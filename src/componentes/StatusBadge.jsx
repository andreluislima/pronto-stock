import { statusOf } from "../services/inventory";
import { Badge } from "./Badge";
export function StatusBadge({ product }) {
  const status = statusOf(product);
  return (
    <Badge status={status}>
      {status === "critical"
        ? "Crítico"
        : status === "low"
          ? "Baixo"
          : "Regular"}
    </Badge>
  );
}
