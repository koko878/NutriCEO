#!/usr/bin/env python3
"""Bundle the hub + all pages into one standalone HTML file.
Each sub-page is embedded as an isolated iframe (srcdoc) to avoid CSS/JS
collisions. Cross-document links inside a page are routed to the parent
package via postMessage."""
import json, base64, pathlib

BASE = pathlib.Path(__file__).parent
OUT = BASE / "nutricrops-demo.html"

DOCS = ["exec-summary", "nutriceo", "sentinel", "helios", "maestro", "custobot", "radar", "cgm"]
TITLES = {
    "exec-summary": "Executive Summary",
    "nutriceo": "NutriCEO · CEO",
    "sentinel": "Sentinel · Performance & Risk",
    "helios": "Helios · HR",
    "maestro": "Maestro · Executive Assistant",
    "custobot": "CustoBot · Customization Marketing",
    "radar": "Radar Intrants · Procurement",
    "cgm": "CGM Simulator · Sales",
}

BRIDGE = """<script>(function(){
function route(n){if(window.parent!==window){parent.postMessage({pkgnav:n},'*');}}
document.querySelectorAll('[data-demo]').forEach(function(el){
  var c=el.cloneNode(true);el.parentNode.replaceChild(c,el);
  c.addEventListener('click',function(e){e.stopPropagation();e.preventDefault();route(c.getAttribute('data-demo').replace('.html',''));});
});
document.querySelectorAll('a[href$=".html"]').forEach(function(a){
  a.addEventListener('click',function(e){e.preventDefault();route(a.getAttribute('href').replace('.html',''));});
});
})();</script>"""

def embed(name):
    s = (BASE / f"{name}.html").read_text(encoding="utf-8")
    s = s.replace("</body>", BRIDGE + "</body>", 1)
    j = json.dumps(s)            # safe JS string literal
    j = j.replace("</", "<\\/")  # neutralise any </script> for the outer parser
    return j

docs_js = ",\n".join(f'  {json.dumps(n)}: {embed(n)}' for n in DOCS)
titles_js = json.dumps(TITLES)

# favicon as data URI (no external asset needed)
ico = base64.b64encode((BASE / "assets" / "dnai-icon-180.png").read_bytes()).decode()
favicon = f"data:image/png;base64,{ico}"

