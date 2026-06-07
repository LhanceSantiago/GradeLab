import { useEffect, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

const API_BASE_URL = "http://127.0.0.1:5000/api"
const completionColors = ["#6F58C9", "#EF4444"]

function InsightsPage() {
  const [insights, setInsights] = useState(null)
  const [error, setError] = useState("")

  useEffect(() => {
    loadInsights()
  }, [])

  async function loadInsights() {
    setError("")

    try {
      const response = await fetch(`${API_BASE_URL}/insights`)
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Unable to load insights.")
        return
      }

      setInsights(data)
    } catch {
      setError("Unable to load insights. Make sure the backend is running.")
    }
  }

  return (
    <section className="min-h-full bg-slate-50 p-5 lg:p-8">
      <div className="mx-auto flex max-w-[96rem] flex-col gap-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            Performance Overview
          </p>
          <h1 className="text-3xl font-bold text-dark">Insights</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Track student population, grade completion, and top academic performance.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {!insights ? (
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
            Loading insights...
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <MetricCard label="Students" value={insights.totals.students} />
              <MetricCard label="Sections" value={insights.totals.sections} />
              <MetricCard label="Subjects" value={insights.totals.subjects} />
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(22rem,0.8fr)]">
              <ChartPanel title="Students by Course">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={insights.courses}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="course" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="students" fill="#6F58C9" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartPanel>

              <ChartPanel title="Grade Completion">
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={insights.gradeCompletion}
                      dataKey="value"
                      innerRadius={72}
                      outerRadius={112}
                      paddingAngle={4}
                    >
                      {insights.gradeCompletion.map((entry, index) => (
                        <Cell key={entry.name} fill={completionColors[index % completionColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ChartPanel>
            </div>

            <div className="grid gap-5 xl:grid-cols-2">
              <ChartPanel title="Top Section Averages">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={insights.sectionAverages} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis domain={[60, 100]} tick={{ fontSize: 12 }} type="number" />
                    <YAxis dataKey="section" tick={{ fontSize: 12 }} type="category" width={84} />
                    <Tooltip />
                    <Bar dataKey="average" fill="#2563EB" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartPanel>

              <ChartPanel title="Top Subject Averages">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={insights.subjectAverages} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis domain={[60, 100]} tick={{ fontSize: 12 }} type="number" />
                    <YAxis dataKey="code" tick={{ fontSize: 12 }} type="category" width={84} />
                    <Tooltip />
                    <Bar dataKey="average" fill="#059669" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartPanel>
            </div>

            {insights.matplotlibChart && (
              <ChartPanel title="Matplotlib Preview">
                <div className="flex justify-center">
                  <img
                    alt="Matplotlib top section averages chart"
                    className="max-h-80 max-w-full rounded-lg border border-slate-200"
                    src={insights.matplotlibChart}
                  />
                </div>
              </ChartPanel>
            )}
          </>
        )}
      </div>
    </section>
  )
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-dark">{value}</p>
    </div>
  )
}

function ChartPanel({ children, title }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-bold text-dark">{title}</h2>
      {children}
    </div>
  )
}

export default InsightsPage
