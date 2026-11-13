import { type ReactNode, useEffect } from 'react';
import { AlertCircle, Check, ChevronDown, Search, X } from 'lucide-react';
import type { AppState, Product } from './types';
import { number, statusOf } from './types';

export function Card({children,className='',title,action}:{children:ReactNode;className?:string;title?:string;action?:ReactNode}){
  return <div className={`panel ${className}`}>{title&&<div className="panel-head"><h3>{title}</h3>{action}</div>}{children}</div>;
}
export function Button({children,variant='primary',type='button',onClick,disabled=false,className=''}:{children:ReactNode;variant?:'primary'|'soft'|'outline'|'ghost'|'danger';type?:'button'|'submit';onClick?:()=>void;disabled?:boolean;className?:string}){
  return <button type={type} disabled={disabled} className={`button button-${variant} ${className}`} onClick={onClick}>{children}</button>;
}
export function Badge({status,children}:{status:'critical'|'low'|'ok'|'info'|'pending'|'success';children:ReactNode}){
  return <span className={`badge badge-${status}`}><span className="status-dot"/>{children}</span>;
}
export function StatusBadge({product}:{product:Product}){
  const status=statusOf(product);
  return <Badge status={status}>{status==='critical'?'Crítico':status==='low'?'Baixo':'Regular'}</Badge>;
}
export function PageHeading({eyebrow,title,subtitle,action}:{eyebrow:string;title:string;subtitle?:string;action?:ReactNode}){
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{subtitle&&<p>{subtitle}</p>}</div>{action&&<div className="heading-action">{action}</div>}</div>;
}
export function Stat({icon,title,value,foot,tone='normal'}:{icon:ReactNode;title:string;value:string;foot:string;tone?:'normal'|'red'|'green'}){
  return <Card className="stat-card"><div className="stat-top"><span>{title}</span><div className={`stat-icon stat-${tone}`}>{icon}</div></div><div className="stat-value">{value}</div><div className="stat-foot">{foot}</div></Card>;
}
export function Modal({title,subtitle,children,onClose,footer,width='medium'}:{title:string;subtitle?:string;children:ReactNode;onClose:()=>void;footer?:ReactNode;width?:'medium'|'wide'}){
  useEffect(()=>{const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')onClose();};document.addEventListener('keydown',onKey);return()=>document.removeEventListener('keydown',onKey);},[onClose]);
  return <div className="modal-layer" onMouseDown={event=>{if(event.target===event.currentTarget)onClose();}}><section className={`modal modal-${width}`} role="dialog" aria-modal="true" aria-label={title}>
    <div className="modal-header"><div><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div><button aria-label="Fechar" className="icon-button" onClick={onClose}><X size={19}/></button></div>
    <div className="modal-body">{children}</div>{footer&&<div className="modal-footer">{footer}</div>}
  </section></div>;
}
export function Field({label,children,hint}:{label:string;children:ReactNode;hint?:string}){return <label className="field"><span className="field-label">{label}</span>{children}{hint&&<small>{hint}</small>}</label>;}
export function SearchField({value,onChange,placeholder='Pesquisar produtos...'}:{value:string;onChange:(value:string)=>void;placeholder?:string}){return <div className="search-wrap"><Search size={17}/><input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} aria-label="Pesquisar"/></div>;}
export function CategorySelect({value,onChange,categories,allLabel='Todas as categorias'}:{value:string;onChange:(value:string)=>void;categories:string[];allLabel?:string}){
  return <div className="select-wrap"><select aria-label="Filtrar categoria" value={value} onChange={e=>onChange(e.target.value)}><option value="all">{allLabel}</option>{categories.map(c=><option key={c}>{c}</option>)}</select><ChevronDown size={16}/></div>;
}
export function ProductSelect({data,value,onChange,placeholder='Selecione um produto',excluded=[]}:{data:AppState;value:string;onChange:(id:string)=>void;placeholder?:string;excluded?:string[]}){
  return <select value={value} onChange={e=>onChange(e.target.value)} required><option value="">{placeholder}</option>{data.products.filter(p=>p.active&&!excluded.includes(p.id)).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')).map(p=><option key={p.id} value={p.id}>{p.name} · {number(p.stock,2)} {p.unit}</option>)}</select>;
}
export function Notice({children,tone='neutral'}:{children:ReactNode;tone?:'neutral'|'warn'|'success'}){return <div className={`notice notice-${tone}`}><AlertCircle size={17}/><div>{children}</div></div>;}
export function Empty({title,description,action}:{title:string;description:string;action?:ReactNode}){return <div className="empty"><div className="empty-icon"><Check size={23}/></div><strong>{title}</strong><p>{description}</p>{action}</div>;}
export function StockNumber({product}:{product:Product}){return <span className={statusOf(product)==='critical'?'stock-critical':statusOf(product)==='low'?'stock-low':''}>{number(product.stock,2)} <span className="muted">{product.unit}</span></span>;}
export function KitSwitcher({kits,selected,onChange}:{kits:AppState['kits'];selected:string;onChange:(id:string)=>void}){
  return <div className="kit-switcher">{kits.map((k,i)=><button key={k.id} onClick={()=>onChange(k.id)} className={selected===k.id?'active':''}><span className="kit-switch-index">0{i+1}</span>{k.name}</button>)}</div>;
}
