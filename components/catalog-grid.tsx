"use client";

import {CSSProperties,ReactNode,useId,useRef,useState} from "react";

// Divisible by every supported desktop column count: 1, 3 and 5.
const PAGE_SIZE=15;

export function CatalogGrid({items,resetKey="",noun="productos"}:{items:ReactNode[];resetKey?:string;noun?:string}){
 const [columns,setColumns]=useState(3);
 const [position,setPosition]=useState({key:resetKey,page:1});
 if(position.key!==resetKey)setPosition({key:resetKey,page:1});
 const listId=useId();
 const top=useRef<HTMLDivElement>(null);
 const pages=Math.max(1,Math.ceil(items.length/PAGE_SIZE));
 const page=position.key===resetKey?Math.min(position.page,pages):1;
 const start=(page-1)*PAGE_SIZE;
 function go(next:number,scroll=false){
  setPosition({key:resetKey,page:Math.max(1,Math.min(next,pages))});
  if(scroll)top.current?.scrollIntoView({behavior:"smooth",block:"start"});
 }
 function pagination(scroll=false){return <nav className="catalog-pagination" aria-label={scroll?"Paginación inferior":"Paginación del catálogo"}>
  <button type="button" aria-label="Primera página" title="Primera página" aria-controls={listId} disabled={page===1} onClick={()=>go(1,scroll)}>«</button>
  <button type="button" aria-label="Página anterior" title="Página anterior" aria-controls={listId} disabled={page===1} onClick={()=>go(page-1,scroll)}>‹</button>
  <label>Página <select aria-label={scroll?"Elegir página al pie":"Elegir página"} value={page} onChange={e=>go(Number(e.target.value),scroll)}>{Array.from({length:pages},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}</select><span>de {pages}</span></label>
  <button type="button" aria-label="Página siguiente" title="Página siguiente" aria-controls={listId} disabled={page===pages} onClick={()=>go(page+1,scroll)}>›</button>
  <button type="button" aria-label="Última página" title="Última página" aria-controls={listId} disabled={page===pages} onClick={()=>go(pages,scroll)}>»</button>
 </nav>;}
 return <div className={`catalog-browser columns-${columns}`} style={{"--catalog-columns":columns} as CSSProperties} ref={top}>
  <div className="catalog-viewbar"><fieldset className="catalog-columns"><legend>{noun==="servicios"?"Servicios":"Productos"} por fila</legend><div>{[1,3,5].map(n=><button key={n} type="button" aria-pressed={columns===n} onClick={()=>setColumns(n)}>{n}</button>)}</div></fieldset>{pagination()}</div>
  <p className="catalog-range" role="status">{items.length?`Mostrando ${start+1}–${Math.min(start+PAGE_SIZE,items.length)} de ${items.length} ${noun}`:`Sin ${noun}`}</p>
  <div className="product-grid catalog-product-grid" id={listId}>{items.slice(start,start+PAGE_SIZE)}</div>
  {items.length>0&&<div className="catalog-page-footer">{pagination(true)}</div>}
 </div>;
}
