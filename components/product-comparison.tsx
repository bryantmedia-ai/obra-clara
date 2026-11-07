"use client";
import {directPriceIssue} from "../lib/pricing-model";
import {useEffect,useRef} from "react";
import {productImage} from "./product-images";
import Link from "next/link";
import {Product} from "./marketplace-data";
import {saleUnits} from "./sale-units";
export function ProductComparison({products,onClose}:{products:Product[];onClose:()=>void}){const ref=useRef<HTMLDialogElement>(null);useEffect(()=>{ref.current?.showModal();},[]);return <dialog ref={ref} className="retail-compare-dialog" onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose();}} aria-labelledby="compare-title"><div className="retail-compare-heading"><h2 id="compare-title">Comparar productos</h2><button type="button" className="button secondary" onClick={onClose}>Cerrar ✕</button></div><div className="retail-compare-scroll"><table><thead><tr><th>Producto</th>{products.map(p=><th key={p.id}><img src={productImage(p.image)} alt=""/><Link href={`/productos/${p.id}`} onClick={onClose}>{p.name}</Link></th>)}</tr></thead><tbody>{[
 ["Proveedor",...products.map(p=>p.supplier.name)], ["Marca",...products.map(p=>p.brand)], ["Modelo",...products.map(p=>p.model)], ["Presentación",...products.map(p=>`${p.format??`${p.kg} kg`} · ${saleUnits(p.pack,p.saleLabel,p.unit)}`)], ["Precio",...products.map(p=>directPriceIssue(p)?"Solicitar cotización":`${p.price.toLocaleString("es-AR")} ARGt`)], ["Stock",...products.map(p=>`${p.stock} ${p.stockUnit??"presentaciones"}`)], ["Entrega",...products.map(p=>p.shippingIncluded?"Incluye envío":"Coordinar entrega con el proveedor")]
].map(row=><tr key={row[0]}>{row.map((cell,i)=>i===0?<th key={i}>{cell}</th>:<td key={i}>{cell}</td>)}</tr>)}</tbody></table></div></dialog>;}
