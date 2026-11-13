export type MovementType = 'entrada' | 'saida' | 'montagem' | 'venda-kit';
export type Product = {
  id: string; sku: string; name: string; category: string; unit: string;
  stock: number; minStock: number; unitCost: number; isBackpack: boolean;
  active: boolean; notes: string; createdAt: string; updatedAt: string;
};
export type KitItem = { productId: string; quantity: number };
export type KitModel = {
  id: string; name: string; description: string; salePrice: number;
  platformFeePercent: number; extraCost: number; components: KitItem[];
  updatedAt: string;
};
export type Movement = {
  id: string; type: MovementType; date: string; createdAt: string;
  productId?: string; kitModelId?: string; quantity: number;
  unitCost?: number; salePrice?: number; note: string;
  componentSnapshot?: {productId: string; quantity: number; unitCost: number}[];
};
export type PendingPurchase = {
  id: string; productId: string; quantity: number; expectedDate: string | null;
  note: string; status: 'pendente' | 'recebido' | 'cancelado'; createdAt: string;
  receivedAt?: string;
};
export type AppState = {
  version: number; products: Product[]; kits: KitModel[];
  movements: Movement[]; pendingPurchases: PendingPurchase[];
  finishedKits: Record<string, number>; updatedAt: string;
};
export type KitMetrics = {
  possibleWithoutBackpack: number; possibleWithBackpack: number;
  materialCost: number; totalCost: number; platformFee: number;
  expectedProfit: number; margin: number; limiters: {product: Product; possible: number}[];
  categoryCosts: {category: string; amount: number}[];
};
export const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(value) ? value : 0);
export const number = (value: number, max = 0) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: max }).format(value);
export const dateLabel = (date: string) => {
  if (!date) return '—';
  const [y, m, d] = date.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};
export const todayLocal = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
export const categoriesOf = (state: AppState) => [...new Set(state.products.filter(p=>p.active).map(p=>p.category))].sort((a,b)=>a.localeCompare(b, 'pt-BR'));
export const statusOf = (p: Product): 'critical' | 'low' | 'ok' => p.stock <= 2 ? 'critical' : p.stock <= p.minStock ? 'low' : 'ok';
export const stockValue = (state: AppState) => state.products.reduce((sum, p) => sum + p.stock * p.unitCost, 0);
export function kitMetrics(state: AppState, kit: KitModel): KitMetrics {
  const rows = kit.components.filter(c=>c.quantity > 0).map(item=>({item, product:state.products.find(p=>p.id===item.productId)})).filter((x): x is {item:KitItem;product:Product} =>!!x.product);
  const included = rows.filter(x=>!x.product.isBackpack);
  const capacities = included.map(x=>({ product:x.product, possible:Math.floor((x.product.stock+1e-7)/x.item.quantity) }));
  const withBags = rows.map(x=>Math.floor((x.product.stock+1e-7)/x.item.quantity));
  const possibleWithoutBackpack = capacities.length ? Math.max(0,Math.min(...capacities.map(x=>x.possible))) : 0;
  const possibleWithBackpack = withBags.length ? Math.max(0,Math.min(...withBags)) : 0;
  const materialCost = rows.reduce((sum, x)=>sum+x.product.unitCost*x.item.quantity,0);
  const totalCost = materialCost+kit.extraCost;
  const platformFee = kit.salePrice*kit.platformFeePercent/100;
  const expectedProfit = kit.salePrice-totalCost-platformFee;
  const cats = new Map<string,number>();
  rows.forEach(({item,product})=>cats.set(product.category, (cats.get(product.category) || 0)+item.quantity*product.unitCost));
  return {possibleWithoutBackpack, possibleWithBackpack, materialCost,totalCost,platformFee,expectedProfit,
    margin:kit.salePrice>0?(expectedProfit/kit.salePrice*100):0,
    limiters:capacities.sort((a,b)=>a.possible-b.possible).slice(0,4),
    categoryCosts:[...cats.entries()].map(([category,amount])=>({category,amount})).sort((a,b)=>b.amount-a.amount)
  };
}
