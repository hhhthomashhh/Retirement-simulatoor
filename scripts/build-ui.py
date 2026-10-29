from pathlib import Path
import re,json
root=Path(__file__).resolve().parents[1]
h=(root/'index.html').read_text()
assert 'id="optimizerDashboard"' not in h,'Run prepare-modules.py first'
quick='''<section id="optimizerDashboard" class="optimizer-shell" aria-labelledby="optimizerHeading">
<div class="optimizer-intro"><div><span class="eyebrow">Retirement Simulator 4.1 · Development preview</span><h2 id="optimizerHeading">Your retirement, with a plan.</h2><p>Find a retirement age, a spending budget and a withdrawal plan that work together.</p></div><span class="local-badge">Private · Runs on your device</span></div>
<div class="optimizer-form"><h3>Start with your household</h3><div class="quick-grid">
<label>Household<select data-mirror="household"><option value="couple">Couple</option><option value="single">Single</option></select></label>
<label>Your age<input data-mirror="aAge" type="number" inputmode="numeric" min="18" max="100"></label>
<label>Partner's age<input data-mirror="bAge" type="number" inputmode="numeric" min="18" max="100"></label>
<label>Annual after-tax spending · today $<input data-mirror="spend" type="number" inputmode="decimal" min="1" step="1000"></label>
<label>Plan through your age<input data-mirror="planAge" type="number" inputmode="numeric" max="110"></label></div>
<details class="quick-accounts"><summary>Account balances and cost bases</summary><p>Enter investable assets. Your home and future practice-sale proceeds are not included automatically.</p><div id="quickAccounts" class="quick-grid"></div></details>
<div class="quick-actions"><button type="button" data-action="loadDeviceBtn">Load saved plan</button><button type="button" data-action="saveDeviceBtn">Save plan</button><button type="button" data-action="exportPlanBtn">Export plan</button><button type="button" id="openAssumptions">Review savings, CPP/OAS and expenses ↓</button></div>
<details id="optimizerSettings"><summary>Planning preferences and assumptions</summary><div class="quick-grid">
<label>Target full-spending success<select id="optTarget"><option value="0.85">85%</option><option value="0.90" selected>90%</option><option value="0.95">95%</option></select></label>
<label>Earliest age to test<input id="optMinAge" type="number" inputmode="numeric" value="53"></label>
<label>Latest age to test<input id="optMaxAge" type="number" inputmode="numeric" value="70"></label>
<label>Validation paths<select id="optPaths"><option value="256">256 · faster</option><option value="512" selected>512 · standard</option><option value="2000">2,000 · detailed</option></select></label>
<label>Random seed<input id="optSeed" type="number" inputmode="numeric" value="20260810"></label>
<label>Calculation basis<select id="optBasis"><option value="4.1">Updated 2026 BC rules</option><option value="v4.0.3">Original v4.0.3 compatibility</option></select></label>
<label>Investment-return model<select id="optReturns"><option value="lognormal">Geometric returns as entered</option><option value="legacy">Original normal / fat-tail model</option></select></label>
<label>Corporate tax model<select id="optCorpModel"><option value="split-pools">Separate RDTOH / GRIP pools</option><option value="pooled">Original combined RDTOH</option></select></label>
<label>Eligible portion of total RDTOH $<input id="optEligibleRDTOH" type="number" inputmode="decimal" value="0" min="0"></label>
<label>Opening GRIP $<input id="optGRIP" type="number" inputmode="decimal" value="0" min="0"></label>
<label class="check"><input id="optTogether" type="checkbox">Move both retirement dates together</label>
<label class="check"><input id="optLinkCorp" type="checkbox" checked>Move corporate saving stop with your retirement</label>
</div><p>Annual contributions are assumed to come from work income until each person's retirement. Salary and work expenses are not modeled. Partner's retirement stays as entered unless you select “move both.” CPP amounts remain your estimates; retiring earlier can affect actual entitlement.</p><p>Success means the full spending target and enabled irregular expenses are funded without cuts. Guardrails are disabled during optimization. Inputs for contingency expenses remain in the existing expense editor.</p><p>The new return model uses your geometric assumptions directly, with correlated lognormal shocks. The original model retains its 0.5% equity uplift, normal/fat tails and return limits. Original compatibility restores the v4.0.3 calculation basis and return model.</p></details>
<div class="optimizer-run"><button id="optimizeBtn" class="primary" type="button">Find my retirement plan</button><button id="cancelOptimizer" hidden type="button">Cancel</button><span id="optimizerStatus" role="status" aria-live="polite">Review the inputs, then find your plan.</span></div>
<p id="optimizerError" class="optimizer-error" role="alert" hidden></p>
</div>
<div id="optimizerResults" hidden></div>
</section>
'''
h=h.replace('<main>','<main>\n'+quick,1)
h=h.replace('<div class="grid">','<details id="detailedSimulator" class="detailed-simulator"><summary>Detailed simulator · assumptions, expenses, scenarios and charts</summary><div class="grid">',1)
h=h.replace('<div class="footer">','</details>\n<div class="footer">',1)
h=h.replace('BC Retirement Decision Simulator v4.0 • Model date: August 2026','BC Retirement Optimizer v4.1.0-dev • Rules reviewed: October 29, 2026')
h=h.replace('<script src="optimizer/ui.js">','<script src="optimizer/optimizer.js"></script><script src="optimizer/storage.js"></script><script src="optimizer/ui.js">')
h=h.replace('</body>','<script>if(location.protocol!=="file:"&&"serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js");</script></body>')
h=h.replace("The engine converts geometric assumptions to arithmetic means for Monte Carlo. For equities it also adds back FP Canada's 0.50% safety margin before the conversion.","Select the return model in Planning preferences. Geometric mode uses these assumptions directly. Original mode converts to arithmetic means and adds back the 0.50% equity safety margin.")
h=h.replace('It does not model every T2 pool or GRIP/ERDTOH distinction.','The updated model tracks separate eligible/non-eligible RDTOH and GRIP when enabled. It remains a simplified investment-only CCPC model, not a T2 return.')
h=h.replace('It <strong>does not</strong> reproduce all CCPC tax pools or the exact treatment of every security.','The optional separate-pool model adds eligible/non-eligible RDTOH and GRIP; connected-company dividends, capital-loss carryforwards and TOSI are not modeled.')
h=h.replace('holds at 2026','holds at 2026')
(root/'index.html').write_text(h)
p=root/'optimizer/legacy-ui.js';s=p.read_text()
s=re.sub(r'function v40ReadStore\(\)\{[^\n]*', 'function v40ReadStore(){return OptimizerStorage.read();}',s)
s=re.sub(r'function v40WriteStore\(d\)\{[^\n]*','function v40WriteStore(d){OptimizerStorage.write(d);}',s)
p.write_text(s)
m=json.loads((root/'manifest.json').read_text());m['name']='Retirement Optimizer 4.1 Development';(root/'manifest.json').write_text(json.dumps(m,indent=2)+'\n')
files=['./','./index.html','./manifest.json','./icons/icon-192.png','./icons/icon-512.png']+[str(x.relative_to(root)) for x in sorted((root/'optimizer').glob('*')) if x.suffix in ('.css','.js') and '.inc.' not in x.name]
sw="""const VERSION='retirement-4.1.0-dev-1';
const CACHE=VERSION+'-'+self.registration.scope;
const SHELL=%s;
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL))));
self.addEventListener('message',e=>{if(e.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('retirement-')&&k.endsWith(self.registration.scope)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin||!u.href.startsWith(self.registration.scope))return;e.respondWith((async()=>{const c=await caches.open(CACHE);try{const r=await fetch(e.request);if(r.ok)await c.put(e.request,r.clone());return r;}catch(error){return (await c.match(e.request))||Response.error();}})());});
"""%json.dumps(files)
(root/'sw.js').write_text(sw)
