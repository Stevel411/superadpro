#!/usr/bin/env python3
"""
Bulk-translate UI strings via Claude Haiku 4.5.

Runs locally (not in production). Reads English values from en.json,
translates to all 19 non-English locales for the target namespaces,
writes results back into the locale files.

REQUIREMENTS:
  - ANTHROPIC_API_KEY set in env
  - pip install anthropic

USAGE:
  # dry run (estimate scope, no API calls):
  python3 scripts/bulk_translate_haiku.py --dry-run

  # translate the 3 stream namespaces:
  python3 scripts/bulk_translate_haiku.py

  # translate specific namespaces:
  python3 scripts/bulk_translate_haiku.py --namespaces tools,explore

  # only specific locales (testing):
  python3 scripts/bulk_translate_haiku.py --locales fr,de,es

DESIGN NOTES:
  - Batches up to 30 strings per API call (one call per locale per batch)
  - Skips strings that are already translated (value differs from English)
  - Skips strings that don't need translation (numbers, brand names, emojis)
  - Idempotent: re-running won't re-translate work already done
  - Progress prints to stderr; locale files are written incrementally per
    batch so a crash mid-run still saves what's done

COST ESTIMATE (Haiku 4.5):
  ~$1/M input tokens, ~$5/M output. Roughly $2-5 for the 3 stream
  namespaces across all 19 locales (~3,990 total translations).
"""
import os, sys, json, re, argparse, time
from pathlib import Path

LOCALE_DIR = Path("frontend/src/i18n/locales")
DEFAULT_NAMESPACES = ["gridStream", "membershipStream", "nexusStream"]

LANG_NAMES = {
    "ar": "Arabic", "de": "German", "es": "Spanish", "fr": "French",
    "hi": "Hindi", "id": "Indonesian", "it": "Italian", "ja": "Japanese",
    "ko": "Korean", "nl": "Dutch", "pl": "Polish", "pt": "Portuguese",
    "ru": "Russian", "sw": "Swahili", "th": "Thai", "tl": "Tagalog",
    "tr": "Turkish", "vi": "Vietnamese", "zh": "Chinese (Simplified)",
}

# Brand and technical terms that should NEVER be translated. Same set as
# translate_all.py keeps consistent with the existing curated translations.
KEEP_ENGLISH = {
    "SuperAdPro", "Banxa", "NOWPayments", "USDT", "USDC", "USD", "EUR", "GBP",
    "Polygon", "MetaMask", "Brevo", "Cloudflare", "AI", "API", "URL", "PDF",
    "QR", "HTML", "CSS", "MP3", "MP4", "PNG", "SVG", "JSON",
    "SuperPages", "SuperLeads", "SuperDeck", "SuperMarket", "SuperCut",
    "SuperLink", "SuperScene", "SuperSeller", "ProSeller", "LinkHub",
    "AdBoost", "EvoLink", "OmniHuman", "Kling", "Sora", "Grok", "Suno",
    "YouTube", "Vimeo", "Loom", "Google Authenticator", "Google Play",
    "App Store", "Coinbase Wallet", "Trust Wallet", "Pay It Forward",
    "Watch to Earn", "Watch & Earn", "Income Grid", "Profit Nexus",
    "Credit Nexus", "Command Centre", "Pro", "Basic", "Free",
}


def is_legit_same_as_en(value):
    """Return True if value should NOT be translated (numbers, brands, emojis, URLs)."""
    s = (value or "").strip()
    if not s:
        return True
    if s.startswith(("http://", "https://", "/")):
        return True
    if re.fullmatch(r"[\d\s\$\%\.,\-x/+]+", s):
        return True
    if not re.search(r"[a-zA-Z]", s):
        return True
    if s in KEEP_ENGLISH:
        return True
    if len(s) <= 2:
        return True
    return False


def flatten(d, prefix=""):
    """Flatten nested dict into {dotted.path: value}. Only string leaves."""
    out = {}
    for k, v in d.items():
        path = f"{prefix}.{k}" if prefix else k
        if isinstance(v, dict):
            out.update(flatten(v, path))
        elif isinstance(v, str):
            out[path] = v
    return out


