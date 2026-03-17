# Surrogate_2: LLM-neutralized tracking replacement

This folder provides an **alternate surrogate pipeline** that replaces tracking JavaScript calls with **neutralized code** so that:

1. **Tracking is disabled** (no network requests or data exfil for analytics/tracking).
2. **Webpage functionality is preserved** (return types and control flow are kept so the rest of the script does not break).

Unlike the original `surrogate/` (which replaces calls with `blockme()` and can break pages), surrogate_2 uses **GPT-4o** to suggest drop-in replacements that match the expected return type (e.g. `true` for `sendBeacon`, `Promise.resolve(new Response())` for `fetch`).

## Requirements

- Python 3.8+
- Same pipeline inputs as `surrogate/`: `server/output/<site>/request.json`, `features.xlsx`, and `response/<id>.txt`.
- For LLM mode: **OpenAI API key** and the `openai` package.

Install:

```bash
pip install openai pandas openpyxl
```

Set your API key:

```bash
export OPENAI_API_KEY="sk-..."
```

## Usage

Run from the **Not.js repository root** (where `server/output` exists):

```bash
# Use GPT-4o to neutralize each tracking call (recommended)
python -m surrogate_2.main

# Heuristic-only mode (no API key needed; may break some pages)
python -m surrogate_2.main --no-llm

# Custom model or output directory
python -m surrogate_2.main --model gpt-4o --output surrogate_2
```

## Output

- **Per-site:** `server/output/<site>/surrogate_2/<request_id>_modified.txt` — modified script with tracking calls replaced.
- **Logs:** `server/output/<site>/surrogate_2_logs.json` and `logs/surrogate_2_logs.txt`.

To serve these in Chrome (e.g. via extension or overrides), mirror the structure the same way as the original surrogates (e.g. copy `surrogate_2` output into a path that your extension serves).

## Integration with client pipeline

After `graph-plot/makeFeatures.py` has produced `features.xlsx`, you can run surrogate_2 instead of (or in addition to) `surrogate/main.py`:

```bash
python3 -W ignore graph-plot/main.py
python3 -W ignore graph-plot/makeFeatures.py
# Original: python3 -W ignore surrogate/main.py
python3 -m surrogate_2.main
# Then, if desired, copy surrogate_2 outputs into your Chrome layout (e.g. script similar to generateSurrogateForChrome.py but for surrogate_2).
```

## How it works

1. **Same inputs as surrogate:** For each site, reads `request.json` and `features.xlsx`, and for each script with `label == 1` methods, gets the corresponding response file.
2. **Per tracking call:** Extracts the exact call snippet (and a short context line). Sends it to GPT-4o with a system prompt that asks for a **replacement** that:
   - Performs no tracking (no network, no sensitive data).
   - Preserves return type so surrounding code does not throw (e.g. `sendBeacon` → `true`, `fetch` → `Promise.resolve(new Response())`).
3. **Fallback:** If the API is unavailable or `--no-llm` is set, uses heuristic replacements (`true` for sendBeacon, `Promise.resolve(new Response(...))` for fetch, etc.).
4. **Apply:** All replacements for a given script are applied in **reverse source order** so character offsets don’t shift. The result is written to `surrogate_2/<request_id>_modified.txt`.

## Files

| File | Purpose |
|------|--------|
| `main.py` | Orchestrator: discovers tracking scripts/methods, calls LLM or fallback, batches edits per file, writes surrogate_2 output. |
| `llm_neutralize.py` | Calls GPT-4o with a fixed prompt to get a safe replacement for a tracking call. |
| `replace_function_call.py` | Gets call span (matching parens) and applies a replacement string; used for single-call or batch logic. |
| `balance_parentheses.py` | Finds the matching closing `)` for a given `(` (same logic as surrogate). |
