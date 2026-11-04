"""Build public supplier profiles from the documented 2026-11-04 research.
Entries are companies or listed outlets; shared commercial names are not CUIT identities.
"""
import json,re,hashlib,unicodedata
from pathlib import Path
root=Path(__file__).resolve().parents[1]
source=root/'research/precios-proveedores-2026-11-04'
def norm(value):return unicodedata.normalize('NFD',value).encode('ascii','ignore').decode().lower()
def rubros(sector):
 s=norm(sector);out=[]
 for pattern,label in [('cement|materiales de construccion|^materiales$|obra gruesa','Corralón y obra gruesa'),('cable|conductor','Cables y conductores'),('electri|proteccion|automatiza|tablero|canaliza','Electricidad'),('ilumin','Iluminación'),('sanitar|plomer|grifer|tuber','Sanitarios y plomería'),('bomba|motor','Bombas y motores'),('ferreter|bulon|herramient','Ferretería y herramientas'),('acero|hierro','Hierros y aceros'),('pintur','Pinturas'),('madera','Maderas'),('piso|revest|ceram|porcel','Pisos y revestimientos'),('abert|cortin','Aberturas'),('clima|calef|refrig','Climatización'),('seco|placa|yeso','Construcción en seco'),('genera|energia','Energía y grupos electrógenos')]:
  if re.search(pattern,s):out.append(label)
 if 'Cables y conductores' in out and 'Electricidad' not in out:out.append('Electricidad')
 return out or ['Otros / rubro por validar']
def price_mode(mode):
 m=norm(mode)
 if 'historica' in m:return 'Lista histórica'
 if 'hibrido' in m:return 'Publicado y cotización'
 if 'por cuenta' in m:return 'Precio por cuenta'
 if 'lista' in m:return 'Lista de precios'
 if 'precio publico' in m:return 'Precio publicado'
 if 'cotizacion' in m:return 'Cotización'
 if 'acopio' in m:return 'Acopio; precio por confirmar'
 return 'Precio por relevar'
def website(value):
 v=re.sub(r'^https?://','',value.strip(),flags=re.I)
 if '@' in v or not re.match(r'^(www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}',v):return ''
 return 'https://'+v.split('?')[0].lower()
rows=[]
for name,role,sector,location,mode,note,url in json.loads((source/'empresas-relevadas.json').read_text()):
 n=norm(location)
 province='CABA' if 'caba' in n and 'pba' not in n and 'ezeiza' not in n else 'Buenos Aires' if any(x in n for x in ['pba','buenos aires','ezeiza']) else 'Santa Fe' if 'santa fe' in n else 'Alcance nacional / sede por validar'
 kind='Fabricante' if role.startswith('Fabricante') else 'Asociado industrial' if role.startswith('Asociado') else 'Corralón' if role=='Corralón' else 'Importador / distribuidor' if 'Importador' in role else 'Distribuidor' if 'Distribuidor' in role else 'Comercio / ferretería'
 specialties=rubros(sector)
 if name in ['Grupo Dema','IPS / Rotoplas','Amanco Wavin','Tigre Argentina','Industrias Saladillo','FV','Hidromet','Peirano','Roca Argentina','Johnson Acero']:specialties=['Sanitarios y plomería']
 if name=='Motorarg':specialties=['Bombas y motores']
 rows.append(dict(id='research-'+hashlib.sha256(name.encode()).hexdigest()[:12],name=name,kind=kind,recordType='Empresa / grupo',sector=sector,tags=specialties,province=province,locality=location,address='',priceMode=price_mode(mode),priceDetail=mode,notes=note,source='Relevamiento comercial',sourceUrl=url,website=url if 'afcp.org' not in url and 'cadieel.org' not in url else '',reviewedAt='2026-11-04'))
for item in json.loads((source/'bapro-comercios-revisado.json').read_text()):
 name=item['nombre'];address=item['direccion_o_web'];location=item['localidad'];n=norm(name);role='Corralón' if 'corralon' in n or 'materiales' in n else 'Comercio / ferretería';online=location=='Venta online'
 rows.append(dict(id='outlet-'+hashlib.sha256((name+'|'+location+'|'+address).encode()).hexdigest()[:12],name=name,kind=role,recordType='Canal online' if online else 'Punto de venta',sector=item['rubro_inferido'],tags=rubros(item['rubro_inferido']),province='Venta online / sede por validar' if online else 'Buenos Aires',locality=location.split(' - ',1)[-1].strip(),address='' if online else address,priceMode='Precio por relevar',priceDetail='No relevada',notes='Comercio incluido en el padrón de construcción de Banco Provincia. El rubro se infiere del nombre y requiere validación. La adhesión bancaria no acredita registro en Obra Clara, precios, stock ni cobertura de entrega.',source='Banco Provincia',sourceUrl=item['fuente']+'#page='+str(item['pagina']),website=website(address) if online else '',reviewedAt='2026-11-04'))
assert len({r['id'] for r in rows})==len(rows)
(root/'components/supplier-directory-data.json').write_text(json.dumps(rows,ensure_ascii=False,separators=(',',':')))
print(json.dumps({'entries':len(rows),'companies_and_groups':71,'outlets_and_online':1126,'tags':len(set(t for r in rows for t in r['tags']))}))
