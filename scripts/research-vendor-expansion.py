"""Second-pass discovery from identified company sites. Stores candidates for review.
Images must be attached to a product card or structured Product, not website logos.
"""
import json,re,urllib.request,urllib.parse,concurrent.futures,hashlib
from html.parser import HTMLParser
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'research/vendor-catalogs/expansion';OUT.mkdir(exist_ok=True)
class N:
 def __init__(self,t='',a=None,parent=None):self.tag=t;self.attrs=dict(a or []);self.parent=parent;self.children=[]
 def nodes(self):
  yield self
  for c in self.children:
   if isinstance(c,N):yield from c.nodes()
 def text(self):return re.sub(r'\s+',' ',' '.join(c.text() if isinstance(c,N) else c for c in self.children if not isinstance(c,N) or c.tag not in ['script','style','noscript'])).strip()
class DOM(HTMLParser):
 def __init__(self):super().__init__();self.root=N();self.stack=[self.root]
 def handle_starttag(self,t,a):
  n=N(t,a,self.stack[-1]);self.stack[-1].children.append(n)
  if t not in ['img','meta','link','input','br','hr','source','area','base','embed','wbr']:self.stack.append(n)
 def handle_startendtag(self,t,a):self.handle_starttag(t,a);self.handle_endtag(t)
 def handle_endtag(self,t):
  for i in range(len(self.stack)-1,0,-1):
   if self.stack[i].tag==t:self.stack=self.stack[:i];break
 def handle_data(self,d):self.stack[-1].children.append(d)
def fetch(url):
 if re.search(r'add-to-cart|remove_item|wishlist|logout',url,re.I):raise ValueError('Non-catalog action URL')
 req=urllib.request.Request(url,headers={'User-Agent':'ObraClaraCatalogResearch/1.0 (public product references)'})
 with urllib.request.urlopen(req,timeout=15) as r:
  mime=r.headers.get('Content-Type','')
  if 'html' not in mime:return None,r.geturl()
  raw=r.read(2600000).decode('utf-8','replace');d=DOM();d.feed(raw);return d.root,r.geturl()
def image(n,base):
 for v in n.nodes():
  if v.tag=='img':
   a=v.attrs;src=a.get('data-src') or a.get('data-original') or a.get('src') or a.get('data-srcset','').split(' ')[0]
   if src and not src.startswith('data:') and not re.search(r'logo|icon|placeholder|transparent|pixel|loading|banner',src,re.I):return urllib.parse.urljoin(base,src).replace(' ','%20')
 return ''
def safe(u):
 try:p=urllib.parse.urlparse(u);return p.scheme=='https' and bool(p.hostname) and not p.username
 except:return False
