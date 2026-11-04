export {buildOverview} from './overview-model';
export const financeTodayFallback=(now=new Date().toISOString())=>new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Argentina/Buenos_Aires'}).format(new Date(now));
