import { Check } from "lucide-react";
export function Empty({ title, description, action }) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Check size={23} />
      </div>
      <strong>{title}</strong>
      <p>{description}</p>
      {action}
    </div>
  );
}
