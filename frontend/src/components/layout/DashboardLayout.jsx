import { Outlet, useLocation } from "react-router-dom"

import Header from "./Header"

function DashboardLayout() {
  const location = useLocation()

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header />
      <main className="min-w-0 flex-1">
        <div key={location.pathname} className="min-h-full animate-[pageSwitch_180ms_ease-out]">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default DashboardLayout
