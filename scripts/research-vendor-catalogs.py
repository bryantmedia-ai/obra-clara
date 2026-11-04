"""Bounded first-party catalog discovery. No price/stock imported as an offer."""
import json,re,hashlib,concurrent.futures,urllib.request,urllib.parse,time
from html.parser import HTMLParser
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
class Page(HTMLParser):
 def __init__(self):super().__init__();self.links=[];self.current=None;self.scripts=[];self.script=None;self.text=[]
 def handle_starttag(self,t,a):
  d=dict(a)
  if t=='a':self.current={'href':d.get('href',''),'name':'','image':''}
  if t=='img' and self.current:self.current['image']=d.get('data-src') or d.get('src','');self.current['name']+=' '+d.get('alt','')
  if t=='script' and 'ld+json' in d.get('type',''):self.script=''
 def handle_data(self,d):
  self.text.append(d)
  if self.current:self.current['name']+=' '+d
  if self.script is not None:self.script+=d
 def handle_endtag(self,t):
  if t=='a' and self.current:self.links.append(self.current);self.current=None
  if t=='script' and self.script is not None:self.scripts.append(self.script);self.script=None

def fetch(url):
 req=urllib.request.Request(url,headers={'User-Agent':'ObraClaraCatalogResearch/1.0 (public product reference research)'})
 with urllib.request.urlopen(req,timeout=18) as r:
  if 'html' not in r.headers.get('Content-Type',''):return None,r.geturl()
  raw=r.read(2500000).decode('utf-8','replace');p=Page();p.feed(raw);return p,r.geturl()
def clean(s):return re.sub(r'\s+',' ',s).strip()
def web(s):
 if not s or '@' in s:return ''
 s=re.sub(r'^https?://','',s,flags=re.I)
 if '.' not in s:return ''
 return 'https://'+s.split('?')[0].lower()
rows=json.loads((ROOT/'components/supplier-directory-data.json').read_text())
extra={'Loma Negra':'https://www.lomanegra.com/productos/','Holcim Argentina':'https://www.holcim.com.ar/productos-y-servicios/productos/cementos/cementos-en-bolsa','Cementos Avellaneda':'https://www.cementosavellaneda.com.ar/productos/','Cambre':'https://www.cambre.com.ar/','Cimet':'https://cimet.com/empresa/','Conextube':'https://conextube.com/index.php'}
extra.update({'PCR':'https://cemento.pcr.energy/','ABB S.A.':'https://new.abb.com/south-america/argentina/catalogo-comercial-abb-en-argentina','Aparatos Eléctricos Automáticos':'https://catalogo.aea.com.ar/','Atomlux':'https://www.atomlux.com.ar/web/Luz-de-Emergencia.php','DBT / Cramaco':'https://dbtsa.com/empresa/','Delga':'https://www.delga.com/productos','Ferrolux':'https://ferrolux.com.ar/productos','Industrias MH':'https://www.industriasmh.com.ar/','Industrias Sica':'https://tienda.sicaelec.com/sica','Jeluz':'https://jeluz.net/','Lumenac':'https://lumenac.com.ar/inicio'})
raw=json.loads((ROOT/'research/precios-proveedores-2026-11-04/bapro-comercios-revisado.json').read_text())
for r in rows:
 if r['name'] in extra:r['website']=extra[r['name']]
 if r['recordType']=='Canal online':
  source=next((v for v in raw if v['nombre']==r['name'] and v['localidad']=='Venta online'),None)
  if source:r['website']=web(source['direccion_o_web'])
previous={v['supplierId']:v for v in json.loads((ROOT/'research/vendor-catalogs/discovery.json').read_text())} if (ROOT/'research/vendor-catalogs/discovery.json').exists() else {}
def work(r):
 if r['id'] in previous and previous[r['id']]['website']==r['website']:return previous[r['id']]
 url=r['website'];out={'supplierId':r['id'],'supplierName':r['name'],'website':url,'checkedAt':'2026-11-04','pages':[],'products':[],'catalogs':[],'status':'no-website'}
 if not url:return out
 try:
  page,base=fetch(url)
  if not page:out['status']='not-html';return out
  out['website']=base;queue=[(page,base)];seen={base};firsthost=urllib.parse.urlparse(base).hostname
  for link in page.links:
   u=urllib.parse.urljoin(base,link['href']);label=clean(link['name'])
   if urllib.parse.urlparse(u).hostname!=firsthost:continue
   if re.search(r'catalog|product|tienda|shop',u,re.I) and not re.search(r'\.(pdf|jpg|png|zip)|cart|account|login|page/\d',u,re.I) and u not in seen and len(queue)<4:
    seen.add(u)
    try:
     child,actual=fetch(u)
     if child:queue.append((child,actual))
    except Exception:pass
  products={};catalogs={}
  for p,source in queue:
   out['pages'].append(source)
   def add(name,url,image='',kind='product'):
    name=clean(name);name=re.sub(r'\$\s*[\d.,]+.*$','',name).strip()
    if len(name)<5 or len(name)>150 or re.search(r'cookie|newsletter|carrito|iniciar|ver todos|ver m[aá]s|solicitar|contact|comprar|pol[ií]tica|facebook|instagram|producto[s]?$|categor[ií]a[s]?$|comparar|presupuesto',name,re.I):return
    key=name.casefold();products.setdefault(key,{'name':name,'sourceUrl':url,'image':urllib.parse.urljoin(source,image) if image and not image.startswith('data:') else '', 'kind':kind})
   def walk(x):
    if isinstance(x,list):
     for v in x:walk(v)
    elif isinstance(x,dict):
     if 'Product' in str(x.get('@type','')):
      image=x.get('image','');image=image[0] if isinstance(image,list) and image else image
      if isinstance(image,dict):image=image.get('url','')
      add(x.get('name',''),urllib.parse.urljoin(source,x.get('url','') or source),image,'product')
     for v in x.values():
      if isinstance(v,(dict,list)):walk(v)
   for script in p.scripts:
    try:walk(json.loads(script))
    except Exception:pass
   for a in p.links:
    u=urllib.parse.urljoin(source,a['href']);name=clean(a['name'])
    if urllib.parse.urlparse(u).hostname!=firsthost:continue
    if re.search(r'\.pdf(?:$|\?)',u,re.I):catalogs[u]={'name':name or 'Catálogo técnico','url':u}
    if re.search(r'/producto/|/product/|/p$|/p\?|/productos/[^/?]+|/product-category/|/categoria-producto/',u,re.I):add(name,u,a['image'],'family' if re.search('category|categoria',u) else 'product')
  out['products']=list(products.values())[:24];out['catalogs']=list(catalogs.values())[:12];out['status']='catalog-found' if products or catalogs else 'website-found'
 except Exception as e:out['status']='unavailable';out['error']=str(e)[:160]
 return out
with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool:results=list(pool.map(work,rows))
(ROOT/'research/vendor-catalogs/discovery.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
print(json.dumps({'records':len(results),'withWebsite':sum(bool(v['website']) for v in results),'catalogs':sum(v['status']=='catalog-found' for v in results),'references':sum(len(v['products']) for v in results)}))
