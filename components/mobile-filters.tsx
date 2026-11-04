"use client";
import {useRef,useState,type ReactNode} from 'react';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faSliders,faChevronDown} from '@fortawesome/free-solid-svg-icons';
export function MobileFilters({children,id,label}:{children:ReactNode;id:string;label:string}){const [open,setOpen]=useState(false),trigger=useRef<HTMLButtonElement>(null);return <div className={'mobile-filters'+(open?' is-open':'')}><button ref={trigger} type="button" className="mobile-filters-toggle" aria-controls={id} aria-expanded={open} onClick={()=>setOpen(!open)}><FontAwesomeIcon icon={faSliders}/>{open?'Ocultar filtros':label}<FontAwesomeIcon icon={faChevronDown}/></button><div className="mobile-filters-content" id={id}>{children}<button className="mobile-filters-done" type="button" onClick={()=>{setOpen(false);trigger.current?.focus();trigger.current?.scrollIntoView({block:'nearest'});}}>Ver resultados</button></div></div>;}
