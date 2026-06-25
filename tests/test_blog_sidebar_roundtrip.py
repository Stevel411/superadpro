import ast, json, sys, re, datetime
import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT,"app"))

# ── 1. Extract the REAL save/read normalisers from main.py source (no reimplementation) ──
src = open(os.path.join(ROOT,"app","main.py")).read()
tree = ast.parse(src)
want = {"_clean_link_widgets", "_default_sidebar_layout", "_reconcile_sidebar_layout"}
ns = {"json": json}
# module-level constant first
for node in tree.body:
    if isinstance(node, ast.Assign) and any(getattr(t,"id",None)=="_BUILTIN_SIDEBAR_BLOCKS" for t in node.targets):
        exec(compile(ast.Module([node],[]), "main_extract", "exec"), ns)
for node in tree.body:
    if isinstance(node, ast.FunctionDef) and node.name in want:
        exec(compile(ast.Module([node],[]), "main_extract", "exec"), ns)
for n in want | {"_BUILTIN_SIDEBAR_BLOCKS"}:
    assert n in ns, f"failed to extract {n}"
_clean = ns["_clean_link_widgets"]; _default = ns["_default_sidebar_layout"]; _reconcile = ns["_reconcile_sidebar_layout"]

# ── 2. The REAL renderer ──
from blog_render import render_cs_feed, BlogRenderContext, PostView

# ── 3. Simulate the exact save → DB blob → read path ──
def save(editor_payload):                       # mirrors _save_blog_link_widgets
    widgets = _clean(editor_payload.get("widgets"))
    layout  = _reconcile(editor_payload.get("layout"), len(widgets))
    return json.dumps({"widgets": widgets, "layout": layout})   # what lands in widgets_json
def read(blob):                                  # mirrors _get_blog_link_widgets (current shape)
    data = json.loads(blob)
    widgets = _clean(data.get("widgets"))
    layout  = _reconcile(data.get("layout"), len(widgets))
    return {"widgets": widgets, "layout": layout}

def render(cfg):
    posts = [PostView(title="First Post", slug="first", excerpt="hello", tags=[("News","news")],
                      published_at=datetime.datetime(2026,6,1), read_minutes=3),
             PostView(title="Second Post", slug="second", excerpt="world", tags=[("Tips","tips")],
                      published_at=datetime.datetime(2026,6,2), read_minutes=5)]
    ctx = BlogRenderContext(blog_title="SuperAdPro", tagline="Tools first", slug="superadpro",
                            username="steve", theme="classic-sidebar", palette="plum",
                            base_path="/sites/superadpro", posts=posts,
                            link_widgets=cfg["widgets"], sidebar_layout=cfg["layout"])
    return render_cs_feed(ctx)

# ── 4. Extract the rendered sidebar block ORDER from the <aside> ──
MARK = {"about":"<h4>About</h4>", "subscribe":'id="subscribe"',
        "popular":"<h4>Popular</h4>", "topics":"<h4>Topics</h4>"}
def sidebar_order(html, widget_titles):
    aside = re.search(r'<aside class="side">(.*?)</aside>', html, re.S).group(1)
    found = []
    for bid, mk in MARK.items():
        i = aside.find(mk)
        if i >= 0: found.append((i, bid))
    for idx, t in enumerate(widget_titles):
        i = aside.find(f"<h4>{t}</h4>")
        if i >= 0: found.append((i, f"lw:{idx}"))
    return [b for _, b in sorted(found)]

W = [{"title":"My Shop","new_tab":True,"links":[{"label":"Store","url":"https://shop.example"}]}]
fails = 0
def check(name, got, expect):
    global fails
    ok = got == expect
    print(("PASS " if ok else "FAIL ")+name)
    if not ok:
        print(f"      expected: {expect}\n      got:      {got}"); fails += 1

# Scenario A — default order, no widgets
cfg = read(save({"widgets":[], "layout":None}))
check("A default order", sidebar_order(render(cfg), []), ["about","subscribe","popular","topics"])

# Scenario B — REORDER: subscribe to top, topics before popular  (the editor's core action)
lay = [{"id":"subscribe","show":True},{"id":"topics","show":True},
       {"id":"popular","show":True},{"id":"about","show":True}]
cfg = read(save({"widgets":[], "layout":lay}))
check("B reorder persists through round-trip", sidebar_order(render(cfg), []),
      ["subscribe","topics","popular","about"])

# Scenario C — HIDE: about hidden, rest default
lay = [{"id":"about","show":False},{"id":"subscribe","show":True},
       {"id":"popular","show":True},{"id":"topics","show":True}]
cfg = read(save({"widgets":[], "layout":lay}))
check("C hidden block absent from render", sidebar_order(render(cfg), []),
      ["subscribe","popular","topics"])

# Scenario D — link widget reordered into the middle + about hidden
lay = [{"id":"subscribe","show":True},{"id":"lw:0","show":True},
       {"id":"about","show":False},{"id":"popular","show":True},{"id":"topics","show":True}]
cfg = read(save({"widgets":W, "layout":lay}))
check("D widget reorder+hide round-trip", sidebar_order(render(cfg), ["My Shop"]),
      ["subscribe","lw:0","popular","topics"])

# Scenario E — ALL hidden → graceful (empty sidebar, no crash)
lay = [{"id":b,"show":False} for b in ["about","subscribe","popular","topics"]]
cfg = read(save({"widgets":[], "layout":lay}))
html = render(cfg)
empty = re.search(r'<aside class="side">(.*?)</aside>', html, re.S).group(1).strip()
check("E all-hidden degrades to empty sidebar", empty, "")

# Scenario F — stale id in saved layout + a newly-added widget not in layout (reconcile heals both)
lay = [{"id":"ghost","show":True},{"id":"about","show":True},{"id":"subscribe","show":True}]
cfg = read(save({"widgets":W, "layout":lay}))            # widget present but lw:0 missing from layout
order = sidebar_order(render(cfg), ["My Shop"])
check("F stale id dropped + new widget auto-appended visible",
      ("ghost" not in order) and ("lw:0" in order) and order[:2]==["about","subscribe"], True)

print("\n"+("ALL PASS" if fails==0 else f"{fails} FAILED"))
sys.exit(1 if fails else 0)