def set_nested(d, dotted, value):
    """Write value at d[a][b][c] given 'a.b.c'. Create intermediate dicts as needed."""
    parts = dotted.split(".")
    cur = d
    for p in parts[:-1]:
        if p not in cur or not isinstance(cur[p], dict):
            cur[p] = {}
        cur = cur[p]
    cur[parts[-1]] = value


def get_nested(d, dotted):
    """Return d[a][b][c] for 'a.b.c', or None if any segment missing."""
    cur = d
    for p in dotted.split("."):
        if not isinstance(cur, dict) or p not in cur:
            return None
        cur = cur[p]
    return cur


def collect_work(en_data, target_ns, locale_data, locale_code):
    """For one locale, find strings that need translation. Returns list of (key, en_value)."""
    work = []
    for ns in target_ns:
        if ns not in en_data:
            continue
        for key, en_val in flatten(en_data[ns], ns).items():
            if is_legit_same_as_en(en_val):
                continue
            existing = get_nested(locale_data, key)
            # Skip if locale already has a non-English translation
            if existing is not None and existing != en_val:
                continue
            work.append((key, en_val))
    return work


def translate_batch(client, model, lang_code, lang_name, strings):
    """Translate a list of English UI strings to one target language. Returns list of translations in same order."""
    # Build a numbered list. Asking for JSON back keeps parsing reliable.
    numbered = "\n".join(f"{i+1}. {s}" for i, s in enumerate(strings))

    system = (
        f"You are a professional UI translator working on a SaaS marketing platform "
        f"(SuperAdPro). Your job: translate English UI strings to {lang_name}. "
        "STRICT RULES:\n"
        "- Preserve placeholders like {{count}}, {{name}}, {{date}} EXACTLY as written\n"
        "- Preserve HTML tags like <strong>, <li>, <br> EXACTLY\n"
        "- Keep brand names in English: SuperAdPro, Banxa, NOWPayments, USDT, "
        "Polygon, Brevo, Pro, Basic, Cloudflare, Kling, Sora, Grok\n"
        "- Keep marketing taglines tight - don't expand them\n"
        "- Don't translate emojis or punctuation\n"
        "- Match register (formal/casual) of the English source\n"
        "- For ambiguous short labels (Tier, Cycle, Grid, Nexus), prefer the natural "
        "translation but if your language commonly keeps the English term (e.g., "
        "tech adoption), keep English\n"
        "Respond with ONLY a JSON array of translated strings, in the same order as "
        "the input. No commentary, no markdown, no code fences. Just the JSON array."
    )

    user = f"Translate these {len(strings)} UI strings to {lang_name}:\n\n{numbered}"

    response = client.messages.create(
        model=model,
        max_tokens=4096,
        system=system,
        messages=[{"role": "user", "content": user}],
    )

    text = response.content[0].text.strip()
    # Strip ```json fences if the model added them despite instructions
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    text = text.strip()

    try:
        result = json.loads(text)
    except json.JSONDecodeError as e:
        raise RuntimeError(
            f"Haiku returned non-JSON for {lang_code}: {text[:300]!r}\nError: {e}"
        )

    if not isinstance(result, list):
        raise RuntimeError(f"Expected JSON array, got {type(result).__name__}")
    if len(result) != len(strings):
        raise RuntimeError(
            f"Got {len(result)} translations for {len(strings)} inputs (lang {lang_code})"
        )

    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--namespaces", default=",".join(DEFAULT_NAMESPACES),
                        help="Comma-separated list of top-level namespaces to translate.")
    parser.add_argument("--locales", default=",".join(LANG_NAMES.keys()),
                        help="Comma-separated locale codes (default: all 19).")
    parser.add_argument("--batch-size", type=int, default=30,
                        help="Strings per API call (default 30).")
    parser.add_argument("--dry-run", action="store_true",
                        help="Print scope and exit without calling the API.")
    parser.add_argument("--model", default="claude-haiku-4-5-20251001",
                        help="Anthropic model ID (default: claude-haiku-4-5-20251001).")
    args = parser.parse_args()

    target_ns = [n.strip() for n in args.namespaces.split(",") if n.strip()]
    target_locales = [c.strip() for c in args.locales.split(",") if c.strip()]
    for lc in target_locales:
        if lc not in LANG_NAMES:
            print(f"ERROR: unknown locale code: {lc}", file=sys.stderr)
            sys.exit(1)

    en_path = LOCALE_DIR / "en.json"
    en_data = json.loads(en_path.read_text())

    # Print scope
    total_work = 0
    print(f"Target namespaces: {target_ns}", file=sys.stderr)
    print(f"Target locales:    {target_locales}", file=sys.stderr)
    print("", file=sys.stderr)
    print("Per-locale work (strings needing translation):", file=sys.stderr)
    locale_work_map = {}
    for lc in target_locales:
        locale_data = json.loads((LOCALE_DIR / f"{lc}.json").read_text())
        work = collect_work(en_data, target_ns, locale_data, lc)
        locale_work_map[lc] = work
        total_work += len(work)
        print(f"  {lc} ({LANG_NAMES[lc]:13}) -> {len(work):>4} strings", file=sys.stderr)
    print(f"\nTOTAL TRANSLATIONS: {total_work}", file=sys.stderr)
    print(f"Estimated batches:  {(total_work + args.batch_size - 1) // args.batch_size}", file=sys.stderr)

    if args.dry_run:
        print("\n[DRY RUN — exiting without calling API]", file=sys.stderr)
        return 0

    if total_work == 0:
        print("\nNothing to translate. All target strings already have non-English values.",
              file=sys.stderr)
        return 0

    # Confirm before spending money
    print("", file=sys.stderr)
    confirm = input("Proceed with API calls? [y/N] ").strip().lower()
    if confirm not in ("y", "yes"):
        print("Cancelled.", file=sys.stderr)
        return 1

    try:
        from anthropic import Anthropic
    except ImportError:
        print("ERROR: anthropic SDK not installed. Run: pip install anthropic",
              file=sys.stderr)
        return 1

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ERROR: ANTHROPIC_API_KEY not set in env.", file=sys.stderr)
        return 1

    client = Anthropic(api_key=api_key)

    # Process locale by locale, batch by batch. Save after each batch so a
    # crash mid-run doesn't lose work.
    grand_total = 0
    for lc in target_locales:
        work = locale_work_map[lc]
        if not work:
            continue

        locale_path = LOCALE_DIR / f"{lc}.json"
        locale_data = json.loads(locale_path.read_text())

        print(f"\n=== {lc} ({LANG_NAMES[lc]}) — {len(work)} strings ===", file=sys.stderr)

        for batch_start in range(0, len(work), args.batch_size):
            batch = work[batch_start:batch_start + args.batch_size]
            batch_strings = [en_val for _, en_val in batch]
            batch_keys = [key for key, _ in batch]

            attempt = 0
            while True:
                try:
                    print(f"  batch {batch_start//args.batch_size + 1}: "
                          f"translating {len(batch_strings)} strings...",
                          file=sys.stderr, end=" ", flush=True)
                    translations = translate_batch(
                        client, args.model, lc, LANG_NAMES[lc], batch_strings
                    )
                    print("ok", file=sys.stderr)
                    break
                except Exception as e:
                    attempt += 1
                    print(f"FAILED ({e})", file=sys.stderr)
                    if attempt >= 3:
                        print(f"  giving up on this batch after 3 attempts", file=sys.stderr)
                        translations = None
                        break
                    print(f"  retry {attempt}/3 in 5s...", file=sys.stderr)
                    time.sleep(5)

            if translations is None:
                continue  # skip this batch, move on

            # Apply translations into the locale data
            for key, translated in zip(batch_keys, translations):
                set_nested(locale_data, key, translated)

            # Save after each batch (crash safety)
            locale_path.write_text(
                json.dumps(locale_data, ensure_ascii=False, indent=2) + "\n"
            )
            grand_total += len(translations)

        print(f"  done with {lc}", file=sys.stderr)

    print(f"\n=== ALL DONE ===", file=sys.stderr)
    print(f"Total strings translated: {grand_total}", file=sys.stderr)
    print(f"Locale files updated. Review changes with: git diff frontend/src/i18n/locales/",
          file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
