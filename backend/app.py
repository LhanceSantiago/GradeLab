import sqlite3
import re
import base64
import sys
import site
from io import BytesIO
from pathlib import Path

USER_PACKAGE_PATH = Path(site.getusersitepackages())
sys.path.insert(0, str(USER_PACKAGE_PATH))

import numpy as np
from flask import Flask, jsonify, request
from flask_cors import CORS

from utils.math import average_grade, average_values, normalize_grade_value, round_grade

try:
    import matplotlib
    if hasattr(matplotlib, "use"):
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
    else:
        matplotlib = None
        plt = None
except ModuleNotFoundError:
    matplotlib = None
    plt = None

app = Flask(__name__)
CORS(app)

DATABASE_PATH = Path(__file__).parent / "database" / "database.db"
YEAR_OPTIONS = ["1st Year", "2nd Year", "3rd Year", "4th Year"]
YEAR_NUMBERS = {
    "1st Year": "1",
    "2nd Year": "2",
    "3rd Year": "3",
    "4th Year": "4",
}
YEAR_ID_PREFIXES = {
    "1st Year": "2026",
    "2nd Year": "2025",
    "3rd Year": "2024",
    "4th Year": "2023",
}
COURSES = ["BSCS", "BSIT", "BSBA", "BSCE", "BSIE", "BSA", "BSPsy", "BSN"]
SECTION_SEEDS = [
    (f"{course}-{YEAR_NUMBERS[year]}A", year, YEAR_ID_PREFIXES[year])
    for course in COURSES
    for year in YEAR_OPTIONS
]
EMAIL_PATTERN = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$")
LEGACY_SECTION_RENAMES = {
    "BSIT 1A": "BSIT-1A",
    "BSIT 1B": "BSIT-1B",
    "BSIT 1C": "BSIT-1C",
    "BSCS 1A": "BSCS-1A",
    "BSIT 2B": "BSIT-2B",
    "BSCS 2A": "BSCS-2A",
    "BSIS 2A": "BSIS-2A",
    "BSCS 3A": "BSCS-3A",
    "BSIS 3B": "BSIS-3B",
    "BSIT 3C": "BSIT-3C",
    "BSIS 4A": "BSIS-4A",
    "BSCS 4B": "BSCS-4B",
}
MINOR_SUBJECTS = [
    ("GE101", "Understanding the Self"),
    ("GE102", "Purposive Communication"),
    ("GE103", "Mathematics in the Modern World"),
    ("GE104", "Art Appreciation"),
    ("PE101", "Physical Education"),
]
MAJOR_SUBJECTS = {
    "BSCS": [
        ("CS101", "Computer Programming 1", 1),
        ("CS102", "Discrete Structures", 1),
        ("CS201", "Data Structures and Algorithms", 2),
        ("CS202", "Object-Oriented Programming", 2),
        ("CS301", "Software Engineering", 3),
        ("CS302", "Operating Systems", 3),
        ("CS401", "Artificial Intelligence", 4),
        ("CS402", "Computer Science Thesis", 4),
    ],
    "BSIT": [
        ("IT101", "Introduction to Computing", 1),
        ("IT102", "Computer Programming", 1),
        ("IT201", "Database Management Systems", 2),
        ("IT202", "Networking 1", 2),
        ("IT301", "Web Systems and Technologies", 3),
        ("IT302", "Systems Integration", 3),
        ("IT401", "Information Assurance", 4),
        ("IT402", "Capstone Project", 4),
    ],
    "BSBA": [
        ("BA101", "Principles of Management", 1),
        ("BA102", "Business Mathematics", 1),
        ("BA201", "Marketing Management", 2),
        ("BA202", "Financial Management", 2),
        ("BA301", "Human Resource Management", 3),
        ("BA302", "Operations Management", 3),
        ("BA401", "Strategic Management", 4),
        ("BA402", "Business Research", 4),
    ],
    "BSCE": [
        ("CE101", "Engineering Drawing", 1),
        ("CE102", "College Algebra for Engineers", 1),
        ("CE201", "Statics of Rigid Bodies", 2),
        ("CE202", "Engineering Mechanics", 2),
        ("CE301", "Structural Theory", 3),
        ("CE302", "Hydraulics", 3),
        ("CE401", "Construction Project Management", 4),
        ("CE402", "Civil Engineering Design Project", 4),
    ],
    "BSIE": [
        ("IE101", "Introduction to Industrial Engineering", 1),
        ("IE102", "Engineering Economy", 1),
        ("IE201", "Work Study and Measurement", 2),
        ("IE202", "Quality Management", 2),
        ("IE301", "Operations Research", 3),
        ("IE302", "Production Systems", 3),
        ("IE401", "Facilities Planning", 4),
        ("IE402", "Industrial Engineering Project Study", 4),
    ],
    "BSA": [
        ("AC101", "Fundamentals of Accounting", 1),
        ("AC102", "Business Law and Regulations", 1),
        ("AC201", "Financial Accounting and Reporting", 2),
        ("AC202", "Cost Accounting", 2),
        ("AC301", "Auditing Principles", 3),
        ("AC302", "Taxation", 3),
        ("AC401", "Accounting Information Systems", 4),
        ("AC402", "Advanced Financial Accounting", 4),
    ],
    "BSPsy": [
        ("PS101", "Introduction to Psychology", 1),
        ("PS102", "Developmental Psychology", 1),
        ("PS201", "Psychological Statistics", 2),
        ("PS202", "Theories of Personality", 2),
        ("PS301", "Abnormal Psychology", 3),
        ("PS302", "Psychological Assessment", 3),
        ("PS401", "Counseling Psychology", 4),
        ("PS402", "Psychology Research", 4),
    ],
    "BSN": [
        ("NUR101", "Anatomy and Physiology", 1),
        ("NUR102", "Health Assessment", 1),
        ("NUR201", "Fundamentals of Nursing Practice", 2),
        ("NUR202", "Pharmacology", 2),
        ("NUR301", "Medical-Surgical Nursing", 3),
        ("NUR302", "Maternal and Child Nursing", 3),
        ("NUR401", "Community Health Nursing", 4),
        ("NUR402", "Nursing Leadership and Management", 4),
    ],
}


