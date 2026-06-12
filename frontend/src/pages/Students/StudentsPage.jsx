import { useEffect, useMemo, useState } from "react"

import { TextInput, SelectInput } from "../../components/ui/FormFields"
import { primaryButtonClass, secondaryButtonClass, dangerButtonClass } from "../../components/ui/buttonStyles"
import { SearchInput, SortControls } from "../../components/ui/ListControls"
import PaginationFooter from "../../components/ui/PaginationFooter"
import Toast from "../../components/ui/Toast"

const API_BASE_URL = "http://127.0.0.1:5000/api"
const emptyStudent = {
  idNum: "",
  email: "",
  lastName: "",
  firstName: "",
  middleName: "",
  suffix: "",
  section: "",
  year: "",
}
const emptySection = {
  course: "",
  sectionLetter: "",
  year: "",
}
const yearOptions = ["1st Year", "2nd Year", "3rd Year", "4th Year"]
const sectionLetterOptions = ["A", "B", "C", "D"]
const suffixOptions = ["Jr.", "Sr.", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"]
const yearNumbers = {
  "1st Year": "1",
  "2nd Year": "2",
  "3rd Year": "3",
  "4th Year": "4",
}
const modalOverlayClass =
  "fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
const modalPanelClass =
  "rounded-lg border border-slate-200 bg-white shadow-2xl"
const SECTIONS_PER_PAGE = 6
const STUDENTS_PER_PAGE = 6
const panelHeightClass = "h-[min(52rem,calc(100vh-10rem))]"
const STUDENT_EMAIL_PATTERN = /^[^@\s]+@[^@.\s]+(\.[^@.\s]+)+$/

function StudentsPage() {
  const [sections, setSections] = useState([])
  const [students, setStudents] = useState([])
  const [selectedSection, setSelectedSection] = useState("")
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [formData, setFormData] = useState(emptyStudent)
  const [sectionForm, setSectionForm] = useState(emptySection)
  const [mode, setMode] = useState("")
  const [isLoadingSections, setIsLoadingSections] = useState(true)
  const [isLoadingStudents, setIsLoadingStudents] = useState(false)
  const [error, setError] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [sectionPage, setSectionPage] = useState(1)
  const [sectionSearch, setSectionSearch] = useState("")
  const [sectionSortBy, setSectionSortBy] = useState("studentCount")
  const [sectionSortDirection, setSectionSortDirection] = useState("desc")
  const [studentSearch, setStudentSearch] = useState("")
  const [studentSortBy, setStudentSortBy] = useState("name")
  const [studentSortDirection, setStudentSortDirection] = useState("asc")
  const [isClosingModal, setIsClosingModal] = useState(false)

  const sectionOptions = useMemo(
    () => [...new Set(sections.map((section) => section.section))],
    [sections],
  )
  const sectionYears = useMemo(
    () => Object.fromEntries(sections.map((section) => [section.section, section.year])),
    [sections],
  )
  const filteredSections = useMemo(() => {
    const query = sectionSearch.trim().toLowerCase()
    return sections
      .filter((section) => section.section.toLowerCase().includes(query))
      .sort((first, second) => {
        const firstValue = sectionSortBy === "year" ? first.year : first.studentCount
        const secondValue = sectionSortBy === "year" ? second.year : second.studentCount
        const result = sectionSortBy === "year"
          ? firstValue.localeCompare(secondValue)
          : firstValue - secondValue
        return sectionSortDirection === "asc" ? result : -result
      })
  }, [sections, sectionSearch, sectionSortBy, sectionSortDirection])
  const filteredStudents = useMemo(() => {
    const query = studentSearch.trim().toLowerCase()
    return students
      .filter((student) =>
        student.idNum.toLowerCase().includes(query)
        || student.name.toLowerCase().includes(query)
        || (student.email || "").toLowerCase().includes(query),
      )
      .sort((first, second) => {
        if (studentSortBy === "finalGrade") {
          return compareFinalGrades(first.finalGrade, second.finalGrade, studentSortDirection)
        }

        const firstValue = studentSortBy === "id" ? first.idNum : first.name
        const secondValue = studentSortBy === "id" ? second.idNum : second.name
        const result = firstValue.localeCompare(secondValue)
        return studentSortDirection === "asc" ? result : -result
      })
  }, [students, studentSearch, studentSortBy, studentSortDirection])
  const totalSectionPages = Math.max(1, Math.ceil(filteredSections.length / SECTIONS_PER_PAGE))
  const paginatedSections = filteredSections.slice(
    (sectionPage - 1) * SECTIONS_PER_PAGE,
    sectionPage * SECTIONS_PER_PAGE,
  )
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / STUDENTS_PER_PAGE))
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * STUDENTS_PER_PAGE,
    currentPage * STUDENTS_PER_PAGE,
  )
  const sectionPreview =
    sectionForm.course && sectionForm.year && sectionForm.sectionLetter
      ? `${sectionForm.course.toUpperCase()}-${yearNumbers[sectionForm.year] || ""}${sectionForm.sectionLetter.toUpperCase()}`
      : ""
  const selectedSectionDetails = sections.find((section) => section.section === selectedSection)
  const modalOverlayAnimation = isClosingModal
    ? "animate-[modalFadeOut_180ms_ease-in_forwards]"
    : "animate-[modalFade_180ms_ease-out]"
  const modalPanelAnimation = isClosingModal
    ? "animate-[modalScaleOut_180ms_ease-in_forwards]"
    : "animate-[modalScale_180ms_ease-out]"

  useEffect(() => {
    loadSections()
  }, [])

  useEffect(() => {
    if (!error) {
      return
    }

    const timer = window.setTimeout(() => setError(""), 5000)
    return () => window.clearTimeout(timer)
  }, [error])

  useEffect(() => {
    if (selectedSection) {
      setCurrentPage(1)
      loadStudents(selectedSection)
    }
  }, [selectedSection])

  useEffect(() => {
    setSectionPage(1)
  }, [sectionSearch, sectionSortBy, sectionSortDirection])

  useEffect(() => {
    setCurrentPage(1)
  }, [studentSearch, studentSortBy, studentSortDirection])

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
    setIsClosingModal(false)
    setSelectedStudent(null)
    setFormData({
      ...emptyStudent,
      section: selectedSection,
      year: sectionYears[selectedSection] || "",
    })
    setMode("add")
  }

  function openAddSectionForm() {
    setIsClosingModal(false)
    setSectionForm(emptySection)
    setMode("addSection")
  }

  function openEditSectionForm() {
    const parsedSection = parseSectionName(selectedSection)

    setIsClosingModal(false)
    setSectionForm({
      course: parsedSection.course,
      sectionLetter: parsedSection.sectionLetter,
      year: selectedSectionDetails?.year || "",
    })
    setMode("editSection")
  }

  function openEditForm(student) {
    setIsClosingModal(false)
    setSelectedStudent(student)
    setFormData(student)
    setMode("edit")
  }

  function openDeleteConfirm(student) {
    setIsClosingModal(false)
    setSelectedStudent(student)
    setMode("delete")
  }

  function openDeleteSectionConfirm() {
    setIsClosingModal(false)
    setMode("deleteSection")
  }

  function closePanel() {
    setIsClosingModal(true)
    window.setTimeout(() => {
      setMode("")
      setSelectedStudent(null)
      setFormData(emptyStudent)
      setSectionForm(emptySection)
      setIsClosingModal(false)
    }, 180)
  }

  function closeProfile() {
    setIsClosingModal(true)
    window.setTimeout(() => {
      setSelectedStudent(null)
      setIsClosingModal(false)
    }, 180)
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

  function updateSectionLetter(value) {
    setSectionForm((current) => ({
      ...current,
      sectionLetter: value.replace(/[^a-z]/gi, "").toUpperCase(),
    }))
  }

  async function saveStudent(event) {
    event.preventDefault()
    setError("")

    const email = formData.email.trim()
    if (!STUDENT_EMAIL_PATTERN.test(email)) {
      setError("Invalid email.")
      return
    }

    const isAdd = mode === "add"
    const url = isAdd
      ? `${API_BASE_URL}/students`
      : `${API_BASE_URL}/students/${encodeURIComponent(selectedStudent.idNum)}`

    const payload = {
      idNum: formData.idNum,
      email,
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

  async function saveSection(event) {
    event.preventDefault()
    setError("")

    const isEdit = mode === "editSection"
    const url = isEdit
      ? `${API_BASE_URL}/sections/${encodeURIComponent(selectedSection)}`
      : `${API_BASE_URL}/sections`

    try {
      const response = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          course: sectionForm.course,
          year: sectionForm.year,
          sectionLetter: sectionForm.sectionLetter,
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Unable to save section.")
        return
      }

      const nextSection = sectionPreview
      await loadSections()
      setSelectedSection(nextSection)
      setStudents([])
      await loadStudents(nextSection)
      closePanel()
    } catch {
      setError("Unable to save section. Make sure the Flask backend is running.")
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

  async function deleteSection() {
    if (!selectedSection) {
      return
    }

    setError("")

    try {
      const response = await fetch(`${API_BASE_URL}/sections/${encodeURIComponent(selectedSection)}`, {
        method: "DELETE",
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Unable to delete section.")
        return
      }

      const remainingSections = sections.filter((section) => section.section !== selectedSection)
      const nextSection = remainingSections[0]?.section || ""

      await loadSections()
      setSelectedSection(nextSection)
      setStudents([])
      if (nextSection) {
        await loadStudents(nextSection)
      }
      closePanel()
    } catch {
      setError("Unable to delete section. Make sure the Flask backend is running.")
    }
  }

  return (
    <section className="min-h-full bg-slate-50 p-5 lg:p-8">
      <div className="mx-auto flex max-w-[96rem] flex-col gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              Student Management
            </p>
            <h1 className="text-3xl font-bold text-dark">Students</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Choose a section to view and manage its students.
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 lg:w-auto lg:min-w-[34rem] lg:flex-row lg:items-center lg:justify-between">
            <button className={primaryButtonClass} onClick={openAddForm}>
              Add Student
            </button>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <button className={secondaryButtonClass} onClick={openAddSectionForm}>
                Add Section
              </button>
              {selectedSection && (
                <>
                  <button className={secondaryButtonClass} onClick={openEditSectionForm}>
                    Edit Section
                  </button>
                  <button className={dangerButtonClass} onClick={openDeleteSectionConfirm}>
                    Delete Section
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[18rem_minmax(0,1fr)]">
          <div className={`flex ${panelHeightClass} flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm`}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-dark">Sections</h2>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {filteredSections.length}
              </span>
            </div>
            <div className="mb-3 grid gap-2">
              <SearchInput
                placeholder="Search course"
                value={sectionSearch}
                onChange={setSectionSearch}
              />
              <SortControls
                direction={sectionSortDirection}
                options={[
                  { label: "Sort by students", value: "studentCount" },
                  { label: "Sort by year", value: "year" },
                ]}
                sortBy={sectionSortBy}
                onDirectionChange={setSectionSortDirection}
                onSortByChange={setSectionSortBy}
              />
            </div>

            {isLoadingSections ? (
              <p className="text-sm text-slate-500">Loading sections...</p>
            ) : filteredSections.length === 0 ? (
              <p className="text-sm text-slate-500">No sections found.</p>
            ) : (
              <div key={sectionPage} className="grid min-h-0 flex-1 grid-rows-6 gap-1.5 animate-[pageSwitch_180ms_ease-out]">
                {paginatedSections.map((section) => (
                  <button
                    key={section.section}
                    className={`min-h-0 cursor-pointer rounded-lg border px-3 py-2 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 ${
                      selectedSection === section.section
                        ? "border-primary bg-primary text-light"
                        : "border-slate-200 bg-white text-dark hover:border-primary hover:bg-primary/5"
                    }`}
                    onClick={() => setSelectedSection(section.section)}
                  >
                    <span className="block text-sm font-bold">{section.section}</span>
                    <span className={`block text-xs leading-4 ${selectedSection === section.section ? "text-white/80" : "text-slate-500"}`}>
                      {section.year} - {formatCount(section.studentCount, "student")}
                    </span>
                  </button>
                ))}
                {Array.from({ length: SECTIONS_PER_PAGE - paginatedSections.length }).map((_, index) => (
                  <div key={`section-placeholder-${index}`} className="min-h-0 rounded-lg border border-transparent px-3 py-2" />
                ))}
              </div>
            )}

            <div className="mt-4">
              <PaginationFooter
                currentPage={sectionPage}
                totalPages={totalSectionPages}
                onPrevious={() => setSectionPage((page) => Math.max(1, page - 1))}
                onNext={() => setSectionPage((page) => Math.min(totalSectionPages, page + 1))}
              />
            </div>
          </div>

          <div key={selectedSection} className={`flex ${panelHeightClass} min-w-0 flex-col rounded-lg border border-slate-200 bg-white shadow-sm animate-[pageSwitch_180ms_ease-out]`}>
            <div className="border-b border-slate-200 p-4">
              <div>
                <h2 className="text-xl font-bold text-dark">
                  {selectedSection || "Select a section"}
                </h2>
              </div>
            </div>
            <div className="grid gap-2 border-b border-slate-200 p-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
              <SearchInput
                placeholder="Search name, ID, or email"
                value={studentSearch}
                onChange={setStudentSearch}
              />
              <SortControls
                direction={studentSortDirection}
                options={[
                  { label: "Sort by name", value: "name" },
                  { label: "Sort by ID", value: "id" },
                  { label: "Sort by average", value: "finalGrade" },
                ]}
                sortBy={studentSortBy}
                onDirectionChange={setStudentSortDirection}
                onSortByChange={setStudentSortBy}
              />
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
              <table className="min-w-[48rem] w-full table-fixed text-left">
                <thead className="bg-slate-100 text-[11px] uppercase leading-tight text-slate-500 xl:text-xs 2xl:text-sm">
                  <tr>
                    <th className="w-[16%] px-2 py-3">ID</th>
                    <th className="w-[28%] px-2 py-3">Name</th>
                    <th className="w-[28%] px-2 py-3">Email</th>
                    <th className="w-[13%] px-2 py-3">Average</th>
                    <th className="w-[15%] px-2 py-3"></th>
                  </tr>
                </thead>
                <tbody key={`${selectedSection}-${currentPage}`} className="divide-y divide-slate-200 text-sm animate-[pageSwitch_180ms_ease-out]">
                  {isLoadingStudents ? (
                    <tr>
                      <td className="px-4 py-6 text-slate-500" colSpan="5">
                        Loading students...
                      </td>
                    </tr>
                  ) : filteredStudents.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-slate-500" colSpan="5">
                        No students in this section yet.
                      </td>
                    </tr>
                  ) : (
                    paginatedStudents.map((student) => (
                      <tr key={student.idNum} className="h-14 hover:bg-slate-50">
                        <td className="break-words px-2 py-2 align-middle font-semibold text-primary">{student.idNum}</td>
                        <td className="break-words px-2 py-2 align-middle font-medium text-dark">{student.name}</td>
                        <td className="break-words px-2 py-2 align-middle text-slate-600">{student.email || "No email"}</td>
                        <td className="break-words px-2 py-2 align-middle font-semibold text-dark">{student.finalGrade}</td>
                        <td className="px-2 py-2 align-middle">
                          <div className="flex flex-wrap gap-2">
                            <button className={`${secondaryButtonClass} px-3`} onClick={() => setSelectedStudent(student)}>
                              View Profile
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                  {!isLoadingStudents && filteredStudents.length > 0 && Array.from({ length: STUDENTS_PER_PAGE - paginatedStudents.length }).map((_, index) => (
                    <tr key={`student-placeholder-${index}`} className="h-14">
                      <td className="px-2 py-2" colSpan="5"></td>
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

      <Toast message={error} />

      {selectedStudent && !mode && (
        <div
          className={`${modalOverlayClass} ${modalOverlayAnimation}`}
          onClick={closeProfile}
        >
          <div
            className={`${modalPanelClass} ${modalPanelAnimation} max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                  Student Profile
                </p>
                <h2 className="mt-1 text-2xl font-bold text-dark">{selectedStudent.name}</h2>
              </div>
              <button className={secondaryButtonClass} onClick={closeProfile}>
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
              <ProfileField label="ID" value={selectedStudent.idNum} />
              <ProfileField label="Email" value={selectedStudent.email || "No email"} />
              <ProfileField label="Last Name" value={selectedStudent.lastName} />
              <ProfileField label="First Name" value={selectedStudent.firstName} />
              <ProfileField label="Middle Name" value={selectedStudent.middleName || "None"} />
              <ProfileField label="Suffix" value={selectedStudent.suffix || "None"} />
              <ProfileField label="Section" value={selectedStudent.section} />
              <ProfileField label="Year" value={selectedStudent.year} />
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-5">
              <button className={secondaryButtonClass} onClick={() => openEditForm(selectedStudent)}>
                Edit
              </button>
              <button className={secondaryButtonClass} onClick={() => openDeleteConfirm(selectedStudent)}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {["add", "edit"].includes(mode) && (
        <div
          className={`${modalOverlayClass} ${modalOverlayAnimation}`}
          onClick={closePanel}
        >
          <form
            className={`${modalPanelClass} ${modalPanelAnimation} max-h-[90vh] w-full max-w-3xl overflow-y-auto p-6`}
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

            <div className="flex flex-col gap-6">
              <div>
                <h3 className="mb-3 text-sm font-bold uppercase text-slate-500">Name</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextInput
                    highlighted
                    label="Last Name"
                    value={formData.lastName}
                    onChange={(value) => updateField("lastName", value)}
                  />
                  <TextInput
                    highlighted
                    label="First Name"
                    value={formData.firstName}
                    onChange={(value) => updateField("firstName", value)}
                  />
                  <TextInput
                    highlighted
                    label="Middle Name"
                    required={false}
                    value={formData.middleName}
                    onChange={(value) => updateField("middleName", value)}
                  />
                  <TextInput
                    highlighted
                    label="Suffix"
                    list="suffix-options"
                    required={false}
                    value={formData.suffix}
                    onChange={(value) => updateField("suffix", value)}
                  />
                  <datalist id="suffix-options">
                    {suffixOptions.map((option) => (
                      <option key={option} value={option} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-bold uppercase text-slate-500">Student Details</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextInput
                    disabled
                    highlighted
                    label="ID"
                    placeholder="Auto generated"
                    required={false}
                    value={formData.idNum}
                    onChange={() => {}}
                  />
                  <TextInput
                    highlighted
                    label="Email"
                    inputMode="email"
                    title="Invalid email."
                    value={formData.email}
                    onChange={(value) => updateField("email", value)}
                  />
                  <SelectInput
                    highlighted
                    label="Section"
                    options={sectionOptions}
                    value={formData.section}
                    onChange={updateSection}
                  />
                  <TextInput
                    disabled
                    highlighted
                    label="Year"
                    value={formData.year}
                    onChange={(value) => updateField("year", value)}
                  />
                </div>
              </div>
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

      {["addSection", "editSection"].includes(mode) && (
        <div
          className={`${modalOverlayClass} ${modalOverlayAnimation}`}
          onClick={closePanel}
        >
          <form
            className={`${modalPanelClass} ${modalPanelAnimation} max-h-[90vh] w-full max-w-xl overflow-y-auto p-6`}
            onClick={(event) => event.stopPropagation()}
            onSubmit={saveSection}
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                  {mode === "addSection" ? "Add Section" : "Edit Section"}
                </p>
                <h2 className="mt-1 text-2xl font-bold text-dark">
                  {mode === "addSection" ? "Create section record" : selectedSection}
                </h2>
              </div>
              <button type="button" className={secondaryButtonClass} onClick={closePanel}>
                Close
              </button>
            </div>

            <div className="grid gap-4">
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
                list="section-letter-options"
                placeholder="A"
                value={sectionForm.sectionLetter}
                onChange={updateSectionLetter}
              />
              <datalist id="section-letter-options">
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

            <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-5">
              <button type="button" className={secondaryButtonClass} onClick={closePanel}>
                Cancel
              </button>
              <button className={primaryButtonClass} type="submit">
                {mode === "addSection" ? "Save Section" : "Update Section"}
              </button>
            </div>
          </form>
        </div>
      )}

      {mode === "delete" && selectedStudent && (
        <div
          className={`${modalOverlayClass} ${modalOverlayAnimation}`}
          onClick={closePanel}
        >
          <div
            className={`${modalPanelClass} ${modalPanelAnimation} w-full max-w-md border-red-100 p-6`}
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

      {mode === "deleteSection" && selectedSection && (
        <div
          className={`${modalOverlayClass} ${modalOverlayAnimation}`}
          onClick={closePanel}
        >
          <div
            className={`${modalPanelClass} ${modalPanelAnimation} w-full max-w-md border-red-100 p-6`}
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-sm font-semibold uppercase tracking-wide text-red-600">
              Delete Section
            </p>
            <h2 className="mt-1 text-2xl font-bold text-dark">{selectedSection}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              This will remove the section, its students, and related grade records. This action cannot be undone.
            </p>
            {selectedSectionDetails && (
              <p className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {formatCount(selectedSectionDetails.studentCount, "student")} will be removed.
              </p>
            )}

            <div className="mt-6 flex justify-end gap-2 border-t border-slate-200 pt-5">
              <button className={secondaryButtonClass} onClick={closePanel}>
                Cancel
              </button>
              <button className={dangerButtonClass} onClick={deleteSection}>
                Delete Section
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

function formatCount(count, label) {
  return `${count} ${label}${count === 1 ? "" : "s"}`
}

function parseSectionName(section) {
  const match = section.match(/^(.+)-\d+([A-Z]+)$/i)

  return {
    course: match?.[1] || "",
    sectionLetter: match?.[2] || "",
  }
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

export default StudentsPage


