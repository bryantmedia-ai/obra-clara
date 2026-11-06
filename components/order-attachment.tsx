"use client";
import {useEffect,useRef,useState} from 'react';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faFile,faImage,faVideo,faVolumeHigh,faDownload} from '@fortawesome/free-solid-svg-icons';
import type {OrderAttachment} from '../lib/order-attachments';
import {readOrderFile} from './order-files';
export const attachmentSize=(size:number)=>size>=1024*1024?(size/1024/1024).toLocaleString('es-AR',{maximumFractionDigits:1})+' MB':Math.max(1,Math.ceil(size/1024))+' KB';
export function OrderAttachmentCard({file}:{file:OrderAttachment}){
 const [url,setURL]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');const pending=useRef<Promise<string>|null>(null);
 useEffect(()=>()=>{if(url)URL.revokeObjectURL(url);},[url]);
 const image=/^image\/(jpeg|png|webp|gif|avif)$/.test(file.type),video=file.type.startsWith('video/'),audio=file.type.startsWith('audio/');
 async function open(download=false){setError('');setBusy(true);try{let href=url;if(!href){if(!pending.current)pending.current=readOrderFile(file).then(blob=>URL.createObjectURL(blob));href=await pending.current;setURL(href);}if(download||(!image&&!video&&!audio)){const link=document.createElement('a');link.href=href;link.download=file.name;link.click();}}catch(e){pending.current=null;setError(e instanceof Error?e.message:'No se pudo abrir el archivo. Reintentá.');}finally{setBusy(false);}}
 return <div className="order-attachment"><div className="order-attachment-title"><FontAwesomeIcon icon={image?faImage:video?faVideo:audio?faVolumeHigh:faFile}/><div><strong>{file.name}</strong><small>{attachmentSize(file.size)}</small></div></div>{url&&(image?<img src={url} alt={file.name}/>:video?<video src={url} controls preload="metadata"/>:audio?<audio src={url} controls preload="metadata"/>:null)}<div className="order-attachment-actions">{(image||video||audio)&&!url&&<button type="button" disabled={busy} onClick={()=>void open()}>{busy?'Abriendo…':image?'Ver foto':video?'Ver video':'Escuchar audio'}</button>}<button type="button" disabled={busy} aria-label={'Descargar '+file.name} onClick={()=>void open(true)}><FontAwesomeIcon icon={faDownload}/>{busy?'Cargando…':'Descargar'}</button></div>{error&&<p className="order-file-error" role="alert">{error}</p>}</div>;
}
