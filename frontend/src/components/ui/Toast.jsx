function Toast({ message }) {
  if (!message) {
    return null
  }

  return (
    <div
      className="fixed bottom-5 right-5 z-[70] max-w-sm animate-[toastSlide_5s_ease-in-out_forwards] rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 shadow-xl"
      role="alert"
    >
      {message}
    </div>
  )
}

export default Toast
