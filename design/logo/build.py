"""Builds the TASKR logo option SVGs and the preview page from one source.

Run:  python design/logo/build.py
"""
from pathlib import Path

HERE = Path(__file__).parent

# Each icon is drawn on a 64x64 grid in currentColor, so CSS can recolour it.
# Parts carry class names (tx-*) so they can be animated individually.
OPTIONS = [
    {
        "id": "quad",
        "name": "Quad",
        "idea": "Four tiles for the four tools. One sticker is lifting off the board: the moment a task gets done.",
        "anim": "The loose tile drops in and settles.",
        "svg": lambda u: """
  <rect class="tx-a" x="4" y="34" width="26" height="26" rx="7"/>
  <rect class="tx-b" x="34" y="34" width="26" height="26" rx="7"/>
  <rect class="tx-c" x="4" y="4" width="26" height="26" rx="7"/>
  <g transform="rotate(12 47 17)"><rect class="tx-lift" x="34" y="4" width="26" height="26" rx="7"/></g>""",
    },
    {
        "id": "nodes",
        "name": "Nodes",
        "idea": "A T built from connected dots, like a small flow diagram: the separate pieces of your day joined in one place.",
        "anim": "The dots pop in one by one, then the links grow between them.",
        "svg": lambda u: """
  <rect class="tx-link" x="12" y="9" width="40" height="9" rx="4.5"/>
  <rect class="tx-link" x="27.5" y="13" width="9" height="38" rx="4.5"/>
  <circle class="tx-n1" cx="11" cy="13.5" r="9"/>
  <circle class="tx-n2" cx="53" cy="13.5" r="9"/>
  <circle class="tx-n4" cx="32" cy="52" r="9"/>""",
    },
    {
        "id": "note",
        "name": "Folded note",
        "idea": "A sticky note with a turned-up corner and a tick cut through it. It says 'tasks, done' without any words.",
        "anim": "The corner folds up and the tick draws itself.",
        "svg": lambda u: f"""
  <defs>
    <mask id="tick-{u}" maskUnits="userSpaceOnUse">
      <rect width="64" height="64" fill="#fff"/>
      <path class="tx-tick" d="M20 31.5 L28 39.5 L43 23.5" fill="none" stroke="#000" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round" pathLength="1"/>
    </mask>
  </defs>
  <path mask="url(#tick-{u})" d="M15 6 H49 A9 9 0 0 1 58 15 V38 L38 58 H15 A9 9 0 0 1 6 49 V15 A9 9 0 0 1 15 6 Z"/>
  <path class="tx-fold" d="M58 44 V51 A7 7 0 0 1 51 58 H44 Z" opacity=".55"/>""",
    },
    {
        "id": "tick-t",
        "name": "Tick t",
        "idea": "A lowercase t whose tail swings up into a check mark. A monogram that reads as both the name and the purpose.",
        "anim": "The letter writes itself in one stroke.",
        "svg": lambda u: """
  <path class="tx-draw" d="M25 6 V39 L33 47 L57 20" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" pathLength="1"/>
  <path class="tx-draw2" d="M10 21 H39" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" pathLength="1"/>""",
    },
    {
        "id": "spark",
        "name": "Spark",
        "idea": "A burst of rays around an open centre, close to the nuworld mark: the spark of getting started, four long rays for the four tools.",
        "anim": "The rays shoot out from the centre in turn.",
        "svg": lambda u: "".join(
            f'\n  <g transform="rotate({a} 32 32)"><rect class="tx-ray" style="animation-delay:{i * 0.05:.2f}s" x="28" y="{3 if i % 2 == 0 else 9}" width="8" height="{18 if i % 2 == 0 else 12}" rx="4"/></g>'
            for i, a in enumerate(range(0, 360, 45))
        ),
    },
    {
        "id": "facet",
        "name": "Facet",
        "idea": "A T cut from two angular blocks, in the spirit of the intrex mark: sharp, structured, a little architectural.",
        "anim": "The two blocks slide together.",
        "svg": lambda u: """
  <path class="tx-top" d="M6 7 H58 V23 H22 Z"/>
  <path class="tx-stem" d="M31 28 H41 V58 H25 V34 Z"/>""",
    },
]


def icon_svg(option, uid, size=None, cls=""):
    attrs = f' width="{size}" height="{size}"' if size else ""
    return f'<svg class="tx {cls}" viewBox="0 0 64 64" fill="currentColor"{attrs} aria-hidden="true">{option["svg"](uid)}\n</svg>'


for option in OPTIONS:
    body = option["svg"](option["id"])
    standalone = f'<!-- TASKR logo option: {option["name"]} -->\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="currentColor">{body}\n</svg>\n'
    (HERE / f"taskr-{option['id']}.svg").write_text(standalone, encoding="utf-8")

counter = 0


def next_uid(prefix):
    global counter
    counter += 1
    return f"{prefix}-{counter}"


