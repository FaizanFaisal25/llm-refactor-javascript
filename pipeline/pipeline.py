import os
from typing import List, Dict, Any

from .function_extractor import extract_functions_from_file
from .notjs_model import NotJSClassifier


def classify_js_file(path: str) -> List[Dict[str, Any]]:
    """
    High-level helper to classify each function in a JavaScript file
    as tracking / non-tracking using the existing Not.js classifier.

    Returns a list of dictionaries with:
      - function_name
      - start_line
      - end_line
      - prediction        (0 = non-tracking, 1 = tracking)
      - prediction_label  ("non-tracking" / "tracking")
      - tracking_score    (probability of tracking, if available)
    """
    if not os.path.isfile(path):
        raise FileNotFoundError(f"JavaScript file not found: {path}")

    functions = extract_functions_from_file(path)
    script_name = os.path.basename(path)

    classifier = NotJSClassifier()
    results = classifier.predict(functions, script_name=script_name)
    return results


def classify_js_source(source: str, script_name: str = "<inline>") -> List[Dict[str, Any]]:
    """
    Variant of `classify_js_file` that takes raw JavaScript source instead of a path.
    """
    from .function_extractor import extract_functions_from_source

    functions = extract_functions_from_source(source)
    classifier = NotJSClassifier()
    results = classifier.predict(functions, script_name=script_name)
    return results


if __name__ == "__main__":
    import argparse
    import json

    parser = argparse.ArgumentParser(
        description="Run the Not.js per-function classifier on a JavaScript file."
    )
    parser.add_argument(
        "path",
        help="Path to the JavaScript file to analyse (e.g., original.js)",
    )
    parser.add_argument(
        "--pretty",
        action="store_true",
        help="Pretty-print JSON output.",
    )
    args = parser.parse_args()

    output = classify_js_file(args.path)
    if args.pretty:
        print(json.dumps(output, indent=2))
    else:
        print(json.dumps(output))

