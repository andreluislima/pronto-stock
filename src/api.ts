import type { AppState } from './types';

export async function loadState():Promise<AppState>{
  const response=await fetch('/api/state',{cache:'no-store'});
  if(!response.ok)throw new Error('Não foi possível acessar a API local. Verifique se o servidor está ligado.');
  return response.json() as Promise<AppState>;
}
export async function updateState(path:string,body:unknown,method:'POST'|'PUT'|'PATCH'='POST'):Promise<AppState>{
  const response=await fetch('/api'+path,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(!response.ok){
    const error=await response.json().catch(()=>({error:`Erro HTTP ${response.status}`})) as {error:string};
    throw new Error(error.error||`Erro HTTP ${response.status}`);
  }
  return response.json() as Promise<AppState>;
}
export function downloadCsv(name:string,rows:(string|number)[][]){
  const csv='\uFEFF'+rows.map(row=>row.map(cell=>`"${String(cell).replaceAll('"','""')}"`).join(';')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const anchor=document.createElement('a');anchor.href=url;anchor.download=name;document.body.append(anchor);anchor.click();anchor.remove();URL.revokeObjectURL(url);
}
