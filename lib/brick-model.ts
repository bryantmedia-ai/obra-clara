export type BrickAttachment={id:string;name:string;type:string;size:number};
export type BrickMessage={id:string;role:'user'|'assistant';text:string;createdAt:string;attachments?:BrickAttachment[]};
export type BrickChat={id:string;title:string;createdAt:string;updatedAt:string;messages:BrickMessage[];archivedAt?:string;deletedAt?:string};
export type BrickDraft={text:string;files:BrickAttachment[];requestId?:string};
export type BrickUI={activeId:string|null;mode:'closed'|'open'|'minimized';drafts:Record<string,BrickDraft>};
export const emptyBrickUI=():BrickUI=>({activeId:null,mode:'closed',drafts:{}});
export function transitionBrick(ui:BrickUI,action:'open'|'minimize'|'close'|'new',id:string):BrickUI{if(action==='close')return {...ui,activeId:null,mode:'closed'};if(action==='minimize')return {...ui,mode:'minimized'};return {...ui,activeId:action==='new'||!ui.activeId?id:ui.activeId,mode:action==='new'?ui.mode:'open'};}
export function applyBrickCommand(chats:BrickChat[],type:string,payload:unknown,now:string):BrickChat[]{
 const p=payload as Record<string,unknown>;const result=structuredClone(chats);
 if(type==='chat.save'){
  const chat=p.chat as BrickChat;if(!chat||typeof chat.id!=='string'||!chat.id||chat.id.length>100||typeof chat.title!=='string'||!Array.isArray(chat.messages)||chat.messages.length>400)throw new Error('Conversación inválida.');
  const existing=result.find(v=>v.id===chat.id);if(existing?.deletedAt)throw new Error('Este chat fue eliminado. Empezá uno nuevo.');if(existing?.archivedAt)throw new Error('Restaurá este chat antes de continuar.');
  for(const m of chat.messages){if(!m.id||!['user','assistant'].includes(m.role)||typeof m.text!=='string'||m.text.length>12000||!Array.isArray(m.attachments??[])||(m.attachments?.length??0)>6)throw new Error('Mensaje inválido.');for(const a of m.attachments??[])if(typeof a.id!=='string'||!a.id||typeof a.type!=='string'||typeof a.name!=='string'||a.name.length>300||!Number.isFinite(a.size)||a.size<0)throw new Error('Adjunto inválido.');}
  const messages=new Map((existing?.messages??[]).map(m=>[m.id,m]));for(const m of chat.messages)if(!messages.has(m.id))messages.set(m.id,m);
  if(messages.size>400)throw new Error('Este chat llegó al límite de mensajes. Creá uno nuevo.');
  const next:BrickChat={id:chat.id,title:(existing?.title||chat.title).slice(0,90)||'Nuevo chat',createdAt:existing?.createdAt??now,updatedAt:now,messages:[...messages.values()]};
  if(!existing&&result.filter(c=>!c.deletedAt).length>=200)throw new Error('Eliminá conversaciones antiguas para liberar espacio.');return [next,...result.filter(c=>c.id!==chat.id)];
 }
 const chat=result.find(c=>c.id===p.chatId);if(!chat||chat.deletedAt)throw new Error('Conversación no encontrada.');
 if(type==='chat.archive')chat.archivedAt=p.archived?now:undefined;
 else if(type==='chat.delete'){chat.deletedAt=now;chat.messages=[];}
 else throw new Error('Operación de chat inválida.');chat.updatedAt=now;return result;
}
