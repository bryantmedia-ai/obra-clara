"use client";

import {useEffect,useId,useRef,useState} from "react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faArrowDownWideShort} from "@fortawesome/free-solid-svg-icons/faArrowDownWideShort";
import {faCheck} from "@fortawesome/free-solid-svg-icons/faCheck";

const options=[
 {value:"arrival",label:"Entrega más rápida"},
 {value:"price",label:"Menor precio"},
 {value:"price-desc",label:"Mayor precio"},
];

export function ProductSort({value,onChange}:{value:string;onChange:(value:string)=>void}){
 const [open,setOpen]=useState(false);
 const root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null);
 const id=useId(),label=options.find(option=>option.value===value)?.label??options[0].label;
 useEffect(()=>{
  if(!open)return;
  function outside(event:PointerEvent){if(!root.current?.contains(event.target as Node))setOpen(false);}
  function escape(event:KeyboardEvent){if(event.key==="Escape"){setOpen(false);trigger.current?.focus();}}
  document.addEventListener("pointerdown",outside);
  document.addEventListener("keydown",escape);
  root.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus();
  return ()=>{document.removeEventListener("pointerdown",outside);document.removeEventListener("keydown",escape);};
 },[open]);
 return <div className="product-sort" ref={root}>
  <button ref={trigger} type="button" className="product-sort-trigger" aria-label={`Ordenar productos: ${label}`} title={`Ordenar: ${label}`} aria-haspopup="menu" aria-expanded={open} aria-controls={open?id:undefined} onClick={()=>setOpen(!open)} onKeyDown={event=>{if(event.key==="ArrowDown"||event.key==="ArrowUp"){event.preventDefault();setOpen(true);}}}>
   <FontAwesomeIcon icon={faArrowDownWideShort}/>
  </button>
  {open&&<div id={id} className="product-sort-menu" role="menu" aria-label="Ordenar productos" onKeyDown={event=>{
   const buttons=Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button'));
   const current=buttons.indexOf(document.activeElement as HTMLButtonElement);
   const next=event.key==="ArrowDown"?(current+1)%buttons.length:event.key==="ArrowUp"?(current-1+buttons.length)%buttons.length:event.key==="Home"?0:event.key==="End"?buttons.length-1:-1;
   if(next>=0){event.preventDefault();buttons[next].focus();}
   if(event.key==="Tab")setOpen(false);
  }}>
   {options.map(option=><button key={option.value} type="button" role="menuitemradio" aria-checked={value===option.value} onClick={()=>{onChange(option.value);setOpen(false);trigger.current?.focus();}}><span>{option.label}</span>{value===option.value&&<FontAwesomeIcon icon={faCheck}/>}</button>)}
  </div>}
 </div>;
}