def build_subject_seed_data():
    subjects = []
    subject_sections = {}
    subject_id = 1
    all_sections = [section for section, _, _ in SECTION_SEEDS]

    for code, name in MINOR_SUBJECTS:
        subjects.append((subject_id, code, name))
        subject_sections[subject_id] = all_sections
        subject_id += 1

    for course, major_subjects in MAJOR_SUBJECTS.items():
        for code, name, year_number in major_subjects:
            subjects.append((subject_id, code, name))
            subject_sections[subject_id] = [f"{course}-{year_number}A"]
            subject_id += 1

    return subjects, subject_sections


SUBJECT_SEEDS, SUBJECT_SECTION_SEEDS = build_subject_seed_data()
SECTION_STUDENT_COUNTS = {
    section: 14 + ((index * 3) % 8)
    for index, (section, _, _) in enumerate(SECTION_SEEDS)
}
FIRST_NAMES = [
    "Alyssa", "Miguel", "Jasmine", "Elijah", "Grace", "Andrea", "Joshua",
    "Patricia", "Lance", "Camille", "Beatrice", "Francis", "Mia", "Noel",
    "Rica", "Carlo", "Sofia", "Daniel", "Elaine", "Harvey", "Janine",
    "Ryan", "Nicole", "Marco", "Hannah", "Kevin", "Louise", "Diana",
    "Leah", "Kenneth", "Shaina", "Bianca", "Nathan", "Erika", "Alexis",
    "Victor", "Irene", "Paolo", "Clarisse", "Gino", "Mae", "Lara",
    "Cedric", "Marlene", "Sean", "Therese", "Gabriel", "Mika", "Rafael",
    "Abigail", "Christian", "Fiona", "Ivan", "Mariel", "Ronald", "Tanya",
    "Adrian", "Trisha", "Patrick", "Angelica",
    "Ariana", "Benedict", "Celina", "Dominic", "Eunice", "Felix", "Gianna",
    "Hector", "Isabela", "Julian", "Katrina", "Leonard", "Monica", "Nico",
    "Olivia", "Prince", "Quinn", "Regina", "Simon", "Thea", "Ulrich",
    "Vanessa", "Warren", "Xandra", "Yna", "Zachary", "Kian", "Samara",
    "Matteo", "Phoebe", "Cedrick", "Denise", "Emmanuel", "Fatima",
    "Gian", "Hazel", "Inigo", "Janelle", "Kyla", "Lorenz", "Marga",
    "Nadine", "Oscar", "Pamela", "Quincy", "Renz", "Samantha", "Timothy",
    "Uriah", "Vince", "Wendy", "Xavier", "Ysabel", "Zoey",
]
LAST_NAMES = [
    "Reyes", "Santos", "Cruz", "Tolentino", "Ramos", "Villanueva", "Mercado",
    "Bautista", "Soriano", "David", "Navarro", "Castillo", "Alvarez",
    "Fernandez", "Mendoza", "Garcia", "Castro", "Padilla", "De Leon",
    "Santiago", "Tan", "Manalo", "Perez", "Uy", "Ong", "Morales", "Flores",
    "Lim", "Dela Cruz", "Romero", "Salazar", "Rivera", "Gonzales",
    "Domingo", "Aquino", "Valdez", "Torres", "Lopez", "Mariano", "Davidson",
    "Montemayor", "Aguilar", "Pascual", "Chua", "Dizon", "Lazaro",
    "Macaraeg", "Natividad", "Ocampo", "Panganiban", "Quiambao", "Rosales",
    "Sebastian", "Tejada", "Urbano", "Velasco", "Yap", "Zamora", "Bernardo",
    "Cabrera",
    "Abella", "Bagatsing", "Caluag", "Dimaculangan", "Escueta", "Fajardo",
    "Galang", "Hernando", "Ilustre", "Javier", "Katigbak", "Labrador",
    "Magbanua", "Nolasco", "Ortega", "Palma", "Quijano", "Roldan",
    "Sarmiento", "Tuazon", "Umali", "Vergara", "Wenceslao", "Xerez",
    "Yabut", "Zialcita", "Arceo", "Borromeo", "Canlas", "Del Rosario",
    "Enriquez", "Fuentes", "Gatchalian", "Hilario", "Ignacio", "Jacinto",
    "Kalaw", "Ledesma", "Madrigal", "Nieva", "Olivarez", "Penalosa",
    "Quinto", "Recto", "San Diego", "Tiongson", "Uson", "Villarica",
    "Wong", "Yu", "Zobel",
]
MIDDLE_NAMES = [
    "Marie", "Luis", "Anne", "Paul", "Elaine", "Mae", "Lee", "Rose",
    "Noel", "Joy", "Faye", "Ray", "Belle", "Jane", "",
]
SUFFIXES = ["", "", "", "", "Jr.", "", "", "III", "", "", "", "Sr."]


