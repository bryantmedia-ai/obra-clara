import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
const cache=new Map();
export function load(file){if(cache.has(file))return cache.get(file);const exports={};cache.set(file,exports);vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,{exports,structuredClone,URL,URLSearchParams,Request,Response,fetch,AbortSignal,require:name=>{const target=path.normalize(path.join(path.dirname(file),name));return name.endsWith('.json')?JSON.parse(fs.readFileSync(target)):load(target+'.ts');}});return exports;}
