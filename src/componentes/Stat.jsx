import { Card } from "./Card";
export function Stat({ icon, title, value, foot, tone = "normal" }) {
  return (
    <Card className="stat-card">
      <div className="stat-top">
        <span>{title}</span>
        <div className={`stat-icon stat-${tone}`}>{icon}</div>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-foot">{foot}</div>
    </Card>
  );
}
