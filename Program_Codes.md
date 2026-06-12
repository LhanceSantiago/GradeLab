# V. Program Codes

## A. List of Functions

### backend/app.py

1. `build_subject_seed_data()` - Prepares the default subjects and connects them to the correct sections.
2. `build_mock_students()` - Creates sample student records for initial database data.
3. `get_db_connection()` - Opens the SQLite database connection used by the backend.
4. `init_database()` - Creates tables, updates old data, and inserts default records.
5. `format_student_name(row)` - Formats a student's full name for display.
6. `calculate_final_grade(row)` - Computes the final grade from prelim, midterm, semi-final, and finals.
7. `display_average_grade(value)` - Displays a grade average or shows `No grades` when empty.
8. `subject_row_to_dict(row)` - Converts subject database rows into JSON-ready data.
9. `grade_row_to_dict(row)` - Converts grade rows into JSON-ready data with final grade.
10. `build_matplotlib_chart(section_averages)` - Creates a chart image for section averages.
11. `build_insight_data(connection)` - Computes totals, averages, top students, and dashboard data.
12. `seed_grade_for_student(subject_id, student_id)` - Generates sample grades for seeded students.
13. `add_subject_section_records(connection, subject_id, section, seed_grades=False)` - Assigns subjects to sections and optionally creates grade rows.
14. `migrate_section_names(connection)` - Updates old section names to the current naming format.
15. `is_allowed_section(section)` - Checks if a section exists or is valid.
16. `get_section_year(section)` - Gets the year level of a section.
17. `section_matches_year(section, year)` - Checks if a section code matches its year level.
18. `is_valid_email(email)` - Validates student email format.
19. `reset_student_ids(connection)` - Reorders student ID numbers by year and student details.
20. `generate_student_id(connection, year)` - Creates the next student ID number.
21. `section_from_payload(data)` - Builds and validates a section name from form data.
22. `row_to_student(row)` - Converts student rows into JSON-ready data.
23. Route functions such as `get_sections()`, `add_student()`, `update_student()`, `delete_student()`, `get_subjects()`, and `update_grade()` - Handle frontend requests for managing sections, students, subjects, and grades.

### backend/utils/math.py

1. `average_grade(values)` - Computes the average of complete grade values.
2. `average_values(values)` - Computes the average of a list of numeric values.
3. `round_grade(value)` - Rounds grades to two decimal places.
4. `normalize_grade_value(value)` - Converts grade input to a number and validates that it is between 60 and 99.

## B. List of Libraries Used

1. `sqlite3` - Used for the local database that stores students, sections, subjects, and grades.
2. `re` - Used for email validation through regular expressions.
3. `base64` - Used to convert generated chart images into text for API responses.
4. `sys` and `site` - Used to include the user's installed Python packages in the Python path.
5. `io.BytesIO` - Used as an in-memory image file when creating charts.
6. `pathlib.Path` - Used for building file paths such as the database path.
7. `numpy` - Used for grade and average calculations.
8. `flask` - Used to create the backend API server and send JSON responses.
9. `flask_cors` - Used to allow the frontend and backend to communicate during development.
10. `matplotlib` - Used to generate visual charts for the insights dashboard.
11. `utils.math` - Local module used for grade calculation, rounding, and validation helpers.

## C. Source Code Snippets

### backend/app.py

#### Library Imports and App Setup

```python
import sqlite3
import re
import base64
import sys
import site
from io import BytesIO
from pathlib import Path

import numpy as np
from flask import Flask, jsonify, request
from flask_cors import CORS

from utils.math import average_grade, average_values, normalize_grade_value, round_grade

app = Flask(__name__)
CORS(app)

DATABASE_PATH = Path(__file__).parent / "database" / "database.db"
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@.\s]+(?:\.[^@.\s]+)+$")
```

#### Database Connection

```python
def get_db_connection():
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    return connection
```

#### Email Validation

```python
def is_valid_email(email):
    return bool(EMAIL_PATTERN.fullmatch(email.strip()))
```

#### Student Name Formatting

```python
def format_student_name(row):
    middle_name = row["middle_name"] if row["middle_name"] else ""
    suffix = row["suffix"] if row["suffix"] else ""
    parts = [row["first_name"], middle_name, row["last_name"], suffix]
    return " ".join(part for part in parts if part).strip()
```

#### Final Grade Calculation

```python
def calculate_final_grade(row):
    return average_grade([
        grade_value(row["prelim"]),
        grade_value(row["midterm"]),
        grade_value(row["semi"]),
        grade_value(row["finals"]),
    ])
```

#### Adding a Student

```python
@app.route("/api/students", methods=["POST"])
def add_student():
    data = request.get_json()
    required_fields = ["email", "lastName", "firstName", "section"]

    if not data or any(not data.get(field, "").strip() for field in required_fields):
        return jsonify({"error": "Email, last name, first name, and section are required."}), 400

    email = data["email"].strip()

    if not is_valid_email(email):
        return jsonify({"error": "Invalid email."}), 400

    with get_db_connection() as connection:
        id_num = generate_student_id(connection, data.get("year", ""))
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
                data["section"].strip(),
                data.get("year", "").strip(),
                "",
            ),
        )
        connection.commit()

    return jsonify({"message": "Student added successfully."}), 201
```

#### Updating Grades

```python
@app.route("/api/grades/<int:subject_id>/<student_id>", methods=["PUT"])
def update_grade(subject_id, student_id):
    data = request.get_json()

    try:
        values = [
            normalize_grade_value(data.get("prelim")),
            normalize_grade_value(data.get("midterm")),
            normalize_grade_value(data.get("semi")),
            normalize_grade_value(data.get("finals")),
        ]
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
        connection.commit()

    return jsonify({"message": "Grade updated successfully."})
```

#### Insight Chart Generation

```python
def build_matplotlib_chart(section_averages):
    if plt is None or not section_averages:
        return ""

    labels = [row["section"] for row in section_averages]
    values = [row["average"] for row in section_averages]

    fig, ax = plt.subplots(figsize=(8, 4))
    ax.bar(labels, values, color="#6F58C9")
    ax.set_ylabel("Average Grade")
    ax.set_ylim(60, 100)
    fig.tight_layout()

    buffer = BytesIO()
    fig.savefig(buffer, format="png")
    plt.close(fig)
    buffer.seek(0)

    return base64.b64encode(buffer.read()).decode("utf-8")
```

### backend/utils/math.py

#### Grade Average Function

```python
import numpy as np


def average_grade(values):
    if any(value is None for value in values):
        return None

    grades = np.array(values, dtype=float)

    if np.isnan(grades).any():
        return None

    return round(float(np.mean(grades)), 2)
```

#### General Average Function

```python
def average_values(values):
    grades = np.array(values, dtype=float)

    if grades.size == 0:
        return None

    return round(float(np.mean(grades)), 2)
```

#### Grade Validation Function

```python
def normalize_grade_value(value):
    if value in ("", None):
        return None

    grade = float(value)

    if grade < 60 or grade > 99:
        raise ValueError("Grades must be between 60 and 99.")

    return grade
```
