import { ArrowDownWideNarrow, ArrowUpNarrowWide } from "lucide-react"

export function SearchInput({ placeholder, value, onChange }) {
  return (
    <input
      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-dark outline-none transition-all duration-200 focus:border-primary focus:shadow-sm"
      placeholder={placeholder}
      type="search"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}

export function SortControls({ direction, label, options, sortBy, onDirectionChange, onSortByChange }) {
  const nextDirection = direction === "asc" ? "desc" : "asc"

  return (
    <div className="flex items-center gap-2">
      <select
        className="min-w-0 flex-1 cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none transition-all duration-200 focus:border-primary focus:shadow-sm"
        value={sortBy}
        onChange={(event) => onSortByChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      <button
        aria-label={`Sort ${direction === "asc" ? "ascending" : "descending"}`}
        className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary hover:shadow-md active:translate-y-0 active:shadow-sm"
        title={direction === "asc" ? "Ascending" : "Descending"}
        type="button"
        onClick={() => onDirectionChange(nextDirection)}
      >
        <SortDirectionIcon direction={direction} />
      </button>
      {label && <p className="text-[11px] font-medium text-slate-400">{label}</p>}
    </div>
  )
}

function SortDirectionIcon({ direction }) {
  const Icon = direction === "asc" ? ArrowUpNarrowWide : ArrowDownWideNarrow

  return <Icon className="h-4 w-4 transition-transform duration-200" strokeWidth={2.2} />
}
