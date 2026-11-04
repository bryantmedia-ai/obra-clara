"""Publish bounded, reviewed product references, never stock, price or registration claims."""
import json,re,hashlib
from pathlib import Path
from urllib.parse import urljoin,urlparse
root=Path(__file__).resolve().parents[1]
rows=json.loads((root/'research/vendor-catalogs/discovery.json').read_text())
links=json.loads((root/'research/vendor-catalogs/site-links.json').read_text())
# These expressions select product families actually named on the vendor's own page.
select={
'Corralón El Veloz':r'^\d+ Materiales gruesos|^\d+ Hierros y estructura|^\d+ Ladrillos y bloques|^\d+ Sanitarios y agua|^\d+ Electricidad|^\d+ Pinturas|^Hormigón elaborado$',
'Construcción Vía Web':r'^Caños Termofusión$|^Caños Bicapa$|^PVC cloacal Tigre Ramat$|^Bombas de agua$|^Piso radiante TuboTherm$|^Corrugados en rollos$|^Grifería monocomando$|^Piletas de cocina',
'Blaisten':r'^Griferías para Baño$|^Griferías para Cocina$|^Accesorios Sanitarios$|^Cerámicas para Pisos$|^Cerámicas para Paredes',
'TECI SAC':r'^Organizador para cables PF-TECI$',
'Adducci Adrogué':r'^PORCELANA Y GRIFERIAS$',
'Loma Negra':r'^Cemento$|^Cemento de Albañilería$|^Hormigón$',
'PCR':r'^Cemento Portland$|^Cemento para uso Petrolero$|^Cemento de Albañilería$',
'Marlew':r'^Variador de Motor \(VFD\)$|^Sistemas Fotovoltaicos$',
'Kalop / Acrópolis Cables':r'^Conductores Eléctricos$|^Sistema Modular$',
'Motorarg':r'^Bombas Sumergibles de Pozo$|^Bombas Presurizadoras$|^Bombas Centrífugas$|^Bombas Desagote$|^Motores y Accesorios$',
'Atomlux':r'^Estabilizadores de tensión Línea Rc$|^UPS\.',
'Industrias MH':r'^Conductores de Aluminio$|^Conductores de Cobre$',
'EMPRESA GUANZETTI SA':r'^Cemento$|^Arena$|^Piedra$|^Ladrillos$|^Bloque Hormigón$|^Varilla de Hierro$|^Malla de hierro$',
'GILI Y CIA':r'^Arena y Piedra Arena|^Cemento Cemento|^Griferías Griferías|^Hierros Hierros|^Ladrillos Ladrillos|^Pinturas Pinturas|^Sanitarios Sanitarios',
'MARTINEZ ESCALADA':r'^Pinturas y equipos de pintar$|^Motores$',
'SERVISTEEL':r'^Placas Cementicias Eternit$|^Placas Desmontables Durlock$|^Placas para exterior Durlock$|^Placas de yeso Durlock$|^Aceros Planos$|^Aceros Largos$',
}
for site in links:
 row=next(v for v in rows if v['supplierName']==site['name'])
 if site['name'] in select:
  for a in site['links']:
   if re.search(select[site['name']],a['name']):
    name=re.sub(r'^\d+ ','',a['name']);name=re.split(r' Ver productos',name)[0]
    row['products'].append({'name':name,'sourceUrl':urljoin(site['url'],a['url']),'image':urljoin(site['url'],a['image']) if a['image'] else '', 'kind':'family'})
# Additional indexed first-party references, retained with their exact supporting URL.
manual={
'ABB S.A.':('https://new.abb.com/south-america/argentina/abb-en-argentina',['Interruptores diferenciales FH200 y F200','Interruptores termomagnéticos SH200 y S200','Contactores AX','Relés térmicos','Capacitores']),
'Holcim Argentina':('https://holcimsoluciones.com/argentina/centro-fichas-tecnicas',['Cemento Portland Fuerte ECOPlanet CPN40 25 kg','Cemento de Albañilería Maestro ECOPlanet 25 kg','Cemento Rápido 25 kg','Cemento Ultra Durable CPP40 ARS 25 kg','Cemento Fuerte Max 25 kg']),
'Lumenac':('https://lumenac.com.ar/catalogo/lib/inflate',['Proyectores LED','Colgantes industriales LED','Alumbrado público LED','Farolas LED','Artefactos solares LED']),
'Atomlux':('https://www.atomlux.com.ar/web/Manuales/MANUAL-AUXILIAR-DE-EMERGENCIA-UNIVERSAL-PARA-LED-MODELO-1601-LITIO-LED.pdf',['Auxiliar de emergencia universal 1601LITIO-LED']),
'CIARDI HNOS':('https://ciardi.com.ar/',['Schneider Easy9 termomagnético bipolar 25 A curva C 4,5 kA','IMSA cable unipolar flexible 1 × 1,5 mm² marrón × 100 m','Schneider contactor tripolar 9 A control 220 Vca','IMSA cable subterráneo 2 × 1,5 mm²']),
}
for name,(url,names) in manual.items():
 row=next(v for v in rows if v['supplierName']==name)
 if name in ['Holcim Argentina','CIARDI HNOS']:row['products']=[]
 row['products']=[{'name':n,'sourceUrl':url,'image':'','kind':'family' if name in ['ABB S.A.','Lumenac'] else 'product'} for n in names]+row['products']
