"""Select sourced references and validate image responses for the next catalog batch.
The approved branch map is explicit and auditable. It is not a legal-entity merger.
"""
import json,re,hashlib,html,unicodedata,urllib.request,urllib.parse,concurrent.futures,struct
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];FOLDER=ROOT/'research/vendor-catalogs/expansion'
def norm(s):return re.sub(r'[^a-z0-9]+',' ',unicodedata.normalize('NFD',html.unescape(s)).encode('ascii','ignore').decode().lower()).strip()
reject=re.compile(r'^see more$|whatsapp image|^skip|^saltar|^ir al|^previo|^siguiente|^anterior|^agotado$|^add |lee m[aá]s|^carrusel|^detalles$|^m[aá]s info|^precio|^carrito|^favorito|ver detalle|nuevos espacios|certificaci[oó]n uniview|newsletter|instagram|^contact|^inici|^oferta[s]?$|^entrar|^cerrar|^espa[nñ]ol|^english',re.I)
keywords=re.compile(r'cemento|hierro|acero|ca[nñ]o|cable|soldad|rotomartillo|amoladora|taladro|compresor|generador|el[eé]ctr|led|interrupt|tablero|bomba|placa|termofus|hormig|impermeab|ceresita|revoque|porcela|grifer|inodoro|sanitario|membrana|desag|perfil|malla|mortero|bloque|ladrillo|vigueta|termotan|calef[oó]n|adhesivo|revest|masilla|aislante|herramient',re.I)
def clean(p):
 p=dict(p);n=html.unescape(p['name']);n=re.sub(r'\s+',' ',n).strip();n=re.sub(r'\s*0 de 5.*$','',n);n=re.sub(r'^\d\) ','',n)
 n=re.sub(r'\s+Ver m[aá]s.*$','',n,flags=re.I)
 n=re.sub(r'\s*[−-]?\s*\d+% OFF.*$','',n).strip()
 if reject.search(n) or len(n)<5 or len(n)>125 or re.search(r'cart|add-to-cart|DETALLE_NOTICIA|#|javascript:',p['sourceUrl'],re.I):return None
 # Remove repeated image alt/title labels from a product card.
 words=n.split()
 for i in range(2,len(words)//2+1):
  if words[:i]==words[i:2*i]:n=' '.join(words[:i]+words[2*i:]);break
 p['name']=n
 if not re.search(r'\d',n) and len(n.split())<4:p['kind']='family'
 if re.search('busqueda\\?cat=|category|categoria',p['sourceUrl']):p['kind']='family'
 if re.search(r'/(?:plus|minus|zoom|close|search|arrow|loader|spinner)(?:[-_.])|logo|icon|banner|sprite|placeholder|/Brands/|facebook|instagram|data:',p.get('image',''),re.I):p['image']=''
 return p
# Exact recorded outlets with public primary identity/location evidence.
branches=json.loads((FOLDER/'branch-ids.json').read_text())
exclude={'MAFFERETTI':['outlet-7dc5646026b6','outlet-28c86fd636ca'],'CENTRO HIERRO':['outlet-9804dc789b0a','outlet-cf57030f40dd'],'MAS FERRETERIAS SA':['outlet-c07a26e8ff65','outlet-898286c9f2ca'],'VENTA MAT':['outlet-875f46c8e7f6'],'URBANIA':['outlet-636dd9ceaf29'],'MOSAICOS LENZI':['outlet-cdd2650653e7','outlet-c2b020236d53'],'FERRETERIA CASA MEÑICA':['outlet-8e694bba51d5'],'AITER':['outlet-1351f9c29253']}
for name,ids in branches.items():branches[name]=[i for i in ids if i not in exclude.get(name,[])]
# Sources checked explicitly beyond the first page.
identity={'MAFFERETTI':'https://mafferetti.com/contacto','DI STABILE':'https://www.distabile.com.ar/sucursales/','VENTA MAT':'https://ventamatshop.com.ar/informacion/','CASA BLANCO':'https://www.casablanco.com/SUCURSALES/sucursales/casablanco-electricidad.aspx','IMPERIO DEL CERAMICO':'https://www.imperiodelceramico.com.ar/','ACON MATERIALES':'https://www.aconmateriales.com.ar/contacto/','EL EMPORIO DEL TERCIADO':'https://emporiodelterciado.com.ar/contacto/','IMEPHO':'https://imepho.com.ar/empresa','FERRETERIA CASA MEÑICA':'https://www.casamenica.com/contacto/','CENTRO HIERRO':'https://centrohierro.com.ar/#sucursales','RICARDO OSPITAL':'https://ricardoospital.com.ar/','AITER':'https://aiter.com.ar/','MOSAICOS LENZI':'https://www.somoslenzi.com.ar/','MAS FERRETERIAS SA':'https://www.masferreterias.com/contacto/','CASA CALIENDO':'https://casacaliendo.com.ar/empresa.php','URBANIA':'https://www.urbaniasa.com/sucursales'}
base=json.loads((ROOT/'components/vendor-catalog-data.json').read_text());directory=json.loads((ROOT/'components/supplier-directory-data.json').read_text());byname={r['supplierName']:r for r in base};registry=json.loads((FOLDER/'registry.json').read_text());approved=[]
for item in registry:
 file=FOLDER/(item['key']+'.json')
 if not file.exists():continue
 raw=json.loads(file.read_text())
 overrides=json.loads((ROOT/'research/vendor-catalogs/semantic-photo-overrides.json').read_text())
 override=next((v for v in overrides if v['name']==item['name']),None)
 if override:raw['products']=override['products'];item['website']=override.get('website',item['website'])
 ids=[item['supplierId']] if item.get('supplierId') else branches.get(item['name'],[])
 if not ids and item['name'] in ['Interelec','Inbaco','Conductres','Industrias Juan F. Secco']:
  ids=[d['id'] for d in directory if d['name']==item['name'] and d['recordType']=='Empresa / grupo']
 if not ids:continue
 products={}
 for p in raw['products']:
  p=clean(p)
  if not p:continue
  key=norm(p['name']);old=products.get(key)
  if not old or p.get('image') and not old.get('image') or len(p['sourceUrl'])>len(old['sourceUrl']) and bool(p.get('image'))==bool(old.get('image')):products[key]=p
 selected=sorted(products.values(),key=lambda p:(not bool(p.get('image')),p['kind']=='family',not bool(keywords.search(p['name'])),len(p['name'])))[:20 if override and override.get('keepAll') else 10]
 if not selected:continue
 approved.append({'key':item['key'],'supplierIds':ids,'name':item['name'],'website':item['website'],'identitySource':override.get('identitySource',identity.get(item['name'],item['website'])) if override else identity.get(item['name'],item['website']),'identityNote':'Catálogo general de la empresa; confirmar disponibilidad y retiro con la sucursal indicada.' if any(i.startswith('outlet-') for i in ids) else 'Referencias publicadas por la empresa en su sitio oficial.','checkedAt':'2026-11-04','products':selected,'catalogs':raw['catalogs'][:6]})
# Existing linked images are checked too; no assumption that a remote URL is a usable photo.
images=list(dict.fromkeys([p['image'] for v in approved for p in v['products'] if p.get('image')]+[p['image'] for v in base for p in v['products'] if p.get('image')]))
cachefile=FOLDER/'image-checks.json';old=json.loads(cachefile.read_text()) if cachefile.exists() else {}
def check(url):
 if url in old:return url,old[url]
 try:
  u=urllib.parse.urlparse(url)
  if u.scheme!='https' or not u.hostname or u.username or u.port not in [None,443]:raise ValueError('Unsafe image URL')
  req=urllib.request.Request(url,headers={'User-Agent':'ObraClaraCatalogResearch/1.0'})
  with urllib.request.urlopen(req,timeout=15) as r:
   mime=r.headers.get('Content-Type','').split(';')[0];data=r.read(100000)
   if mime not in ['image/jpeg','image/png','image/webp','image/avif']:raise ValueError('Not a raster photo')
   if len(data)<1000:raise ValueError('Image too small')
   dims=None
   if data.startswith(b'\x89PNG'):dims=struct.unpack('>II',data[16:24])
   if dims and min(dims)<80:raise ValueError('Tiny image')
   return url,{'valid':True,'contentType':mime,'checkedAt':'2026-11-04','sampleSha256':hashlib.sha256(data).hexdigest(),**({'dimensions':dims} if dims else {})}
 except Exception as e:return url,{'valid':False,'reason':str(e)[:120],'checkedAt':'2026-11-04'}
with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool:checks=dict(pool.map(check,images))
cachefile.write_text(json.dumps(checks,ensure_ascii=False,indent=2))
for v in approved:
 for p in v['products']:
  if p.get('image') and checks.get(p['image'],{}).get('valid'):p['imageVerifiedAt']='2026-11-04'
  else:p['image']=''
 # Require at least one named reference, not arbitrary website illustrations.
 v['products']=[p for p in v['products'] if p.get('name')]
(ROOT/'research/vendor-catalogs/expansion-reviewed.json').write_text(json.dumps(approved,ensure_ascii=False,indent=2))
(ROOT/'research/vendor-catalogs/image-verification.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2))
print(json.dumps({'companiesReviewed':len(approved),'mappedProfiles':sum(len(v['supplierIds']) for v in approved),'selectedPhotoReferences':sum(bool(p['image']) for v in approved for p in v['products']),'checkedImages':len(checks),'validImages':sum(v['valid'] for v in checks.values())}))
