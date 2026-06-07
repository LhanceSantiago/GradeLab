import { Navigate, Routes, Route } from "react-router-dom"

import DashboardLayout from "./components/layout/DashboardLayout"

import GradesPage from "./pages/Grades/GradesPage"
import InsightsPage from "./pages/Insights/InsightsPage"
import StudentsPage from "./pages/Students/StudentsPage"

function App() {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route path="/" element={<Navigate replace to="/students" />} />
        <Route path="/grades" element={<GradesPage />} />
        <Route path="/insights" element={<InsightsPage />} />
        <Route path="/students" element={<StudentsPage />} />
        <Route path="*" element={<Navigate replace to="/students" />} />
      </Route>
    </Routes>
  )
}

export default App