reject=re.compile(r'^skip|^links$|^favoritos$|^detalles$|información adicional|método de envío|^ir al|^pasar al|^m[aá]s info|^descubr|^espa[nñ]ol$|^english$|^ofertas$|^otros$|cat[aá]logos|icon-|^obras y reformas$',re.I)
for name,ref in json.loads((root/'research/vendor-catalogs/curated-references.json').read_text()).items():
 row=next(v for v in rows if v['supplierName']==name)
 if name=='Ferromil' or not row['website']:row['website']=ref['url']
 row['products']=[{'name':n,'sourceUrl':ref['url'],'image':'','kind':ref['kind']} for n in ref['names']]
for row in rows:
 cleaned=[];seen=set();urls=set();words=0
 for p in row['products']:
  name=p['name'].strip()
  if row['supplierName']=='RONIX TIENDA ONLINE':
   name=re.split(r' Máquinas| Corte Manual| Fijaciones| Llaves| Ver detalle',name)[0]
  if row['supplierName']=='IPS / Rotoplas':
   name={'Roscas':'Rosca','Fusion':'Fusión','Desague':'Desagüe'}.get(name,name)
  if reject.search(name) or '{' in name:continue
  # Remove repeated accessible image/title labels while retaining suffix model codes.
  for n in range(5,len(name)//2+1):
   prefix=name[:n]
   if name[n:].lstrip().startswith(prefix):
    tail=name[n:].lstrip()[n:].strip();name=prefix+(' '+tail if tail and len(tail)<35 else '');break
  if len(name)>110:continue
  u=p['sourceUrl'].split('#')[0]
  if not u.startswith('https://'):continue
  if name.casefold() in seen:continue
  count=len(name.split())
  if words+count>170 or len(cleaned)>=8:continue
  seen.add(name.casefold());urls.add(u);words+=count
  kind=p['kind'];kind='family' if len(name.split())<4 and not re.search(r'\d',name) else kind
  image=p['image'];image=image if image.startswith('https://') and not re.search(r'logo|icon|sprite|banner|placeholder',image,re.I) else ''
  cleaned.append({'id':'ref-'+hashlib.sha256((row['supplierId']+'|'+name+'|'+u).encode()).hexdigest()[:16],'name':name,'sourceUrl':u,'image':image,'kind':kind})
 row['products']=cleaned
 row['catalogs']=[c for c in row['catalogs'] if c['url'].startswith('https://') and re.search(r'catalog|ficha|product|manual|folleto',c['name']+' '+c['url'],re.I)][:6]
 row.pop('error',None)
 if row['supplierName'] in ['Loma Negra','Argenplas','Lumenac','Motores Czerweny']:
  row['channelNote']='Comercialización a través de distribuidores; confirmar el canal habilitado para esta obra.'
  row['channelSource']={'Loma Negra':'https://wa-portal-lomanegra.azurewebsites.net/preguntas-frecuentes/','Argenplas':'https://www.argenplas.net/','Lumenac':'https://lumenac.com.ar/inicio','Motores Czerweny':'https://www.czerweny.ar/'}[row['supplierName']]
 row['status']='catalog-found' if cleaned or row['catalogs'] else 'website-found' if row['status']=='catalog-found' else row['status']
# No automatic association of a branch with a different legal entity's inventory.
(root/'components/vendor-catalog-data.json').write_text(json.dumps(rows,ensure_ascii=False,separators=(',',':')))
# Correct case-insensitive online URL extraction and enrich only exact researched IDs.
import subprocess
subprocess.run(['python3',str(root/'scripts/build-supplier-directory.py')],check=True)
directory=json.loads((root/'components/supplier-directory-data.json').read_text());lookup={r['supplierId']:r for r in rows}
for d in directory:
 r=lookup[d['id']]
 if r['website'].startswith('https://'):d['website']=r['website']
(root/'components/supplier-directory-data.json').write_text(json.dumps(directory,ensure_ascii=False,separators=(',',':')))
summary={'reviewedAt':'2026-11-04','directoryRecords':len(rows),'websitesIdentified':sum(bool(r['website']) for r in rows),'profilesWithFeaturedProducts':sum(bool(r['products']) for r in rows),'featuredReferences':sum(len(r['products']) for r in rows),'withDocuments':sum(bool(r['catalogs']) for r in rows),'recordsWithoutIdentifiedWebsite':sum(not r['website'] for r in rows),'scope':'Known official sites and indexed sources checked. No claim of exhaustive web search for 1,197 records; branches are separate entries. Unresolved entities receive no invented catalog.'}
(root/'research/vendor-catalogs/coverage.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2));print(json.dumps(summary))

# Apply the second research pass after generating the original stable reference IDs.
if (root/'research/vendor-catalogs/expansion-reviewed.json').exists():
 subprocess.run(['python3',str(root/'scripts/apply-vendor-expansion.py')],check=True)
