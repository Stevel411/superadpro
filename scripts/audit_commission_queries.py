#!/usr/bin/env python3
"""
Audit every analytics-style query in app/main.py and grid.py
that reads from one of SuperAdPro's three commission tables:

  1. Commission              (grid + membership + misc)
  2. CourseCommission        (Course Academy pass-up)
  3. CreditMatrixCommission  (Credit Nexus matrix payouts)

Each table was added at a different time; readers added before a
table existed often never got updated when new tables shipped. This
script finds queries that touch some-but-not-all tables, flagging
likely aggregator bugs (e.g. a function summing user lifetime
earnings from Commission only, missing matrix + course income).

Originally written 7 May 2026 after finding the same bug class in
two places on the same day:
  - get_user_commission_history  (wallet activity feed missing
    Credit Nexus + Course commissions)
  - compute_user_earnings        (wallet earnings cards showing $0
    for Credit Nexus despite confirmed balance)

Both were silent bugs — money was correctly in members' balances,
but downstream displays were wrong. The pattern repeats across
~17 other functions per this audit.

Run from repo root:
    python3 scripts/audit_commission_queries.py

Re-run after each fix to track progress. The script reports raw
counts; human triage is needed to separate "real aggregator bugs"
from "function legitimately only needs Commission" cases.
"""
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
FILES = [REPO_ROOT / 'app' / 'main.py', REPO_ROOT / 'app' / 'grid.py']

# Patterns that match attribute access on each commission table.
# Catching attribute access (rather than just the class name) avoids
# false positives from imports or comments mentioning the class.
PATTERNS = {
    'Commission':              re.compile(r'\bCommission\.(amount_usdt|to_user_id|commission_type|status|created_at)\b'),
    'CourseCommission':        re.compile(r'\bCourseCommission\.(amount|earner_id|commission_type|created_at|course_tier)\b'),
    'CreditMatrixCommission':  re.compile(r'\bCreditMatrixCommission\.(amount|earner_id|status|commission_type|created_at)\b'),
}

TERMINATOR = re.compile(r'\.(scalar|all|first|count|delete|update|one|one_or_none)\s*\(\s*\)')


def find_query_blocks(src):
    """Yield (start_line, end_line, block_text) for each db.query block."""
    lines = src.split('\n')
    for i, line in enumerate(lines):
        if 'db.query(' in line:
            block_lines = []
            for j, candidate in enumerate(lines[i:i+25]):
                block_lines.append(candidate)
                if TERMINATOR.search(candidate):
                    yield (i + 1, i + 1 + j, '\n'.join(block_lines))
                    break


def build_func_map(src):
    """Map line number -> enclosing function/route name."""
    func_map = {}
    current = '<module>'
    for i, line in enumerate(src.split('\n'), 1):
        m_def = re.match(r'^(?:async\s+)?def\s+(\w+)', line)
        if m_def:
            current = m_def.group(1)
        m_route = re.match(r'^@app\.(?:get|post|delete|put|patch)\s*\(\s*"([^"]+)"', line)
        if m_route:
            current = '@app.' + m_route.group(1)
        func_map[i] = current
    return func_map


def main():
    results = {}  # function_name -> set of tables touched

    for f in FILES:
        if not f.exists():
            print(f"⚠ {f} not found — skipping", file=sys.stderr)
            continue
        src = f.read_text()
        func_map = build_func_map(src)

        for start, _end, block in find_query_blocks(src):
            tables = {tname for tname, pat in PATTERNS.items() if pat.search(block)}
            if not tables:
                continue
            func = func_map.get(start, '<unknown>')
            results.setdefault(func, set()).update(tables)

    # Report
    print(f"{'Function/Endpoint':<55} {'Comm':<6} {'Course':<7} {'Matrix':<7} Status")
    print('-' * 90)

    issues = []
    for func, tables in sorted(results.items()):
        has_comm = 'Commission' in tables
        has_course = 'CourseCommission' in tables
        has_matrix = 'CreditMatrixCommission' in tables

        flag = ''
        if has_comm and not has_course and not has_matrix:
            flag = '⚠ COMM-ONLY'
            issues.append((func, 'Commission only — possibly missing matrix + course'))
        elif has_comm and has_course and not has_matrix:
            flag = '⚠ MISSING MATRIX'
            issues.append((func, 'Has Commission + Course, missing CreditMatrixCommission'))
        elif has_comm and has_matrix and not has_course:
            flag = '⚠ MISSING COURSE'
            issues.append((func, 'Has Commission + Matrix, missing CourseCommission'))
        elif has_comm and has_course and has_matrix:
            flag = '✅ all 3'

        print(f"{func[:54]:<55} {'✓' if has_comm else '·':<6} "
              f"{'✓' if has_course else '·':<7} {'✓' if has_matrix else '·':<7} {flag}")

    print(f"\n{'=' * 90}")
    print(f"FUNCTIONS NEEDING REVIEW: {len(issues)}")
    print('=' * 90)
    for func, why in issues:
        print(f"\n  📍 {func}")
        print(f"     {why}")

    if issues:
        print('\nNote: this script reports raw query patterns. Some flagged functions')
        print('legitimately need only one table (e.g. /api/membership-stream queries')
        print('Commission specifically, no matrix/course data needed). Human triage')
        print('required to separate real bugs from intentional single-table queries.')

    sys.exit(0 if not issues else 1)


if __name__ == '__main__':
    main()
