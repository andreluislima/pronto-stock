import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { AppState, KitModel, Movement, PendingPurchase, Product } from '../src/types.js';

const localDir = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(localDir, 'data'));
export const DATA_FILE = path.join(DATA_DIR, 'estoque.json');
const SEED_FILE = path.join(localDir, 'seed', 'initial-data.json');
const moneyRound = (n:number)=> Math.round((n + Number.EPSILON)*100)/100;
const stockRound = (n:number)=>Math.round((n+Number.EPSILON)*1000)/1000;
const nonnegative = z.number().finite().min(0);
const positive = z.number().finite().positive();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/,'Use AAAA-MM-DD').refine(value=>{
  const d = new Date(value+'T12:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(value);
},'Data inválida');
const productSchema = z.object({id:z.string(),sku:z.string(),name:z.string(),category:z.string(),unit:z.string(),stock:nonnegative,minStock:nonnegative,unitCost:nonnegative,isBackpack:z.boolean(),active:z.boolean(),notes:z.string(),createdAt:z.string(),updatedAt:z.string()});
const componentSchema = z.object({productId:z.string(),quantity:positive});
const kitSchema = z.object({id:z.string(),name:z.string(),description:z.string(),salePrice:nonnegative,platformFeePercent:z.number().min(0).max(100),extraCost:nonnegative,components:z.array(componentSchema),updatedAt:z.string()});
const movementSchema = z.object({id:z.string(),type:z.enum(['entrada','saida','montagem','venda-kit']),date,createdAt:z.string(),productId:z.string().optional(),kitModelId:z.string().optional(),quantity:positive,unitCost:nonnegative.optional(),salePrice:nonnegative.optional(),note:z.string(),componentSnapshot:z.array(z.object({productId:z.string(),quantity:positive,unitCost:nonnegative})).optional()});
const pendingSchema = z.object({id:z.string(),productId:z.string(),quantity:positive,expectedDate:date.nullable(),note:z.string(),status:z.enum(['pendente','recebido','cancelado']),createdAt:z.string(),receivedAt:z.string().optional()});
const stateSchema = z.object({version:z.number(),products:z.array(productSchema),kits:z.array(kitSchema),movements:z.array(movementSchema),pendingPurchases:z.array(pendingSchema),finishedKits:z.record(nonnegative),updatedAt:z.string()});
const now = ()=>new Date().toISOString();
const error = (message:string)=>{throw new Error(message);};
let state:AppState;
let queue: Promise<unknown> = Promise.resolve();
let listeners = new Set<()=>void>();

function validateRelations(s:AppState){
  const products = new Set(s.products.map(p=>p.id));
  const kits = new Set(s.kits.map(k=>k.id));
  if (products.size !== s.products.length) error('Produtos duplicados.');
  if (kits.size !== s.kits.length) error('Modelos duplicados.');
  if(new Set(s.products.map(p=>p.sku.toUpperCase())).size !== s.products.length) error('SKUs duplicados.');
  for (const kit of s.kits){
    if(new Set(kit.components.map(c=>c.productId)).size!==kit.components.length) error('Item duplicado na composição.');
    for(const c of kit.components) if(!products.has(c.productId))error(`Produto não encontrado na composição: ${c.productId}`);
  }
  for(const pend of s.pendingPurchases) if(!products.has(pend.productId))error('Compra pendente com produto não encontrado.');
  for(const m of s.movements) {
    if(m.productId && !products.has(m.productId))error('Movimentação com produto não encontrado.');
    if(m.kitModelId && !kits.has(m.kitModelId))error('Movimentação com modelo não encontrado.');
  }
  for(const k of Object.keys(s.finishedKits)) if(!kits.has(k))error('Estoque de kits com modelo não encontrado.');
}
async function writeState(data:AppState, makeBackup=false){
  await fs.mkdir(DATA_DIR,{recursive:true});
  if(makeBackup){
    try {
      const backupDir = path.join(DATA_DIR, 'backups');
      await fs.mkdir(backupDir,{recursive:true});
      await fs.copyFile(DATA_FILE,path.join(backupDir,`estoque-${new Date().toISOString().slice(0,10)}.json`), (await import('node:fs')).constants.COPYFILE_EXCL);
    } catch(e){ if((e as NodeJS.ErrnoException).code !== 'EEXIST' && (e as NodeJS.ErrnoException).code!=='ENOENT')throw e; }
  }
  const tempFile = path.join(DATA_DIR,`estoque-${process.pid}.tmp`);
  await fs.writeFile(tempFile,JSON.stringify(data,null,2),'utf8');
  await fs.rename(tempFile,DATA_FILE);
}
export async function initStore(){
  await fs.mkdir(DATA_DIR,{recursive:true});
  let parsed:unknown;
  try {parsed=JSON.parse(await fs.readFile(DATA_FILE,'utf8'));}
  catch(e){
    if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;
    parsed=JSON.parse(await fs.readFile(SEED_FILE,'utf8'));
    const initial=stateSchema.parse(parsed) as AppState;
    validateRelations(initial);
    await writeState(initial);
  }
  state=stateSchema.parse(parsed) as AppState;
  validateRelations(state);
}
export const getState=():AppState=>structuredClone(state);
export const onChange=(callback:()=>void)=>{listeners.add(callback);return()=>listeners.delete(callback);};
async function mutate(fn:(s:AppState)=>void):Promise<AppState>{
  const work=queue.then(async()=>{
    const next=structuredClone(state);
    fn(next);
    next.updatedAt=now();
    validateRelations(next);
    await writeState(next,true);
    state=next;
    listeners.forEach(cb=>cb());
    return getState();
  });
  queue=work.then(()=>undefined,()=>undefined);
  return work;
}
const getProduct=(s:AppState,id:string)=>s.products.find(p=>p.id===id)||error('Produto não encontrado.');
const getKit=(s:AppState,id:string)=>s.kits.find(k=>k.id===id)||error('Modelo não encontrado.');
const fieldText = z.string().trim().min(1);
export const newProductInput=z.object({sku:fieldText.max(40),name:fieldText.max(140),category:fieldText.max(70),unit:fieldText.max(20),minStock:nonnegative,unitCost:nonnegative,initialStock:nonnegative.default(0),isBackpack:z.boolean().default(false),notes:z.string().max(1500).default('')});
export const editProductInput=newProductInput.omit({initialStock:true}).partial().extend({active:z.boolean().optional()});
export const movementInput=z.object({type:z.enum(['entrada','saida']),productId:fieldText,quantity:positive,date,note:z.string().max(600).default(''),unitCost:nonnegative.optional()});
export const kitInput=z.object({name:fieldText.max(80),description:z.string().max(400).default(''),salePrice:nonnegative,platformFeePercent:z.number().min(0).max(100),extraCost:nonnegative,components:z.array(componentSchema)});
export const assemblyInput=z.object({kitModelId:fieldText,quantity:z.number().int().min(1),date,note:z.string().max(600).default('')});
export const saleKitInput=assemblyInput.extend({salePrice:nonnegative.optional()});
export const pendingInput=z.object({productId:fieldText,quantity:positive,expectedDate:date.nullable().optional(),note:z.string().max(600).default('')});
export const receiveInput=z.object({date,unitCost:nonnegative.optional()});
export async function createProduct(data:z.infer<typeof newProductInput>){
  return mutate(s=>{
    if(s.products.some(p=>p.sku.toLowerCase()===data.sku.toLowerCase()))error('Este SKU já está cadastrado.');
    const id=randomUUID(),timestamp=now();
    const p:Product={id,sku:data.sku,name:data.name,category:data.category,unit:data.unit,minStock:data.minStock,unitCost:data.unitCost,stock:stockRound(data.initialStock),isBackpack:data.isBackpack,active:true,notes:data.notes,createdAt:timestamp,updatedAt:timestamp};
    s.products.push(p);
    if(data.initialStock>0)s.movements.unshift({id:randomUUID(),type:'entrada',date:timestamp.slice(0,10),createdAt:timestamp,productId:id,quantity:data.initialStock,unitCost:data.unitCost,note:'Saldo inicial do cadastro'});
  });
}
export async function editProduct(id:string,data:z.infer<typeof editProductInput>){
  return mutate(s=>{
    const p=getProduct(s,id);
    if(data.sku!==undefined && s.products.some(other=>other.id!==id&&other.sku.toLowerCase()===data.sku!.toLowerCase()))error('Este SKU já está cadastrado.');
    const {active,...rest}=data;
    Object.assign(p,rest,active===undefined?{}:{active}, {updatedAt:now()});
  });
}
export async function addMovement(data:z.infer<typeof movementInput>){
  return mutate(s=>{
    const p=getProduct(s,data.productId);
    if(!p.active)error('Produto inativo.');
    const before=p.stock;
    if(data.type==='saida' && before<data.quantity)error(`Estoque insuficiente. Disponível: ${p.stock} ${p.unit}.`);
    if(data.type==='entrada' && data.unitCost!==undefined){
      p.unitCost=moneyRound((p.unitCost*before+data.unitCost*data.quantity)/(before+data.quantity));
    }
    p.stock=stockRound(before+(data.type==='entrada'?data.quantity:-data.quantity));
    p.updatedAt=now();
    const movement:Movement={id:randomUUID(),type:data.type,date:data.date,createdAt:now(),productId:p.id,quantity:data.quantity,note:data.note,unitCost:data.unitCost??p.unitCost};
    s.movements.unshift(movement);
  });
}
export async function addPending(data:z.infer<typeof pendingInput>){
  return mutate(s=>{
    getProduct(s,data.productId);
    const entry:PendingPurchase={id:randomUUID(),productId:data.productId,quantity:data.quantity,expectedDate:data.expectedDate??null,note:data.note,status:'pendente',createdAt:now()};
    s.pendingPurchases.unshift(entry);
  });
}
export async function receivePending(id:string,data:z.infer<typeof receiveInput>){
  return mutate(s=>{
    const pending=s.pendingPurchases.find(x=>x.id===id)||error('Compra pendente não encontrada.');
    if(pending.status!=='pendente')error('Esta compra já foi finalizada.');
    const p=getProduct(s,pending.productId),before=p.stock;
    if(data.unitCost!==undefined)p.unitCost=moneyRound((p.unitCost*before+data.unitCost*pending.quantity)/(before+pending.quantity));
    p.stock=stockRound(before+pending.quantity);
    p.updatedAt=now();
    pending.status='recebido';pending.receivedAt=now();
    s.movements.unshift({id:randomUUID(),type:'entrada',date:data.date,createdAt:now(),productId:p.id,quantity:pending.quantity,unitCost:data.unitCost??p.unitCost,note:`Recebimento: ${pending.note||'Compra em trânsito'}`});
  });
}
export async function cancelPending(id:string){
  return mutate(s=>{
    const p=s.pendingPurchases.find(x=>x.id===id)||error('Compra pendente não encontrada.');
    if(p.status!=='pendente')error('Esta compra já foi finalizada.');
    p.status='cancelado';
  });
}
export async function createKit(data:z.infer<typeof kitInput>){
  return mutate(s=>{
    if(s.kits.length>=10)error('Limite de 10 modelos atingido.');
    const id=randomUUID();
    const kit:KitModel={id,...data,updatedAt:now()};
    s.kits.push(kit);s.finishedKits[id]=0;
  });
}
export async function editKit(id:string,data:z.infer<typeof kitInput>){
  return mutate(s=>{
    const kit=getKit(s,id);
    if(new Set(data.components.map(c=>c.productId)).size!==data.components.length)error('Não repita um componente.');
    data.components.forEach(c=>getProduct(s,c.productId));
    Object.assign(kit,data,{updatedAt:now()});
  });
}
export async function assemble(data:z.infer<typeof assemblyInput>){
  return mutate(s=>{
    const kit=getKit(s,data.kitModelId);
    if(!kit.components.length)error('Configure pelo menos um item na composição.');
    const snapshot=kit.components.map(c=>({productId:c.productId,quantity:c.quantity,unitCost:getProduct(s,c.productId).unitCost}));
    for(const c of snapshot){
      const p=getProduct(s,c.productId),needed=stockRound(c.quantity*data.quantity);
      if(p.stock+1e-8<needed)error(`Faltam ${p.name}: necessário ${needed} ${p.unit}, disponível ${p.stock}.`);
    }
    snapshot.forEach(c=>{
      const p=getProduct(s,c.productId);p.stock=stockRound(p.stock-c.quantity*data.quantity);p.updatedAt=now();
    });
    s.finishedKits[kit.id]=(s.finishedKits[kit.id]||0)+data.quantity;
    s.movements.unshift({id:randomUUID(),type:'montagem',date:data.date,createdAt:now(),kitModelId:kit.id,quantity:data.quantity,note:data.note,componentSnapshot:snapshot});
  });
}
export async function sellKit(data:z.infer<typeof saleKitInput>){
  return mutate(s=>{
    const kit=getKit(s,data.kitModelId),available=s.finishedKits[kit.id]||0;
    if(available<data.quantity)error(`Somente ${available} kit(s) prontos deste modelo.`);
    s.finishedKits[kit.id]=available-data.quantity;
    s.movements.unshift({id:randomUUID(),type:'venda-kit',date:data.date,createdAt:now(),kitModelId:kit.id,quantity:data.quantity,note:data.note,salePrice:data.salePrice??kit.salePrice});
  });
}
export async function restoreState(raw:unknown){
  const parsed=stateSchema.parse(raw) as AppState;
  validateRelations(parsed);
  const work=queue.then(async()=>{
    await fs.mkdir(DATA_DIR,{recursive:true});
    // Restore always creates a timestamped independent backup of the current state.
    const stamp=new Date().toISOString().replace(/[:.]/g,'-');
    const directory=path.join(DATA_DIR,'backups');await fs.mkdir(directory,{recursive:true});
    await fs.writeFile(path.join(directory,`antes-restauracao-${stamp}.json`),JSON.stringify(state,null,2),'utf8');
    await writeState(parsed);state=parsed;listeners.forEach(cb=>cb());return getState();
  });
  queue=work.then(()=>undefined,()=>undefined);return work;
}
