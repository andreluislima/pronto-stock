import { AlertCircle } from "lucide-react";
export function Notice({ children, tone = "neutral" }) {
  return (
    <div className={`notice notice-${tone}`}>
      <AlertCircle size={17} />
      <div>{children}</div>
    </div>
  );
}
