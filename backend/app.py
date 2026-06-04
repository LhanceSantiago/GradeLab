import sqlite3
from pathlib import Path

from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

DATABASE_PATH = Path(__file__).parent / "database" / "database.db"
SECTION_SEEDS = [
    ("BSIT 1A", "1st Year", "2026"),
    ("BSIT 1B", "1st Year", "2026"),
    ("BSIT 1C", "1st Year", "2026"),
    ("BSCS 1A", "1st Year", "2026"),
    ("BSIT 2B", "2nd Year", "2025"),
    ("BSCS 2A", "2nd Year", "2025"),
    ("BSIS 2A", "2nd Year", "2025"),
    ("BSCS 3A", "3rd Year", "2024"),
    ("BSIS 3B", "3rd Year", "2024"),
    ("BSIT 3C", "3rd Year", "2024"),
    ("BSIS 4A", "4th Year", "2023"),
    ("BSCS 4B", "4th Year", "2023"),
]
SUBJECT_SEEDS = [
    (1, "Programming 1", "IT101"),
    (2, "Data Structures", "CS201"),
    (3, "Database Systems", "IT203"),
    (4, "Web Development", "IT301"),
    (5, "Systems Analysis", "IS302"),
    (6, "Capstone Research", "IT401"),
]
SUBJECT_SECTION_SEEDS = {
    1: ["BSIT 1A", "BSIT 1B", "BSIT 1C", "BSCS 1A"],
    2: ["BSCS 1A", "BSCS 2A", "BSCS 3A"],
    3: ["BSIT 2B", "BSCS 2A", "BSIS 2A"],
    4: ["BSIT 2B", "BSIT 3C", "BSCS 3A"],
    5: ["BSIS 2A", "BSIS 3B", "BSIS 4A"],
    6: ["BSIT 3C", "BSIS 4A", "BSCS 4B"],
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
        for student_index in range(15):
            name_index = student_number - 1
            first_name = FIRST_NAMES[name_index % len(FIRST_NAMES)]
            last_name = LAST_NAMES[(name_index * 7 + section_index) % len(LAST_NAMES)]
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
        for column_name in ["last_name", "first_name", "middle_name", "suffix"]:
            if column_name not in existing_columns:
                connection.execute(
                    f"ALTER TABLE students ADD COLUMN {column_name} TEXT NOT NULL DEFAULT ''"
                )

        connection.execute(
            """
            DELETE FROM students
            WHERE CAST(substr(id_num, 6) AS INTEGER) BETWEEN 1 AND 180
            """
        )
        connection.execute(
            """
            DELETE FROM students
            WHERE lower(trim(section)) = 'bscs 1a'
              AND (section != 'BSCS 1A' OR year != '1st Year')
            """
        )
        connection.executemany(
            """
            INSERT OR IGNORE INTO students (id_num, last_name, first_name, middle_name, suffix, section, year, name)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [
                (
                    id_num,
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
        connection.executemany(
            """
            INSERT OR IGNORE INTO subjects (id, code, name)
            VALUES (?, ?, ?)
            """,
            SUBJECT_SEEDS,
        )

        for subject_id, sections in SUBJECT_SECTION_SEEDS.items():
            for section in sections:
                add_subject_section_records(connection, subject_id, section)


def format_student_name(row):
    middle_name = row["middle_name"]
    middle_initial = f", {middle_name[0]}." if middle_name else ""
    suffix = row["suffix"]
    suffix_text = f" {suffix}" if suffix else ""
    return f"{row['last_name']} {row['first_name']}{middle_initial}{suffix_text}"


def calculate_final_grade(row):
    grades = [row["prelim"], row["midterm"], row["semi"], row["finals"]]
    if any(grade is None for grade in grades):
        return None

    return round(sum(grades) / len(grades), 2)


def grade_value(value):
    if value in ("", None):
        return None

    return float(value)


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


def add_subject_section_records(connection, subject_id, section):
    if not is_allowed_section(section):
        return

    connection.execute(
        """
        INSERT OR IGNORE INTO subject_sections (subject_id, section)
        VALUES (?, ?)
        """,
        (subject_id, section),
    )
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


def is_allowed_section(section):
    return section in {section_name for section_name, _, _ in SECTION_SEEDS}


def get_section_year(section):
    for section_name, year, _ in SECTION_SEEDS:
        if section_name == section:
            return year

    return ""


def row_to_student(row):
    return {
        "idNum": row["id_num"],
        "lastName": row["last_name"],
        "firstName": row["first_name"],
        "middleName": row["middle_name"],
        "suffix": row["suffix"],
        "name": format_student_name(row),
        "section": row["section"],
        "year": row["year"],
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
            SELECT section, year, COUNT(*) as student_count
            FROM students
            GROUP BY section, year
            ORDER BY year, section
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


@app.route("/api/sections/<section>/students")
def get_students_by_section(section):
    with get_db_connection() as connection:
        rows = connection.execute(
            """
            SELECT id_num, last_name, first_name, middle_name, suffix, section, year
            FROM students
            WHERE section = ?
            ORDER BY last_name, first_name
            """,
            (section,),
        ).fetchall()

    return jsonify([row_to_student(row) for row in rows])


@app.route("/api/students", methods=["POST"])
def add_student():
    data = request.get_json() or {}
    required_fields = ["idNum", "lastName", "firstName", "section", "year"]

    if any(not data.get(field) for field in required_fields):
        return jsonify({"error": "All student fields are required."}), 400

    section = data["section"].strip()
    if not is_allowed_section(section):
        return jsonify({"error": "Please choose an existing section."}), 400
    year = get_section_year(section)

    try:
        with get_db_connection() as connection:
            connection.execute(
                """
                INSERT INTO students (id_num, last_name, first_name, middle_name, suffix, section, year, name)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    data["idNum"].strip(),
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
    required_fields = ["idNum", "lastName", "firstName", "section", "year"]

    if any(not data.get(field) for field in required_fields):
        return jsonify({"error": "ID, last name, first name, section, and year are required."}), 400

    updated_id_num = data["idNum"].strip()
    last_name = data["lastName"].strip()
    first_name = data["firstName"].strip()
    middle_name = data.get("middleName", "").strip()
    suffix = data.get("suffix", "").strip()
    section = data["section"].strip()

    if not is_allowed_section(section):
        return jsonify({"error": "Please choose an existing section."}), 400
    year = get_section_year(section)

    try:
        with get_db_connection() as connection:
            result = connection.execute(
                """
                UPDATE students
                SET id_num = ?, last_name = ?, first_name = ?, middle_name = ?, suffix = ?,
                    name = ?, section = ?, year = ?
                WHERE id_num = ?
                """,
                (
                    updated_id_num,
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
    values = (
        grade_value(data.get("prelim")),
        grade_value(data.get("midterm")),
        grade_value(data.get("semi")),
        grade_value(data.get("finals")),
    )

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
            SELECT id_num, last_name, first_name, middle_name, suffix, section, year
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
