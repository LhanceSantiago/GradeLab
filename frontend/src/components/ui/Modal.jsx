import { secondaryButtonClass, dangerButtonClass } from "./buttonStyles"

const modalOverlayClass =
  "fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
const modalPanelClass =
  "rounded-lg border border-slate-200 bg-white shadow-2xl"

export function Modal({ children, isClosing = false, onClose }) {
  const overlayAnimation = isClosing
    ? "animate-[modalFadeOut_180ms_ease-in_forwards]"
    : "animate-[modalFade_180ms_ease-out]"
  const panelAnimation = isClosing
    ? "animate-[modalScaleOut_180ms_ease-in_forwards]"
    : "animate-[modalScale_180ms_ease-out]"

  return (
    <div className={`${modalOverlayClass} ${overlayAnimation}`} onClick={onClose}>
      <div className={`${modalPanelClass} ${panelAnimation}`} onClick={(event) => event.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

export function ModalHeader({ eyebrow, title, subtitle, onClose }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        {eyebrow && <p className="text-sm font-semibold uppercase tracking-wide text-primary">{eyebrow}</p>}
        <h2 className="mt-1 text-2xl font-bold text-dark">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      <button className={secondaryButtonClass} onClick={onClose}>Close</button>
    </div>
  )
}

export function ModalActions({ children, onCancel }) {
  return (
    <div className="mt-6 flex justify-end gap-2 border-t border-slate-200 pt-5">
      <button className={secondaryButtonClass} type="button" onClick={onCancel}>Cancel</button>
      {children}
    </div>
  )
}

export function ConfirmModal({
  confirmLabel = "Delete",
  isClosing = false,
  message,
  onCancel,
  onConfirm,
  title,
}) {
  return (
    <Modal isClosing={isClosing} onClose={onCancel}>
      <div className="w-full max-w-md p-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-red-600">{title}</p>
        <p className="mt-3 text-sm leading-6 text-slate-600">{message}</p>
        <div className="mt-6 flex justify-end gap-2 border-t border-slate-200 pt-5">
          <button className={secondaryButtonClass} onClick={onCancel}>Cancel</button>
          <button className={dangerButtonClass} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </Modal>
  )
}
