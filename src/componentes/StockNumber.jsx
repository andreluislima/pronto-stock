import { number, statusOf } from "../services/inventory";
export function StockNumber({ product }) {
  return (
    <span
      className={
        statusOf(product) === "critical"
          ? "stock-critical"
          : statusOf(product) === "low"
            ? "stock-low"
            : ""
      }
    >
      {number(product.stock, 2)} <span className="muted">{product.unit}</span>
    </span>
  );
}
