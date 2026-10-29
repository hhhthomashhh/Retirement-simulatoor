"""Decode the real production entrypoint, preserving the exact v4.0.3 reference."""
from pathlib import Path
import re,gzip,base64,hashlib
root=Path(__file__).resolve().parents[1]
loader=(root/'index.html').read_text()
if 'p403-00a.txt' in loader:
 names=re.findall(r"'([^']+\.txt)'",loader)
 data=gzip.decompress(base64.b64decode(''.join((root/n).read_text() for n in names)))
 (root/'reference').mkdir(exist_ok=True)
 (root/'reference/v4.0.3.html').write_bytes(data)
 print(hashlib.sha256(data).hexdigest())
