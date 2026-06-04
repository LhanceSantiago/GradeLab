import { useEffect, useMemo, useState } from "react"

const API_BASE_URL = "http://127.0.0.1:5000/api"
const emptyStudent = {
  idNum: "",
  lastName: "",
  firstName: "",
  middleName: "",
  suffix: "",
  section: "",
  year: "",
}
const primaryButtonClass =
  "cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-light shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-lightPrimary hover:shadow-md active:translate-y-0 active:shadow-sm"
const secondaryButtonClass =
  "cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary hover:shadow-md active:translate-y-0 active:shadow-sm"
const dangerButtonClass =
  "cursor-pointer rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-red-700 hover:shadow-md active:translate-y-0 active:shadow-sm"
const modalOverlayClass =
  "fixed inset-0 z-50 flex animate-[modalFade_180ms_ease-out] items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
const modalPanelClass =
  "animate-[modalScale_180ms_ease-out] rounded-lg border border-slate-200 bg-white shadow-2xl"
const SECTIONS_PER_PAGE = 7
const STUDENTS_PER_PAGE = 9
const panelHeightClass = "h-[52rem]"

function StudentsPage() {
  const [sections, setSections] = useState([])
  const [students, setStudents] = useState([])
  const [selectedSection, setSelectedSection] = useState("")
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [formData, setFormData] = useState(emptyStudent)
  const [mode, setMode] = useState("")
  const [isLoadingSections, setIsLoadingSections] = useState(true)
  const [isLoadingStudents, setIsLoadingStudents] = useState(false)
  const [error, setError] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [sectionPage, setSectionPage] = useState(1)

  const sectionOptions = useMemo(
    () => [...new Set(sections.map((section) => section.section))],
    [sections],
  )
  const sectionYears = useMemo(
    () => Object.fromEntries(sections.map((section) => [section.section, section.year])),
    [sections],
  )
  const totalSectionPages = Math.max(1, Math.ceil(sections.length / SECTIONS_PER_PAGE))
  const paginatedSections = sections.slice(
    (sectionPage - 1) * SECTIONS_PER_PAGE,
    sectionPage * SECTIONS_PER_PAGE,
  )
  const totalPages = Math.max(1, Math.ceil(students.length / STUDENTS_PER_PAGE))
  const paginatedStudents = students.slice(
    (currentPage - 1) * STUDENTS_PER_PAGE,
    currentPage * STUDENTS_PER_PAGE,
  )

  useEffect(() => {
    loadSections()
  }, [])

  useEffect(() => {
    if (selectedSection) {
      setCurrentPage(1)
      loadStudents(selectedSection)
    }
  }, [selectedSection])

  async function loadSections() {
    setIsLoadingSections(true)
    setError("")

    try {
      const response = await fetch(`${API_BASE_URL}/sections`)
      const data = await response.json()
      setSections(data)

      if (!selectedSection && data.length > 0) {
        setSelectedSection(data[0].section)
      }
    } catch {
      setError("Unable to load sections. Make sure the Flask backend is running.")
    } finally {
      setIsLoadingSections(false)
    }
  }

  async function loadStudents(section) {
    setIsLoadingStudents(true)
    setError("")

    try {
      const response = await fetch(`${API_BASE_URL}/sections/${encodeURIComponent(section)}/students`)
      const data = await response.json()
      setStudents(data)
    } catch {
      setError("Unable to load students for this section.")
    } finally {
      setIsLoadingStudents(false)
    }
  }

  function openAddForm() {
    setSelectedStudent(null)
    setFormData({
      ...emptyStudent,
      section: selectedSection,
      year: sectionYears[selectedSection] || "",
    })
    setMode("add")
  }

  function openEditForm(student) {
    setSelectedStudent(student)
    setFormData(student)
    setMode("edit")
  }

  function openDeleteConfirm(student) {
    setSelectedStudent(student)
    setMode("delete")
  }

  function closePanel() {
    setMode("")
    setSelectedStudent(null)
    setFormData(emptyStudent)
  }

  function updateField(field, value) {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function updateSection(value) {
    setFormData((current) => ({
      ...current,
      section: value,
      year: sectionYears[value] || "",
    }))
  }

  async function saveStudent(event) {
    event.preventDefault()
    setError("")

    const isAdd = mode === "add"
    const url = isAdd
      ? `${API_BASE_URL}/students`
      : `${API_BASE_URL}/students/${encodeURIComponent(selectedStudent.idNum)}`

    const payload = {
      idNum: formData.idNum,
      lastName: formData.lastName,
      firstName: formData.firstName,
      middleName: formData.middleName,
      suffix: formData.suffix,
      section: formData.section,
      year: formData.year,
    }

    try {
      const response = await fetch(url, {
        method: isAdd ? "POST" : "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Unable to save student.")
        return
      }

      const nextSection = formData.section
      await loadSections()
      setSelectedSection(nextSection)
      await loadStudents(nextSection)
      closePanel()
    } catch {
      setError("Unable to save student. Make sure the Flask backend is running.")
    }
  }

  async function deleteStudent() {
    setError("")

    try {
      const response = await fetch(`${API_BASE_URL}/students/${encodeURIComponent(selectedStudent.idNum)}`, {
        method: "DELETE",
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Unable to delete student.")
        return
      }

      await loadSections()
      await loadStudents(selectedSection)
      closePanel()
    } catch {
      setError("Unable to delete student. Make sure the Flask backend is running.")
    }
  }

  return (
    <section className="min-h-full bg-slate-50 p-5 lg:p-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              Student Management
            </p>
            <h1 className="text-3xl font-bold text-dark">Students</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Choose a section to view students stored in the SQLite database.
            </p>
          </div>

          <button className={primaryButtonClass} onClick={openAddForm}>
            Add Student
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[18rem_minmax(0,1fr)]">
          <div className={`flex ${panelHeightClass} flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm`}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-dark">Sections</h2>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {sections.length}
              </span>
            </div>

            {isLoadingSections ? (
              <p className="text-sm text-slate-500">Loading sections...</p>
            ) : sections.length === 0 ? (
              <p className="text-sm text-slate-500">No sections found.</p>
            ) : (
              <div className="grid flex-1 grid-rows-7 gap-2">
                {paginatedSections.map((section) => (
                  <button
                    key={section.section}
                    className={`cursor-pointer rounded-lg border px-4 py-2.5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 ${
                      selectedSection === section.section
                        ? "border-primary bg-primary text-light"
                        : "border-slate-200 bg-white text-dark hover:border-primary hover:bg-primary/5"
                    }`}
                    onClick={() => setSelectedSection(section.section)}
                  >
                    <span className="block text-base font-bold">{section.section}</span>
                    <span className={selectedSection === section.section ? "text-white/80" : "text-slate-500"}>
                      {section.year} - {section.studentCount} students
                    </span>
                  </button>
                ))}
                {Array.from({ length: SECTIONS_PER_PAGE - paginatedSections.length }).map((_, index) => (
                  <div key={`section-placeholder-${index}`} className="rounded-lg border border-transparent px-4 py-2.5" />
                ))}
              </div>
            )}

            <div className="mt-4 flex shrink-0 flex-col gap-3 border-t border-slate-200 pt-4 text-[12px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <span>
                Page {sectionPage} of {totalSectionPages}
              </span>
              <div className="flex gap-2">
                <button
                  className={secondaryButtonClass}
                  disabled={sectionPage === 1}
                  onClick={() => setSectionPage((page) => Math.max(1, page - 1))}
                >
                  Previous
                </button>
                <button
                  className={secondaryButtonClass}
                  disabled={sectionPage === totalSectionPages}
                  onClick={() => setSectionPage((page) => Math.min(totalSectionPages, page + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          <div className={`flex ${panelHeightClass} min-w-0 flex-col rounded-lg border border-slate-200 bg-white shadow-sm`}>
            <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-bold text-dark">
                  {selectedSection || "Select a section"}
                </h2>
              </div>
            </div>

            <div className="min-h-0 flex-1">
              <table className="w-full table-fixed text-left">
                <thead className="bg-slate-100 text-xs uppercase text-slate-500 lg:text-sm">
                  <tr>
                    <th className="w-[16%] px-2 py-4 lg:px-4">ID</th>
                    <th className="w-[30%] px-2 py-4 lg:px-4">Name</th>
                    <th className="px-2 py-4 lg:px-4">Section</th>
                    <th className="px-2 py-4 lg:px-4">Year</th>
                    <th className="w-[18%] px-2 py-4 lg:px-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {isLoadingStudents ? (
                    <tr>
                      <td className="px-4 py-6 text-slate-500" colSpan="5">
                        Loading students...
                      </td>
                    </tr>
                  ) : students.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-slate-500" colSpan="5">
                        No students in this section yet.
                      </td>
                    </tr>
                  ) : (
                    paginatedStudents.map((student) => (
                      <tr key={student.idNum} className="hover:bg-slate-50">
                        <td className="break-words px-2 py-4 font-semibold text-primary lg:px-4">{student.idNum}</td>
                        <td className="break-words px-2 py-4 font-medium text-dark lg:px-4">{student.name}</td>
                        <td className="break-words px-2 py-4 text-slate-600 lg:px-4">{student.section}</td>
                        <td className="break-words px-2 py-4 text-slate-600 lg:px-4">{student.year}</td>
                        <td className="px-2 py-4 lg:px-4">
                          <div className="flex flex-wrap gap-2">
                            <button className={`${secondaryButtonClass} px-3`} onClick={() => setSelectedStudent(student)}>
                              View Profile
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex shrink-0 flex-col gap-3 border-t border-slate-200 p-4 text-[12px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  className={secondaryButtonClass}
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                >
                  Previous
                </button>
                <button
                  className={secondaryButtonClass}
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      {selectedStudent && !mode && (
        <div
          className={modalOverlayClass}
          onClick={() => setSelectedStudent(null)}
        >
          <div
            className={`${modalPanelClass} max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                  Student Profile
                </p>
                <h2 className="mt-1 text-2xl font-bold text-dark">{selectedStudent.name}</h2>
              </div>
              <button className={secondaryButtonClass} onClick={() => setSelectedStudent(null)}>
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
              <ProfileField label="ID" value={selectedStudent.idNum} />
              <ProfileField label="Last Name" value={selectedStudent.lastName} />
              <ProfileField label="First Name" value={selectedStudent.firstName} />
              <ProfileField label="Middle Name" value={selectedStudent.middleName || "None"} />
              <ProfileField label="Suffix" value={selectedStudent.suffix || "None"} />
              <ProfileField label="Section" value={selectedStudent.section} />
              <ProfileField label="Year" value={selectedStudent.year} />
            </div>

            <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-200 pt-5">
              <button className={secondaryButtonClass} onClick={() => openEditForm(selectedStudent)}>
                Edit Student
              </button>
              <button className={secondaryButtonClass} onClick={() => openDeleteConfirm(selectedStudent)}>
                Delete Student
              </button>
            </div>
          </div>
        </div>
      )}

      {["add", "edit"].includes(mode) && (
        <div
          className={modalOverlayClass}
          onClick={closePanel}
        >
          <form
            className={`${modalPanelClass} max-h-[90vh] w-full max-w-3xl overflow-y-auto p-6`}
            onClick={(event) => event.stopPropagation()}
            onSubmit={saveStudent}
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                  {mode === "add" ? "Add Student" : "Edit Student"}
                </p>
                <h2 className="mt-1 text-2xl font-bold text-dark">
                  {mode === "add" ? "Create student record" : selectedStudent?.name}
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Highlighted fields are ready to edit.
                </p>
              </div>
              <button type="button" className={secondaryButtonClass} onClick={closePanel}>
                Close
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <StudentInput
                highlighted
                label="ID"
                value={formData.idNum}
                onChange={(value) => updateField("idNum", value)}
              />
              <StudentInput
                highlighted
                label="Last Name"
                value={formData.lastName}
                onChange={(value) => updateField("lastName", value)}
              />
              <StudentInput
                highlighted
                label="First Name"
                value={formData.firstName}
                onChange={(value) => updateField("firstName", value)}
              />
              <StudentInput
                highlighted
                label="Middle Name"
                required={false}
                value={formData.middleName}
                onChange={(value) => updateField("middleName", value)}
              />
              <StudentInput
                highlighted
                label="Suffix"
                required={false}
                value={formData.suffix}
                onChange={(value) => updateField("suffix", value)}
              />
              <StudentSelect
                highlighted
                label="Section"
                options={sectionOptions}
                value={formData.section}
                onChange={updateSection}
              />
              <StudentInput
                disabled
                highlighted
                label="Year"
                value={formData.year}
                onChange={(value) => updateField("year", value)}
              />
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-5">
              <button type="button" className={secondaryButtonClass} onClick={closePanel}>
                Cancel
              </button>
              <button className={primaryButtonClass} type="submit">
                Save Student
              </button>
            </div>
          </form>
        </div>
      )}

      {mode === "delete" && selectedStudent && (
        <div
          className={modalOverlayClass}
          onClick={closePanel}
        >
          <div
            className={`${modalPanelClass} w-full max-w-md border-red-100 p-6`}
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-sm font-semibold uppercase tracking-wide text-red-600">
              Delete Student
            </p>
            <h2 className="mt-1 text-2xl font-bold text-dark">{selectedStudent.name}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              This will permanently remove this student from the database. This action cannot be undone.
            </p>

            <div className="mt-6 flex justify-end gap-2 border-t border-slate-200 pt-5">
              <button className={secondaryButtonClass} onClick={closePanel}>
                Cancel
              </button>
              <button className={dangerButtonClass} onClick={deleteStudent}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function ProfileField({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase text-slate-400">{label}</p>
      <p className="mt-1 font-semibold text-dark">{value}</p>
    </div>
  )
}

function StudentInput({ disabled = false, highlighted = false, label, list, required = true, value, onChange }) {
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
        list={list}
        required={required}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

function StudentSelect({ highlighted = false, label, options, value, onChange }) {
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
        <option value="" disabled>
          Select section
        </option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}

export default StudentsPage
