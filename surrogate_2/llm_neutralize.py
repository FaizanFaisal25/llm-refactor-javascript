"""
Use GPT-4o to suggest a drop-in replacement for tracking-related JavaScript.
"""

import json
import logging
import os
import re
from typing import Optional

logger = logging.getLogger(__name__)

# Model to use for neutralization
DEFAULT_MODEL = "gpt-4o"

SYSTEM_PROMPT = """You are a JavaScript expert. Your task is to remove tracking behavior from
JavaScript snippets while preserving non-tracking behavior.

## Definitions
- **Tracking behavior**: Any code that collects, transmits, or stores user
  data to external endpoints, including analytics calls, fingerprinting,
  beacon requests, pixel fires, and similar.
- **Non-tracking functionality**: Return values, DOM mutations, control flow
  outcomes, or side effects unrelated to data collection.

## Instructions
1. Replace only the provided snippet. It may be a full function definition or a
   smaller call expression/statement.
2. If the snippet is a full function definition, preserve its signature exactly:
   same name, parameters, and async/generator modifiers.
3. Understand the snippet's behavior before modifying it, using any provided
   context.
4. Remove or neutralize tracking behavior using the following priority order:
   a. **Replace with type-compatible dummy values**: stub out tracking code
      with dummy values that match the return type of the original snippet.
      Infer the expected type from context where possible.
   b. **Graceful nullification**: if the tracking logic is entangled with
      non-tracking logic, surgically remove only the tracking portions and
      preserve the rest.
   c. **Interface-preserving stub**: if neither above is possible, replace the
      snippet with a structurally valid stub so callers do not break.
5. Assume unknown external function calls return `null` unless their return
   type is inferable from context.
6. Do not rename variables, reorganize logic, or make style changes beyond
   what is necessary to remove tracking.
7. Do not introduce any new variables, functions, or dependencies that are not
   already present in the surrounding code scope.
8. Preserve the original snippet's whitespace and formatting style as closely
   as possible, changing only what is necessary.

## Output format
Return a JSON object with two fields:
- `replacementCode`: the complete replacement snippet, with no markdown fences
  or surrounding commentary.
- `changesSummary`: a brief list of what was removed or stubbed and why."""

USER_PROMPT_TEMPLATE = """The following JavaScript snippet may contain tracking-related behavior.
Refactor it to remove or neutralize tracking while preserving non-tracking behavior.

Snippet to replace:
{snippet}

Surrounding context:
{context}

Follow all instructions in the system prompt.

Return the result strictly in the required JSON format:
{{
  "replacementCode": "...",
  "changesSummary": ["..."]
}}
"""


def _strip_code_fences(text: str) -> str:
    text = text.strip()
    if not text.startswith("```"):
        return text

    lines = text.splitlines()
    if len(lines) < 2:
        return text

    lines = lines[1:]
    if lines and lines[-1].strip() == "```":
        lines = lines[:-1]
    return "\n".join(lines).strip()


def _extract_replacement_code(text: str) -> Optional[str]:
    cleaned = _strip_code_fences(text)
    try:
        payload = json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if not match:
            return cleaned or None
        try:
            payload = json.loads(match.group(0))
        except json.JSONDecodeError:
            return cleaned or None

    if not isinstance(payload, dict):
        return cleaned or None

    replacement = payload.get("replacementCode") or payload.get("refactoredFunction")
    if isinstance(replacement, str):
        replacement = _strip_code_fences(replacement).strip()
        return replacement or None

    return cleaned or None


def _looks_like_function_definition(text: str) -> bool:
    stripped = text.strip()
    patterns = (
        r"^(?:async\s+)?function\b",
        r"^(?:const|let|var)\s+[\w$]+\s*=\s*(?:async\s*)?(?:\([^)]*\)|[\w$]+)\s*=>\s*\{",
        r"^(?:async\s+)?[\w$]+\s*\([^)]*\)\s*\{",
        r"^(?:get|set)\s+[\w$]+\s*\([^)]*\)\s*\{",
    )
    return any(re.match(pattern, stripped, re.DOTALL) for pattern in patterns)


def _build_function_fallback(snippet: str) -> str:
    start = snippet.find("{")
    end = snippet.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return snippet

    body = snippet[start + 1:end]
    body_indent_match = re.search(r"\n([ \t]+)\S", body)
    body_indent = body_indent_match.group(1) if body_indent_match else "    "
    closing_indent_match = re.search(r"\n([ \t]*)\}\s*$", snippet)
    closing_indent = closing_indent_match.group(1) if closing_indent_match else ""

    stub_lines = []
    if re.search(r"\breturn\b", body):
        stub_lines.append(f"{body_indent}return undefined;")

    if stub_lines:
        new_body = "\n" + "\n".join(stub_lines) + "\n" + closing_indent
    else:
        new_body = "\n" + closing_indent

    return snippet[: start + 1] + new_body + snippet[end:]


def _get_client():
    try:
        from openai import OpenAI

        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable is not set")
        return OpenAI(api_key=api_key)
    except ImportError as exc:
        raise ImportError("openai package is required. Install with: pip install openai") from exc


def neutralize_tracking_call(
    call_text: str,
    context: str,
    model: str = DEFAULT_MODEL,
) -> Optional[str]:
    """
    Ask the LLM for a drop-in replacement snippet that preserves page behavior.

    :param call_text: The exact JavaScript snippet to replace.
    :param context: Surrounding code for context.
    :param model: OpenAI model name.
    :return: Replacement code string, or None on error or if API key is missing.
    """
    if not call_text or not call_text.strip():
        logger.warning("empty call_text in neutralize_tracking_call")
        return None

    try:
        client = _get_client()
        user_content = USER_PROMPT_TEMPLATE.format(
            snippet=call_text[:4000],
            context=(context or call_text)[:4000],
        )
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
            temperature=0.01,
            max_tokens=1024,
        )
        choice = response.choices[0] if response.choices else None
        if not choice or not choice.message or not choice.message.content:
            logger.warning("empty LLM response for neutralize_tracking_call")
            return None
        replacement = _extract_replacement_code(choice.message.content)
        return replacement, choice.message.content if replacement else None
    except Exception as exc:
        logger.exception("LLM neutralize_tracking_call failed: %s", exc)
        return None


def get_fallback_replacement(call_text: str) -> str:
    """
    Heuristic fallback when the LLM is unavailable or fails.
    """
    stripped = call_text.strip()
    raw = stripped.lower()
    if _looks_like_function_definition(stripped):
        return _build_function_fallback(stripped)
    if "sendbeacon" in raw or "sendbeacon" in call_text:
        return "true"
    if "fetch(" in raw:
        return "Promise.resolve(new Response(null,{status:200}))"
    if ".send(" in raw and "xmlhttprequest" in raw:
        return "undefined"
    # Generic: return undefined; if code uses return value they may get undefined.
    return "void 0"