reject=re.compile(r'cookie|carrito|comparar|cuenta|^ver |inici|registr|^comprar$|^añadir|^contacto$|^inicio$|^ofertas$|pol[ií]tica',re.I)
def candidates(root,base):
 products=[];documents=[];links=[]
 def add(name,url,img='',kind='product'):
  name=re.sub(r'\s+',' ',name).strip();name=re.sub(r'\$\s*[\d.,]+.*$','',name).strip();url=urllib.parse.urljoin(base,url)
  if len(name)<5 or len(name)>150 or reject.search(name) or not safe(url):return
  products.append({'name':name,'sourceUrl':url,'image':img if safe(img) else '', 'kind':kind,'imageSourceUrl':base})
 def walk(x):
  if isinstance(x,list):
   for v in x:walk(v)
  elif isinstance(x,dict):
   if 'Product' in str(x.get('@type','')) and x.get('name'):
    img=x.get('image','');img=img[0] if isinstance(img,list) and img else img
    if isinstance(img,dict):img=img.get('url','')
    add(x['name'],x.get('url','') or base,urllib.parse.urljoin(base,img) if isinstance(img,str) else '')
   for y in x.values():
    if isinstance(y,(dict,list)):walk(y)
 for n in root.nodes():
  if n.tag=='script' and 'ld+json' in n.attrs.get('type',''):
   try:walk(json.loads(''.join(c for c in n.children if isinstance(c,str))))
   except:pass
  if n.tag=='a':
   u=urllib.parse.urljoin(base,n.attrs.get('href',''));label=n.text();links.append((label,u))
   if re.search(r'\.pdf(?:$|\?)',u,re.I) and safe(u):documents.append({'name':label[:120] or 'Catálogo técnico','url':u})
   if re.search(r'/producto/|/product/|/productos/[^/?]+/?$|/p(?:$|\?)|/product-category/|/categoria-producto/|/DETALLE/|/busqueda\?cat=|/detalle[^/]*|producto[^/]*\?',u,re.I):
    title=n.attrs.get('title') or n.attrs.get('aria-label') or label
    if not title and '/DETALLE/' in u:title=urllib.parse.unquote(u.split('/DETALLE/')[1].split('/')[0]).replace('-',' ')
    if not title:
     imgs=[c for c in n.nodes() if c.tag=='img'];title=imgs[0].attrs.get('alt','') if imgs else ''
    img=image(n,base)
    if not img and n.parent:
     for depth in [n.parent,n.parent.parent]:
      if depth and len(depth.text())<900:
       heads=[h for h in depth.nodes() if h.tag in ['h2','h3','h4']]
       if heads and (not title or len(title)<5):title=heads[0].text()
       img=image(depth,base)
       if img:break
    add(title,u,img,'family' if re.search('category|categoria|busqueda\?cat=',u) else 'product')
 # Product tiles whose links are implemented with JavaScript, or use legacy URLs.
 for n in root.nodes():
  css=n.attrs.get('class','')
  if n.tag in ['article','div','li'] and re.search(r'product[-_ ]?(?:item|card)|item[-_ ]?product|card[-_ ]?product|producto[-_ ]?(?:item|card)|oe_product',css,re.I):
   heads=[h for h in n.nodes() if h.tag in ['h2','h3','h4']]
   if heads and len(n.text())<1600:
    title=heads[0].text();img=image(n,base)
    productlinks=[urllib.parse.urljoin(base,a.attrs.get('href','')) for a in n.nodes() if a.tag=='a' and re.search(r'product|producto|DETALLE|/p$',a.attrs.get('href',''),re.I)]
    if img and title:add(title,productlinks[0] if productlinks else base,img)
 return products,documents,links
registry=json.loads((OUT/'registry.json').read_text())
def run(item):
 cache=OUT/(item['key']+'.json')
 if cache.exists() and not item.get('refresh'):
  cached=json.loads(cache.read_text());return {'name':item['name'],'cached':True,'products':len(cached['products'])}
 result={**item,'pages':[],'products':[],'catalogs':[],'identityText':[],'errors':[]}
 queue=list(dict.fromkeys([item['website'],*item.get('seeds',[]),*item.get('identitySources',[])]));seen=set();host=urllib.parse.urlparse(item['website']).hostname.removeprefix('www.')
 while queue and len(seen)<12:
  url=queue.pop(0)
  if url in seen:continue
  seen.add(url)
  try:
   root,actual=fetch(url)
   if not root:continue
   p,d,links=candidates(root,actual);result['pages'].append(actual);result['products']+=p;result['catalogs']+=d
   if url==item['website'] or re.search(r'contact|sucursal|nosotros|empresa|donde|qui[eé]nes|historia',url,re.I):result['identityText'].append({'url':actual,'text':root.text()[-18000:]})
   if len(seen)<3:
    for label,u in links:
     h=urllib.parse.urlparse(u).hostname
     if h and h.removeprefix('www.')==host and safe(u) and u not in seen and not re.search(r'\.(pdf|jpg|png)|cart|login',u,re.I) and re.search(r'contact|sucursal|catalog|product|tienda|shop|store',u,re.I) and len(queue)<9:queue.append(u)
   if p and len(seen)<6:
    for v in p[:4]:
     if v['kind']=='product' and not v['image'] and v['sourceUrl'] not in seen and len(queue)<10:queue.append(v['sourceUrl'])
  except Exception as e:result['errors'].append({'url':url,'error':str(e)[:100]})
 unique={}
 for p in result['products']:
  key=(p['name'].casefold(),p['sourceUrl']);old=unique.get(key)
  if not old or p['image'] and not old['image']:unique[key]=p
 result['products']=list(unique.values())[:100]
 result['catalogs']=list({v['url']:v for v in result['catalogs']}.values())[:20]
 (OUT/(item['key']+'.json')).write_text(json.dumps(result,ensure_ascii=False,indent=2))
 return {'name':item['name'],'products':len(result['products']),'photos':sum(bool(p['image']) for p in result['products']),'pages':len(result['pages'])}
if __name__=='__main__':
 with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
  for v in pool.map(run,registry):print(json.dumps(v,ensure_ascii=False),flush=True)
