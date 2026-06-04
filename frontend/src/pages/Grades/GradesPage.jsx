import { useEffect, useMemo, useState } from "react"

const API_BASE_URL = "http://127.0.0.1:5000/api"
const emptySubject = { code: "", name: "" }
const emptySection = { section: "" }
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
const STUDENTS_PER_PAGE = 9

function GradesPage() {
  const [subjects, setSubjects] = useState([])
  const [allSections, setAllSections] = useState([])
  const [subjectSections, setSubjectSections] = useState([])
  const [gradeRows, setGradeRows] = useState([])
  const [selectedSubjectId, setSelectedSubjectId] = useState(null)
  const [selectedSection, setSelectedSection] = useState("")
  const [modal, setModal] = useState("")
  const [subjectForm, setSubjectForm] = useState(emptySubject)
  const [sectionForm, setSectionForm] = useState(emptySection)
  const [activeSubject, setActiveSubject] = useState(null)
  const [activeSection, setActiveSection] = useState(null)
  const [activeStudent, setActiveStudent] = useState(null)
  const [studentGrades, setStudentGrades] = useState(null)
  const [gradeDrafts, setGradeDrafts] = useState([])
  const [isEditingGrades, setIsEditingGrades] = useState(false)
  const [error, setError] = useState("")
  const [currentPage, setCurrentPage] = useState(1)

  const selectedSubject = useMemo(
    () => subjects.find((subject) => subject.id === selectedSubjectId),
    [subjects, selectedSubjectId],
  )
  const assignedSectionNames = useMemo(
    () => new Set(subjectSections.map((section) => section.section)),
    [subjectSections],
  )
  const availableSectionOptions = allSections
    .map((section) => section.section)
    .filter((section) => !assignedSectionNames.has(section))
  const sectionModalOptions = modal === "editSection" && activeSection
    ? [
        activeSection.section,
        ...availableSectionOptions.filter((section) => section !== activeSection.section),
      ]
    : availableSectionOptions
  const totalPages = Math.max(1, Math.ceil(gradeRows.length / STUDENTS_PER_PAGE))
  const paginatedGradeRows = gradeRows.slice(
    (currentPage - 1) * STUDENTS_PER_PAGE,
    currentPage * STUDENTS_PER_PAGE,
  )

  useEffect(() => {
    loadSubjects()
    loadAllSections()
  }, [])

  useEffect(() => {
    if (selectedSubjectId) {
      loadSubjectSections(selectedSubjectId)
    }
  }, [selectedSubjectId])

  useEffect(() => {
    if (selectedSubjectId && selectedSection) {
      setCurrentPage(1)
      loadSectionGrades(selectedSubjectId, selectedSection)
    } else {
      setGradeRows([])
    }
  }, [selectedSubjectId, selectedSection])

  async function loadSubjects() {
    setError("")
    try {
      const response = await fetch(`${API_BASE_URL}/subjects`)
      const data = await response.json()
      setSubjects(data)

      if (!selectedSubjectId && data.length > 0) {
        setSelectedSubjectId(data[0].id)
      }
    } catch {
      setError("Unable to load subjects. Make sure the Flask backend is running.")
    }
  }

  async function loadAllSections() {
    try {
      const response = await fetch(`${API_BASE_URL}/sections`)
      const data = await response.json()
      setAllSections(data)
    } catch {
      setError("Unable to load sections.")
    }
  }

  async function loadSubjectSections(subjectId) {
    setError("")
    try {
      const response = await fetch(`${API_BASE_URL}/subjects/${subjectId}/sections`)
      const data = await response.json()
      setSubjectSections(data)
      setSelectedSection(data[0]?.section || "")
    } catch {
      setError("Unable to load sections for this subject.")
    }
  }

  async function loadSectionGrades(subjectId, section) {
    setError("")
    try {
      const response = await fetch(
        `${API_BASE_URL}/subjects/${subjectId}/sections/${encodeURIComponent(section)}/grades`,
      )
      const data = await response.json()
      setGradeRows(data)
    } catch {
      setError("Unable to load grades for this section.")
    }
  }

  async function chooseSubject(subject) {
    setSelectedSubjectId(subject.id)
    setSelectedSection("")
    setGradeRows([])
    setCurrentPage(1)
    setModal("chooseSection")
  }

  function chooseSection(section) {
    setSelectedSection(section.section)
    setModal("")
  }

  function openSubjectModal(mode, subject = null) {
    setActiveSubject(subject)
    setSubjectForm(subject ? { code: subject.code, name: subject.name } : emptySubject)
    setModal(mode)
  }

  function openSectionModal(mode, section = null) {
    setActiveSection(section)
    setSectionForm({ section: section?.section || "" })
    setModal(mode)
  }

  function closeModal() {
    setModal("")
    setActiveSubject(null)
    setActiveSection(null)
    setActiveStudent(null)
    setStudentGrades(null)
    setGradeDrafts([])
    setIsEditingGrades(false)
    setSubjectForm(emptySubject)
    setSectionForm(emptySection)
  }

  async function saveSubject(event) {
    event.preventDefault()
    const isEdit = modal === "editSubject"
    const url = isEdit
      ? `${API_BASE_URL}/subjects/${activeSubject.id}`
      : `${API_BASE_URL}/subjects`

    try {
      const response = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subjectForm),
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Unable to save subject.")
        return
      }

      await loadSubjects()
      closeModal()
    } catch {
      setError("Unable to save subject.")
    }
  }

  async function deleteSubject() {
    try {
      const response = await fetch(`${API_BASE_URL}/subjects/${activeSubject.id}`, {
        method: "DELETE",
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Unable to delete subject.")
        return
      }

      setSelectedSubjectId(null)
      await loadSubjects()
      closeModal()
    } catch {
      setError("Unable to delete subject.")
    }
  }

  async function saveSubjectSection(event) {
    event.preventDefault()
    const isEdit = modal === "editSection"
    const url = isEdit
      ? `${API_BASE_URL}/subjects/${selectedSubjectId}/sections/${encodeURIComponent(activeSection.section)}`
      : `${API_BASE_URL}/subjects/${selectedSubjectId}/sections`

    try {
      const response = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sectionForm),
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Unable to save section.")
        return
      }

      await loadSubjects()
      await loadSubjectSections(selectedSubjectId)
      setActiveSection(null)
      setSectionForm(emptySection)
      setModal("chooseSection")
    } catch {
      setError("Unable to save section.")
    }
  }

  async function removeSubjectSection() {
    try {
      const response = await fetch(
        `${API_BASE_URL}/subjects/${selectedSubjectId}/sections/${encodeURIComponent(activeSection.section)}`,
        { method: "DELETE" },
      )
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Unable to remove section.")
        return
      }

      await loadSubjects()
      await loadSubjectSections(selectedSubjectId)
      setActiveSection(null)
      setSectionForm(emptySection)
      setModal("chooseSection")
    } catch {
      setError("Unable to remove section.")
    }
  }

  async function openGradesModal(student) {
    setActiveStudent(student)
    setModal("studentGrades")
    setIsEditingGrades(false)

    try {
      const response = await fetch(`${API_BASE_URL}/students/${student.studentId}/grades`)
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Unable to load student grades.")
        closeModal()
        return
      }

      setStudentGrades(data)
      setGradeDrafts(data.grades)
    } catch {
      setError("Unable to load student grades.")
      closeModal()
    }
  }

  function updateGradeDraft(index, field, value) {
    setGradeDrafts((current) =>
      current.map((grade, gradeIndex) =>
        gradeIndex === index ? { ...grade, [field]: value } : grade,
      ),
    )
  }

  async function saveStudentGrades() {
    try {
      await Promise.all(
        gradeDrafts.map((grade) =>
          fetch(`${API_BASE_URL}/grades/${grade.subjectId}/${activeStudent.studentId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(grade),
          }),
        ),
      )
      await openGradesModal(activeStudent)
      await loadSectionGrades(selectedSubjectId, selectedSection)
      setIsEditingGrades(false)
    } catch {
      setError("Unable to save grades.")
    }
  }

  return (
    <section className="min-h-full bg-slate-50 p-5 lg:p-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              Grade Management
            </p>
            <h1 className="text-3xl font-bold text-dark">Grades</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Open a subject, choose a section, then manage student grades.
            </p>
          </div>
          <button className={primaryButtonClass} onClick={() => openSubjectModal("addSubject")}>
            Add Subject
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[18rem_minmax(0,1fr)]">
          <Panel title="Subjects" count={subjects.length}>
            <div className="flex flex-col gap-2">
              {subjects.map((subject) => (
                <button
                  key={subject.id}
                  className={`cursor-pointer rounded-lg border p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                    selectedSubjectId === subject.id
                      ? "border-primary bg-primary text-light"
                      : "border-slate-200 bg-white text-dark hover:border-primary hover:bg-primary/5"
                  }`}
                  onClick={() => chooseSubject(subject)}
                >
                  <span className="block text-base font-bold">{subject.name}</span>
                  <span className={selectedSubjectId === subject.id ? "text-white/80" : "text-slate-500"}>
                    {subject.code || "No code"} - {subject.sectionCount} sections
                  </span>
                </button>
              ))}
            </div>
            {selectedSubject && (
              <div className="mt-4 flex gap-2 border-t border-slate-200 pt-4">
                <button className={secondaryButtonClass} onClick={() => openSubjectModal("editSubject", selectedSubject)}>
                  Edit
                </button>
                <button className={secondaryButtonClass} onClick={() => openSubjectModal("deleteSubject", selectedSubject)}>
                  Delete
                </button>
              </div>
            )}
          </Panel>

          <div className="flex min-w-0 flex-col rounded-lg border border-slate-200 bg-white shadow-sm lg:col-span-2 2xl:col-span-1">
            <div className="border-b border-slate-200 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <h2 className="text-xl font-bold text-dark">
                  {selectedSubject?.name || "Select a subject"} {selectedSection ? `- ${selectedSection}` : ""}
                </h2>
                {selectedSubject && (
                  <button className={secondaryButtonClass} onClick={() => setModal("chooseSection")}>
                    Change Section
                  </button>
                )}
              </div>
            </div>
            <div>
              <table className="w-full table-fixed text-left">
                <thead className="bg-slate-100 text-xs uppercase text-slate-500 lg:text-sm">
                  <tr>
                    <th className="w-[14%] px-2 py-4 lg:px-3">ID</th>
                    <th className="w-[22%] px-2 py-4 lg:px-3">Name</th>
                    <th className="px-2 py-4 lg:px-3">Prelim</th>
                    <th className="px-2 py-4 lg:px-3">Midterm</th>
                    <th className="px-2 py-4 lg:px-3">Semi</th>
                    <th className="px-2 py-4 lg:px-3">Finals</th>
                    <th className="px-2 py-4 lg:px-3">Final</th>
                    <th className="w-[16%] px-2 py-4 lg:px-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {gradeRows.length === 0 ? (
                    <tr>
                      <td className="px-3 py-6 text-slate-500" colSpan="8">
                        Select a subject section to view grades.
                      </td>
                    </tr>
                  ) : (
                    paginatedGradeRows.map((student) => (
                      <tr key={student.studentId} className="hover:bg-slate-50">
                        <td className="break-words px-2 py-4 font-semibold text-primary lg:px-3">{student.studentId}</td>
                        <td className="break-words px-2 py-4 font-medium text-dark lg:px-3">{student.name}</td>
                        <td className="px-2 py-4 text-slate-600 lg:px-3">{displayGrade(student.prelim)}</td>
                        <td className="px-2 py-4 text-slate-600 lg:px-3">{displayGrade(student.midterm)}</td>
                        <td className="px-2 py-4 text-slate-600 lg:px-3">{displayGrade(student.semi)}</td>
                        <td className="px-2 py-4 text-slate-600 lg:px-3">{displayGrade(student.finals)}</td>
                        <td className="px-2 py-4 font-semibold text-dark lg:px-3">{displayGrade(student.finalGrade)}</td>
                        <td className="px-2 py-4 lg:px-3">
                          <button className={`${secondaryButtonClass} px-3`} onClick={() => openGradesModal(student)}>
                            View Grades
                          </button>
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

      {["addSubject", "editSubject"].includes(modal) && (
        <Modal onClose={closeModal}>
          <form className="w-full max-w-lg p-6" onSubmit={saveSubject}>
            <ModalHeader title={modal === "addSubject" ? "Add Subject" : "Edit Subject"} onClose={closeModal} />
            <div className="mt-6 grid gap-4">
              <TextInput label="Subject Code" value={subjectForm.code} onChange={(value) => setSubjectForm({ ...subjectForm, code: value })} />
              <TextInput label="Subject Name" value={subjectForm.name} onChange={(value) => setSubjectForm({ ...subjectForm, name: value })} />
            </div>
            <ModalActions onCancel={closeModal}>
              <button className={primaryButtonClass} type="submit">Save Subject</button>
            </ModalActions>
          </form>
        </Modal>
      )}

      {modal === "deleteSubject" && activeSubject && (
        <ConfirmModal
          title="Delete Subject"
          message={`Delete ${activeSubject.name} and all related grades?`}
          onCancel={closeModal}
          onConfirm={deleteSubject}
        />
      )}

      {modal === "chooseSection" && selectedSubject && (
        <Modal onClose={closeModal}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6">
            <ModalHeader
              title={`${selectedSubject.name} Sections`}
              subtitle="Choose a section to open its grade list."
              onClose={closeModal}
            />

            <button className={`${primaryButtonClass} mt-6 w-full`} onClick={() => openSectionModal("addSection")}>
              Add Section
            </button>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {subjectSections.length === 0 ? (
                <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500 sm:col-span-2">
                  No sections assigned.
                </p>
              ) : (
                subjectSections.map((section) => (
                  <div
                    key={section.section}
                    className={`rounded-lg border p-4 shadow-sm transition-all duration-200 ${
                      selectedSection === section.section
                        ? "border-primary bg-primary/5"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <button className="w-full cursor-pointer text-left" onClick={() => chooseSection(section)}>
                      <span className="block text-base font-bold text-dark">{section.section}</span>
                      <span className="text-sm text-slate-500">{section.studentCount} students</span>
                    </button>
                    <div className="mt-4 flex gap-2 border-t border-slate-200 pt-4">
                      <button className={secondaryButtonClass} onClick={() => openSectionModal("editSection", section)}>
                        Edit
                      </button>
                      <button className={secondaryButtonClass} onClick={() => openSectionModal("removeSection", section)}>
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Modal>
      )}

      {["addSection", "editSection"].includes(modal) && (
        <Modal onClose={closeModal}>
          <form className="w-full max-w-lg p-6" onSubmit={saveSubjectSection}>
            <ModalHeader title={modal === "addSection" ? "Add Section to Subject" : "Edit Subject Section"} onClose={closeModal} />
            <div className="mt-6">
              <SelectInput
                label="Section"
                options={sectionModalOptions}
                value={sectionForm.section}
                onChange={(value) => setSectionForm({ section: value })}
              />
            </div>
            <ModalActions onCancel={closeModal}>
              <button className={primaryButtonClass} type="submit">Save Section</button>
            </ModalActions>
          </form>
        </Modal>
      )}

      {modal === "removeSection" && activeSection && (
        <ConfirmModal
          title="Remove Section"
          message={`Remove ${activeSection.section} from ${selectedSubject?.name}?`}
          onCancel={closeModal}
          onConfirm={removeSubjectSection}
        />
      )}

      {modal === "studentGrades" && studentGrades && (
        <Modal onClose={closeModal}>
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto p-6">
            <ModalHeader title={studentGrades.student.name} subtitle={`${studentGrades.student.idNum} - ${studentGrades.student.section}`} onClose={closeModal} />
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {gradeDrafts.map((grade, index) => (
                <div key={grade.subjectId} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-primary">{grade.code || "Subject"}</p>
                    <h3 className="text-lg font-bold text-dark">{grade.subject}</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {["prelim", "midterm", "semi", "finals"].map((field) => (
                      <GradeInput
                        key={field}
                        disabled={!isEditingGrades}
                        label={labelGrade(field)}
                        value={grade[field] ?? ""}
                        onChange={(value) => updateGradeDraft(index, field, value)}
                      />
                    ))}
                  </div>
                  <p className="mt-4 text-sm font-semibold text-slate-600">
                    Final Grade: {displayGrade(grade.finalGrade)}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-5">
              {isEditingGrades ? (
                <button className={primaryButtonClass} onClick={saveStudentGrades}>Save Grades</button>
              ) : (
                <button className={secondaryButtonClass} onClick={() => setIsEditingGrades(true)}>Edit</button>
              )}
              <button className={secondaryButtonClass} onClick={() => window.print()}>Print</button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  )
}

function Panel({ title, count, children }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-dark">{title}</h2>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          {count}
        </span>
      </div>
      {children}
    </div>
  )
}

function Modal({ children, onClose }) {
  return (
    <div className={modalOverlayClass} onClick={onClose}>
      <div className={modalPanelClass} onClick={(event) => event.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

function ModalHeader({ title, subtitle, onClose }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">Grades</p>
        <h2 className="mt-1 text-2xl font-bold text-dark">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      <button className={secondaryButtonClass} onClick={onClose}>Close</button>
    </div>
  )
}

function ModalActions({ children, onCancel }) {
  return (
    <div className="mt-6 flex justify-end gap-2 border-t border-slate-200 pt-5">
      <button className={secondaryButtonClass} type="button" onClick={onCancel}>Cancel</button>
      {children}
    </div>
  )
}

function ConfirmModal({ title, message, onCancel, onConfirm }) {
  return (
    <Modal onClose={onCancel}>
      <div className="w-full max-w-md p-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-red-600">{title}</p>
        <p className="mt-3 text-sm leading-6 text-slate-600">{message}</p>
        <div className="mt-6 flex justify-end gap-2 border-t border-slate-200 pt-5">
          <button className={secondaryButtonClass} onClick={onCancel}>Cancel</button>
          <button className={dangerButtonClass} onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </Modal>
  )
}

function TextInput({ label, value, onChange }) {
  return (
    <label className="flex flex-col gap-2 text-sm font-semibold text-slate-600">
      {label}
      <input
        className="rounded-lg border border-primary/50 bg-primary/5 px-4 py-3 font-medium text-dark outline-none transition-all duration-200 focus:border-primary focus:shadow-sm"
        required={label.includes("Name")}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

function SelectInput({ label, options, value, onChange }) {
  return (
    <label className="flex flex-col gap-2 text-sm font-semibold text-slate-600">
      {label}
      <select
        className="cursor-pointer rounded-lg border border-primary/50 bg-primary/5 px-4 py-3 font-medium text-dark outline-none transition-all duration-200 focus:border-primary focus:shadow-sm"
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="" disabled>Select section</option>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  )
}

function GradeInput({ disabled, label, value, onChange }) {
  return (
    <label className="flex flex-col gap-2 text-sm font-semibold text-slate-600">
      {label}
      <input
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-medium text-dark outline-none transition-all duration-200 focus:border-primary disabled:bg-white disabled:text-slate-600"
        disabled={disabled}
        max="100"
        min="0"
        type="number"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

function activeSectionControls(selectedSection, sections) {
  return sections.find((section) => section.section === selectedSection)
}

function displayGrade(grade) {
  return grade === null || grade === undefined || grade === "" ? "-" : grade
}

function labelGrade(field) {
  return {
    prelim: "Prelim",
    midterm: "Midterm",
    semi: "Semi",
    finals: "Finals",
  }[field]
}

export default GradesPage
