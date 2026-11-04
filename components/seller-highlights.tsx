"use client";
import Link from "next/link";
import {useProviders} from "./provider-store";
import {useSupplierOffers} from "./supplier-offers";
export function SellerHighlights(){const providers=useProviders();const offers=useSupplierOffers();return <section className="marketplace-sellers"><div className="section-head"><div><h2>Cada proveedor, su propia tienda.</h2><p>Fabricantes, productores y distribuidores de todos los tamaños.</p></div><Link href="/proveedores">Explorar vendedores →</Link></div><div className="marketplace-seller-tiles">{providers.slice(-3).map(p=><Link key={p.slug} href={`/proveedores/${p.slug}`}><span className="marketplace-seller-initials">{p.initials}</span><div><h3>{p.name}</h3><p>{p.businessType} · {p.companySize}</p><small>{p.area} · {offers.filter(o=>o.supplier.slug===p.slug).length} ofertas</small></div><span aria-hidden="true">→</span></Link>)}</div></section>;}
