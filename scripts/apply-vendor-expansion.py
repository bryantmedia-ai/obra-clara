"""Apply reviewed, sourced catalogs without replacing existing RFQ reference IDs."""
import json,hashlib,unicodedata,re
from pathlib import Path
root=Path(__file__).resolve().parents[1];base=root/'components/vendor-catalog-data.json';rows=json.loads(base.read_text());byid={v['supplierId']:v for v in rows};approved=json.loads((root/'research/vendor-catalogs/expansion-reviewed.json').read_text());checks=json.loads((root/'research/vendor-catalogs/image-verification.json').read_text())
def norm(n):return re.sub(r'[^a-z0-9]+',' ',unicodedata.normalize('NFD',n).encode('ascii','ignore').decode().lower()).strip()
for row in rows:
 for p in row['products']:
  if p['image'] and checks.get(p['image'],{}).get('valid'):
   p['imageVerifiedAt']='2026-11-04';p.setdefault('imageSourceUrl',p['sourceUrl'])
  elif p['image']:p['image']=''
for source in approved:
 for ident in source['supplierIds']:
  row=byid[ident];row['website']=source['website'];row['identityNote']=source['identityNote'];row['identitySource']=source['identitySource'];row['checkedAt']=source['checkedAt']
  existing={norm(p['name']):p for p in row['products']}
  for p in source['products']:
   if norm(p['name']) in existing:
    prior=existing[norm(p['name'])]
    if p['image']:prior.update(image=p['image'],imageVerifiedAt=p['imageVerifiedAt'],imageSourceUrl=p.get('imageSourceUrl',p['sourceUrl']))
    continue
   product={'id':'ref-'+hashlib.sha256((ident+'|'+p['name']+'|'+p['sourceUrl']).encode()).hexdigest()[:16],**p};row['products'].append(product);existing[norm(p['name'])]=product
  docs={c['url']:c for c in row['catalogs']}
  for c in source['catalogs']:
   if c['url'].startswith('https://') and re.search(r'catalog|ficha|manual|producto|folleto',c['name']+' '+c['url'],re.I):docs[c['url']]=c
  row['catalogs']=list(docs.values())[:10];row['status']='catalog-found' if row['products'] or row['catalogs'] else row['status']
base.write_text(json.dumps(rows,ensure_ascii=False,separators=(',',':')))
directoryfile=root/'components/supplier-directory-data.json';directory=json.loads(directoryfile.read_text())
for d in directory:
 v=byid[d['id']]
 if v['website'].startswith('https://'):d['website']=v['website']
# Classifications here are supported by the researched catalog, not just by the name.
specialties={
 'MAFFERETTI':['Ferretería y herramientas','Bombas y motores','Energía y grupos electrógenos'],
 'CENTRO HIERRO':['Hierros y aceros','Ferretería y herramientas','Construcción en seco'],
 'CASA BLANCO':['Electricidad','Iluminación','Cables y conductores'],
 'MAS FERRETERIAS SA':['Ferretería y herramientas','Pinturas','Corralón y obra gruesa'],
 'CASA CALIENDO':['Pisos y revestimientos','Sanitarios y plomería','Corralón y obra gruesa'],
 'VENTA MAT':['Pisos y revestimientos','Sanitarios y plomería','Corralón y obra gruesa'],
 'IMPERIO DEL CERAMICO':['Pisos y revestimientos','Sanitarios y plomería'],
 'DI STABILE':['Pisos y revestimientos','Sanitarios y plomería','Corralón y obra gruesa'],
 'TUBO CENTER SA':['Hierros y aceros','Ferretería y herramientas'],
 'ACON MATERIALES':['Corralón y obra gruesa','Pisos y revestimientos','Sanitarios y plomería'],
 'MOSAICOS LENZI':['Pisos y revestimientos','Sanitarios y plomería'],
 'FERRETERIA CASA MEÑICA':['Ferretería y herramientas'],
 'RICARDO OSPITAL':['Pisos y revestimientos','Sanitarios y plomería'],
 'AITER':['Construcción en seco','Maderas'],
 'Interelec':['Electricidad','Iluminación'],
 'Conductres':['Cables y conductores','Electricidad','Iluminación']}
approved_ids={ident for a in approved for ident in a['supplierIds']}
for d in directory:
 if d['id'] in approved_ids and d['name'] in specialties:
  d['tags']=specialties[d['name']];d['sector']='; '.join(d['tags'])
  if 'Catálogo contrastado' not in d['notes']:d['notes']+=' Catálogo contrastado con el sitio oficial el 4 de noviembre de 2026; precios, stock y entrega requieren confirmación.'
directoryfile.write_text(json.dumps(directory,ensure_ascii=False,separators=(',',':')))
summary={'reviewedAt':'2026-11-04','directoryRecords':len(rows),'websitesIdentified':sum(bool(v['website']) for v in rows),'profilesWithFeaturedProducts':sum(bool(v['products']) for v in rows),'featuredReferences':sum(len(v['products']) for v in rows),'profilesWithVerifiedPhotos':sum(any(p.get('image') and p.get('imageVerifiedAt') for p in v['products']) for v in rows),'referencesWithVerifiedPhotos':sum(bool(p.get('image') and p.get('imageVerifiedAt')) for v in rows for p in v['products']),'withDocuments':sum(bool(v['catalogs']) for v in rows),'recordsWithoutIdentifiedWebsite':sum(not v['website'] for v in rows),'scope':'Public primary-source catalogs and product images. Branch associations use explicit reviewed mappings and identity sources; general company catalogs do not imply branch stock. Unresolved entries receive no invented products.'}
(root/'research/vendor-catalogs/coverage.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2));print(json.dumps(summary))
