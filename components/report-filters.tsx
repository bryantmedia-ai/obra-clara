"use client";
import {useEffect,useState} from 'react';
import {DateRangeFilter} from './date-range-filter';
import {ProjectChecklist} from './project-checklist';
import {dayOffset,mondayOf} from '../lib/overview-model';
import {isCalendarDate} from '../lib/calendar-date';
import {financeToday} from '../lib/finance-model';
import {financeTodayFallback} from '../lib/procurement-source';

export const reportDay=(value:string)=>value.length>10?financeToday(value):value;
type ReportRow={projectId:string;date:string};
export function useReportFilters(rows:ReportRow[]){
 const [projectIds,setProjectIds]=useState<string[]|null>(null),[dates,setDates]=useState<{start:string;end:string}|null>(null),[mode,setMode]=useState('all'),[today,setToday]=useState('2026-11-03');
 useEffect(()=>setToday(financeTodayFallback()),[]);
 const days=rows.map(r=>reportDay(r.date)).filter(isCalendarDate).sort(),start=dates?.start??days[0]??today,end=dates?.end??(days.at(-1)&&days.at(-1)!>today?days.at(-1)!:today);
 const matchesProject=(id:string)=>projectIds===null||projectIds.includes(id);
 const matchesDate=(day:string)=>!dates||reportDay(day)>=dates.start&&reportDay(day)<=dates.end;
 function apply(start:string,end:string){setDates({start,end});setMode('custom');}
 function preset(value:string){setMode(value);if(value==='all'){setDates(null);return;}setDates({start:value==='week'?mondayOf(today):value==='30d'?dayOffset(today,-29):today.slice(0,7)+'-01',end:today});}
 function reset(){setProjectIds(null);setDates(null);setMode('all');}
 return {projectIds,setProjectIds,dates,mode,start,end,today,matchesProject,matchesDate,apply,preset,reset};
}
export function ReportFilters({filter,projects,count,dateLabel,noun='registro',allowFuture=false,showDate=true,showProjects=true}:{filter:ReturnType<typeof useReportFilters>;projects:{id:string;name:string;code?:string}[];count:number;dateLabel:string;noun?:string;allowFuture?:boolean;showDate?:boolean;showProjects?:boolean}){
 const checklist=showProjects?<ProjectChecklist projects={projects} value={filter.projectIds} onChange={filter.setProjectIds}/>:null;
 if(!showDate)return <div className="report-projects-only">{checklist}<button type="button" className="button secondary" onClick={filter.reset}>Restablecer</button></div>;
 return <DateRangeFilter mode={filter.mode} start={filter.start} end={filter.end} today={filter.today} count={count} onPreset={filter.preset} onApply={filter.apply} onReset={filter.reset} dateLabel={dateLabel} noun={noun} allowFuture={allowFuture}>{checklist}</DateRangeFilter>;
}
