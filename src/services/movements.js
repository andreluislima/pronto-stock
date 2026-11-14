export function movementTypeName(type) {
  return (
    {
      entrada: "Entrada",
      saida: "Saída",
      montagem: "Montagem",
      "venda-kit": "Venda de kit",
    }[type] || type
  );
}
export function movementName(data, row) {
  return row.productId
    ? data.products.find((p) => p.id === row.productId)?.name || "Produto"
    : data.kits.find((k) => k.id === row.kitModelId)?.name || "Kit";
}
