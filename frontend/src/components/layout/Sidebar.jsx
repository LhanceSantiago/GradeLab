import { NavLink, useLocation } from "react-router-dom"

function Sidebar({ isSidebarOpen, setIsSidebarOpen }) {
  const { pathname } = useLocation()

  function closeSidebar() {
      setIsSidebarOpen(false)
  }

  const navClass = ({ isActive }) =>
    `p-5 rounded-lg transition-all duration-500 flex items-center gap-3 text-xl font-bold 
     lg:p-3 lg:text-sm ${
      isActive
        ? "bg-primary text-light"
        : "text-primary hover:bg-primary/20"
    }`

  return (

    <div
      className={`fixed top-0 h-full w-full p-4 flex flex-col gap-8 border-r border-gray bg-white transition-all duration-500 z-50 
        lg:static
      ${
        isSidebarOpen
          ? "left-0"
          : "left-[-50rem]"
      }

      lg:left-0 lg:w-64`}
    >

      {/* branding */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="py-3 px-4 flex items-center justify-center rounded-md bg-primary text-light font-semibold">
            GL
          </div>
          <h2 className="text-xl text-primary font-semibold">
            GradeLab
          </h2>
        </div>
        <div
          onClick={() => setIsSidebarOpen(false)} className="flex flex-col gap-1.5 cursor-pointer
          lg:hidden">
              <span className="w-8 h-0.75 bg-primary rounded-4xl"></span>
              <span className="w-8 h-0.75 bg-primary rounded-4xl"></span>
              <span className="w-8 h-0.75 bg-primary rounded-4xl"></span>
        </div>

      </div>

      {/* nav */}
      <nav className="h-full flex flex-col gap-2 justify-between">

        <div className="flex flex-col gap-2">

          <NavLink
            className={() => navClass({ isActive: pathname === "/" || pathname === "/home" })}
            to="/home"
            onClick={closeSidebar}
          >
            Home
          </NavLink>

          <NavLink className={navClass} to="/grades" onClick={closeSidebar}>
            Grades
          </NavLink>

          <NavLink className={navClass} to="/students" onClick={closeSidebar}>
            Students
          </NavLink>

          <NavLink className={navClass} to="/insights" onClick={closeSidebar}> 
            Insights
          </NavLink>

        </div>

        <div className="border-t border-gray pt-5 flex flex-col gap-5">

          <NavLink className={navClass} to="/settings" onClick={closeSidebar}>
            Settings
          </NavLink>
        
        </div>

      </nav>

    </div>
  )
}

export default Sidebar
