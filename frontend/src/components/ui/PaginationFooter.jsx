import { secondaryButtonClass } from "./buttonStyles"

function PaginationFooter({ currentPage, totalPages, onNext, onPrevious }) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-200 p-3 text-[11px] text-slate-500">
      <span className="whitespace-nowrap">
        Page {currentPage} of {totalPages}
      </span>
      <div className="flex gap-2">
        <button
          className={`${secondaryButtonClass} px-2.5 py-1.5 text-xs`}
          disabled={currentPage === 1}
          onClick={onPrevious}
        >
          Previous
        </button>
        <button
          className={`${secondaryButtonClass} px-2.5 py-1.5 text-xs`}
          disabled={currentPage === totalPages}
          onClick={onNext}
        >
          Next
        </button>
      </div>
    </div>
  )
}

export default PaginationFooter
