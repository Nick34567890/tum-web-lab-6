export function NotificationCenter({ notifications, onRemove }) {
  return (
    <div className="fixed top-4 right-4 space-y-3 z-50 max-w-sm">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`rounded-lg p-4 shadow-lg animate-in slide-in-from-top-2 ${
            notification.type === 'success'
              ? 'bg-green-500/90 text-white'
              : notification.type === 'error'
              ? 'bg-red-500/90 text-white'
              : 'bg-blue-500/90 text-white'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">{notification.message}</span>
            <button
              onClick={() => onRemove(notification.id)}
              className="text-lg font-bold opacity-70 hover:opacity-100"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
