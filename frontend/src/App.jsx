import { Routes, Route } from "react-router-dom"

import DashboardLayout from "./components/layout/DashboardLayout"

import HomePage from "./pages/home/HomePage"
import GradesPage from "./pages/Grades/GradesPage"
import InsightsPage from "./pages/Insights/InsightsPage"
import SettingsPage from "./pages/Settings/SettingsPage"
import StudentsPage from "./pages/Students/StudentsPage"

function App() {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/grades" element={<GradesPage />} />
        <Route path="/insights" element={<InsightsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/students" element={<StudentsPage />} />
      </Route>
    </Routes>
  )
}

export default App