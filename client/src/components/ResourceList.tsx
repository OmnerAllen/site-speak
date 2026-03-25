import { useState } from "react";

export interface ResourceColumnConfig<T> {
  label: string;
  value: (item: T) => React.ReactNode;
}

export interface ResourceListProps<T extends { id: string }> {
  items: T[];
  titleKey: keyof T & string;
  badgeKey?: keyof T & string;
  columns: ResourceColumnConfig<T>[];
  onEdit: (item: T) => void;
  onDelete: (id: string) => void;
  emptyMessage?: string;
}

export function ResourceList<T extends { id: string }>({
  items,
  titleKey,
  badgeKey,
  columns,
  onEdit,
  onDelete,
  emptyMessage = "No items yet.",
}: ResourceListProps<T>) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    if (confirmDeleteId === id) {
      onDelete(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
    }
  };

  if (items.length === 0) {
    return (
      <p className="text-brick-400 italic bg-brick-900/50 p-6 rounded-lg border border-brick-800/50 text-center">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="bg-brick-900 border border-brick-800 rounded-lg p-5 hover:border-brick-700 transition-colors"
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold text-brick-200 truncate">
                  {String(item[titleKey])}
                </h3>
                {badgeKey && (
                  <span className="shrink-0 text-xs bg-brick-800 text-brick-300 px-2 py-0.5 rounded-full">
                    {String(item[badgeKey])}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                {columns.map((col) => (
                  <div key={col.label}>
                    <div className="text-xs text-brick-500">{col.label}</div>
                    <div className="text-brick-400">{col.value(item)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => onEdit(item)}
                className="text-sm text-brick-300 hover:text-brick-100 px-3 py-1.5 border border-brick-700 rounded-md hover:bg-brick-800 transition-colors cursor-pointer"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(item.id)}
                onBlur={() => setConfirmDeleteId(null)}
                className={`text-sm px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                  confirmDeleteId === item.id
                    ? "bg-radioactive-700 text-radioactive-100 border border-radioactive-600"
                    : "text-brick-400 hover:text-radioactive-300 border border-brick-700 hover:border-radioactive-800"
                }`}
              >
                {confirmDeleteId === item.id ? "Confirm?" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
