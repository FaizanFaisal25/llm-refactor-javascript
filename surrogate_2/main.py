"""
Surrogate_2: replace tracking calls with LLM-generated neutralizations so that
the webpage continues to work (no broken references, same return types).
"""

import json
import logging
import os
import sys

import pandas as pd

from .replace_function_call import get_call_span, extract_call_snippet
from .replace_function_call import replace_function_call
from .llm_neutralize import neutralize_tracking_call, get_fallback_replacement

# Ensure we can run from repo root when invoked as script
if __name__ == "__main__":
    _ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if _ROOT not in sys.path:
        sys.path.insert(0, _ROOT)


def request_response_dic(filename: str) -> dict:
    """Build { script_url -> request_id } from request.json."""
    dataset = pd.read_json(filename, lines=True)
    out = {}
    for i in dataset.index:
        if dataset["http_req"][i] not in out:
            out[dataset["http_req"][i]] = dataset["request_id"][i]
    return out


def get_tracking_functions(filename: str) -> dict:
    """Build { script_name -> [ method_name, ... ] } for label == 1."""
    dataset = pd.read_excel(filename)
    out = {}
    for i in dataset.index:
        if dataset["label"][i] == 1:
            sn = dataset["script_name"][i]
            if sn not in out:
                out[sn] = []
            out[sn].append(dataset["method_name"][i])
    return out


def contains_only_numbers(s: str) -> bool:
    s = s.strip()
    return s.replace(".", "", 1).isdigit()


def setup_logging(log_file: str) -> None:
    os.makedirs(os.path.dirname(log_file) or ".", exist_ok=True)
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(levelname)s - %(message)s",
        filename=log_file,
        filemode="w",
    )


def process_script(
    response_path: str,
    surrogate_path: str,
    methods: list,
    use_llm: bool,
    model: str,
    log: logging.Logger,
) -> dict:
    """
    For one script file, compute replacements (LLM or fallback) and apply them
    in one pass (reverse order by position so indices don't shift).
    methods: list of method_name strings "fn@line@col" (0-based line/col from features).
    """
    if not os.path.isfile(response_path):
        return {"error": "response file not found", "success": 0, "fallback": 0, "llm": 0}

    with open(response_path, "r", encoding="utf-8") as f:
        code_lines = f.readlines()

    # (line_index, col_start, col_end, replacement) for each method
    edits = []
    stats = {"llm": 0, "fallback": 0}

    for method_name in methods:
        parts = method_name.split("@")
        if len(parts) < 3:
            log.warning("skip malformed method_name: %s", method_name)
            continue
        try:
            line_0 = int(parts[1])
            col_0 = int(parts[2])
        except ValueError:
            log.warning("skip non-numeric line/col in method_name: %s", method_name)
            continue
        line_num = line_0 + 1
        column_num = col_0 + 1

        call_text, context = extract_call_snippet(code_lines, line_num, column_num)
        if call_text is None:
            log.warning("could not get call span for %s at %s:%s", method_name, line_num, column_num)
            continue

        if use_llm:
            replacement = neutralize_tracking_call(call_text, context or call_text, model=model)
            if replacement:
                stats["llm"] += 1
            else:
                replacement = get_fallback_replacement(call_text)
                stats["fallback"] += 1
        else:
            replacement = get_fallback_replacement(call_text)
            stats["fallback"] += 1

        t = get_call_span(code_lines, line_num, column_num)
        line_index, col_start, col_end = t
        if line_index is None:
            log.warning("get_call_span failed for %s", method_name)
            continue
        edits.append((line_index, col_start, col_end, replacement))

    # Apply from last position to first so earlier offsets don't change
    edits.sort(key=lambda x: (x[0], -x[1]), reverse=True)

    for line_index, col_start, col_end, replacement in edits:
        line = code_lines[line_index]
        code_lines[line_index] = line[:col_start] + replacement + line[col_end + 1 :]

    os.makedirs(os.path.dirname(surrogate_path) or ".", exist_ok=True)
    with open(surrogate_path, "w", encoding="utf-8") as f:
        f.writelines(code_lines)

    return {"success": len(edits), "llm": stats["llm"], "fallback": stats["fallback"]}


def main(use_llm: bool = True, model: str = "gpt-4o", output_subdir: str = "surrogate_2") -> None:
    folder_base = "server/output"
    if not os.path.isdir(folder_base):
        print("Directory server/output not found. Run from repo root after crawling.")
        return

    log_file = "logs/surrogate_2_logs.txt"
    setup_logging(log_file)
    log = logging.getLogger(__name__)

    for site in os.listdir(folder_base):
        folder = os.path.join(folder_base, site)
        if not os.path.isdir(folder):
            continue
        request_path = os.path.join(folder, "request.json")
        features_path = os.path.join(folder, "features.xlsx")
        if not os.path.isfile(request_path) or not os.path.isfile(features_path):
            log.info("skip %s: missing request.json or features.xlsx", site)
            continue

        try:
            print("Surrogate_2: website:", site)
            log.info("surrogate_2 site=%s use_llm=%s", site, use_llm)

            request_id = request_response_dic(request_path)
            tracking_functions = get_tracking_functions(features_path)
            out_dir = os.path.join(folder, output_subdir)
            os.makedirs(out_dir, exist_ok=True)

            logs = {
                "script_not_in_request_file": 0,
                "inline_script": 0,
                "success": 0,
                "llm_replacements": 0,
                "fallback_replacements": 0,
            }

            for script_name in tracking_functions:
                if script_name not in request_id:
                    for _ in tracking_functions[script_name]:
                        logs["script_not_in_request_file"] += 1
                    log.info("script_not_in_request_file %s", script_name)
                    continue

                req_id = request_id[script_name]
                if not contains_only_numbers(str(req_id).strip()):
                    logs["inline_script"] += len(tracking_functions[script_name])
                    log.info("inline_script %s", script_name)
                    continue

                response_path = os.path.join(folder, "response", str(req_id) + ".txt")
                surrogate_path = os.path.join(out_dir, str(req_id) + "_modified.txt")

                result = process_script(
                    response_path,
                    surrogate_path,
                    tracking_functions[script_name],
                    use_llm=use_llm,
                    model=model,
                    log=log,
                )
                if "error" in result:
                    log.warning("process_script %s: %s", script_name, result.get("error"))
                    continue
                logs["success"] += result.get("success", 0)
                logs["llm_replacements"] += result.get("llm", 0)
                logs["fallback_replacements"] += result.get("fallback", 0)

            with open(os.path.join(folder, "surrogate_2_logs.json"), "w") as f:
                json.dump(logs, f, indent=2)
            log.info("surrogate_2 site=%s logs=%s", site, logs)
            print("Completed surrogate_2: website:", site, "logs:", logs)
        except Exception as e:
            log.exception("surrogate_2 site=%s failed: %s", site, e)
            print("Crashed surrogate_2: website:", site, e)


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Surrogate_2: LLM-neutralized tracking replacement")
    parser.add_argument("--no-llm", action="store_true", help="Use only heuristic fallback (no API key)")
    parser.add_argument("--model", default="gpt-4o", help="OpenAI model (default: gpt-4o)")
    parser.add_argument("--output", default="surrogate_2", help="Output subdir under each site (default: surrogate_2)")
    args = parser.parse_args()
    main(use_llm=not args.no_llm, model=args.model, output_subdir=args.output)