def build_mock_students():
    students = []
    student_number = 1

    for section_index, (section, year, id_year) in enumerate(SECTION_SEEDS):
        section_count = SECTION_STUDENT_COUNTS.get(section, 15)

        for student_index in range(section_count):
            name_index = student_number - 1
            first_name = FIRST_NAMES[(name_index + section_index * 3) % len(FIRST_NAMES)]
            last_name = LAST_NAMES[(name_index * 11 + section_index * 5) % len(LAST_NAMES)]
            middle_name = MIDDLE_NAMES[(name_index + section_index) % len(MIDDLE_NAMES)]
            suffix = SUFFIXES[(name_index + section_index) % len(SUFFIXES)]
            students.append((
                f"{id_year}-{student_number:04d}",
                last_name,
                first_name,
                middle_name,
                suffix,
                section,
                year,
            ))
            student_number += 1

    return students


MOCK_STUDENTS = build_mock_students()


def get_db_connection():
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_database():
    DATABASE_PATH.parent.mkdir(exist_ok=True)

    with get_db_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS students (
                id_num TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT NOT NULL DEFAULT '',
                last_name TEXT NOT NULL DEFAULT '',
                first_name TEXT NOT NULL DEFAULT '',
                middle_name TEXT NOT NULL DEFAULT '',
                suffix TEXT NOT NULL DEFAULT '',
                section TEXT NOT NULL,
                year TEXT NOT NULL
            )
            """
        )
        existing_columns = {
            row["name"]
            for row in connection.execute("PRAGMA table_info(students)").fetchall()
        }
        for column_name in ["email", "last_name", "first_name", "middle_name", "suffix"]:
            if column_name not in existing_columns:
                connection.execute(
                    f"ALTER TABLE students ADD COLUMN {column_name} TEXT NOT NULL DEFAULT ''"
                )
        connection.execute(
            """
            UPDATE students
            SET email = replace(email, '@gradelab.edu', '@gmail.com')
            WHERE email LIKE '%@gradelab.edu'
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS sections (
                section TEXT PRIMARY KEY,
                year TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS subjects (
                id INTEGER PRIMARY KEY,
                code TEXT NOT NULL,
                name TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS subject_sections (
                subject_id INTEGER NOT NULL,
                section TEXT NOT NULL,
                PRIMARY KEY (subject_id, section)
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS grades (
                subject_id INTEGER NOT NULL,
                student_id TEXT NOT NULL,
                prelim REAL,
                midterm REAL,
                semi REAL,
                finals REAL,
                PRIMARY KEY (subject_id, student_id)
            )
            """
        )
        existing_data = any(
            connection.execute(f"SELECT COUNT(*) AS count FROM {table_name}").fetchone()["count"]
            for table_name in ["students", "sections", "subjects", "subject_sections", "grades"]
        )

        if existing_data:
            return

        connection.executemany(
            """
            INSERT INTO sections (section, year)
            VALUES (?, ?)
            """,
            [(section, year) for section, year, _ in SECTION_SEEDS],
        )
        connection.executemany(
            """
            INSERT INTO students (id_num, email, last_name, first_name, middle_name, suffix, section, year, name)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [
                (
                    id_num,
                    f"{first_name}.{last_name}".lower().replace(" ", "") + "@gmail.com",
                    last_name,
                    first_name,
                    middle_name,
                    suffix,
                    section,
                    year,
                    format_student_name({
                        "last_name": last_name,
                        "first_name": first_name,
                        "middle_name": middle_name,
                        "suffix": suffix,
                    }),
                )
                for id_num, last_name, first_name, middle_name, suffix, section, year in MOCK_STUDENTS
            ],
        )
        reset_student_ids(connection)
        connection.executemany(
            """
            INSERT OR IGNORE INTO subjects (id, code, name)
            VALUES (?, ?, ?)
            """,
            SUBJECT_SEEDS,
        )
        connection.executemany(
            """
            UPDATE subjects
            SET code = ?, name = ?
            WHERE id = ?
            """,
            [(code, name, subject_id) for subject_id, code, name in SUBJECT_SEEDS],
        )

        for subject_id, sections in SUBJECT_SECTION_SEEDS.items():
            for section in sections:
                add_subject_section_records(connection, subject_id, section, seed_grades=True)


def format_student_name(row):
    middle_name = row["middle_name"]
    middle_initial = f", {middle_name[0]}." if middle_name else ""
    suffix = row["suffix"]
    suffix_text = f" {suffix}" if suffix else ""
    return f"{row['last_name']} {row['first_name']}{middle_initial}{suffix_text}"


def calculate_final_grade(row):
    grades = [row["prelim"], row["midterm"], row["semi"], row["finals"]]
    return average_grade(grades)


def display_average_grade(value):
    if value is None:
        return "No grades"

    return round_grade(value)


def grade_value(value):
    return normalize_grade_value(value)


def subject_row_to_dict(row):
    return {
        "id": row["id"],
        "code": row["code"],
        "name": row["name"],
        "sectionCount": row["section_count"],
    }


def grade_row_to_dict(row):
    return {
        "studentId": row["student_id"],
        "name": format_student_name(row),
        "section": row["section"],
        "prelim": row["prelim"],
        "midterm": row["midterm"],
        "semi": row["semi"],
        "finals": row["finals"],
        "finalGrade": calculate_final_grade(row),
    }


def build_matplotlib_chart(section_averages):
    top_sections = section_averages[:5]

    if not top_sections or plt is None:
        return ""

    labels = [section["section"] for section in top_sections]
    values = np.array([section["average"] for section in top_sections], dtype=float)
    figure, axis = plt.subplots(figsize=(7, 3.5))
    axis.bar(labels, values, color="#6F58C9")
    axis.set_ylim(60, 100)
    axis.set_ylabel("Average")
    axis.set_title("Top Section Averages")
    axis.grid(axis="y", alpha=0.2)
    figure.tight_layout()

    image = BytesIO()
    figure.savefig(image, format="png", dpi=120)
    plt.close(figure)
    image.seek(0)

    encoded = base64.b64encode(image.read()).decode("utf-8")
    return f"data:image/png;base64,{encoded}"


def build_insight_data(connection):
    totals = {
        "students": connection.execute("SELECT COUNT(*) AS count FROM students").fetchone()["count"],
        "sections": connection.execute("SELECT COUNT(*) AS count FROM sections").fetchone()["count"],
        "subjects": connection.execute("SELECT COUNT(*) AS count FROM subjects").fetchone()["count"],
    }
    course_rows = connection.execute(
        """
        SELECT substr(s.section, 1, instr(s.section, '-') - 1) AS course,
               COUNT(DISTINCT s.section) AS section_count,
               COUNT(st.id_num) AS student_count
        FROM sections s
        LEFT JOIN students st ON st.section = s.section
        GROUP BY course
        ORDER BY course
        """
    ).fetchall()
    grade_rows = connection.execute(
        """
        SELECT st.section, sub.code, sub.name,
               g.prelim, g.midterm, g.semi, g.finals
        FROM students st
        JOIN subject_sections ss ON ss.section = st.section
        JOIN subjects sub ON sub.id = ss.subject_id
        LEFT JOIN grades g ON g.subject_id = sub.id AND g.student_id = st.id_num
        """
    ).fetchall()
    section_grades = {}
    subject_grades = {}
    complete_count = 0
    incomplete_count = 0

    for row in grade_rows:
        final_grade = calculate_final_grade(row)

        if final_grade is None:
            incomplete_count += 1
            continue

        complete_count += 1
        section_grades.setdefault(row["section"], []).append(final_grade)
        subject_key = (row["code"], row["name"])
        subject_grades.setdefault(subject_key, []).append(final_grade)

    section_averages = [
        {
            "section": section,
            "average": average_values(values),
            "completedGrades": len(values),
        }
        for section, values in section_grades.items()
    ]
    section_averages.sort(key=lambda row: row["average"], reverse=True)
    subject_averages = [
        {
            "code": code,
            "name": name,
            "average": average_values(values),
            "completedGrades": len(values),
        }
        for (code, name), values in subject_grades.items()
    ]
    subject_averages.sort(key=lambda row: row["average"], reverse=True)

    return {
        "totals": totals,
        "courses": [
            {
                "course": row["course"],
                "sections": row["section_count"],
                "students": row["student_count"],
            }
            for row in course_rows
        ],
        "sectionAverages": section_averages[:10],
        "subjectAverages": subject_averages[:10],
        "gradeCompletion": [
            {"name": "Complete", "value": complete_count},
            {"name": "Incomplete", "value": incomplete_count},
        ],
        "matplotlibChart": build_matplotlib_chart(section_averages),
    }


def seed_grade_for_student(subject_id, student_id):
    digits = "".join(character for character in student_id if character.isdigit())
    numeric_id = int(digits[-4:] or 0)
    base_grade = 78 + ((numeric_id + subject_id) % 15)

    return (
        subject_id,
        student_id,
        min(base_grade, 99),
        min(base_grade + ((numeric_id + 1) % 4), 99),
        min(base_grade + ((numeric_id + 2) % 5), 99),
        min(base_grade + ((numeric_id + 3) % 6), 99),
    )


def add_subject_section_records(connection, subject_id, section, seed_grades=False):
    if not is_allowed_section(section):
        return

    connection.execute(
        """
        INSERT OR IGNORE INTO subject_sections (subject_id, section)
        VALUES (?, ?)
        """,
        (subject_id, section),
    )
    if seed_grades:
        student_rows = connection.execute(
            "SELECT id_num FROM students WHERE section = ?",
            (section,),
        ).fetchall()
        connection.executemany(
            """
            INSERT OR IGNORE INTO grades (subject_id, student_id, prelim, midterm, semi, finals)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            [seed_grade_for_student(subject_id, row["id_num"]) for row in student_rows],
        )


def migrate_section_names(connection):
    for old_section, new_section in LEGACY_SECTION_RENAMES.items():
        connection.execute(
            "UPDATE students SET section = ? WHERE section = ?",
            (new_section, old_section),
        )
        connection.execute(
            """
            INSERT OR IGNORE INTO subject_sections (subject_id, section)
            SELECT subject_id, ? FROM subject_sections WHERE section = ?
            """,
            (new_section, old_section),
        )
        connection.execute(
            "DELETE FROM subject_sections WHERE section = ?",
            (old_section,),
        )

        existing_new_section = connection.execute(
            "SELECT 1 FROM sections WHERE section = ?",
            (new_section,),
        ).fetchone()
        if existing_new_section:
            connection.execute(
                "DELETE FROM sections WHERE section = ?",
                (old_section,),
            )
        else:
            connection.execute(
                "UPDATE sections SET section = ? WHERE section = ?",
                (new_section, old_section),
            )


def is_allowed_section(section):
    if section in {section_name for section_name, _, _ in SECTION_SEEDS}:
        return True

    with get_db_connection() as connection:
        row = connection.execute(
            "SELECT 1 FROM sections WHERE section = ?",
            (section,),
        ).fetchone()

    return row is not None


def get_section_year(section):
    with get_db_connection() as connection:
        row = connection.execute(
            "SELECT year FROM sections WHERE section = ?",
            (section,),
        ).fetchone()

    if row:
        return row["year"]

    return ""


def section_matches_year(section, year):
    expected_number = YEAR_NUMBERS.get(year)
    return bool(expected_number) and f"-{expected_number}" in section


def is_valid_email(email):
    return bool(EMAIL_PATTERN.fullmatch(email.strip()))


def reset_student_ids(connection):
    rows = connection.execute(
        """
        SELECT id_num, year
        FROM students
        ORDER BY year DESC, section, last_name, first_name, middle_name, id_num
        """
    ).fetchall()
    year_counts = {}
    id_updates = []

    for row in rows:
        prefix = YEAR_ID_PREFIXES.get(row["year"], "2026")
        year_counts[prefix] = year_counts.get(prefix, 0) + 1
        next_id = f"{prefix}-{year_counts[prefix]:04d}"

        if row["id_num"] != next_id:
            id_updates.append((row["id_num"], f"TMP-{next_id}", next_id))

    for old_id, temp_id, _ in id_updates:
        connection.execute("UPDATE students SET id_num = ? WHERE id_num = ?", (temp_id, old_id))
        connection.execute("UPDATE grades SET student_id = ? WHERE student_id = ?", (temp_id, old_id))

    for _, temp_id, next_id in id_updates:
        connection.execute("UPDATE students SET id_num = ? WHERE id_num = ?", (next_id, temp_id))
        connection.execute("UPDATE grades SET student_id = ? WHERE student_id = ?", (next_id, temp_id))


def generate_student_id(connection, year):
    prefix = YEAR_ID_PREFIXES.get(year, "2026")
    row = connection.execute(
        """
        SELECT MAX(CAST(substr(id_num, 6) AS INTEGER)) as max_number
        FROM students
        WHERE id_num LIKE ?
        """,
        (f"{prefix}-%",),
    ).fetchone()
    next_number = (row["max_number"] or 0) + 1

    return f"{prefix}-{next_number:04d}"


def section_from_payload(data):
    year = data.get("year", "").strip()
    course = data.get("course", "").strip().upper()
    section_letter = data.get("sectionLetter", "").strip().upper()
    section = data.get("section", "").strip().upper()

    if course or section_letter:
        if not course or not section_letter:
            return "", year, "Course, year, and section are required."
        if not section_letter.isalpha():
            return "", year, "Section must contain letters only."
        section = f"{course}-{YEAR_NUMBERS.get(year, '')}{section_letter}"

    if not section or not year:
        return "", year, "Course, year, and section are required."

    if year not in YEAR_OPTIONS:
        return "", year, "Please choose a year from 1st Year to 4th Year."

    if not section_matches_year(section, year):
        return "", year, "Section format should match the selected year, like BSCS-2A."

    return section, year, ""


def row_to_student(row):
    return {
        "idNum": row["id_num"],
        "email": row["email"],
        "lastName": row["last_name"],
        "firstName": row["first_name"],
        "middleName": row["middle_name"],
        "suffix": row["suffix"],
        "name": format_student_name(row),
        "section": row["section"],
        "year": row["year"],
        "finalGrade": display_average_grade(row["final_grade"]) if "final_grade" in row.keys() else "No grades",
    }


@app.route("/")
def home():
    return {
        "message": "Backend is running"
    }


@app.route("/api/sections")
def get_sections():
    with get_db_connection() as connection:
        rows = connection.execute(
            """
            SELECT s.section, s.year, COUNT(st.id_num) as student_count
            FROM sections s
            LEFT JOIN students st ON st.section = s.section
            GROUP BY s.section, s.year
            ORDER BY s.year, s.section
            """
        ).fetchall()

    return jsonify([
        {
            "section": row["section"],
            "year": row["year"],
            "studentCount": row["student_count"],
        }
        for row in rows
    ])


@app.route("/api/insights")
def get_insights():
    with get_db_connection() as connection:
        data = build_insight_data(connection)

    return jsonify(data)


@app.route("/api/sections", methods=["POST"])
def add_section():
    data = request.get_json() or {}
    section, year, error = section_from_payload(data)

    if error:
        return jsonify({"error": error}), 400

    try:
        with get_db_connection() as connection:
            connection.execute(
                """
                INSERT INTO sections (section, year)
                VALUES (?, ?)
                """,
                (section, year),
            )
    except sqlite3.IntegrityError:
        return jsonify({"error": "This section already exists."}), 409

    return jsonify({"message": "Section added successfully."}), 201


@app.route("/api/sections/<section>", methods=["PUT"])
def update_section(section):
    data = request.get_json() or {}
    next_section, next_year, error = section_from_payload(data)

    if error:
        return jsonify({"error": error}), 400

    try:
        with get_db_connection() as connection:
            existing_section = connection.execute(
                "SELECT 1 FROM sections WHERE section = ?",
                (section,),
            ).fetchone()

            if not existing_section:
                return jsonify({"error": "Section not found."}), 404

            connection.execute(
                "UPDATE sections SET section = ?, year = ? WHERE section = ?",
                (next_section, next_year, section),
            )
            connection.execute(
                "UPDATE students SET section = ?, year = ? WHERE section = ?",
                (next_section, next_year, section),
            )
            connection.execute(
                "UPDATE subject_sections SET section = ? WHERE section = ?",
                (next_section, section),
            )
    except sqlite3.IntegrityError:
        return jsonify({"error": "This section already exists."}), 409

    return jsonify({"message": "Section updated successfully."})


@app.route("/api/sections/<section>/students")
def get_students_by_section(section):
    with get_db_connection() as connection:
        rows = connection.execute(
            """
            SELECT st.id_num, st.email, st.last_name, st.first_name, st.middle_name,
                   st.suffix, st.section, st.year,
                   CASE
                       WHEN COUNT(ss.subject_id) > 0
                        AND COUNT(ss.subject_id) = SUM(
                           CASE
                               WHEN g.prelim IS NOT NULL
                                AND g.midterm IS NOT NULL
                                AND g.semi IS NOT NULL
                                AND g.finals IS NOT NULL
                               THEN 1
                               ELSE 0
                           END
                        )
                       THEN AVG((g.prelim + g.midterm + g.semi + g.finals) / 4.0)
                   END as final_grade
            FROM students st
            LEFT JOIN subject_sections ss ON ss.section = st.section
            LEFT JOIN grades g ON g.student_id = st.id_num AND g.subject_id = ss.subject_id
            WHERE st.section = ?
            GROUP BY st.id_num, st.email, st.last_name, st.first_name, st.middle_name,
                     st.suffix, st.section, st.year
            ORDER BY st.last_name, st.first_name
            """,
            (section,),
        ).fetchall()

    return jsonify([row_to_student(row) for row in rows])


@app.route("/api/sections/<section>", methods=["DELETE"])
def delete_section(section):
    with get_db_connection() as connection:
        student_rows = connection.execute(
            "SELECT id_num FROM students WHERE section = ?",
            (section,),
        ).fetchall()
        student_ids = [row["id_num"] for row in student_rows]

        if student_ids:
            placeholders = ",".join("?" for _ in student_ids)
            connection.execute(
                f"DELETE FROM grades WHERE student_id IN ({placeholders})",
                student_ids,
            )

        connection.execute(
            "DELETE FROM subject_sections WHERE section = ?",
            (section,),
        )
        connection.execute(
            "DELETE FROM students WHERE section = ?",
            (section,),
        )
        result = connection.execute(
            "DELETE FROM sections WHERE section = ?",
            (section,),
        )

    if result.rowcount == 0:
        return jsonify({"error": "Section not found."}), 404

    return jsonify({"message": "Section deleted successfully."})


@app.route("/api/students", methods=["POST"])
def add_student():
    data = request.get_json() or {}
    required_fields = ["email", "lastName", "firstName", "section"]

    if any(not data.get(field) for field in required_fields):
        return jsonify({"error": "Email, last name, first name, and section are required."}), 400

    section = data["section"].strip()
    if not is_allowed_section(section):
        return jsonify({"error": "Please choose an existing section."}), 400
    year = get_section_year(section)
    email = data["email"].strip()

    if not is_valid_email(email):
        return jsonify({"error": "Invalid email."}), 400

    try:
        with get_db_connection() as connection:
            id_num = generate_student_id(connection, year)
            connection.execute(
                """
                INSERT INTO students (id_num, email, last_name, first_name, middle_name, suffix, section, year, name)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    id_num,
                    email,
                    data["lastName"].strip(),
                    data["firstName"].strip(),
                    data.get("middleName", "").strip(),
                    data.get("suffix", "").strip(),
                    section,
                    year,
                    format_student_name({
                        "last_name": data["lastName"].strip(),
                        "first_name": data["firstName"].strip(),
                        "middle_name": data.get("middleName", "").strip(),
                        "suffix": data.get("suffix", "").strip(),
                    }),
                ),
            )
    except sqlite3.IntegrityError:
        return jsonify({"error": "A student with this ID number already exists."}), 409

    return jsonify({"message": "Student added successfully."}), 201


@app.route("/api/students/<id_num>", methods=["PUT"])
def update_student(id_num):
    data = request.get_json() or {}
    required_fields = ["email", "lastName", "firstName", "section"]

    if any(not data.get(field) for field in required_fields):
        return jsonify({"error": "Email, last name, first name, and section are required."}), 400

    email = data["email"].strip()
    last_name = data["lastName"].strip()
    first_name = data["firstName"].strip()
    middle_name = data.get("middleName", "").strip()
    suffix = data.get("suffix", "").strip()
    section = data["section"].strip()

    if not is_allowed_section(section):
        return jsonify({"error": "Please choose an existing section."}), 400
    year = get_section_year(section)

    if not is_valid_email(email):
        return jsonify({"error": "Invalid email."}), 400

    try:
        with get_db_connection() as connection:
            result = connection.execute(
                """
                UPDATE students
                SET email = ?, last_name = ?, first_name = ?, middle_name = ?, suffix = ?,
                    name = ?, section = ?, year = ?
                WHERE id_num = ?
                """,
                (
                    email,
                    last_name,
                    first_name,
                    middle_name,
                    suffix,
                    format_student_name({
                        "last_name": last_name,
                        "first_name": first_name,
                        "middle_name": middle_name,
                        "suffix": suffix,
                    }),
                    section,
                    year,
                    id_num,
                ),
            )
    except sqlite3.IntegrityError:
        return jsonify({"error": "A student with this ID already exists."}), 409

    if result.rowcount == 0:
        return jsonify({"error": "Student not found."}), 404

    return jsonify({"message": "Student updated successfully."})


@app.route("/api/students/<id_num>", methods=["DELETE"])
def delete_student(id_num):
    with get_db_connection() as connection:
        result = connection.execute(
            "DELETE FROM students WHERE id_num = ?",
            (id_num,),
        )

    if result.rowcount == 0:
        return jsonify({"error": "Student not found."}), 404

    return jsonify({"message": "Student deleted successfully."})


@app.route("/api/subjects")
def get_subjects():
    with get_db_connection() as connection:
        rows = connection.execute(
            """
            SELECT s.id, s.code, s.name, COUNT(ss.section) as section_count
            FROM subjects s
            LEFT JOIN subject_sections ss ON ss.subject_id = s.id
            GROUP BY s.id, s.code, s.name
            ORDER BY s.name
            """
        ).fetchall()

    return jsonify([subject_row_to_dict(row) for row in rows])


@app.route("/api/subjects", methods=["POST"])
def add_subject():
    data = request.get_json() or {}

    if not data.get("name"):
        return jsonify({"error": "Subject name is required."}), 400

    with get_db_connection() as connection:
        result = connection.execute(
            "INSERT INTO subjects (code, name) VALUES (?, ?)",
            (data.get("code", "").strip(), data["name"].strip()),
        )

    return jsonify({"id": result.lastrowid, "message": "Subject added successfully."}), 201


@app.route("/api/subjects/<int:subject_id>", methods=["PUT"])
def update_subject(subject_id):
    data = request.get_json() or {}

    if not data.get("name"):
        return jsonify({"error": "Subject name is required."}), 400

    with get_db_connection() as connection:
        result = connection.execute(
            "UPDATE subjects SET code = ?, name = ? WHERE id = ?",
            (data.get("code", "").strip(), data["name"].strip(), subject_id),
        )

    if result.rowcount == 0:
        return jsonify({"error": "Subject not found."}), 404

    return jsonify({"message": "Subject updated successfully."})


@app.route("/api/subjects/<int:subject_id>", methods=["DELETE"])
def delete_subject(subject_id):
    with get_db_connection() as connection:
        connection.execute("DELETE FROM grades WHERE subject_id = ?", (subject_id,))
        connection.execute("DELETE FROM subject_sections WHERE subject_id = ?", (subject_id,))
        result = connection.execute("DELETE FROM subjects WHERE id = ?", (subject_id,))

    if result.rowcount == 0:
        return jsonify({"error": "Subject not found."}), 404

    return jsonify({"message": "Subject deleted successfully."})


@app.route("/api/subjects/<int:subject_id>/sections")
def get_subject_sections(subject_id):
    with get_db_connection() as connection:
        rows = connection.execute(
            """
            SELECT ss.section, st.year, COUNT(st.id_num) as student_count
            FROM subject_sections ss
            JOIN students st ON st.section = ss.section
            WHERE ss.subject_id = ?
            GROUP BY ss.section, st.year
            ORDER BY st.year, ss.section
            """,
            (subject_id,),
        ).fetchall()

    return jsonify([
        {
            "section": row["section"],
            "year": row["year"],
            "studentCount": row["student_count"],
        }
        for row in rows
    ])


@app.route("/api/subjects/<int:subject_id>/sections", methods=["POST"])
def add_subject_section(subject_id):
    data = request.get_json() or {}
    section = data.get("section", "").strip()

    if not is_allowed_section(section):
        return jsonify({"error": "Please choose an existing section."}), 400

    try:
        with get_db_connection() as connection:
            add_subject_section_records(connection, subject_id, section)
    except sqlite3.IntegrityError:
        return jsonify({"error": "Unable to add section to subject."}), 400

    return jsonify({"message": "Section added to subject."}), 201


@app.route("/api/subjects/<int:subject_id>/sections/<section>", methods=["PUT"])
def update_subject_section(subject_id, section):
    data = request.get_json() or {}
    next_section = data.get("section", "").strip()

    if not is_allowed_section(next_section):
        return jsonify({"error": "Please choose an existing section."}), 400

    with get_db_connection() as connection:
        connection.execute(
            "DELETE FROM subject_sections WHERE subject_id = ? AND section = ?",
            (subject_id, section),
        )
        connection.execute(
            """
            DELETE FROM grades
            WHERE subject_id = ?
              AND student_id IN (SELECT id_num FROM students WHERE section = ?)
            """,
            (subject_id, section),
        )
        add_subject_section_records(connection, subject_id, next_section)

    return jsonify({"message": "Subject section updated."})


@app.route("/api/subjects/<int:subject_id>/sections/<section>", methods=["DELETE"])
def remove_subject_section(subject_id, section):
    with get_db_connection() as connection:
        result = connection.execute(
            "DELETE FROM subject_sections WHERE subject_id = ? AND section = ?",
            (subject_id, section),
        )
        connection.execute(
            """
            DELETE FROM grades
            WHERE subject_id = ?
              AND student_id IN (SELECT id_num FROM students WHERE section = ?)
            """,
            (subject_id, section),
        )

    if result.rowcount == 0:
        return jsonify({"error": "Section not found for this subject."}), 404

    return jsonify({"message": "Section removed from subject."})


@app.route("/api/subjects/<int:subject_id>/sections/<section>/grades")
def get_section_grades(subject_id, section):
    with get_db_connection() as connection:
        rows = connection.execute(
            """
            SELECT st.id_num as student_id, st.last_name, st.first_name, st.middle_name,
                   st.suffix, st.section, g.prelim, g.midterm, g.semi, g.finals
            FROM students st
            LEFT JOIN grades g ON g.student_id = st.id_num AND g.subject_id = ?
            WHERE st.section = ?
            ORDER BY st.last_name, st.first_name
            """,
            (subject_id, section),
        ).fetchall()

    return jsonify([grade_row_to_dict(row) for row in rows])


@app.route("/api/grades/<int:subject_id>/<student_id>", methods=["PUT"])
def update_grade(subject_id, student_id):
    data = request.get_json() or {}
    try:
        values = (
            grade_value(data.get("prelim")),
            grade_value(data.get("midterm")),
            grade_value(data.get("semi")),
            grade_value(data.get("finals")),
        )
    except ValueError as error:
        return jsonify({"error": str(error)}), 400

    with get_db_connection() as connection:
        connection.execute(
            """
            INSERT INTO grades (subject_id, student_id, prelim, midterm, semi, finals)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(subject_id, student_id)
            DO UPDATE SET prelim = excluded.prelim, midterm = excluded.midterm,
                          semi = excluded.semi, finals = excluded.finals
            """,
            (subject_id, student_id, *values),
        )

    return jsonify({"message": "Grade updated successfully."})


@app.route("/api/students/<student_id>/grades")
def get_student_grades(student_id):
    with get_db_connection() as connection:
        student = connection.execute(
            """
            SELECT id_num, email, last_name, first_name, middle_name, suffix, section, year,
                   NULL as final_grade
            FROM students
            WHERE id_num = ?
            """,
            (student_id,),
        ).fetchone()

        if student is None:
            return jsonify({"error": "Student not found."}), 404

        rows = connection.execute(
            """
            SELECT sub.id as subject_id, sub.code, sub.name as subject_name,
                   g.prelim, g.midterm, g.semi, g.finals
            FROM subject_sections ss
            JOIN subjects sub ON sub.id = ss.subject_id
            LEFT JOIN grades g ON g.subject_id = sub.id AND g.student_id = ?
            WHERE ss.section = ?
            ORDER BY sub.name
            """,
            (student_id, student["section"]),
        ).fetchall()

    return jsonify({
        "student": row_to_student(student),
        "grades": [
            {
                "subjectId": row["subject_id"],
                "code": row["code"],
                "subject": row["subject_name"],
                "prelim": row["prelim"],
                "midterm": row["midterm"],
                "semi": row["semi"],
                "finals": row["finals"],
                "finalGrade": calculate_final_grade(row),
            }
            for row in rows
        ],
    })


init_database()


if __name__ == "__main__":
    app.run(debug=True)
