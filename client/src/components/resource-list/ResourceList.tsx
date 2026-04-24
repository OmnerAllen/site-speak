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
  renderHeaderSuffix?: (item: T) => React.ReactNode;
  onEdit?: (item: T) => void;
  onDelete?: (id: string) => void;
  onItemClick?: (item: T) => void;
  renderRowActions?: (item: T) => React.ReactNode;
  editLabel?: string;
  /** When set, replaces the default edit/Open button styles. */
  editButtonClassName?: string;
  emptyMessage?: string;
  editingId?: string;
  renderEditForm?: (item: T) => React.ReactNode;
}

export function ResourceList<T extends { id: string }>({
  items,
  titleKey,
  badgeKey,
  columns,
  renderHeaderSuffix,
  renderRowActions,
  onEdit,
  onDelete,
  onItemClick,
  editLabel = "Edit",
  editButtonClassName,
  emptyMessage = "No items yet.",
  editingId,
  renderEditForm,
}: ResourceListProps<T>) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    if (!onDelete) return;

    if (confirmDeleteId === id) {
      onDelete(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
    }
  };

  if (items.length === 0) {
    return (
      <p className="text-brick-300 italic bg-brick-900/50 p-6 rounded-lg border border-brick-800/50 text-center">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        if (editingId === item.id && renderEditForm) {
          return (
            <div key={item.id} className="bg-brick-900 border border-brick-800 rounded-lg p-5">
              {renderEditForm(item)}
            </div>
          );
        }

        return (
          <div
            key={item.id}
            role={onItemClick && editingId !== item.id ? "button" : undefined}
            tabIndex={onItemClick && editingId !== item.id ? 0 : undefined}
            onClick={onItemClick && editingId !== item.id ? () => onItemClick(item) : undefined}
            onKeyDown={
              onItemClick && editingId !== item.id
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onItemClick(item);
                    }
                  }
                : undefined
            }
            className={`bg-brick-900 border border-brick-800 rounded-lg p-5 hover:border-brick-700 transition-colors ${
              onItemClick && editingId !== item.id
                ? "cursor-pointer focus:outline-none focus:ring-2 focus:ring-grass-700"
                : ""
            }`}
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
                  {renderHeaderSuffix && renderHeaderSuffix(item)}
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                  {columns.map((col) => (
                    <div key={col.label}>
                      <div className="text-xs text-brick-300">{col.label}</div>
                      <div className="text-brick-200">{col.value(item)}</div>
                    </div>
                  ))}
                </div>
              </div>

              {(onEdit || onDelete || renderRowActions) && (
                <div className="flex items-center gap-2 shrink-0">
                  {renderRowActions && renderRowActions(item)}
                  {onEdit && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(item);
                      }}
                      className={
                        editButtonClassName ??
                        "text-sm text-brick-300 hover:text-brick-100 px-3 py-1.5 border border-brick-700 rounded-md hover:bg-brick-800 transition-colors cursor-pointer"
                      }
                    >
                      {editLabel}
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item.id);
                      }}
                      onBlur={() => setConfirmDeleteId(null)}
                      className={`text-sm px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                        confirmDeleteId === item.id
                          ? "bg-radioactive-700 text-radioactive-100 border border-radioactive-600"
                          : "text-brick-300 hover:text-radioactive-300 border border-brick-700 hover:border-radioactive-800"
                      }`}
                    >
                      {confirmDeleteId === item.id ? "Confirm?" : "Delete"}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
