export function TextInput({
  disabled = false,
  highlighted = false,
  label,
  list,
  inputMode,
  pattern,
  placeholder = "",
  required = true,
  title,
  type = "text",
  value,
  onChange,
}) {
  return (
    <label className="flex flex-col gap-2 text-sm font-semibold text-slate-600">
      {label}
      <input
        className={`rounded-lg border px-4 py-3 font-medium text-dark outline-none transition-all duration-200 focus:border-primary focus:shadow-sm disabled:bg-slate-100 disabled:text-slate-500 ${
          highlighted
            ? "border-primary/50 bg-primary/5 shadow-sm"
            : "border-slate-200 bg-white"
        }`}
        disabled={disabled}
        inputMode={inputMode}
        list={list}
        pattern={pattern}
        placeholder={placeholder}
        required={required}
        title={title}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

export function SelectInput({
  highlighted = false,
  label,
  options,
  placeholder = "Select option",
  value,
  onChange,
}) {
  return (
    <label className="flex flex-col gap-2 text-sm font-semibold text-slate-600">
      {label}
      <select
        className={`cursor-pointer rounded-lg border px-4 py-3 font-medium text-dark outline-none transition-all duration-200 focus:border-primary focus:shadow-sm ${
          highlighted
            ? "border-primary/50 bg-primary/5 shadow-sm"
            : "border-slate-200 bg-white"
        }`}
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="" disabled>{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  )
}
