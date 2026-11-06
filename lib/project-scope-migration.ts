import {demoProjectIds,retiredDemoProjectIds} from '../components/demo-project-scope';
import {initialProjects} from '../components/project-data';
import {sampleOverviewOrders,dayOffset} from './overview-model';
import type {SharedState} from './demo-model';

// One-time cleanup of the approved mockup scope. Later user-created projects survive.
export function reduceDemoProjects(original:SharedState,now=new Date().toISOString()):SharedState{
 if(original.projectScopeVersion===1)return original;
 const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Argentina/Buenos_Aires'}).format(new Date(now));
 const s=structuredClone(original);const keep=new Set<string>(demoProjectIds);
 const removedProjects=s.projects.filter(p=>!keep.has(p.id));
 const removedOrders=s.orders.filter(o=>!keep.has(o.project.id));
 const removedContracts=(s.finance?.contracts??[]).filter(c=>!keep.has(c.projectId));
 const removedOrderIds=new Set([...removedOrders.map(o=>o.id),...removedContracts.map(c=>c.orderId)]);
 const removedContractIds=new Set(removedContracts.map(c=>c.id));
 const removedReferences=[...removedProjects.flatMap(p=>[p.id,p.name,p.address]),...removedOrders.map(o=>o.id),...removedContracts.flatMap(c=>[c.id,c.orderId,c.project])].filter(v=>v.length>=5);
 const mentionsRemoved=(value:unknown)=>{const text=JSON.stringify(value).toLocaleLowerCase('es');return removedReferences.some(ref=>text.includes(ref.toLocaleLowerCase('es')));};
 s.retiredProjectIds=[...new Set([...(s.retiredProjectIds??[]),...retiredDemoProjectIds,...removedProjects.map(p=>p.id),...removedOrders.map(o=>o.project.id)])];
 s.projects=demoProjectIds.map(id=>s.projects.find(p=>p.id===id)??structuredClone(initialProjects.find(p=>p.id===id)!));
 s.orders=s.orders.filter(o=>keep.has(o.project.id));
 // Restore only stock physically consumed by removed receipts. Reservations are derived.
 for(const order of removedOrders)for(const line of order.lines){const offer=s.offers.find(p=>p.id===line.id);if(offer)offer.stock+=line.received;}
 s.productQuotes=s.productQuotes?.filter(q=>keep.has(q.project.id));
 s.catalogRequests=s.catalogRequests?.filter(q=>keep.has(q.project.id));
 s.transportRequests=s.transportRequests?.filter(t=>keep.has(t.project.id)&&(!t.orderId||!removedOrderIds.has(t.orderId)));
 const activeOrderIds=new Set([...s.orders.map(o=>o.id),...sampleOverviewOrders(today).map(o=>o.id)]);
 if(s.procurement){s.procurement.deliveries=Object.fromEntries(Object.entries(s.procurement.deliveries).filter(([id])=>activeOrderIds.has(id)));s.procurement.moves=s.procurement.moves.filter(m=>activeOrderIds.has(m.lotId.split('::')[0])&&(!m.destination||keep.has(m.destination)));}
 if(s.finance){const f=s.finance;
  f.contracts=f.contracts.filter(c=>keep.has(c.projectId));const contractIds=new Set(f.contracts.map(c=>c.id));
  f.requests=f.requests.filter(r=>contractIds.has(r.contractId));const requestIds=new Set(f.requests.map(r=>r.id));
  const removedMovementIds=new Set(f.movements.filter(m=>m.projectId&&!keep.has(m.projectId)||m.contractId&&removedContractIds.has(m.contractId)||m.orderId&&removedOrderIds.has(m.orderId)||m.requestId&&!requestIds.has(m.requestId)).map(m=>m.id));
  f.movements=f.movements.filter(m=>!removedMovementIds.has(m.id)&&!mentionsRemoved(m));
  f.statements=f.statements.filter(row=>(!row.movementId||!removedMovementIds.has(row.movementId))&&!mentionsRemoved(row));
  f.audit=f.audit.filter(row=>!mentionsRemoved(row));
  // Rebase the remaining mock ledger without creating payments or refunds.
  f.opening=f.wallet+f.contracts.reduce((n,c)=>n+c.funded-c.refunded,0);
  const otherDelta=f.movements.filter(m=>m.id!=='MOV-OPEN').reduce((n,m)=>n+m.walletDelta,0);const openingDelta=f.wallet-otherDelta;
  const opening=f.movements.find(m=>m.id==='MOV-OPEN');if(opening){opening.amount=Math.abs(openingDelta);opening.walletDelta=openingDelta;opening.direction=openingDelta>=0?'Ingreso':'Egreso';}
  else f.movements.push({id:'MOV-OPEN',at:dayOffset(today,-75)+'T09:00:00-03:00',kind:'Apertura de registros',party:'Cuenta empresa',amount:Math.abs(openingDelta),walletDelta:openingDelta,direction:openingDelta>=0?'Ingreso':'Egreso',reference:'APERTURA-OC',reconciled:true,rail:'Registro OC'});
  for(const row of f.audit)if(row.id==='AUD-OPEN')row.amount=f.opening;
 }
 s.chats=s.chats?.filter(chat=>!mentionsRemoved(chat));
 s.projectScopeVersion=1;s.revision++;return s;
}
