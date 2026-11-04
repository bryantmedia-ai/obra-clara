"use client";
import Link from "next/link";
import {useCart,updateCart} from "./cart-store";
import {useProjects} from "./project-store";
import {projectReady,projectAddress,projectCode} from "./project-data";
export function ProjectSelector(){const cart=useCart();const projects=useProjects();const project=projects.find(p=>p.id===cart.projectId);return <section className="panel project-shopping-selector"><label className="cart-field">Proyecto para los próximos productos<select value={cart.projectId} onChange={e=>updateCart(s=>({...s,projectId:e.target.value}))}><option value="">Sin asignar · elegir luego</option>{projects.map(p=><option key={p.id} value={p.id}>{projectCode(p)} · {p.name}{!projectReady(p)?" · Completar datos":""}</option>)}</select></label><div>{project?<><strong>{project.name}</strong><p>{projectAddress(project)}</p>{!projectReady(project)&&<small>Completá sus datos para habilitar la compra.</small>}</>:<p>Asigná una obra a los productos que agregues. También podés hacerlo en el carrito.</p>}<Link href="/proyectos">Gestionar proyectos →</Link></div></section>;}
