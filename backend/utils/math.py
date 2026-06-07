import numpy as np


def average_grade(values):
    if any(value is None for value in values):
        return None

    grades = np.array(values, dtype=float)

    if np.isnan(grades).any():
        return None

    return round(float(np.mean(grades)), 2)


def average_values(values):
    grades = np.array(values, dtype=float)

    if grades.size == 0:
        return None

    return round(float(np.mean(grades)), 2)


def round_grade(value):
    if value is None:
        return None

    return round(value, 2)


def normalize_grade_value(value):
    if value in ("", None):
        return None

    grade = float(value)

    if grade < 60 or grade > 99:
        raise ValueError("Grades must be between 60 and 99.")

    return grade
