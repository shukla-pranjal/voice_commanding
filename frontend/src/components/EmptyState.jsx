function EmptyState({ title, message }) {
  return (
    <div className="empty-state">
      <div className="empty-state__title">{title}</div>
      <div>{message}</div>
    </div>
  );
}

export default EmptyState;
