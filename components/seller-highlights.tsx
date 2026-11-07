"use client";
import Link from "next/link";

const featuredSuppliers=[
 {name:"Loma Negra",kind:"Fabricante",id:"research-4eedd748dac8",image:"/suppliers/illustrative/planta-silos.jpg",photo:true},
 {name:"Holcim Argentina",kind:"Fabricante",id:"research-321fb62ab2bb",image:"/suppliers/illustrative/planta-desierto.jpg",photo:true},
 {name:"Cementos Avellaneda",kind:"Fabricante",id:"research-e894f09b02cc",image:"/suppliers/illustrative/planta-misburg.jpg",photo:true},
 {name:"Corralón Norte",kind:"Corralón",slug:"corralon-norte",image:"/suppliers/corralon-norte.jpg",photo:true},
 {name:"Corralón Centro",kind:"Distribuidor",slug:"corralon-centro",image:"/suppliers/corralon-centro.jpg",photo:true},
 {name:"Materiales del Sur",kind:"Distribuidor",slug:"materiales-del-sur",image:"/suppliers/materiales-del-sur.jpg",photo:true},
 {name:"Aliceri Materiales",kind:"Corralón",id:"research-45a6590d44ec",image:"/suppliers/illustrative/patio-bridgnorth.jpg",photo:true},
 {name:"Materiales Nuciari",kind:"Corralón",id:"research-7637e05b3d63",image:"/suppliers/illustrative/patio-emmans.jpg",photo:true},
 {name:"Materiales Moreno",kind:"Corralón",id:"research-a0155eb8c310",image:"/suppliers/illustrative/patio-partridge.jpg",photo:true},
 {name:"Familia Bercomat",kind:"Distribuidor",id:"outlet-dc1c569d4430",image:"/suppliers/illustrative/patio-simak.jpg",photo:true},
 {name:"Blaisten",kind:"Distribuidor",id:"research-f4f7369c8e86",image:"/suppliers/illustrative/patio-deal.jpg",photo:true},
 {name:"Codimat",kind:"Distribuidor",id:"outlet-5ba15cd53e30",image:"/suppliers/illustrative/patio-hemyock.jpg",photo:true},
 {name:"Altea",kind:"Distribuidor",id:"outlet-90f29d6c42b6",image:"/suppliers/illustrative/deposito-blackwood.jpg",photo:true},
 {name:"Yrigoyen Construcciones",kind:"Distribuidor",id:"outlet-c8afba51c565",image:"/suppliers/illustrative/aserradero-troy.jpg",photo:true},
 {name:"Construnort",kind:"Distribuidor",id:"outlet-15fe28f92ac6",image:"/suppliers/illustrative/deposito-sleaford.jpg",photo:true},
];

export function SellerHighlights(){return <section className="marketplace-sellers" aria-label="15 proveedores destacados"><div className="section-head"><div><h2>Los proveedores de tu próxima obra.</h2><p>3 fabricantes · 12 corralones y distribuidores. <span className="marketplace-illustrative">Imágenes ilustrativas</span></p></div><Link href="/proveedores">Explorar proveedores →</Link></div><div className="retail-category-shortcuts marketplace-seller-shortcuts">{featuredSuppliers.map(p=><Link key={p.slug??p.id} href={p.slug?`/proveedores/${p.slug}`:`/proveedores?perfil=${encodeURIComponent(p.id!)}`} aria-label={`Ver tienda de ${p.name}, ${p.kind.toLowerCase()}`}><span className="supplier-circle is-store-photo"><img src={p.image} alt={`Imagen ilustrativa de una instalación, no es la sede de ${p.name}`} width={74} height={74} loading="lazy"/></span><strong>{p.name}</strong></Link>)}</div></section>;}
