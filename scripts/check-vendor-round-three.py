"""Validate new suppliers, primary-source media and saved quotation ID preservation."""
import json,re,tempfile,shutil,subprocess
from pathlib import Path
R=Path(__file__).resolve().parents[1];O=R/'research/vendor-catalogs/round-3-2026-11-04';V=json.loads((R/'components/vendor-catalog-data.json').read_text());D=json.loads((R/'components/supplier-directory-data.json').read_text());review=json.loads((O/'reviewed.json').read_text());baseline=set(json.loads((O/'baseline-reference-ids.json').read_text()));by={v['supplierId']:v for v in V};refs=[p for v in V for p in v['products']];ids={p['id'] for p in refs};assert baseline<=ids;assert len(ids)==len(refs);assert len(ids)-len(baseline)>=2000
assert len(V)==len(D)==1197
for row in review['reviewed']:
 assert row['identityEvidence'] and row['identitySource'].startswith('https://')
 for ident in row['supplierIds']:
  assert by[ident]['website']==row['website'];assert by[ident]['identitySource']==row['identitySource']
 for p in row['products']:
  assert p['sourceUrl'].startswith('https://');assert p['kind'] in ['product','family'];assert not re.search(r'^Elige las opciones|^Quick View|^Logo$|^Mi Marca$|^Locales$|chatgpt|archive product',p['name'],re.I)
  assert not {'price','stock','unitPrice','registered'}&set(p)
  if p['image']:assert p['image'].startswith('https://') and p.get('imageVerifiedAt') and p.get('imageSourceUrl')
# Manufacturer data explicitly identifies all group companies and these shared outlets.
assert all('Servisteel' in by[i]['identityNote'] for i in ['outlet-6415eb6d14a0','outlet-6f271b87d1f9'])
assert len(by['outlet-5a142bd856fa']['products'])>=50
assert len(by['outlet-24c30993821a']['products'])>=50
assert len(by['outlet-b8efb67dc0fd']['catalogs'])>=10
# Similar names and old addresses are not enough to assign a catalogue.
for ident in ['outlet-27ab11321d1d','outlet-b072308ba2b6','outlet-b4accb1ac5ec','outlet-e7a86a9b5383','outlet-5daa87848042','outlet-636dd9ceaf29','outlet-86066607012b','outlet-eb1ae45bbd53']:
 assert not by[ident]['products'],ident
assert all(not p['image'].startswith('blob:') for p in refs)
assert all(c['valid'] for c in review['documentChecks'] if any(c['url']==d['url'] for r in review['reviewed'] for d in r['catalogs']))
with tempfile.TemporaryDirectory(prefix='oc-round3-check-') as td:
 t=Path(td);shutil.copytree(R/'scripts',t/'scripts');shutil.copytree(R/'research',t/'research');(t/'components').mkdir()
 for name in ['vendor-catalog-data.json','supplier-directory-data.json']:shutil.copy2(R/'components'/name,t/'components'/name)
 for _ in range(2):
  result=subprocess.run(['python3',str(t/'scripts/apply-vendor-round-three.py')],cwd=t,capture_output=True,text=True);assert result.returncode==0,result.stderr
 assert (t/'components/vendor-catalog-data.json').read_bytes()==(R/'components/vendor-catalog-data.json').read_bytes(),'Repeated import changed catalog'
 result=subprocess.run(['python3',str(t/'scripts/build-vendor-catalogs.py')],cwd=t,capture_output=True,text=True);assert result.returncode==0,result.stderr
 rebuilt=json.loads((t/'components/vendor-catalog-data.json').read_text());rebuiltIds={p['id'] for v in rebuilt for p in v['products']};assert ids==rebuiltIds,{'missing':list(ids-rebuiltIds)[:8],'extra':list(rebuiltIds-ids)[:8]}
print(f'PASS {len(baseline)} saved quotation references retained; {len(ids)-len(baseline)} additional references; reviewed group and branch identities; source-linked photos; PDFs; no invented stock/prices; repeated import and full rebuild preserve all {len(ids)} IDs.')
