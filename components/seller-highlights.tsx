"use client";
import Link from "next/link";

const featuredSuppliers=[
 {name:"Loma Negra",kind:"Fabricante",id:"research-4eedd748dac8",image:"/products/loma-negra-25.jpg"},
 {name:"Holcim Argentina",kind:"Fabricante",id:"research-321fb62ab2bb",image:"/products/holcim-25.jpg"},
 {name:"Cementos Avellaneda",kind:"Fabricante",id:"research-e894f09b02cc",image:"/products/avellaneda-25.jpg"},
 {name:"Corralón Norte",kind:"Corralón",slug:"corralon-norte",image:"/suppliers/corralon-norte.jpg",photo:true},
 {name:"Corralón Centro",kind:"Distribuidor",slug:"corralon-centro",image:"/suppliers/corralon-centro.jpg",photo:true},
 {name:"Materiales del Sur",kind:"Distribuidor",slug:"materiales-del-sur",image:"/suppliers/materiales-del-sur.jpg",photo:true},
 {name:"Aliceri Materiales",kind:"Corralón",id:"research-45a6590d44ec",image:"/suppliers/materiales-generales.jpg",photo:true},
 {name:"Materiales Nuciari",kind:"Corralón",id:"research-7637e05b3d63",image:"/suppliers/materiales-generales.jpg",photo:true},
 {name:"Materiales Moreno",kind:"Corralón",id:"research-a0155eb8c310",image:"/suppliers/materiales-generales.jpg",photo:true},
 {name:"Familia Bercomat",kind:"Distribuidor",id:"outlet-dc1c569d4430",image:"/suppliers/materiales-generales.jpg",photo:true},
 {name:"Blaisten",kind:"Distribuidor",id:"research-f4f7369c8e86",image:"/suppliers/materiales-generales.jpg",photo:true},
 {name:"Codimat",kind:"Distribuidor",id:"outlet-5ba15cd53e30",image:"/suppliers/materiales-generales.jpg",photo:true},
 {name:"Altea",kind:"Distribuidor",id:"outlet-90f29d6c42b6",image:"/suppliers/materiales-generales.jpg",photo:true},
 {name:"Yrigoyen Construcciones",kind:"Distribuidor",id:"outlet-c8afba51c565",image:"/suppliers/materiales-generales.jpg",photo:true},
 {name:"Construnort",kind:"Distribuidor",id:"outlet-15fe28f92ac6",image:"/suppliers/materiales-generales.jpg",photo:true},
];

export function SellerHighlights(){return <section className="marketplace-sellers" aria-label="15 proveedores destacados"><div className="section-head"><div><h2>Los proveedores de tu próxima obra.</h2><p>3 fabricantes · 12 corralones y distribuidores.</p></div><Link href="/proveedores">Explorar proveedores →</Link></div><div className="retail-category-shortcuts marketplace-seller-shortcuts">{featuredSuppliers.map(p=><Link key={p.slug??p.id} href={p.slug?`/proveedores/${p.slug}`:`/proveedores?perfil=${encodeURIComponent(p.id!)}`} aria-label={`Ver tienda de ${p.name}, ${p.kind.toLowerCase()}`}><span className={p.photo?"supplier-circle is-store-photo":"supplier-circle"}><img src={p.image} alt={`Foto representativa de ${p.name}`} width={74} height={74} loading="lazy" onError={e=>{if(e.currentTarget.getAttribute('src')!=='/suppliers/materiales-generales.jpg')e.currentTarget.src='/suppliers/materiales-generales.jpg';}}/></span><strong>{p.name}</strong></Link>)}</div></section>;}
