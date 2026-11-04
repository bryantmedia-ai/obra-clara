"""Apply a sourced supplier batch additively; saved quote reference IDs remain valid."""
import json,hashlib,re,unicodedata
from pathlib import Path
R=Path(__file__).resolve().parents[1];O=R/'research/vendor-catalogs/round-3-2026-11-04';review=json.loads((O/'reviewed.json').read_text());vf=R/'components/vendor-catalog-data.json';df=R/'components/supplier-directory-data.json';V=json.loads(vf.read_text());D=json.loads(df.read_text());by={v['supplierId']:v for v in V};db={d['id']:d for d in D};checks=json.loads((R/'research/vendor-catalogs/image-verification.json').read_text())
idfile=O/'reference-id-bindings.json';bindings=json.loads(idfile.read_text()) if idfile.exists() else {}
def fingerprint(ident,p):return hashlib.sha256((ident+'|'+p['name']+'|'+p['sourceUrl']).encode()).hexdigest()
def norm(s):return re.sub('[^a-z0-9]+',' ',unicodedata.normalize('NFD',s).encode('ascii','ignore').decode().lower()).strip()
known={t for d in D for t in d['tags']}
for source in review['reviewed']:
 for ident in source['supplierIds']:
  row=by[ident];row.update(website=source['website'],identityNote=source['identityNote'],identitySource=source['identitySource'],checkedAt=source['checkedAt']);row['pages']=list(dict.fromkeys([*row['pages'],*source['pages']]))
  existing={norm(p['name']):p for p in row['products']}
  for p in source['products']:
   if p.get('image'):assert checks.get(p['image'],{}).get('valid'),p['image']
   old=existing.get(norm(p['name']))
   if not old and fingerprint(ident,p) in bindings:old=next((q for q in row['products'] if q['id']==bindings[fingerprint(ident,p)]),None)
   if old:
    if p.get('image'):old.update({k:p[k] for k in ['image','imageSourceUrl','imageVerifiedAt']})
    continue
   product={'id':bindings.get(fingerprint(ident,p),'ref-'+fingerprint(ident,p)[:16]),**p};row['products'].append(product);existing[norm(p['name'])]=product
  docs={d['url']:d for d in row['catalogs']}
  for d in source['catalogs']:docs[d['url']]=d
  row['catalogs']=list(docs.values());row['status']='catalog-found' if row['products'] or row['catalogs'] else 'website-found'
  directory=db[ident];directory['website']=row['website'];directory['reviewedAt']=source['checkedAt'];tags=[t for t in source.get('tags',[]) if t in known]
  if tags:directory['tags']=tags;directory['sector']='; '.join(tags)
for correction in review.get('displayCorrections',[]):
 row=by[correction['supplierId']];p=next(p for p in row['products'] if p['id']==correction['referenceId']);assert p['sourceUrl']==correction['sourceUrl'];p['name']=correction['name'];p['kind']=correction['kind']
vf.write_text(json.dumps(V,ensure_ascii=False,separators=(',',':')));df.write_text(json.dumps(D,ensure_ascii=False,separators=(',',':')))
summary={'reviewedAt':'2026-11-04','directoryRecords':len(V),'websitesIdentified':sum(bool(v['website']) for v in V),'profilesWithFeaturedProducts':sum(bool(v['products']) for v in V),'featuredReferences':sum(len(v['products']) for v in V),'profilesWithVerifiedPhotos':sum(any(p.get('image') and p.get('imageVerifiedAt') for p in v['products']) for v in V),'referencesWithVerifiedPhotos':sum(bool(p.get('image') and p.get('imageVerifiedAt')) for v in V for p in v['products']),'withDocuments':sum(bool(v['catalogs']) for v in V),'recordsWithoutIdentifiedWebsite':sum(not v['website'] for v in V),'scope':'Public primary-source catalogs and images. Directory records include branches and online channels, not unique legal suppliers. Explicit reviewed branch mappings; discrepancies remain visible. General company catalogs do not imply branch stock. Unresolved records receive no invented products.'}
(R/'research/vendor-catalogs/coverage.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2));print(json.dumps(summary))
