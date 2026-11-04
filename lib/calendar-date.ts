export function isCalendarDate(value:string){if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const date=new Date(value+'T12:00:00Z');return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;}
export function localCalendarDate(value:string){return isCalendarDate(value)?value.slice(8,10)+'/'+value.slice(5,7)+'/'+value.slice(0,4):'';}
export function parseLocalCalendarDate(value:string){const match=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());if(!match)return '';const iso=match[3]+'-'+match[2]+'-'+match[1];return isCalendarDate(iso)?iso:'';}
