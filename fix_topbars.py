#!/usr/bin/env python3
"""
Fix topbars on all member pages:
1. Change 3-col grid topbar CSS to simple flexbox
2. Remove Dashboard back buttons from topbar HTML
3. Remove SuperAdPro branding from topbar HTML (sidebar has it)
4. Keep page title and any relevant action buttons
"""
import re, os

TEMPLATE_DIR = "/home/claude/superadpro/templates"

# Pages to fix (all member pages that got the sidebar injection)
PAGES = [
    "income-grid", "courses", "course-learn", "course-commissions",
    "email-swipes", "funnel-analytics", "funnel-leads", "ad-board-manage",
    "compensation-plan-internal", "support-internal", "admin", "grid-detail",
    "pay-membership", "launch-wizard",
]

def fix_page(name):
    filepath = os.path.join(TEMPLATE_DIR, f"{name}.html")
    if not os.path.exists(filepath):
        print(f"  ⚠️  {name} not found")
        return False
    
    with open(filepath) as f:
        content = f.read()
    
    original = content
    
    # FIX 1: Change topbar CSS from grid to flexbox
    content = re.sub(
        r'\.topbar\{[^}]*display:grid;grid-template-columns:auto 1fr auto[^}]*\}',
        '.topbar{position:sticky;top:0;z-index:50;background:#0a0a1a;border-bottom:1px solid rgba(14,165,233,0.12);padding:0 28px;height:70px;display:flex;align-items:center;justify-content:space-between}',
        content
    )
    
    # FIX 2: Remove Dashboard back button from topbar HTML
    # Pattern: <a href="/dashboard" ...>← Dashboard</a> or similar
    content = re.sub(
        r'<a\s+href="/dashboard"\s+class="back-btn"[^>]*>.*?</a>\s*',
        '',
        content,
        flags=re.DOTALL
    )
    # Also handle inline-styled dashboard buttons in topbar
    content = re.sub(
        r'<a\s+href="/dashboard"\s+style="[^"]*"[^>]*>\s*(?:<svg[^>]*>.*?</svg>\s*)?(?:←\s*)?Dashboard\s*</a>\s*',
        '',
        content,
        flags=re.DOTALL
    )
    # Also handle tb-btn class
    content = re.sub(
        r'<a\s+href="/dashboard"\s+class="tb-btn"[^>]*>.*?</a>\s*',
        '',
        content,
        flags=re.DOTALL
    )
    
    # FIX 3: Remove SuperAdPro branding SVG+text from topbar
    # Pattern: <a href="/" ...><svg...>SuperAdPro</a>
    content = re.sub(
        r'<a\s+href="/"\s+(?:class="brand-mark"|style="display:flex;align-items:center;gap:10px;text-decoration:none")[^>]*>\s*<svg[^>]*>.*?</svg>\s*<span[^>]*>Super.*?</span>\s*</a>',
        '',
        content,
        flags=re.DOTALL
    )
    
    # FIX 4: Remove topbar-centre wrapper if it was used for centring with 3-col grid
    # Change <div class="topbar-centre">..title..</div> to just the title content
    content = re.sub(
        r'<div\s+class="topbar-centre"\s*>\s*(<div\s+class="topbar-title".*?</div>\s*(?:<div\s+class="topbar-sub".*?</div>\s*)?)\s*</div>',
        r'<div>\1</div>',
        content,
        flags=re.DOTALL
    )
    
    # Also handle text-align:center on title wrapper
    content = re.sub(
        r'<div\s+style="text-align:center"\s*>\s*(<div\s+class="topbar-title".*?</div>\s*(?:<div\s+class="topbar-sub".*?</div>\s*)?)\s*</div>',
        r'<div>\1</div>',
        content,
        flags=re.DOTALL
    )
    
    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"  🔧 {name} — topbar fixed")
        return True
    else:
        print(f"  ✅ {name} — no changes needed")
        return False


def main():
    print("=" * 50)
    print("TOPBAR STANDARDISATION")
    print("=" * 50)
    
    fixed = 0
    for name in PAGES:
        if fix_page(name):
            fixed += 1
    
    print(f"\n✅ Fixed {fixed} pages")


if __name__ == "__main__":
    main()