HUB = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="theme-color" content="#1B5E20">
<link rel="icon" href="__FAVICON__">
<link rel="apple-touch-icon" href="__FAVICON__">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="D²nAI">
<title>D²nAI — Demo · OCP Nutricrops</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Cormorant+Garamond:wght@500;600;700&display=swap" rel="stylesheet">
<style>
:root{--green-900:#0F3D14;--green-800:#1B5E20;--green-700:#2E7D32;--green-500:#4CAF50;--green-100:#E8F0E8;--green-50:#F4F8F3;--ink:#13191A;--ink-2:#3C4642;--muted:#73796F;--line:#EAECE6;--bg:#FCFCFA;--ok:#15803D;--ok-bg:#DCFCE7;--warn:#B45309;--warn-bg:#FEF3C7}
*{box-sizing:border-box;margin:0;padding:0;-webkit-font-smoothing:antialiased}
body{font-family:'Inter',-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:radial-gradient(900px 420px at 50% -120px,#E2E8DE 0%,transparent 70%),var(--bg);color:var(--ink);min-height:100vh}
#home{max-width:920px;margin:0 auto;padding:36px 24px 70px}
.head{display:flex;align-items:center;gap:14px;margin-bottom:34px}
.logo{width:52px;height:52px;border-radius:14px;background:linear-gradient(135deg,var(--green-800),var(--green-900));display:grid;place-items:center;position:relative;overflow:hidden;box-shadow:0 8px 20px -8px rgba(27,94,32,.5)}
.logo::before{content:"";position:absolute;inset:0;opacity:.22;background:repeating-linear-gradient(180deg,rgba(180,255,180,.7) 0 1px,transparent 1px 3px)}
.logo span{font-family:'Cormorant Garamond',serif;color:#E6F4E6;font-weight:700;font-size:24px;position:relative;letter-spacing:1px}
.logo sup{font-size:12px;font-weight:600;top:-6px;position:relative}
.logo-img{width:52px;height:52px;border-radius:14px;object-fit:contain;background:#fff;border:1px solid var(--line);padding:5px;box-shadow:0 8px 20px -8px rgba(27,94,32,.25);flex:none}
.head .t1{font-size:11px;color:var(--muted);letter-spacing:.08em;text-transform:uppercase;font-weight:600}
.head .t2{font-family:'Cormorant Garamond',serif;font-size:24px;color:var(--green-800);font-weight:700;line-height:1.1}
.hero{margin-bottom:34px}
.kicker{font-size:10.5px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--green-800);margin-bottom:12px}
.hero h1{font-family:'Cormorant Garamond',serif;font-weight:600;font-size:36px;line-height:1.12;color:var(--ink);max-width:660px}
.hero h1 em{font-style:italic;color:var(--green-800)}
.hero p{margin-top:12px;font-size:14.5px;color:var(--ink-2);max-width:620px;line-height:1.55}
.group-label{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin:0 0 12px;padding-bottom:8px;border-bottom:1px solid var(--line)}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:30px}
.card{display:flex;align-items:center;gap:14px;cursor:pointer;border:1px solid var(--line);border-radius:14px;padding:16px;background:#fff;transition:.15s}
.card:hover{border-color:var(--green-500);transform:translateY(-2px);box-shadow:0 14px 28px -18px rgba(0,0,0,.2)}
.card .ico{width:46px;height:46px;border-radius:12px;background:linear-gradient(135deg,var(--green-800),var(--green-900));display:grid;place-items:center;color:#E6F4E6;font-family:'Cormorant Garamond',serif;font-weight:700;font-size:20px;flex:none;position:relative;overflow:hidden}
.card .ico::before{content:"";position:absolute;inset:0;opacity:.18;background:repeating-linear-gradient(180deg,rgba(180,255,180,.7) 0 1px,transparent 1px 3px)}
.card .ico.alt{background:linear-gradient(135deg,#5C4A8C,#3C3160)}
.card .b{flex:1;min-width:0}
.card h3{font-family:'Cormorant Garamond',serif;font-size:19px;font-weight:600;color:var(--ink);line-height:1.15;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.card .who{font-size:11px;color:var(--green-800);font-weight:600;text-transform:uppercase;letter-spacing:.04em;margin-top:1px}
.card p{font-size:12px;color:var(--ink-2);line-height:1.45;margin-top:5px}
.card .tag{font-size:9px;font-weight:700;padding:2px 6px;border-radius:5px;letter-spacing:.04em;text-transform:uppercase;background:var(--warn-bg);color:var(--warn)}
.card .arrow{color:var(--muted);flex:none}
.card:hover .arrow{color:var(--green-800)}
.full{grid-column:1 / -1}
.foot{margin-top:30px;padding-top:16px;border-top:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;font-size:11px;color:var(--muted);flex-wrap:wrap;gap:8px}
.foot .mini{font-family:'Cormorant Garamond',serif;font-style:italic;color:var(--green-800);font-size:13px}
@media(max-width:680px){.grid{grid-template-columns:1fr}.hero h1{font-size:30px}}
/* viewer */
#viewer{position:fixed;inset:0;background:var(--bg);display:none;flex-direction:column;z-index:100}
#viewer.show{display:flex}
.vbar{display:flex;align-items:center;gap:12px;padding:10px 14px;border-bottom:1px solid var(--line);background:#fff}
.vbar button{display:inline-flex;align-items:center;gap:6px;background:var(--green-800);color:#fff;border:0;border-radius:9px;padding:8px 13px;font:600 12.5px 'Inter',sans-serif;cursor:pointer}
.vbar button:hover{background:var(--green-900)}
.vbar .vt{font-family:'Cormorant Garamond',serif;font-size:16px;font-weight:600;color:var(--ink)}
#vframe{flex:1;border:0;width:100%;background:#fff}
@media print{#viewer{position:static;display:block}.vbar{display:none}}
</style>
</head>
<body>
<div id="home">
  <div class="head">
    <img class="logo-img" src="__FAVICON__" alt="D²nAI">
    <div><div class="t1">OCP Nutricrops · Data, Digital &amp; AI</div><div class="t2">D²nAI — State of the art as of May 2026</div></div>
  </div>
  <div class="hero">
    <div class="kicker">One file · all our work</div>
    <h1>The Digital &amp; Data vision, and the <em>co-pilots</em> that bring it to life.</h1>
    <p>Start with the executive summary, dive into the target architecture, or open any executive co-pilot prototype. Everything runs inside this single file.</p>
  </div>

  <div class="group-label">Strategy</div>
  <div class="grid">
    <div class="card full" onclick="loadDoc('exec-summary')">
      <div class="ico">★</div>
      <div class="b"><h3>Executive Summary</h3><div class="who">For the CEO · vision, roadmap, decisions</div><p>3-pillar vision, roadmap, EA Study, products to scale, the 2 short-term decisions to validate.</p></div>
      <svg class="arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
    </div>
  </div>

  <div class="group-label">Executive co-pilots · prototypes</div>
  <div class="grid">
    <div class="card" onclick="loadDoc('nutriceo')"><div class="ico">N</div><div class="b"><h3>NutriCEO <span class="tag">Proto</span></h3><div class="who">CEO</div><p>OPEX, plant roadmap, BU sales, weekly risks.</p></div><svg class="arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></div>
    <div class="card" onclick="loadDoc('sentinel')"><div class="ico">S</div><div class="b"><h3>Sentinel <span class="tag">Proto</span></h3><div class="who">Performance &amp; Risk</div><p>Top risks, BU performance, controls, incidents, reports.</p></div><svg class="arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></div>
    <div class="card" onclick="loadDoc('helios')"><div class="ico">H</div><div class="b"><h3>Helios <span class="tag">Proto</span></h3><div class="who">HR</div><p>Turnover, hires, social climate, payroll, pipeline.</p></div><svg class="arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></div>
    <div class="card" onclick="loadDoc('maestro')"><div class="ico">M</div><div class="b"><h3>Maestro <span class="tag">Proto</span></h3><div class="who">Executive Assistant</div><p>Meeting co-pilot, inbox triage, stakeholder memory, briefs.</p></div><svg class="arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></div>
    <div class="card full" onclick="loadDoc('custobot')"><div class="ico">✦</div><div class="b"><h3>CustoBot <span class="tag">Proto</span></h3><div class="who">Customization BU · Marketing</div><p>Multimodal repo (docs, minutes, audio, market data) → analysis, decks, briefs, video scripts.</p></div><svg class="arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></div>
    <div class="card full" onclick="loadDoc('radar')"><div class="ico">◎</div><div class="b"><h3>Radar Intrants <span class="tag">Proto</span></h3><div class="who">Procurement · Raw materials</div><p>AI event-radar on raw-material prices (sulfur…): editable watchlist + sourced directional buy/price signal, wired to your OpenWebUI.</p></div><svg class="arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></div>
    <div class="card full" onclick="loadDoc('cgm')"><div class="ico">∑</div><div class="b"><h3>CGM Simulator <span class="tag">Proto</span></h3><div class="who">Sales · Commercial margin</div><p>Fertilizer pricing-scenario simulator (fixed / floor / nutrient-based): RM cost, DAP/TSP-equivalent margin, MCV/t P₂O₅, sensitivity &amp; history. Engine faithfully reproduced from the Excel.</p></div><svg class="arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></div>
  </div>

  <div class="foot"><div>D²nAI · OCP Nutricrops · demo prototypes — fictional data</div><div class="mini">Feed the data to feed the decision.</div></div>
</div>

<div id="viewer">
  <div class="vbar">
    <button onclick="goHome()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg> Hub</button>
    <span class="vt" id="vtitle"></span>
  </div>
  <iframe id="vframe" title="document"></iframe>
</div>

<script>
const DOCS = {
__DOCS__
};
const TITLES = __TITLES__;
const vframe=document.getElementById('vframe');
function loadDoc(name){
  if(!DOCS[name])return;
  vframe.srcdoc=DOCS[name];
  document.getElementById('vtitle').textContent=TITLES[name]||'';
  document.getElementById('home').style.display='none';
  document.getElementById('viewer').classList.add('show');
  window.scrollTo(0,0);
}
function goHome(){
  document.getElementById('viewer').classList.remove('show');
  document.getElementById('home').style.display='block';
  vframe.srcdoc='';
}
window.addEventListener('message',function(e){if(e.data&&e.data.pkgnav){loadDoc(e.data.pkgnav);}});
</script>
</body>
</html>
"""

out = (HUB
       .replace("__FAVICON__", favicon)
       .replace("__DOCS__", docs_js)
       .replace("__TITLES__", titles_js))
OUT.write_text(out, encoding="utf-8")
print(f"Built {OUT.name} · {len(out)//1024} KB")
