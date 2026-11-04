"use client";
import {queueShared} from "./shared-demo";
import {useEffect,useState} from "react";
import {initialProjects,Project} from "./project-data";
const key="obra-clara-projects-v1";
export function readProjects():Project[]{if(typeof window==="undefined")return initialProjects;try{const saved=JSON.parse(localStorage.getItem(key)??"null");return Array.isArray(saved)?saved:initialProjects;}catch{return initialProjects;}}
export function saveProject(project:Project){const projects=readProjects();localStorage.setItem(key,JSON.stringify(projects.some(p=>p.id===project.id)?projects.map(p=>p.id===project.id?project:p):[...projects,project]));window.dispatchEvent(new Event("oc-projects-updated"));queueShared("project",project);}
export function useProjects(){const [projects,setProjects]=useState<Project[]>(initialProjects);useEffect(()=>{const refresh=()=>setProjects(readProjects());refresh();window.addEventListener("oc-projects-updated",refresh);window.addEventListener("storage",refresh);return()=>{window.removeEventListener("oc-projects-updated",refresh);window.removeEventListener("storage",refresh);};},[]);return projects;}
