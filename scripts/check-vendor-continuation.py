"""Regression checks for the sourced continuation batch and preserved quotation IDs."""
import json,re,subprocess,tempfile,shutil,hashlib
from pathlib import Path
R=Path(__file__).resolve().parents[1];O=R/'research/vendor-catalogs/continuation-2026-11-04';V=json.loads((R/'components/vendor-catalog-data.json').read_text());D=json.loads((R/'components/supplier-directory-data.json').read_text());review=json.loads((O/'reviewed.json').read_text());baseline=set(json.loads((O/'baseline-reference-ids.json').read_text()));ids=[p['id'] for v in V for p in v['products']];assert baseline<=set(ids);assert len(ids)==len(set(ids));assert len(ids)-len(baseline)>=700
by={v['supplierId']:v for v in V};assert all(by[i]['website'] for row in review['reviewed'] for i in row['supplierIds'])
assert len(by['outlet-7f0ec69918b8']['products'])>=40;assert len(by['outlet-437fdc034144']['products'])>=14
assert by['outlet-1ac52b7838df']['products']==[], 'Do not map the unconfirmed Alejandro Petion FEVESA branch'
assert by['outlet-7827ba1e0933']['website']=='', 'Do not map the unconfirmed second STAVIN location'
assert '813' in by['outlet-693f67d30b76']['identityNote'] and '801' in by['outlet-693f67d30b76']['identityNote']
for v in V:
 for p in v['products']:
  if p['id'] not in baseline:
   assert not re.search(r'archive product|chatgpt image|^000|quick view|\.\.\.$',p['name'],re.I),p['name']
   if p['image']:assert p.get('imageVerifiedAt') and p.get('imageSourceUrl')
for p in by['research-7637e05b3d63']['products']:
 assert not re.search('chatgpt|^000',p['name'],re.I)
 assert not re.search('chatgpt',p.get('image',''),re.I)
assert len(by['research-ee50fa8ea78b']['products'])>=100
assert sum(bool(p.get('imageVerifiedAt')) for p in by['research-d82bae0ad94b']['products'])>=50
# Run the mutation in an isolated copy. Applying the batch twice must preserve data exactly.
with tempfile.TemporaryDirectory(prefix='oc-vendor-continue-') as td:
 t=Path(td);(t/'components').mkdir();(t/'scripts').mkdir();(t/'research/vendor-catalogs').mkdir(parents=True)
 for name in ['vendor-catalog-data.json','supplier-directory-data.json']:shutil.copy2(R/'components'/name,t/'components'/name)
 shutil.copy2(R/'scripts/apply-vendor-continuation.py',t/'scripts')
 for name in ['image-verification.json','coverage.json']:shutil.copy2(R/'research/vendor-catalogs'/name,t/'research/vendor-catalogs'/name)
 shutil.copytree(O,t/'research/vendor-catalogs/continuation-2026-11-04')
 for _ in range(2):subprocess.run(['python3',str(t/'scripts/apply-vendor-continuation.py')],check=True,capture_output=True)
 assert (t/'components/vendor-catalog-data.json').read_bytes()==(R/'components/vendor-catalog-data.json').read_bytes(), 'Repeated import changed published references'
print(f'PASS {len(baseline)} original quotation references preserved; {len(ids)-len(baseline)} additional references; source-backed branch mappings; full models; generated images excluded; idempotent additive import.')
