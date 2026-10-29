from pathlib import Path
import re,subprocess,json,hashlib
r=Path(__file__).resolve().parents[1]
h=(r/'index.html').read_text()
ids=re.findall(r'\bid="([^"]+)"',h)
assert len(ids)==len(set(ids)),'Duplicate form IDs'
for url in re.findall(r'(?:src|href)="([^"]+)"',h):
 if not re.match(r'(https?:|#|data:|/)',url):assert (r/url).is_file(),url
for p in (r/'optimizer').glob('*.js'):subprocess.run(['node','--check',str(p)],check=True,capture_output=True)
subprocess.run(['node','--check',str(r/'sw.js')],check=True,capture_output=True)
sw=(r/'sw.js').read_text();assets=json.loads(re.search(r'const SHELL=(\[.*?\]);',sw)[1])
for url in assets:assert (r/url).exists(),url
for url in ['optimizer/worker.js','optimizer/engine.js','optimizer/optimizer.js','optimizer/storage.js','optimizer/ui.js']:
 assert url in assets,'Missing offline shell asset '+url
# Only self-hosted runtime assets; no analytics or network API dependencies.
assert not re.search(r'<script[^>]+src="https?://',h)
assert not re.search(r'fetch\(\s*[\'\"]https?://',(r/'optimizer/ui.js').read_text())
print('PASS static: unique IDs, JS syntax, runtime links, offline shell and local-only runtime.')
