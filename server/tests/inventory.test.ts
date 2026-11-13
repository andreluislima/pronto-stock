import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { kitMetrics } from '../../src/types.js';
const tempDir = mkdtempSync(path.join(os.tmpdir(), 'pronto-stock-test-'));
process.env.DATA_DIR = tempDir;
// Import after setting DATA_DIR; the application never writes the test data into the project.
const store = await import('../store.js');
await store.initStore();

test('importa os 23 itens, três modelos e compras a caminho sem somar no estoque', () => {
  const state = store.getState();
  assert.equal(state.products.length, 23);
  assert.equal(state.kits.length, 3);
  assert.equal(state.pendingPurchases.filter(p => p.status === 'pendente').length, 6);
  assert.equal(state.products.find(p=>p.id==='LANT-DIN-001')?.stock, 0);
  assert.equal(kitMetrics(state, state.kits[0]).possibleWithoutBackpack,0);
});

test('conta capacidade com e sem mochila separadamente', () => {
  const state = store.getState();
  for(const p of state.products) p.stock = p.isBackpack ? 0 : 30;
  const metrics = kitMetrics(state, state.kits[0]);
  assert.ok(metrics.possibleWithoutBackpack > 0);
  assert.equal(metrics.possibleWithBackpack, 0);
  assert.equal(state.kits[0].components.find(x=>x.productId==='CLOR-001')?.quantity, 1);
});

test('entrada persiste arquivo, saída não aceita saldo insuficiente', async () => {
  await store.addMovement({type:'entrada', productId:'CREM-001', quantity:2, date:'2026-11-12', note:'Teste de recebimento', unitCost:2.5});
  assert.equal(store.getState().products.find(p=>p.id==='CREM-001')?.stock,2);
  assert.equal(JSON.parse(readFileSync(path.join(tempDir,'estoque.json'),'utf8')).products.find((p:{id:string})=>p.id==='CREM-001').stock,2);
  await assert.rejects(store.addMovement({type:'saida',productId:'CREM-001',quantity:3,date:'2026-11-12',note:'Excesso'}),/Estoque insuficiente/);
  assert.equal(store.getState().products.find(p=>p.id==='CREM-001')?.stock,2);
});

test('montagem desconta componentes, venda desconta só o kit pronto', async () => {
  await assert.rejects(store.assemble({kitModelId:'essencial-atual',quantity:1,date:'2026-11-12',note:''}),/Faltam/);
  await store.addMovement({type:'entrada',productId:'LANT-DIN-001',quantity:2,date:'2026-11-12',note:'Teste'});
  const before=store.getState();
  const beforeCrem=before.products.find(p=>p.id==='CREM-001')!.stock;
  await store.assemble({kitModelId:'essencial-atual',quantity:1,date:'2026-11-12',note:'Teste de montagem'});
  const assembled=store.getState();
  assert.equal(assembled.finishedKits['essencial-atual'],1);
  assert.equal(assembled.products.find(p=>p.id==='CREM-001')?.stock,beforeCrem-1);
  assert.ok(assembled.movements[0].componentSnapshot!.length>0);
  const ingredientsAfterAssembly=assembled.products.map(p=>[p.id,p.stock]);
  await store.sellKit({kitModelId:'essencial-atual',quantity:1,date:'2026-11-12',note:'Teste de venda'});
  assert.equal(store.getState().finishedKits['essencial-atual'],0);
  assert.deepEqual(store.getState().products.map(p=>[p.id,p.stock]),ingredientsAfterAssembly);
  await assert.rejects(store.sellKit({kitModelId:'essencial-atual',quantity:1,date:'2026-11-12',note:''}),/Somente/);
});

test('receber pedido pendente aumenta estoque e impede recebimento duplicado', async () => {
  const id = 'pend-CAP-001';
  const before = store.getState().products.find(p=>p.id==='CAP-001')!.stock;
  await store.receivePending(id,{date:'2026-11-12'});
  assert.equal(store.getState().products.find(p=>p.id==='CAP-001')?.stock,before+10);
  await assert.rejects(store.receivePending(id,{date:'2026-11-12'}),/finalizada/);
});
