import { X } from 'lucide-react';

export interface ActiveFiltersProps {
  filters: string[];
  onRemove: (filter: string) => void;
  onClearAll: () => void;
}

export function ActiveFilters({ filters, onRemove, onClearAll }: ActiveFiltersProps) {
  if (filters.length === 0) {
    return null;
  }

  return (
    <div className="px-2 flex items-center gap-2">
      {filters.map((filter) => (
        <span
          key={filter}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-600/70 text-white text-sm"
        >
          {filter}
          <button onClick={() => onRemove(filter)} className="ml-1 hover:bg-gray-500/50 rounded-full p-0.5">
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <button onClick={onClearAll} className="text-sm text-gray-400 hover:text-white transition-colors">
        Clear Filters
      </button>
    </div>
  );
}

export default ActiveFilters;
