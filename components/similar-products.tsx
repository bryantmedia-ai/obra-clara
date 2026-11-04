"use client";
import Link from "next/link";
import {Product} from "./marketplace-data";
import {marketplaceListings} from "./marketplace-model";
import {productImage} from "./product-images";
import {productContent,productDimensions} from "./product-facets";
export function SimilarProducts({product,catalog}:{product:Product;catalog:Product[]}){
 const candidates=marketplaceListings(catalog.filter(p=>p.referenceId!==product.referenceId&&p.productType===product.productType&&(p.category??"Corralón")===(product.category??"Corralón"))).sort((a,b)=>Number(b.offer.brand===product.brand)-Number(a.offer.brand===product.brand)||a.offer.price-b.offer.price).slice(0,3).map(p=>p.offer);
 if(!candidates.length)return null;const products=[product,...candidates];
 return <section className="panel similar-products"><div className="section-head"><div><h2>Compará especificaciones antes de elegir</h2><p>Otros productos de la misma categoría. Revisá modelo, presentación y uso para tu obra.</p></div></div><div className="similar-products-scroll"><table><thead><tr><th>Producto</th>{products.map((p,i)=><th key={p.id}>{i===0&&<span className="similar-current">Estás viendo</span>}<img src={productImage(p.image)} alt=""/><Link href={`/productos/${p.id}`}>{p.name}</Link></th>)}</tr></thead><tbody>{[
 ["Marca",...products.map(p=>p.brand)], ["Modelo",...products.map(p=>p.model)], ["Dimensiones",...products.map(p=>productDimensions(p)||"Consultar ficha")], ["Contenido",...products.map(p=>productContent(p)||p.unit)], ["Presentación que comprás",...products.map(p=>p.unit)], ["Uso declarado",...products.map(p=>p.use||"Consultar al vendedor")], ["Vendedor",...products.map(p=>p.supplier.name)], ["Precio por presentación",...products.map(p=>`${p.price.toLocaleString("es-AR")} ARGt`)]
 ].map(row=><tr key={row[0]}>{row.map((v,i)=>i===0?<th key={i}>{v}</th>:<td key={i}>{v}</td>)}</tr>)}</tbody></table></div></section>;
}
