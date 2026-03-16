#!/usr/bin/env python3
"""Generate translation files for all languages using Claude API."""
import json, os, sys, time
import anthropic

LOCALES_DIR = "/home/claude/superadpro/frontend/src/i18n/locales"

# Load English master
with open(os.path.join(LOCALES_DIR, "en.json"), "r") as f:
    en = json.load(f)

en_str = json.dumps(en, indent=2)

LANGUAGES = [
    ("es", "Spanish"),
    ("fr", "French"),
    ("pt", "Brazilian Portuguese"),
    ("de", "German"),
    ("it", "Italian"),
    ("nl", "Dutch"),
    ("ru", "Russian"),
    ("ar", "Arabic"),
    ("zh", "Simplified Chinese"),
    ("hi", "Hindi"),
    ("ja", "Japanese"),
    ("ko", "Korean"),
    ("tr", "Turkish"),
    ("pl", "Polish"),
    ("vi", "Vietnamese"),
    ("th", "Thai"),
    ("id", "Indonesian"),
    ("tl", "Filipino/Tagalog"),
    ("sw", "Swahili"),
]

client = anthropic.Anthropic()

for code, name in LANGUAGES:
    outpath = os.path.join(LOCALES_DIR, f"{code}.json")
    if os.path.exists(outpath):
        print(f"  SKIP {code} ({name}) — already exists")
        continue

    print(f"  Generating {code} ({name})...", end="", flush=True)
    
    try:
        resp = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=8000,
            messages=[{
                "role": "user",
                "content": f"""Translate this JSON file from English to {name}. 
RULES:
- Return ONLY valid JSON, no markdown backticks, no explanation
- Keep all JSON keys exactly the same (only translate the values)
- Keep technical terms like "SuperAdPro", "LinkHub", "SuperPages", "ProSeller AI", "SuperMarket", "Ad Board", "Uni-Level" etc in English
- Keep currency symbols ($) and numbers as-is
- Keep format strings like {{views}} and {{price}} and {{name}} unchanged
- For placeholder text like "e.g. crypto trading", translate the examples naturally
- Use natural, colloquial language — not formal/stiff translations
- Arabic should be in standard Modern Arabic

{en_str}"""
            }]
        )
        
        text = resp.content[0].text.strip()
        # Clean markdown wrapping if present
        if text.startswith("```"):
            text = text.split("\n", 1)[1]
            if text.endswith("```"):
                text = text[:-3].strip()
        
        parsed = json.loads(text)
        
        with open(outpath, "w", encoding="utf-8") as f:
            json.dump(parsed, f, ensure_ascii=False, indent=2)
        
        print(f" ✓ ({len(text)} chars)")
        
    except json.JSONDecodeError as e:
        print(f" ✗ JSON parse error: {e}")
        # Save raw for debugging
        with open(outpath + ".raw", "w") as f:
            f.write(text)
    except Exception as e:
        print(f" ✗ Error: {e}")
    
    time.sleep(1)  # Rate limit courtesy

print("\nDone!")
