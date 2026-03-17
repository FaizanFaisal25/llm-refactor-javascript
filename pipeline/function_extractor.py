import os
from dataclasses import dataclass
from typing import List, Optional

import esprima  # type: ignore


@dataclass
class JSFunction:
    """
    Representation of a JavaScript function extracted from a file.
    """

    name: str
    start_line: int
    end_line: int
    source: str


def _get_function_name(node: dict, parent: Optional[dict]) -> str:
    """
    Best-effort extraction of a human-readable function name.
    """
    node_type = node.get("type")

    # Named function declarations
    if node_type == "FunctionDeclaration" and node.get("id") and node["id"].get("name"):
        return node["id"]["name"]

    # Methods in object/class literals
    if node_type == "MethodDefinition":
        key = node.get("key")
        if isinstance(key, dict) and key.get("name"):
            return key["name"]

    # Function expressions / arrow functions assigned to a variable
    if parent:
        parent_type = parent.get("type")

        # const foo = function() {} / () => {}
        if parent_type == "VariableDeclarator" and parent.get("id") and parent["id"].get("name"):
            return parent["id"]["name"]

        # obj.foo = function() {} / () => {}
        if parent_type == "AssignmentExpression":
            left = parent.get("left")
            if isinstance(left, dict):
                # obj.foo
                if left.get("property") and left["property"].get("name"):
                    return left["property"]["name"]
                # foo = function () {}
                if left.get("name"):
                    return left["name"]

        # { foo: function() {} }
        if parent_type == "Property":
            key = parent.get("key")
            if isinstance(key, dict) and key.get("name"):
                return key["name"]

    # Fallback: anonymous with line number
    loc = node.get("loc") or {}
    start = loc.get("start", {})
    line = start.get("line", 0)
    return f"<anonymous>@L{line}"


def extract_functions_from_source(source: str) -> List[JSFunction]:
    """
    Parse a JavaScript source string and return all function-like constructs.
    """
    # Keep original line structure for slicing source code later
    lines = source.splitlines()

    # esprima for Python returns a tree of custom node objects.
    # Convert the root to a plain dictionary so our visitor can
    # recursively traverse using standard dict / list checks.
    ast_obj = esprima.parseScript(source, loc=True, tolerant=True)
    ast = ast_obj.toDict() if hasattr(ast_obj, "toDict") else ast_obj
    functions: List[JSFunction] = []

    def visit(node: object, parent: Optional[dict] = None) -> None:
        if isinstance(node, dict):
            node_type = node.get("type")
            if node_type in (
                "FunctionDeclaration",
                "FunctionExpression",
                "ArrowFunctionExpression",
                "MethodDefinition",
            ):
                loc = node.get("loc") or {}
                start = loc.get("start", {})
                end = loc.get("end", {})
                start_line = int(start.get("line", 1))
                end_line = int(end.get("line", start_line))

                name = _get_function_name(node, parent)
                # Lines are 1-based; Python indices are 0-based
                snippet = "\n".join(lines[start_line - 1 : end_line])

                functions.append(
                    JSFunction(
                        name=name,
                        start_line=start_line,
                        end_line=end_line,
                        source=snippet,
                    )
                )

            for _, value in node.items():
                if isinstance(value, (dict, list)):
                    visit(value, node)
        elif isinstance(node, list):
            for child in node:
                visit(child, parent)

    visit(ast)
    return functions


def extract_functions_from_file(path: str) -> List[JSFunction]:
    """
    Convenience wrapper to read a JS file and extract its functions.
    """
    if not os.path.isfile(path):
        raise FileNotFoundError(f"JavaScript file not found: {path}")

    with open(path, "r", encoding="utf-8") as f:
        source = f.read()

    return extract_functions_from_source(source)

