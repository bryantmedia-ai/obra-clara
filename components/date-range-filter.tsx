"use client";
import {DateInput} from './date-input';
import {useEffect,useState,type ReactNode} from 'react';
import {validProjectRange} from '../lib/project-metrics';
const date=(value:string)=>new Date(value+'T12:00:00Z').toLocaleDateString('es-AR',{day:'numeric',month:'short',year:'numeric'});
export function DateRangeFilter({start,end,today,count,onApply,onReset,children,dateLabel='Fecha de compra',noun='compra',allowFuture=false,applyLabel}:{mode:string;start:string;end:string;today:string;count:number;onPreset:(mode:string)=>void;onApply:(start:string,end:string)=>void;onReset:()=>void;children:ReactNode;dateLabel?:string;noun?:string;allowFuture?:boolean;applyLabel?:string}){
 const [from,setFrom]=useState(start),[to,setTo]=useState(end);
 useEffect(()=>{setFrom(start);setTo(end);},[start,end]);
 const valid=validProjectRange({start:from,end:to})&&(allowFuture||to<=today);
 function update(a:string,b:string){setFrom(a);setTo(b);if(validProjectRange({start:a,end:b})&&(allowFuture||b<=today))onApply(a,b);}
 return <section className="date-range-filter" aria-label="Filtros de fecha y proyectos"><header><span>{dateLabel}</span></header><div className="scope-filter-dates"><DateInput label="Desde" name="start" value={from} onChange={value=>update(value,to)} max={to||(allowFuture?undefined:today)} today={today}/><DateInput label="Hasta" name="end" value={to} onChange={value=>update(from,value)} min={from||undefined} max={allowFuture?undefined:today} today={today}/></div>{!valid&&<p className="scope-date-error" role="alert">Elegí una fecha válida. En un rango, la fecha final debe ser igual o posterior a la inicial.</p>}<div className="date-range-fields">{children}<button type="button" className={applyLabel?"button primary date-range-apply":"button secondary date-range-reset"} disabled={!!applyLabel&&!valid} onClick={()=>applyLabel?onApply(from,to):onReset()}>{applyLabel??'Restablecer'}</button></div><div className="date-range-applied" role="status"><span>{start===end?'Fecha aplicada:':'Período aplicado:'} <strong>{date(start)}{start!==end&&' — '+date(end)}</strong></span><span>{count} {count===1?noun:({orden:'órdenes',cotización:'cotizaciones',solicitud:'solicitudes'} as Record<string,string>)[noun]??noun+'s'}</span></div></section>;
}
