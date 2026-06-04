import { useState } from "react"
import { Outlet } from "react-router-dom"

import Header from "./Header"
import Sidebar from "./Sidebar"

function DashboardLayout() {

  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div className="h-screen flex flex-col">

      <Header
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />
      <div className="flex flex-1 overflow-hidden">

        <Sidebar
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
        />
          
          <main className="flex-1 w-full overflow-y-auto">
          <Outlet />  
        </main>
        
        
      </div>

    </div>
  )
}

export default DashboardLayout
