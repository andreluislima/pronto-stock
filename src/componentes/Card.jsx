export function Card({ children, className = "", title, action }) {
  return (
    <div className={`panel ${className}`}>
      {title && (
        <div className="panel-head">
          <h3>{title}</h3>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
