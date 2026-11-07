"use client";
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {WorkspaceHeading} from './workspace-ui';
import {BuyerIdentity} from './buyer-identity';
import {buyerProfile} from '../lib/buyer-profile';
const defaults={name:'',taxId:'',industry:'',contact:buyerProfile.name};
export function CompanySettings(){
 const [profile,setProfile]=useState(defaults),[saved,setSaved]=useState('');
 useEffect(()=>{try{const p=JSON.parse(localStorage.getItem('oc-buyer-profile-jose-v1')||'null');if(p&&typeof p.contact==='string')setProfile({...defaults,...p,contact:p.contact||buyerProfile.name});}catch{}},[]);
 return <div className="settings-workspace"><WorkspaceHeading title="Perfil del comprador" description="José figura como contratista. Lo que no está verificado queda pendiente."/><BuyerIdentity/><div className="settings-columns"><form className="panel settings-form" onSubmit={e=>{e.preventDefault();localStorage.setItem('oc-buyer-profile-jose-v1',JSON.stringify(profile));setSaved('Datos guardados en este navegador.');}}><h3>Datos pendientes</h3><div className="form-grid">{[['name','Razón social'],['taxId','CUIT'],['industry','Actividad']].map(([id,label])=><label key={id}>{label}<input maxLength={160} placeholder="Pendiente" value={profile[id as keyof typeof profile]} onChange={e=>{setProfile({...profile,[id]:e.target.value});setSaved('');}}/></label>)}<label>Nombre verificado<input value={buyerProfile.name} readOnly/></label><label>Rol<input value={buyerProfile.role} readOnly/></label></div><footer className="workspace-actions"><button className="button primary" type="submit">Guardar datos</button>{saved&&<span role="status">{saved}</span>}</footer></form><div className="settings-aside"><section className="panel"><h3>Belo y wallet</h3><p>Origen informado de la cuenta Belo: {buyerProfile.beloOriginArs.toLocaleString('es-AR')} ARS. No vincula una wallet Core ni autoriza a firmar.</p><p>Wallet firmante: {buyerProfile.coreWallet||'sin asignar'}.</p><Link className="button secondary" href="/fondos">Abrir Fondos →</Link></section><section className="panel"><h3>Obras y responsables</h3><p>Los contactos de recepción de cada obra siguen en el proyecto. No se completan con datos de José.</p><Link className="button secondary" href="/proyectos">Administrar proyectos →</Link></section></div></div></div>;
}