cards = []
for index, o in enumerate(OPTIONS, 1):
    def icon(size=None, cls="", o=o):
        return icon_svg(o, next_uid(o["id"]), size, cls)

    cards.append(f"""
<section class="option" data-anim="{o['id']}">
  <header>
    <span class="num">{index:02d}</span>
    <div><h2>{o['name']}</h2><p>{o['idea']}</p></div>
    <button type="button" class="play" onclick="replay(this)">&#9654; Play animation</button>
  </header>
  <div class="grid">
    <div class="hero bg-{index}"><div class="lockup">{icon(cls="big")}<span class="word">taskr</span></div></div>
    <div class="stack">
      <div class="tile"><div class="lockup small">{icon(cls="mid")}<span class="word">taskr</span></div></div>
      <div class="row">
        <div class="appicon">{icon(cls="app")}</div>
        <div class="appicon white">{icon(cls="app")}</div>
        <div class="appicon black">{icon(cls="app")}</div>
        <div class="sizes">{icon(16)}{icon(24)}{icon(32)}<span>16 / 24 / 32px</span></div>
      </div>
      <p class="anim-note">Animation: {o['anim']}</p>
    </div>
  </div>
</section>""")

CSS = """
  :root { --ink:#0c0c0e; --paper:#ffffff; --muted:#71717a; --line:#e4e4e7; --brand:#4f6bff; }
  * { box-sizing: border-box; }
  body { margin:0; background:#f4f4f5; color:var(--ink); font-family:"DM Sans",system-ui,sans-serif; }
  main { max-width:1180px; margin:0 auto; padding:40px 16px 80px; }
  .intro h1 { font-family:Sora,sans-serif; font-size:clamp(28px,4vw,40px); letter-spacing:-.03em; margin:0; }
  .intro p { color:var(--muted); max-width:700px; line-height:1.6; }
  .option { background:var(--paper); border:1px solid var(--line); border-radius:24px; padding:24px; margin-top:28px; }
  .option header { display:flex; gap:16px; align-items:flex-start; margin-bottom:20px; flex-wrap:wrap; }
  .num { font-family:Sora,sans-serif; font-weight:700; color:var(--brand); font-size:14px; padding-top:6px; }
  .option h2 { font-family:Sora,sans-serif; margin:0; font-size:22px; letter-spacing:-.02em; }
  .option header p { margin:4px 0 0; color:var(--muted); max-width:640px; line-height:1.5; }
  .option header > div { flex:1; min-width:220px; }
  .play { border:1px solid var(--line); background:#fff; border-radius:999px; padding:8px 14px; font:600 13px "DM Sans",sans-serif; cursor:pointer; color:var(--ink); }
  .play:hover { border-color:var(--brand); color:var(--brand); }
  .grid { display:grid; grid-template-columns:1.3fr 1fr; gap:16px; }
  @media (max-width:820px) { .grid { grid-template-columns:1fr; } }
  .hero { min-height:clamp(220px,40vw,320px); padding:24px; border-radius:18px; display:grid; place-items:center; color:#fff; overflow:hidden; }
  .bg-1 { background:radial-gradient(60% 70% at 85% 90%, #6d4bff 0%, transparent 60%), radial-gradient(50% 60% at 10% 10%, #1d2bff55 0%, transparent 60%), #08080c; }
  .bg-2 { background:radial-gradient(70% 60% at 20% 100%, #2448ff 0%, transparent 60%), radial-gradient(40% 50% at 95% 20%, #9a7bff88 0%, transparent 60%), #07070b; }
  .bg-3 { background:radial-gradient(60% 60% at 80% 20%, #e8505b99 0%, transparent 60%), radial-gradient(60% 60% at 10% 90%, #1fb5c7aa 0%, transparent 60%), #0b0b10; }
  .bg-4 { background:linear-gradient(135deg, #1530ff 0%, #2b1d8f 45%, #0a0a12 100%); }
  .bg-5 { background:radial-gradient(50% 60% at 50% 120%, #4f6bff 0%, transparent 70%), radial-gradient(40% 40% at 100% 0%, #ff8a5c66 0%, transparent 70%), #09090d; }
  .bg-6 { background:radial-gradient(70% 70% at 0% 100%, #1fb5c7aa 0%, transparent 60%), radial-gradient(60% 60% at 100% 30%, #4f6bffaa 0%, transparent 60%), #0a0a0f; }
  .lockup { display:flex; align-items:center; gap:18px; }
  .lockup .big { width:clamp(48px,8vw,88px); height:clamp(48px,8vw,88px); }
  .word { font-family:Sora,sans-serif; font-weight:600; font-size:clamp(36px,6vw,64px); letter-spacing:-.045em; line-height:1; }
  .lockup.small { gap:12px; }
  .lockup .mid { width:44px; height:44px; color:var(--brand); }
  .lockup.small .word { font-size:34px; color:var(--ink); }
  .stack { display:flex; flex-direction:column; gap:16px; }
  .tile { border:1px solid var(--line); border-radius:18px; display:grid; place-items:center; min-height:150px; background:#fafafa; }
  .row { display:flex; gap:12px; align-items:center; flex-wrap:wrap; }
  .appicon { width:72px; height:72px; border-radius:18px; display:grid; place-items:center; color:#fff; background:linear-gradient(140deg,#5b74ff,#3a2bd1); box-shadow:0 8px 20px -8px #3a2bd199; }
  .appicon.white { background:#fff; color:var(--ink); border:1px solid var(--line); box-shadow:none; }
  .appicon.black { background:#0c0c0e; color:#fff; box-shadow:none; }
  .appicon .app { width:40px; height:40px; }
  .sizes { display:flex; align-items:flex-end; gap:10px; color:var(--ink); padding:10px 12px; border:1px dashed var(--line); border-radius:14px; }
  .sizes span { font-size:11px; color:var(--muted); }
  .anim-note { margin:0; font-size:13px; color:var(--muted); }
  /* Animated parts scale/move around their own centre. */
  .tx-a, .tx-b, .tx-c, .tx-lift, .tx-n1, .tx-n2, .tx-n3, .tx-n4, .tx-link, .tx-fold, .tx-top, .tx-stem { transform-box: fill-box; transform-origin: center; }

  /* Each animation runs when its section gets the .go class. */
  @keyframes pop { from { transform: scale(.4); opacity:0; } }
  @keyframes grow { from { transform: scale(0); opacity:0; } }
  @keyframes draw { from { stroke-dashoffset:1; } }

  .go .tx-a, .go .tx-b, .go .tx-c { animation: pop .45s ease-out both; }
  .go .tx-b { animation-delay:.08s; } .go .tx-c { animation-delay:.16s; }
  .go .tx-lift { animation: lift .9s .2s cubic-bezier(.2,.9,.2,1.2) both; }
  @keyframes lift { from { transform: translate(10px,-24px) rotate(40deg); opacity:0; } }

  .go .tx-n1, .go .tx-n2, .go .tx-n3, .go .tx-n4 { animation: pop .45s cubic-bezier(.3,1.6,.5,1) both; }
  .go .tx-n3 { animation-delay:.1s; } .go .tx-n2 { animation-delay:.2s; } .go .tx-n4 { animation-delay:.3s; }
  .go .tx-link { animation: grow .5s .35s ease-out both; }

  .tx-tick { stroke-dasharray:1; stroke-dashoffset:0; }
  .go .tx-tick { animation: draw .6s .45s ease-out both; }
  .tx .tx-fold { transform-origin: 100% 100%; }
  .go .tx-fold { animation: fold .6s ease-out both; }
  @keyframes fold { from { transform: scale(0); } }

  .tx-draw, .tx-draw2 { stroke-dasharray:1; stroke-dashoffset:0; }
  .go .tx-draw { animation: draw .9s ease-in-out both; }
  .go .tx-draw2 { animation: draw .4s .75s ease-out both; }

  .tx-ray { transform-box: fill-box; transform-origin: 50% 100%; }
  .go .tx-ray { animation: ray .5s cubic-bezier(.3,1.5,.5,1) both; }
  @keyframes ray { from { transform: scaleY(0); opacity:0; } }

  .go .tx-top { animation: fromLeft .6s cubic-bezier(.2,.9,.2,1) both; }
  .go .tx-stem { animation: fromBottom .6s .15s cubic-bezier(.2,.9,.2,1) both; }
  @keyframes fromLeft { from { transform: translateX(-18px); opacity:0; } }
  @keyframes fromBottom { from { transform: translateY(18px); opacity:0; } }

  @media (prefers-reduced-motion: reduce) { .go * { animation:none !important; } }
"""

page = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>TASKR Logo Options</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
<style>{CSS}</style>
</head>
<body>
<main>
  <div class="intro">
    <h1>TASKR logo options</h1>
    <p>Six icon directions. Each is an SVG on a 64&times;64 grid in a single colour (currentColor), so it can be recoloured, resized and animated part by part. Every option is shown as a lockup on a dark gradient like your references, on white, as app icons and at favicon sizes. Press <b>Play animation</b> to see how it could move. The word "taskr" is set in a placeholder typeface (Sora); we refine it once you pick an icon.</p>
  </div>
  {''.join(cards)}
</main>
<script>
  function replay(button) {{
    const section = button.closest('.option');
    section.classList.remove('go'); void section.offsetWidth; section.classList.add('go');
  }}
  // Play each animation once as it scrolls into view.
  const seen = new IntersectionObserver((entries) => entries.forEach((entry) => {{
    if (entry.isIntersecting) {{ entry.target.classList.add('go'); seen.unobserve(entry.target); }}
  }}), {{ threshold: .4 }});
  document.querySelectorAll('.option').forEach((section) => seen.observe(section));
</script>
</body>
</html>
"""
(HERE / "index.html").write_text(page, encoding="utf-8")
print("built", len(OPTIONS), "options")
