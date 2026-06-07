import { NavLink } from "react-router-dom"

const links = [
  { label: "Students", to: "/students" },
  { label: "Grades", to: "/grades" },
  { label: "Insights", to: "/insights" },
]

function Header() {
  const linkClass = ({ isActive }) =>
    `rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 ${
      isActive
        ? "bg-primary text-white shadow-sm"
        : "text-slate-600 hover:bg-primary/10 hover:text-primary"
    }`

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-[96rem] flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <NavLink className="flex w-fit items-center gap-3" to="/students">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white shadow-sm">
            GL
          </div>
          <div>
            <p className="text-lg font-bold text-primary">GradeLab</p>
            <p className="text-xs font-medium text-slate-500">Student records and grades</p>
          </div>
        </NavLink>

        <nav className="flex w-full gap-2 overflow-x-auto rounded-lg bg-slate-100 p-1 sm:w-auto">
          {links.map((link) => (
            <NavLink key={link.to} className={linkClass} to={link.to}>
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  )
}

export default Header
