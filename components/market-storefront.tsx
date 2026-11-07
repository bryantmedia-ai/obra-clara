"use client";
import {SellerHighlights} from "./seller-highlights";
import {useState} from "react";
import {productImage} from "./product-images";
import Link from "next/link";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faBars,faMagnifyingGlass,faLocationDot,faStore,faChevronRight,faShieldHalved,faTruckFast,faXmark} from "@fortawesome/free-solid-svg-icons";
import {catalogDepartments} from "./catalog-departments";
import {type MarketLocation,marketplaceHref} from "./catalog-links";
import {type Product} from "./marketplace-data";
import {departmentMatches} from "./catalog-departments";
import {useProjects} from "./project-store";
import {useCart,updateCart} from "./cart-store";
const searchTerms:Record<string,string>={"Cementos y morteros":"cemento","Arenas y áridos":"arena","Yesos y cales":"cal","Ladrillos y bloques":"bloque","Hierro y acero":"hierro","Maderas y tableros":"madera","Químicos de construcción":"aditivo","Taladros y atornilladores":"taladro","Tableros y protecciones":"tablero","Fijaciones y anclajes":"anclaje","Cables y conductores":"cable"};
export function MarketStorefront({filters,products,onFilter}:{filters:MarketLocation;products:Product[];onFilter:(patch:Partial<MarketLocation>)=>void}){
 const [menuOpen,setMenuOpen]=useState(false);const [department,setDepartment]=useState(filters.department||"construccion");
 const projects=useProjects();const cart=useCart();
 const selected=catalogDepartments.find(d=>d.id===filters.department);const active=catalogDepartments.find(d=>d.id===department)??catalogDepartments[0];
 function choose(id:string,q=""){onFilter({content:"",dimensions:"",color:"",department:id,categories:[],query:q,productType:"",model:"",brand:"",format:"",productId:"",referenceId:""});setMenuOpen(false);}
 const count=(id:string)=>products.filter(p=>departmentMatches(p,id)).length;
 return <div className="market-storefront">
  <div className="market-utility"><span>Comprá para tu empresa. Vendé desde la tuya.</span><div><Link href="/proveedores">Nuestros proveedores</Link><Link href="/mi-tienda">Vender en Obra Clara</Link><Link href="/como-funciona">Cómo funciona</Link></div></div>
  <div className="market-navigation">
  <section className="market-retail-header">
   <button type="button" className={`market-menu-toggle${menuOpen?" active":""}`} aria-expanded={menuOpen} aria-controls="market-department-menu" onClick={()=>setMenuOpen(v=>!v)}><FontAwesomeIcon icon={menuOpen?faXmark:faBars}/> Categorías</button>
   <form className="market-retail-search" role="search" onSubmit={e=>{e.preventDefault();document.getElementById("cement-results")?.scrollIntoView({behavior:"smooth",block:"start"});}}><input aria-label="Buscar productos, marcas o proveedores" placeholder="¿Qué necesitás para tu obra?" value={filters.query} onChange={e=>onFilter({query:e.target.value})}/><button type="submit" aria-label="Buscar productos"><FontAwesomeIcon icon={faMagnifyingGlass}/></button></form>
   <label className="market-project-location"><FontAwesomeIcon icon={faLocationDot}/><span>Entregar en<select aria-label="Proyecto de entrega para nuevas compras" value={cart.projectId} onChange={e=>updateCart(s=>({...s,projectId:e.target.value}))}><option value="">Elegí tu proyecto</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></span></label>
  </section>
  {menuOpen&&<section className="market-department-menu" id="market-department-menu" aria-label="Departamentos"><div className="market-department-list">{catalogDepartments.map(d=><button type="button" key={d.id} className={d.id===active.id?"active":""} onClick={()=>setDepartment(d.id)}>{d.name}<FontAwesomeIcon icon={faChevronRight}/></button>)}</div><div className="market-department-content"><div><h2>{active.name}</h2><button type="button" onClick={()=>choose(active.id)}>Ver todo <span>{count(active.id)} ofertas →</span></button></div><div className="market-department-children">{active.children.map(child=><button type="button" key={child} onClick={()=>choose(active.id,searchTerms[child]??child.replace(/ y .*/,""))}>{child} <span>→</span></button>)}</div></div></section>}
  </div>
  <nav className="retail-breadcrumbs" aria-label="Ruta del catálogo"><Link href="/">Inicio</Link><span>›</span><Link href="/marketplace">Marketplace</Link>{selected&&<><span>›</span><button onClick={()=>choose(selected.id)}>{selected.name}</button></>}{filters.query&&<><span>›</span><span>{filters.query}</span></>}</nav>
  <section className="retail-category-shortcuts" aria-label="Comprar por departamento">{catalogDepartments.slice(0,9).map(d=>{const image=d.image;return <button type="button" key={d.id} className={d.id===filters.department?"active":""} onClick={()=>choose(d.id)}><span>{image?<img src={image} alt={d.name} width={80} height={80}/>:<FontAwesomeIcon icon={faStore}/>}</span><strong>{d.name}</strong></button>;})}</section>
  {!filters.department&&!filters.query&&!filters.supplier&&!filters.favoritesOnly&&<section className="retail-campaign"><div><span>De quien lo produce a quien construye</span><h2>El marketplace<br/>de la construcción.</h2><p>Fabricantes, productores y distribuidores.<br/>Comprá por unidad o por volumen, directo para tu obra.</p><div className="marketplace-role-actions"><button type="button" onClick={()=>choose("construccion")}>Quiero comprar <span>→</span></button><Link href="/mi-tienda">Quiero vender →</Link></div></div><img src="/suppliers/corralon-centro.jpg" alt="Depósito de materiales"/><div className="retail-campaign-stamp"><FontAwesomeIcon icon={faShieldHalved}/><span>Tu obra,<br/><strong>con pagos protegidos.</strong></span></div></section>}
  <div className="retail-benefits"><Link href="/proveedores"><FontAwesomeIcon icon={faStore}/><span><strong>Compará vendedores</strong>Precio, stock, mínimos y condiciones</span></Link><Link href="/proyectos"><FontAwesomeIcon icon={faLocationDot}/><span><strong>Recibí en tu proyecto</strong>Dirección y condiciones de descarga</span></Link><Link href="/como-funciona"><FontAwesomeIcon icon={faShieldHalved}/><span><strong>Acordá cómo pagar</strong>Anticipos y liberación según la entrega</span></Link></div>
 {!filters.department&&!filters.query&&!filters.supplier&&!filters.favoritesOnly&&<SellerHighlights/>}
 </div>;
}
