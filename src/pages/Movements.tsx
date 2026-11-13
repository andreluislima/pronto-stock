import { useMemo, useState } from 'react';
import { Download, History } from 'lucide-react';
import { Button, Card, PageHeading, SearchField } from '../components';
import { downloadCsv } from '../api';
import { useApp } from '../context';
import { dateLabel, money, number } from '../types';
import { movementName, movementTypeName } from './Dashboard';
export function Movements(){
  const {data}=useApp();
  const [type,setType]=useState('all'),[search,setSearch]=useState(''),[since,setSince]=useState(''),[until,setUntil]=useState('');
  const movements=useMemo(()=>data.movements.filter(m=>{
    if(type!=='all'&&m.type!==type)return false;
    if(since&&m.date<since)return false;
    if(until&&m.date>until)return false;
    return `${movementName(data,m)} ${m.note} ${movementTypeName(m.type)}`.toLowerCase().includes(search.toLowerCase());
  }).sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt.localeCompare(a.createdAt)),[data,type,search,since,until]);
  const exportCsv=()=>downloadCsv('pronto-stock-movimentacoes.csv',[['Data','Tipo','Produto/kit','Quantidade','Custo unitário','Preço de venda','Observação'],...movements.map(m=>[dateLabel(m.date),movementTypeName(m.type),movementName(data,m),m.quantity,m.unitCost??'',m.salePrice??'',m.note])]);
  return <div className="page"><PageHeading eyebrow="HISTÓRICO" title="Movimentações" subtitle="Rastreabilidade completa: entradas, saídas, montagens e vendas." action={<Button variant="outline" onClick={exportCsv}><Download size={17}/> Exportar histórico</Button>}/>
    <Card className="table-panel"><div className="table-toolbar"><SearchField value={search} onChange={setSearch} placeholder="Buscar por item ou observação..."/><div className="select-wrap"><select value={type} onChange={e=>setType(e.target.value)}><option value="all">Todos os tipos</option><option value="entrada">Entradas</option><option value="saida">Saídas</option><option value="montagem">Montagens</option><option value="venda-kit">Vendas de kit</option></select></div><div className="date-filter"><label>De <input type="date" value={since} onChange={e=>setSince(e.target.value)}/></label><label>Até <input type="date" value={until} onChange={e=>setUntil(e.target.value)}/></label></div></div>
      <div className="table-scroll"><table><thead><tr><th>DATA</th><th>TIPO</th><th>PRODUTO / MODELO</th><th>QUANTIDADE</th><th>VALOR</th><th>OBSERVAÇÃO</th></tr></thead><tbody>{movements.map(m=><tr key={m.id}><td>{dateLabel(m.date)}</td><td><span className={`movement-type movement-${m.type}`}>{movementTypeName(m.type)}</span></td><td><div className="product-name">{movementName(data,m)}</div>{m.type==='montagem'&&<small className="muted">Composição registrada no histórico</small>}</td><td className={`weight-700 ${m.type==='entrada'?'text-success':m.type==='saida'||m.type==='venda-kit'?'text-danger':''}`}>{m.type==='entrada'?'+':m.type==='saida'||m.type==='venda-kit'?'−':''}{number(m.quantity,2)}</td><td>{m.type==='venda-kit'?money((m.salePrice||0)*m.quantity):m.unitCost!==undefined?money(m.unitCost*m.quantity):'—'}</td><td className="muted">{m.note||'—'}</td></tr>)}</tbody></table></div>
      {movements.length===0&&<div className="empty-table"><History size={27}/><p>Não existem movimentações para os filtros selecionados.</p></div>}<div className="table-footer">{movements.length} movimentações encontradas <span>Histórico preservado mesmo após alterar custos ou composição</span></div>
    </Card>
  </div>;
}
