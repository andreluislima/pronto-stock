export function Badge({ status, children }) {
  return (
    <span className={`badge badge-${status}`}>
      <span className="status-dot" />
      {children}
    </span>
  );
}
