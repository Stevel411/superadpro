#!/usr/bin/env python3
"""
Add sidebar layout wrapper to member pages that are missing it.
Approach: For each page, replace the head/body structure to include
the shared sidebar and layout CSS while preserving all page content.
"""
import re, os

TEMPLATE_DIR = "/home/claude/superadpro/templates"

# Standard head block
FONT_LINK = '<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Rethink+Sans:wght@400;500;600;700;800&family=Sora:wght@700;800&display=swap" rel="stylesheet">'

# Read the shared layout CSS
with open(os.path.join(TEMPLATE_DIR, "_layout.css")) as f:
    LAYOUT_CSS = f.read()

# Pages that need sidebar wrapper added (but keep their own topbar)
# These have a dark topbar already, just need sidebar + layout wrapper
SIDEBAR_WRAP_PAGES = [
    # Priority 1: Core member pages
    ("income-grid.html", "income-grid", "💎 Income Grid"),
    ("courses.html", "courses", "🎓 Course Library"),
    ("course-learn.html", "courses", "🎓 Course Learning"),
    ("course-commissions.html", "courses", "📊 Course Commissions"),
    ("email-swipes.html", "email-swipes", "📧 Email Swipes"),
    ("funnel-analytics.html", "funnels", "📊 Funnel Analytics"),
    ("funnel-leads.html", "funnels", "📋 Funnel Leads"),
    ("ad-board-manage.html", "ad-board", "📝 My Ads"),
    ("compensation-plan-internal.html", "comp-plan", "💰 Compensation Plan"),
    ("support-internal.html", "support", "🎫 Support"),
    ("social-post-generator.html", "social-posts", "📱 Social Posts"),
    ("video-script-generator.html", "video-scripts", "🎬 Video Scripts"),
    # Priority 2: Other member pages
    ("admin.html", "admin", "⚙️ Admin Panel"),
    ("grid-detail.html", "income-grid", "Grid Detail"),
    ("wallet-connect.html", "wallet", "🔗 Connect Wallet"),
    ("pay-membership.html", "membership", "💳 Pay Membership"),
    ("launch-wizard.html", "wizard", "🚀 Launch Wizard"),
]

def process_page(filename, active_page, topbar_title):
    filepath = os.path.join(TEMPLATE_DIR, filename)
    if not os.path.exists(filepath):
        print(f"  ⚠️  {filename} not found, skipping")
        return False
    
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Skip if already has sidebar include
    if '{% include "_sidebar.html" %}' in content:
        print(f"  ✅ {filename} already has sidebar")
        return False
    
    # === FIX 1: Ensure correct fonts ===
    # Replace any existing font link
    content = re.sub(
        r'<link[^>]*fonts\.googleapis\.com[^>]*>',
        FONT_LINK,
        content
    )
    # If no font link, add after <head>
    if 'fonts.googleapis.com' not in content:
        content = content.replace('<head>', f'<head>\n{FONT_LINK}')
    
    # === FIX 2: Ensure correct body background ===
    # Fix body style - replace any existing body font/background
    content = re.sub(
        r"body\s*\{[^}]*font-family:[^}]*\}",
        "body{font-family:'DM Sans','Rethink Sans',sans-serif;background:#f0f2f8;color:#0f172a;min-height:100vh}",
        content,
        count=1
    )
    
    # === FIX 3: Add layout CSS if missing ===
    if '.layout{' not in content and '.layout {' not in content:
        # Add layout CSS after first <style> opening
        layout_inject = f"""
/* ═══ SHARED LAYOUT ═══ */
.layout{{display:flex;min-height:100vh}}
.sidebar{{width:224px;height:100vh;background:#0a0a1a;border-right:1px solid rgba(0,212,255,0.08);position:fixed;top:0;left:0;z-index:100;display:flex;flex-direction:column;overflow-y:auto}}
.sidebar::-webkit-scrollbar{{width:4px}}.sidebar::-webkit-scrollbar-thumb{{background:rgba(56,189,248,0.2);border-radius:4px}}
.sidebar-logo{{display:flex;align-items:center;gap:10px;padding:20px 18px;border-bottom:1px solid rgba(255,255,255,0.06);text-decoration:none}}
.nav-scroll{{flex:1;overflow-y:auto;padding:8px 0}}
.nav-item{{display:flex;align-items:center;gap:11px;padding:12px 18px;font-size:14px;font-weight:500;color:rgba(200,220,255,0.75);text-decoration:none;border-left:2px solid transparent;transition:all 0.2s}}
.nav-item:hover{{color:#38bdf8;background:rgba(56,189,248,0.06);border-left-color:rgba(56,189,248,0.3)}}
.nav-item.active{{color:#38bdf8;background:rgba(56,189,248,0.07);border-left-color:#38bdf8}}
.nav-icon{{font-size:16px;width:18px;text-align:center;flex-shrink:0}}
.nav-divider{{height:1px;background:rgba(255,255,255,0.06);margin:8px 16px}}
.nav-group{{overflow:hidden}}
.nav-header{{display:flex;align-items:center;justify-content:space-between;padding:8px 18px;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:rgba(200,220,255,0.35);cursor:pointer;user-select:none}}
.nav-chevron{{font-size:14px;transition:transform 0.2s}}
.nav-group.open .nav-chevron{{transform:rotate(90deg)}}
.nav-group:not(.open) .nav-children{{display:none}}
.nav-children .nav-item{{padding-left:28px;font-size:13px}}
.sidebar-footer{{margin-top:auto;padding:14px 12px;border-top:1px solid rgba(255,255,255,0.06)}}
.user-mini{{display:flex;align-items:center;gap:10px;padding:10px 12px;background:rgba(56,189,248,0.05);border:1px solid rgba(0,212,255,0.1);border-radius:8px}}
.user-avatar{{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#0ea5e9,#38bdf8);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:#fff;flex-shrink:0}}
.main{{margin-left:224px;flex:1;display:flex;flex-direction:column;min-height:100vh}}
@media(max-width:768px){{.sidebar{{display:none}}.main{{margin-left:0}}}}
"""
        content = content.replace('<style>', f'<style>\n{layout_inject}', 1)
    
    # === FIX 4: Wrap body content with layout + sidebar ===
    # Find the <body> tag and the first content after it
    body_match = re.search(r'<body[^>]*>', content)
    if body_match:
        body_tag = body_match.group()
        body_end = body_match.end()
        
        # Insert layout wrapper and sidebar after <body>
        sidebar_html = f"""
<div class="layout">
  {{% include "_sidebar.html" %}}
  <div class="main">
"""
        content = content[:body_end] + '\n' + sidebar_html + content[body_end:]
        
        # Close the layout divs before </body>
        content = content.replace('</body>', '  </div><!-- /main -->\n</div><!-- /layout -->\n</body>')
    
    with open(filepath, 'w') as f:
        f.write(content)
    
    print(f"  🔧 {filename} — sidebar + layout added")
    return True


def main():
    print("=" * 50)
    print("SIDEBAR LAYOUT INJECTION")
    print("=" * 50)
    
    fixed = 0
    for filename, active_page, title in SIDEBAR_WRAP_PAGES:
        if process_page(filename, active_page, title):
            fixed += 1
    
    print(f"\n✅ Fixed {fixed} pages")


if __name__ == "__main__":
    main()
