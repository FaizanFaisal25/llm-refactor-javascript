"""
Replace a single function call at (line, column) with arbitrary replacement text.
Used by surrogate_2 to apply LLM-generated neutralizations without breaking page behavior.
"""

import os
from .balance_parentheses import find_ending_index, find_call_span_from_column, find_callee_start


def get_call_span(code_lines: list, line_number: int, column_number: int) -> tuple:
    """
    Get the (line_index, start_col, end_col) of the function call at 1-based line/column.
    Chrome may give column of the function name or '('; we find the full call including callee.
    Returns (line_idx, col_start, col_end) or (None, None, None) if not found.
    """
    line_index = line_number - 1
    column_index = column_number - 1
    if line_index < 0 or line_index >= len(code_lines):
        return (None, None, None)
    line = code_lines[line_index]
    if column_index < 0 or column_index >= len(line):
        return (None, None, None)
    # Find the '(' of the call (at column or after) and its matching ')'
    paren_start = column_index
    if line[column_index] != "(":
        start_col, end_index = find_call_span_from_column(line, column_index)
        if end_index == -1:
            return (None, None, None)
        return (line_index, start_col, end_index)
    end_index = find_ending_index(line, paren_start)
    if end_index == -1:
        start_col, end_index = find_call_span_from_column(line, column_index)
        if end_index == -1:
            return (None, None, None)
        return (line_index, start_col, end_index)
    # Include full callee (e.g. sendBeacon(...) not just (...))
    start_col = find_callee_start(line, paren_start)
    return (line_index, start_col, end_index)


def replace_function_call(
    js_file: str,
    modified_js_file: str,
    line_number: int,
    column_number: int,
    replacement: str,
) -> int:
    """
    Replace the function call at (line_number, column_number) with `replacement`.
    Line/column are 1-based. Reads from js_file (or modified_js_file if it exists).
    Writes to modified_js_file.
    Returns 0 on success, -1 if the call span could not be determined.
    """
    target_file = modified_js_file if os.path.exists(modified_js_file) else js_file
    with open(target_file, "r", encoding="utf-8") as f:
        code_lines = f.readlines()

    line_index, col_start, col_end = get_call_span(code_lines, line_number, column_number)
    if line_index is None:
        return -1

    line = code_lines[line_index]
    code_lines[line_index] = (
        line[:col_start] + replacement + line[col_end + 1 :]
    )

    with open(modified_js_file, "w", encoding="utf-8") as f:
        f.writelines(code_lines)
    return 0


def extract_call_snippet(
    code_lines: list, line_number: int, column_number: int
) -> tuple:
    """
    Extract the exact call text and surrounding context (same line, 80 chars before/after).
    Returns (call_text, context_snippet) or (None, None) if span not found.
    """
    line_index, col_start, col_end = get_call_span(code_lines, line_number, column_number)
    if line_index is None:
        return (None, None)
    line = code_lines[line_index]
    call_text = line[col_start : col_end + 1]
    # Context: same line, trim to reasonable length for LLM
    context = line.strip()
    if len(context) > 400:
        start = max(0, col_start - 100)
        end = min(len(line), col_end + 101)
        context = line[start:end] if start > 0 or end < len(line) else line
    return (call_text, context)
