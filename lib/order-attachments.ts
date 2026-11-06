export const orderFileLimit=20*1024*1024;
export const orderChunkSize=512*1024;
export const orderAttachmentLimit=6;
export type OrderAttachment={id:string;orderId:string;name:string;type:string;size:number};
const types:Record<string,string>={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif',avif:'image/avif',heic:'image/heic',heif:'image/heif',mp4:'video/mp4',mov:'video/quicktime',webm:'video/webm',mp3:'audio/mpeg',wav:'audio/wav',m4a:'audio/mp4',ogg:'audio/ogg',oga:'audio/ogg',opus:'audio/ogg',aac:'audio/aac',flac:'audio/flac',pdf:'application/pdf',doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xls:'application/vnd.ms-excel',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',ppt:'application/vnd.ms-powerpoint',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',csv:'text/csv',txt:'text/plain',zip:'application/zip',dwg:'application/acad',dxf:'application/dxf'};
export const orderFileAccept=Object.keys(types).map(extension=>'.'+extension).join(',');
export function orderFileType(name:string,provided=''){const extension=name.split('.').at(-1)?.toLowerCase()??'';const type=types[extension];if(extension==='webm'&&provided==='audio/webm')return provided;return type??'';}
export function validateOrderAttachment(value:unknown,orderId:string):OrderAttachment{
 const file=value as Partial<OrderAttachment>;
 if(!file||typeof file.id!=='string'||!/^[-a-zA-Z0-9]{20,80}$/.test(file.id)||file.orderId!==orderId||typeof file.name!=='string'||!file.name.trim()||file.name.length>180||/[\x00-\x1f\x7f/\\]/.test(file.name)||typeof file.type!=='string'||orderFileType(file.name,file.type)!==file.type||!file.type||!Number.isSafeInteger(file.size)||file.size!<=0||file.size!>orderFileLimit)throw new Error('Adjunto inválido. Usá fotos, videos, audios o documentos de hasta 20 MB vinculados a esta orden.');
 return {id:file.id,orderId,name:file.name,type:file.type,size:file.size!};
}
