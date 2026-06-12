import { useEffect, useMemo, useState } from "react"

import { TextInput, SelectInput } from "../../components/ui/FormFields"
import { Modal, ModalHeader, ModalActions, ConfirmModal } from "../../components/ui/Modal"
import { primaryButtonClass, secondaryButtonClass, dangerButtonClass, compactButtonClass } from "../../components/ui/buttonStyles"
import { SearchInput, SortControls } from "../../components/ui/ListControls"
import PaginationFooter from "../../components/ui/PaginationFooter"
import Toast from "../../components/ui/Toast"

const API_BASE_URL = "http://127.0.0.1:5000/api"
const emptySubject = { code: "", name: "" }
const emptySection = { course: "", section: "", sectionLetter: "", year: "" }
const yearOptions = ["1st Year", "2nd Year", "3rd Year", "4th Year"]
const sectionLetterOptions = ["A", "B", "C", "D"]
const yearNumbers = {
  "1st Year": "1",
  "2nd Year": "2",
  "3rd Year": "3",
  "4th Year": "4",
}
const SUBJECTS_PER_PAGE = 5
const STUDENTS_PER_PAGE = 6
const panelHeightClass = "h-[min(46rem,calc(100vh-12rem))]"

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
  const [subjectPage, setSubjectPage] = useState(1)
  const [subjectSearch, setSubjectSearch] = useState("")
  const [subjectSortDirection, setSubjectSortDirection] = useState("desc")
  const [gradeSearch, setGradeSearch] = useState("")
  const [gradeSortBy, setGradeSortBy] = useState("name")
  const [gradeSortDirection, setGradeSortDirection] = useState("asc")
  const [isClosingModal, setIsClosingModal] = useState(false)
  const [toastMessage, setToastMessage] = useState("")

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
  const selectedSectionDetails = allSections.find((section) => section.section === selectedSection)
  const sectionPreview =
    sectionForm.course && sectionForm.year && sectionForm.sectionLetter
      ? `${sectionForm.course.toUpperCase()}-${yearNumbers[sectionForm.year] || ""}${sectionForm.sectionLetter.toUpperCase()}`
      : ""
  const filteredSubjects = useMemo(() => {
    const query = subjectSearch.trim().toLowerCase()
    return subjects
      .filter((subject) =>
        subject.name.toLowerCase().includes(query)
        || (subject.code || "").toLowerCase().includes(query),
      )
      .sort((first, second) => {
        const result = first.sectionCount - second.sectionCount
        return subjectSortDirection === "asc" ? result : -result
      })
  }, [subjects, subjectSearch, subjectSortDirection])
  const filteredGradeRows = useMemo(() => {
    const query = gradeSearch.trim().toLowerCase()
    return gradeRows
      .filter((student) =>
        student.studentId.toLowerCase().includes(query)
        || student.name.toLowerCase().includes(query),
      )
      .sort((first, second) => {
        if (gradeSortBy === "finalGrade") {
          return compareFinalGrades(first.finalGrade, second.finalGrade, gradeSortDirection)
        }

        const firstValue = gradeSortBy === "id" ? first.studentId : first.name
        const secondValue = gradeSortBy === "id" ? second.studentId : second.name
        const result = firstValue.localeCompare(secondValue)
        return gradeSortDirection === "asc" ? result : -result
      })
  }, [gradeRows, gradeSearch, gradeSortBy, gradeSortDirection])
  const totalPages = Math.max(1, Math.ceil(filteredGradeRows.length / STUDENTS_PER_PAGE))
  const paginatedGradeRows = filteredGradeRows.slice(
    (currentPage - 1) * STUDENTS_PER_PAGE,
    currentPage * STUDENTS_PER_PAGE,
  )
  const totalSubjectPages = Math.max(1, Math.ceil(filteredSubjects.length / SUBJECTS_PER_PAGE))
  const paginatedSubjects = filteredSubjects.slice(
    (subjectPage - 1) * SUBJECTS_PER_PAGE,
    subjectPage * SUBJECTS_PER_PAGE,
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

  useEffect(() => {
    setSubjectPage(1)
  }, [subjectSearch, subjectSortDirection])

  useEffect(() => {
    setCurrentPage(1)
  }, [gradeSearch, gradeSortBy, gradeSortDirection])

  useEffect(() => {
    if (!toastMessage) {
      return
    }

    const timer = window.setTimeout(() => setToastMessage(""), 5000)
    return () => window.clearTimeout(timer)
  }, [toastMessage])

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
    setIsClosingModal(false)
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
    setIsClosingModal(false)
    setActiveSubject(subject)
    setSubjectForm(subject ? { code: subject.code, name: subject.name } : emptySubject)
    setModal(mode)
  }

  function openSectionModal(mode, section = null) {
    setIsClosingModal(false)
    setActiveSection(section)
    setSectionForm({ section: section?.section || "" })
    setModal(mode)
  }

  function openEditCurrentSectionModal() {
    const parsedSection = parseSectionName(selectedSection)

    setIsClosingModal(false)
    setActiveSection({ section: selectedSection })
    setSectionForm({
      course: parsedSection.course,
      section: selectedSection,
      sectionLetter: parsedSection.sectionLetter,
      year: selectedSectionDetails?.year || activeSectionControls(selectedSection, subjectSections)?.year || "",
    })
    setModal("editSection")
  }

  function openRemoveCurrentSectionModal() {
    setIsClosingModal(false)
    setActiveSection(activeSectionControls(selectedSection, subjectSections) || { section: selectedSection })
    setModal("removeSection")
  }

  function closeModal() {
    setIsClosingModal(true)
    window.setTimeout(() => {
      setModal("")
      setActiveSubject(null)
      setActiveSection(null)
      setActiveStudent(null)
      setStudentGrades(null)
      setGradeDrafts([])
      setIsEditingGrades(false)
      setSubjectForm(emptySubject)
      setSectionForm(emptySection)
      setIsClosingModal(false)
    }, 180)
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

    try {
      const response = await fetch(`${API_BASE_URL}/subjects/${selectedSubjectId}/sections`, {
        method: "POST",
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

  async function saveCurrentSection(event) {
    event.preventDefault()
    setError("")

    try {
      const response = await fetch(`${API_BASE_URL}/sections/${encodeURIComponent(selectedSection)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course: sectionForm.course,
          year: sectionForm.year,
          sectionLetter: sectionForm.sectionLetter,
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Unable to update section.")
        return
      }

      const nextSection = sectionPreview
      await loadAllSections()
      await loadSubjects()
      await loadSubjectSections(selectedSubjectId)
      setSelectedSection(nextSection)
      await loadSectionGrades(selectedSubjectId, nextSection)
      closeModal()
    } catch {
      setError("Unable to update section.")
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
    setIsClosingModal(false)
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
    const nextValue = sanitizeGradeInput(value)

    setGradeDrafts((current) =>
      current.map((grade, gradeIndex) =>
        gradeIndex === index ? { ...grade, [field]: nextValue } : grade,
      ),
    )
  }

  async function saveStudentGrades() {
    try {
      const responses = await Promise.all(
        gradeDrafts.map((grade) =>
          fetch(`${API_BASE_URL}/grades/${grade.subjectId}/${activeStudent.studentId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(grade),
          }),
        ),
      )
      const failedResponse = responses.find((response) => !response.ok)

      if (failedResponse) {
        const data = await failedResponse.json()
        setToastMessage(data.error || "Unable to save grades.")
        return
      }

      await openGradesModal(activeStudent)
      await loadSectionGrades(selectedSubjectId, selectedSection)
      setIsEditingGrades(false)
    } catch {
      setToastMessage("Unable to save grades.")
    }
  }

  function studentGradesAreComplete() {
    return gradeDrafts.length > 0 && gradeDrafts.every((grade) =>
      ["prelim", "midterm", "semi", "finals"].every((field) =>
        grade[field] !== null && grade[field] !== undefined && grade[field] !== "",
      ),
    )
  }

  function warnIncompleteGrades() {
    setToastMessage("Complete all subject grades before printing or sending to email.")
  }

  function printStudentGrades() {
    if (!studentGradesAreComplete()) {
      warnIncompleteGrades()
      return
    }

    window.print()
  }

  function sendStudentGradesToEmail() {
    if (!studentGradesAreComplete()) {
      warnIncompleteGrades()
      return
    }

    setToastMessage("Email sending will be available soon.")
  }

  return (
    <section className="min-h-full bg-slate-50 p-5 lg:p-8">
      <div className="mx-auto flex max-w-[96rem] flex-col gap-6">
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
          <div className="flex w-full flex-col gap-2 xl:w-auto xl:items-end">
            <div className="flex flex-wrap gap-2 xl:justify-end">
              <button className={primaryButtonClass} onClick={() => openSubjectModal("addSubject")}>
                Add Subject
              </button>
              {selectedSubject && (
                <>
                  <button className={secondaryButtonClass} onClick={() => openSubjectModal("editSubject", selectedSubject)}>
                    Edit Subject
                  </button>
                  <button className={dangerButtonClass} onClick={() => openSubjectModal("deleteSubject", selectedSubject)}>
                    Delete Subject
                  </button>
                </>
              )}
            </div>
            {selectedSubject && (
              <div className="flex flex-wrap gap-2 xl:justify-end">
                <button className={secondaryButtonClass} onClick={() => openSectionModal("addSection")}>
                  Add Section
                </button>
                {selectedSection && (
                  <>
                    <button
                      className={secondaryButtonClass}
                      onClick={openEditCurrentSectionModal}
                    >
                      Edit Section
                    </button>
                    <button
                      className={dangerButtonClass}
                      onClick={openRemoveCurrentSectionModal}
                    >
                      Delete Section
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[17rem_minmax(0,1fr)] 2xl:grid-cols-[18rem_minmax(0,1fr)]">
          <div className={`flex ${panelHeightClass} flex-col rounded-lg border border-slate-200 bg-white p-3 shadow-sm 2xl:p-4`}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-dark">Subjects</h2>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {filteredSubjects.length}
              </span>
            </div>
            <div className="mb-2 grid gap-2">
              <SearchInput
                placeholder="Search code or name"
                value={subjectSearch}
                onChange={setSubjectSearch}
              />
              <SortControls
                direction={subjectSortDirection}
                options={[
                  { label: "Sort by sections", value: "sectionCount" },
                ]}
                sortBy="sectionCount"
                onDirectionChange={setSubjectSortDirection}
                onSortByChange={() => {}}
              />
            </div>

            <div key={subjectPage} className="grid min-h-0 flex-1 grid-rows-5 gap-2 animate-[pageSwitch_180ms_ease-out]">
              {paginatedSubjects.map((subject) => (
                <button
                  key={subject.id}
                  className={`min-h-0 overflow-hidden cursor-pointer rounded-lg border px-2.5 py-1.5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 2xl:px-3 2xl:py-2 ${
                    selectedSubjectId === subject.id
                      ? "border-primary bg-primary text-light"
                      : "border-slate-200 bg-white text-dark hover:border-primary hover:bg-primary/5"
                  }`}
                  onClick={() => chooseSubject(subject)}
                >
                  <span className="flex min-w-0 items-baseline gap-2">
                    <span className="shrink-0 text-sm font-bold">{subject.code || "SUBJ"}</span>
                    <span className="min-w-0 truncate text-[11px] font-medium 2xl:text-xs">{subject.name}</span>
                  </span>
                  <span className={`mt-1 block truncate text-[11px] leading-4 2xl:text-xs ${selectedSubjectId === subject.id ? "text-white/80" : "text-slate-500"}`}>
                    {formatCount(subject.sectionCount, "section")}
                  </span>
                </button>
              ))}
              {Array.from({ length: SUBJECTS_PER_PAGE - paginatedSubjects.length }).map((_, index) => (
                <div key={`subject-placeholder-${index}`} className="min-h-0 rounded-lg border border-transparent px-3 py-2" />
              ))}
            </div>

            <div className="mt-3">
              <PaginationFooter
                currentPage={subjectPage}
                totalPages={totalSubjectPages}
                onPrevious={() => setSubjectPage((page) => Math.max(1, page - 1))}
                onNext={() => setSubjectPage((page) => Math.min(totalSubjectPages, page + 1))}
              />
            </div>
          </div>

          <div key={`${selectedSubjectId || "none"}-${selectedSection || "none"}`} className={`flex ${panelHeightClass} min-w-0 flex-col rounded-lg border border-slate-200 bg-white shadow-sm animate-[pageSwitch_180ms_ease-out]`}>
            <div className="border-b border-slate-200 p-3 2xl:p-4">
              <h2 className="text-lg font-bold text-dark 2xl:text-xl">
                {selectedSubject?.name || "Select a subject"} {selectedSection ? `- ${selectedSection}` : ""}
              </h2>
            </div>
            <div className="grid gap-2 border-b border-slate-200 p-3 lg:grid-cols-[minmax(0,1fr)_13rem] 2xl:grid-cols-[minmax(0,1fr)_16rem] 2xl:p-4">
              <SearchInput
                placeholder="Search ID or name"
                value={gradeSearch}
                onChange={setGradeSearch}
              />
              <SortControls
                direction={gradeSortDirection}
                options={[
                  { label: "Sort by name", value: "name" },
                  { label: "Sort by ID", value: "id" },
                  { label: "Sort by average", value: "finalGrade" },
                ]}
                sortBy={gradeSortBy}
                onDirectionChange={setGradeSortDirection}
                onSortByChange={setGradeSortBy}
              />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <table className="w-full table-fixed text-left">
                <thead className="bg-slate-100 text-[10px] uppercase leading-tight text-slate-500 2xl:text-xs">
                  <tr>
                    <th className="w-[13%] py-2.5 pl-6 pr-1.5">ID</th>
                    <th className="w-[23%] px-1.5 py-2.5">Name</th>
                    <th className="w-[10%] px-1.5 py-2.5">Prelim</th>
                    <th className="w-[10%] px-1.5 py-2.5">Midterm</th>
                    <th className="w-[10%] px-1.5 py-2.5">Semi</th>
                    <th className="w-[9%] px-1.5 py-2.5">Final</th>
                    <th className="w-[11%] px-1.5 py-2.5">Average</th>
                    <th className="w-[14%] px-1.5 py-2.5"></th>
                  </tr>
                </thead>
                <tbody key={`${selectedSubjectId || "none"}-${selectedSection || "none"}-${currentPage}`} className="divide-y divide-slate-200 text-[11px] animate-[pageSwitch_180ms_ease-out] 2xl:text-sm">
                  {filteredGradeRows.length === 0 ? (
                    <tr>
                      <td className="px-3 py-6 text-slate-500" colSpan="8">
                        Select a subject section to view grades.
                      </td>
                    </tr>
                  ) : (
                    paginatedGradeRows.map((student) => (
                      <tr key={student.studentId} className="h-12 hover:bg-slate-50 2xl:h-14">
                        <td className="break-words py-1.5 pl-6 pr-1.5 align-middle font-semibold text-primary">{student.studentId}</td>
                        <td className="break-words px-1.5 py-1.5 align-middle font-medium text-dark">{student.name}</td>
                        <td className="px-1.5 py-1.5 align-middle text-slate-600">{displayGrade(student.prelim)}</td>
                        <td className="px-1.5 py-1.5 align-middle text-slate-600">{displayGrade(student.midterm)}</td>
                        <td className="px-1.5 py-1.5 align-middle text-slate-600">{displayGrade(student.semi)}</td>
                        <td className="px-1.5 py-1.5 align-middle text-slate-600">{displayGrade(student.finals)}</td>
                        <td className="px-1.5 py-1.5 align-middle font-semibold text-dark">{displayGrade(student.finalGrade)}</td>
                        <td className="px-1.5 py-1.5 align-middle">
                          <button className={`${compactButtonClass} px-2 py-1.5 text-[10px] 2xl:px-3 2xl:py-2 2xl:text-xs`} onClick={() => openGradesModal(student)}>
                            View Grades
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                  {filteredGradeRows.length > 0 && Array.from({ length: STUDENTS_PER_PAGE - paginatedGradeRows.length }).map((_, index) => (
                    <tr key={`grade-placeholder-${index}`} className="h-12 2xl:h-14">
                      <td className="px-1.5 py-1.5" colSpan="8"></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationFooter
              currentPage={currentPage}
              totalPages={totalPages}
              onPrevious={() => setCurrentPage((page) => Math.max(1, page - 1))}
              onNext={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            />
          </div>
        </div>
      </div>

      <Toast message={toastMessage} />

      {["addSubject", "editSubject"].includes(modal) && (
        <Modal onClose={closeModal} isClosing={isClosingModal}>
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
          isClosing={isClosingModal}
          title="Delete Subject"
          message={`Delete ${activeSubject.name} and all related grades?`}
          onCancel={closeModal}
          onConfirm={deleteSubject}
        />
      )}

      {modal === "chooseSection" && selectedSubject && (
        <Modal onClose={closeModal} isClosing={isClosingModal}>
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
                    className={`flex min-h-36 flex-col rounded-lg border p-4 shadow-sm transition-all duration-200 ${
                      selectedSection === section.section
                        ? "border-primary bg-primary/5"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <button className="w-full flex-1 cursor-pointer text-left" onClick={() => chooseSection(section)}>
                      <span className="block text-base font-bold text-dark">{section.section}</span>
                      <span className="text-sm text-slate-500">{formatCount(section.studentCount, "student")}</span>
                    </button>
                    <div className="mt-4 flex justify-center border-t border-slate-200 pt-4">
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

      {modal === "addSection" && (
        <Modal onClose={closeModal} isClosing={isClosingModal}>
          <form className="w-full max-w-lg p-6" onSubmit={saveSubjectSection}>
            <ModalHeader title="Add Section to Subject" onClose={closeModal} />
            <div className="mt-6">
              <SelectInput
                label="Section"
                options={availableSectionOptions}
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

      {modal === "editSection" && (
        <Modal onClose={closeModal} isClosing={isClosingModal}>
          <form className="w-full max-w-xl p-6" onSubmit={saveCurrentSection}>
            <ModalHeader title="Edit Section" subtitle={selectedSection} onClose={closeModal} />
            <div className="mt-6 grid gap-4">
              <TextInput
                highlighted
                label="Course"
                placeholder="BSCS"
                value={sectionForm.course}
                onChange={(value) => setSectionForm((current) => ({ ...current, course: value }))}
              />
              <SelectInput
                highlighted
                label="Year"
                options={yearOptions}
                placeholder="Select year"
                value={sectionForm.year}
                onChange={(value) => setSectionForm((current) => ({ ...current, year: value }))}
              />
              <TextInput
                highlighted
                label="Section"
                list="grade-section-letter-options"
                placeholder="A"
                value={sectionForm.sectionLetter}
                onChange={(value) => setSectionForm((current) => ({
                  ...current,
                  sectionLetter: value.replace(/[^a-z]/gi, "").toUpperCase(),
                }))}
              />
              <datalist id="grade-section-letter-options">
                {sectionLetterOptions.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
              {sectionPreview && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Section name: <span className="font-semibold text-dark">{sectionPreview}</span>
                </div>
              )}
            </div>
            <ModalActions onCancel={closeModal}>
              <button className={primaryButtonClass} type="submit">Update Section</button>
            </ModalActions>
          </form>
        </Modal>
      )}

      {modal === "removeSection" && activeSection && (
        <ConfirmModal
          isClosing={isClosingModal}
          title="Remove Section"
          message={`Remove ${activeSection.section} from ${selectedSubject?.name}?`}
          onCancel={closeModal}
          onConfirm={removeSubjectSection}
        />
      )}

      {modal === "studentGrades" && studentGrades && (
        <Modal onClose={closeModal} isClosing={isClosingModal}>
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto p-6">
            <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                  Student Info
                </p>
                <h2 className="mt-1 text-2xl font-bold text-dark">{studentGrades.student.name}</h2>
                <div className="mt-3 grid gap-x-8 gap-y-1 text-sm text-slate-600 sm:grid-cols-2 print:hidden">
                  <p><span className="font-semibold text-slate-500">ID:</span> {studentGrades.student.idNum}</p>
                  <p><span className="font-semibold text-slate-500">Email:</span> {studentGrades.student.email || "No email"}</p>
                  <p><span className="font-semibold text-slate-500">Year:</span> {studentGrades.student.year}</p>
                  <p><span className="font-semibold text-slate-500">Section:</span> {studentGrades.student.section}</p>
                </div>
                <div className="mt-4 hidden text-sm text-slate-600 print:grid print:grid-cols-2 print:gap-x-8 print:gap-y-1">
                  <p><span className="font-semibold text-slate-500">ID:</span> {studentGrades.student.idNum}</p>
                  <p><span className="font-semibold text-slate-500">Email:</span> {studentGrades.student.email || "No email"}</p>
                  <p><span className="font-semibold text-slate-500">Year:</span> {studentGrades.student.year}</p>
                  <p><span className="font-semibold text-slate-500">Section:</span> {studentGrades.student.section}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 md:justify-end print:hidden">
                <button className={secondaryButtonClass} onClick={printStudentGrades}>
                  Print
                </button>
                <button className={secondaryButtonClass} type="button" onClick={sendStudentGradesToEmail}>
                  Send to Email
                </button>
                <button className={secondaryButtonClass} onClick={closeModal}>
                  Close
                </button>
              </div>
            </div>

            <div className="mt-5 overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[46rem] table-fixed text-left">
                <thead className="bg-slate-100 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="w-[22%] px-3 py-3">Subject Code</th>
                    <th className="w-[13%] px-3 py-3">Prelim</th>
                    <th className="w-[13%] px-3 py-3">Midterm</th>
                    <th className="w-[13%] px-3 py-3">Semi</th>
                    <th className="w-[13%] px-3 py-3">Finals</th>
                    <th className="w-[13%] px-3 py-3">Average</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {gradeDrafts.map((grade, index) => (
                    <tr key={grade.subjectId} className="hover:bg-slate-50">
                      <td className="px-3 py-3 align-middle">
                        <span className="block font-semibold text-primary">{grade.code || "Subject"}</span>
                        <span className="block truncate text-xs text-slate-500">{grade.subject}</span>
                      </td>
                      {["prelim", "midterm", "semi", "finals"].map((field) => (
                        <td key={field} className="px-3 py-3 align-middle">
                          {isEditingGrades ? (
                            <GradeInput
                              compact
                              disabled={false}
                              label={labelGrade(field)}
                              value={grade[field] ?? ""}
                              onChange={(value) => updateGradeDraft(index, field, value)}
                            />
                          ) : (
                            <span className="text-slate-600">{displayGrade(grade[field])}</span>
                          )}
                        </td>
                      ))}
                      <td className="px-3 py-3 align-middle font-semibold text-dark">
                        {displayGrade(grade.finalGrade)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              {isEditingGrades ? (
                <button className={primaryButtonClass} onClick={saveStudentGrades}>Save Grades</button>
              ) : (
                <button className={secondaryButtonClass} onClick={() => setIsEditingGrades(true)}>Edit</button>
              )}
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

function GradeInput({ compact = false, disabled, label, value, onChange }) {
  return (
    <label className={`flex flex-col ${compact ? "gap-1 text-[10px]" : "gap-2 text-sm"} font-semibold text-slate-600`}>
      <span className={compact ? "sr-only" : ""}>{label}</span>
      <input
        className={`${compact ? "px-2 py-1.5 text-xs" : "px-3 py-2"} rounded-lg border border-slate-200 bg-white font-medium text-dark outline-none transition-all duration-200 focus:border-primary disabled:bg-white disabled:text-slate-600`}
        disabled={disabled}
        max="99"
        min="60"
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

function formatCount(count, label) {
  return `${count} ${label}${count === 1 ? "" : "s"}`
}

function labelGrade(field) {
  return {
    prelim: "Preliminary",
    midterm: "Midterm",
    semi: "Semifinal",
    finals: "Final",
  }[field]
}

function parseSectionName(section) {
  const match = section.match(/^(.+)-\d+([A-Z]+)$/i)

  return {
    course: match?.[1] || "",
    sectionLetter: match?.[2] || "",
  }
}

function sanitizeGradeInput(value) {
  if (value === "") {
    return ""
  }

  const digits = value.replace(/\D/g, "")

  if (!digits) {
    return ""
  }

  if (digits.length === 1) {
    return /^[6-9]$/.test(digits) ? digits : ""
  }

  const grade = Number(digits.slice(0, 2))

  if (grade < 60) {
    return "60"
  }

  if (grade > 99) {
    return "99"
  }

  return String(grade)
}

function compareFinalGrades(firstGrade, secondGrade, direction) {
  const firstValue = Number(firstGrade)
  const secondValue = Number(secondGrade)
  const firstHasGrade = Number.isFinite(firstValue)
  const secondHasGrade = Number.isFinite(secondValue)

  if (!firstHasGrade && !secondHasGrade) {
    return 0
  }

  if (!firstHasGrade) {
    return 1
  }

  if (!secondHasGrade) {
    return -1
  }

  const result = firstValue - secondValue
  return direction === "asc" ? result : -result
}

export default GradesPage

