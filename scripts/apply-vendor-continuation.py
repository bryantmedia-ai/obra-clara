"""Add reviewed catalogs and photos without changing IDs used by saved RFQs."""
import json,hashlib,re,unicodedata
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];O=ROOT/'research/vendor-catalogs/continuation-2026-11-04';review=json.loads((O/'reviewed.json').read_text());base=ROOT/'components/vendor-catalog-data.json';rows=json.loads(base.read_text());by={v['supplierId']:v for v in rows};directoryfile=ROOT/'components/supplier-directory-data.json';directory=json.loads(directoryfile.read_text());db={d['id']:d for d in directory};checks=json.loads((ROOT/'research/vendor-catalogs/image-verification.json').read_text())
idfile=O/'reference-id-bindings.json';bindings=json.loads(idfile.read_text()) if idfile.exists() else {}
def fingerprint(ident,p):return hashlib.sha256((ident+'|'+p['name']+'|'+p['sourceUrl']).encode()).hexdigest()
def norm(s):return re.sub('[^a-z0-9]+',' ',unicodedata.normalize('NFD',s).encode('ascii','ignore').decode().lower()).strip()
for source in review['reviewed']:
 for ident in source['supplierIds']:
  row=by[ident];row.update(website=source['website'],identityNote=source['identityNote'],identitySource=source['identitySource'],checkedAt=source['checkedAt']);row['pages']=list(dict.fromkeys([*row['pages'],*source['pages']]))
  existing={norm(p['name']):p for p in row['products']}
  for p in source['products']:
   if p.get('image'):assert checks[p['image']]['valid']
   prior=existing.get(norm(p['name']))
   if not prior:
    reference_id=bindings.get(fingerprint(ident,p),'ref-'+fingerprint(ident,p)[:16])
    prior=next((q for q in row['products'] if q['id']==reference_id),None)
   if prior:
    if p.get('image'):prior.update({k:p[k] for k in ['image','imageSourceUrl','imageVerifiedAt']})
    continue
   product={'id':bindings.get(fingerprint(ident,p),'ref-'+fingerprint(ident,p)[:16]),**p};row['products'].append(product);existing[norm(p['name'])]=product
  docs={c['url']:c for c in row['catalogs']}
  for c in source['catalogs']:docs[c['url']]=c
  row['catalogs']=list(docs.values());row['status']='catalog-found' if row['products'] or row['catalogs'] else 'website-found'
  d=db[ident];d['website']=row['website'];d['reviewedAt']='2026-11-04'
for update in review['photoUpdates']:
 row=by[update['supplierId']];p=next(p for p in row['products'] if p['id']==update['referenceId']);p.update({k:update[k] for k in ['image','imageSourceUrl','imageVerifiedAt']})
# These exact locations have a source-backed specialty; keep unrelated branches untouched.
for correction in review.get('referenceCorrections',[]):
 row=by[correction['supplierId']];p=next(p for p in row['products'] if p['id']==correction['referenceId']);p['name']=correction['name']
 if correction.get('clearGeneratedImage'):
  p['image']='';p.pop('imageVerifiedAt',None);p.pop('imageSourceUrl',None)
specialties={'imepho':['Sanitarios y plomería','Pisos y revestimientos','Corralón y obra gruesa'],'sanige':['Sanitarios y plomería','Bombas y motores','Climatización'],'altea':['Pisos y revestimientos','Sanitarios y plomería'],'cobertizo':['Ferretería y herramientas'],'cycla':['Pisos y revestimientos','Sanitarios y plomería','Construcción en seco'],'rural':['Construcción en seco','Maderas'],'fevesa':['Electricidad','Cables y conductores','Iluminación'],'jlf':['Electricidad','Cables y conductores'],'yrigoyen':['Construcción en seco','Climatización'],'bercomat':['Corralón y obra gruesa','Pisos y revestimientos','Sanitarios y plomería']}
# Use only category labels already established by the directory.
known={t for d in directory for t in d['tags']}
for source in review['reviewed']:
 if source['key'] in specialties:
  tags=[t for t in specialties[source['key']] if t in known]
  for ident in source['supplierIds']:
   if tags:db[ident]['tags']=tags;db[ident]['sector']='; '.join(tags)
for row in rows:
 for p in row['products']:bindings[fingerprint(row['supplierId'],p)]=p['id']
idfile.write_text(json.dumps(bindings,ensure_ascii=False,indent=2))
base.write_text(json.dumps(rows,ensure_ascii=False,separators=(',',':')));directoryfile.write_text(json.dumps(directory,ensure_ascii=False,separators=(',',':')))
summary={'reviewedAt':'2026-11-04','directoryRecords':len(rows),'websitesIdentified':sum(bool(v['website']) for v in rows),'profilesWithFeaturedProducts':sum(bool(v['products']) for v in rows),'featuredReferences':sum(len(v['products']) for v in rows),'profilesWithVerifiedPhotos':sum(any(p.get('image') and p.get('imageVerifiedAt') for p in v['products']) for v in rows),'referencesWithVerifiedPhotos':sum(bool(p.get('image') and p.get('imageVerifiedAt')) for v in rows for p in v['products']),'withDocuments':sum(bool(v['catalogs']) for v in rows),'recordsWithoutIdentifiedWebsite':sum(not v['website'] for v in rows),'scope':'Public primary-source catalogs and images. Directory records include branches and online channels, not unique legal suppliers. Explicit reviewed branch mappings; discrepancies remain visible. General company catalogs do not imply branch stock. Unresolved records receive no invented products.'}
(ROOT/'research/vendor-catalogs/coverage.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2));print(json.dumps(summary))
