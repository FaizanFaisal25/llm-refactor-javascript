"""Find the matching closing parenthesis for a call span. Reused from surrogate logic."""

import re


def find_ending_index(string: str, start_index: int) -> int:
    """
    Given a string and the index of an opening '(', return the index of the
    matching closing ')', or -1 if not found.
    """
    stack = []
    opening_brackets = ["("]
    closing_brackets = [")"]
    index = start_index

    while index < len(string):
        char = string[index]

        if char in opening_brackets:
            stack.append(char)
        elif char in closing_brackets:
            if len(stack) == 0 or opening_brackets.index(
                stack.pop()
            ) != closing_brackets.index(char):
                break
            if len(stack) == 0:
                return index
        index += 1
    return -1


def find_callee_start(line: str, open_paren_index: int) -> int:
    """
    Given the index of the opening '(' of a call, find the start index of the
    callee (the expression before the '('). Handles obj.method(), obj[expr](), (fn)(), etc.
    """
    i = open_paren_index - 1
    while i >= 0 and line[i] in " \t":
        i -= 1
    if i < 0:
        return open_paren_index
    stack = []  # closing brackets we're inside while scanning backward
    while i >= 0:
        c = line[i]
        if c in ")]}":
            stack.append(c)
            i -= 1
        elif c in "([{":
            if not stack:
                return open_paren_index
            closing = stack.pop()
            if (c == "(" and closing != ")") or (c == "[" and closing != "]") or (c == "{" and closing != "}"):
                return i + 1
            i -= 1
        elif stack:
            i -= 1
        elif c.isalnum() or c in "_$." or (c in " \t"):
            i -= 1
        else:
            return i + 1
    return 0


def find_call_span_from_column(line: str, column_index: int) -> tuple:
    """
    Chrome stack frames may give column of the function name, not '('.
    Find the first '(' at or after column_index, then its matching ')'.
    Returns (start_index, end_index) for the full call including callee, or (-1, -1) if not found.
    """
    start = column_index
    while start < len(line) and line[start] != "(":
        start += 1
    if start >= len(line):
        return (-1, -1)
    end = find_ending_index(line, start)
    if end == -1:
        return (-1, -1)
    callee_start = find_callee_start(line, start)
    return (callee_start, end)


def find_matching_brace(code: str, open_index: int, open_char: str = "{", close_char: str = "}") -> int:
    """
    Given the index of an opening brace in code, return the index of the matching closing brace.
    Returns -1 if not found.
    """
    depth = 0
    i = open_index
    while i < len(code):
        c = code[i]
        if c == open_char:
            depth += 1
        elif c == close_char:
            depth -= 1
            if depth == 0:
                return i
        elif c in '"\'':
            # Skip string literals
            quote = c
            i += 1
            while i < len(code) and (code[i] != quote or code[i - 1] == "\\"):
                i += 1
        i += 1
    return -1


def find_function_definition(code: str, callee_name: str) -> str | None:
    """
    Search for a function definition matching callee_name in code.
    Handles: function name(, name = function(, name: function(, name = ( (arrow).
    Returns the full definition source (signature + body) or None if not found.
    """
    if not callee_name or not callee_name.strip():
        return None
    name = re.escape(callee_name.strip())
    # Patterns: function name(, name = function(, name : function(, name = (
    patterns = [
        (rf"\bfunction\s+{name}\s*\(", "function"),   # function name(
        (rf"{name}\s*=\s*function\s*\(", "="),          # name = function(
        (rf"{name}\s*:\s*function\s*\(", ":"),         # name: function(
        (rf"{name}\s*=\s*\(", "arrow"),                 # name = ( (arrow)
    ]
    for pattern, kind in patterns:
        m = re.search(pattern, code)
        if not m:
            continue
        start_idx = m.start()
        if kind == "function":
            def_start = code.rfind("function", 0, start_idx + 1)
            if def_start == -1:
                def_start = start_idx
        else:
            def_start = start_idx
        # Find opening ( and its matching )
        paren_start = code.index("(", m.end() - 1)
        paren_end = find_ending_index(code, paren_start)
        if paren_end == -1:
            continue
        # Body: after ) we have => or { or whitespace
        after_paren = paren_end + 1
        while after_paren < len(code) and code[after_paren] in " \t\n\r":
            after_paren += 1
        if after_paren >= len(code):
            continue
        if code[after_paren] == "{":
            body_end = find_matching_brace(code, after_paren)
            if body_end == -1:
                continue
            return code[def_start : body_end + 1].strip()
        if kind == "arrow" and code[after_paren : after_paren + 2] == "=>":
            arrow = after_paren + 2
            while arrow < len(code) and code[arrow] in " \t":
                arrow += 1
            if arrow < len(code) and code[arrow] == "{":
                body_end = find_matching_brace(code, arrow)
                if body_end != -1:
                    return code[def_start : body_end + 1].strip()
            # Arrow with expression: take until ; or newline (simplified)
            end = arrow
            while end < len(code) and code[end] not in ";\n":
                if code[end] in '"\'':
                    q = code[end]
                    end += 1
                    while end < len(code) and (code[end] != q or code[end - 1] == "\\"):
                        end += 1
                end += 1
            return code[def_start : end].strip()
        # function name() with no { (invalid in JS but be defensive)
        return code[def_start : paren_end + 1].strip()
    return None
