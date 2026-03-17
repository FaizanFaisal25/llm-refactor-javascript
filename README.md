# LLM Refactor JavaScript

This repository is a research clone and extension of the **Not.js** project. The goal is not only to detect tracking-related JavaScript, but to **refactor and neutralize it with LLM assistance** so the page can keep working without the original tracking behavior.

The main implementation for this work lives in `pipeline/demo_pipeline_refactor.ipynb`. That notebook builds on artifacts produced by the Not.js-style pipeline and generates refactored JavaScript files under `output/<site>/surrogate2/`.

## Project Goal

The pipeline in this repo is designed to:

- reuse Not.js-style feature outputs collected from real websites,
- recover JavaScript method definitions from downloaded response files,
- ask an LLM to rewrite those methods so tracking behavior is removed or stubbed,
- preserve return values and surrounding behavior as much as possible,
- write back per-site neutralized script files without breaking the webpage.

In short: **detect candidate tracking-related logic, refactor it, and produce safer surrogate JavaScript files**.

## Main Notebook

The notebook `pipeline/demo_pipeline_refactor.ipynb` is the current end-to-end demo for the refactoring workflow.

At a high level it:

1. Combines all `features.xlsx` files found in `output/<site>/`.
2. Keeps rows whose `script_name` points to JavaScript resources.
3. Maps each script URL to its downloaded source file in `output/<site>/response/<request_id>.txt`.
4. Recovers method call sites and method definitions using the `method_name` format `functionName@line@column`.
5. Sends each recovered method definition to the LLM neutralizer in `surrogate_2/llm_neutralize.py`.
6. Extracts the replacement code and a short summary of the changes.
7. Writes the modified scripts to `output/<site>/surrogate2/`.
8. Uses improved replacement logic to collapse duplicates and avoid false missing-match errors.

## Current Demo Outputs

The checked-in notebook run shows the following results:

- `6018` combined feature rows across the available websites.
- `1346` rows tied to downloadable JavaScript files.
- `928` rows with recoverable method calls and method definitions.
- `868` refactored methods with non-empty change summaries.
- `45` output files written across `5` websites.
- Final improved writing step reports `0` true missing replacements.

The per-site `surrogate2` outputs shown in the notebook were written for:

- `booking.com`
- `dell.com`
- `hp.com`
- `hubspot.com`
- `shopify.com`

## Repository Layout

- `pipeline/demo_pipeline_refactor.ipynb`: main notebook for the LLM refactoring workflow.
- `surrogate_2/`: LLM-assisted neutralization utilities.
- `pipeline/`: lightweight Not.js-compatible classification utilities.
- `graph-plot/`: feature and graph generation code from the original pipeline.
- `server/`: local Express server used by the crawler/instrumentation setup.
- `output/`: collected website artifacts, downloaded JS responses, features, and generated surrogate outputs.
- `generateSurrogateForChrome2.py`: converts `surrogate2` outputs into a Chrome-friendly directory layout.

## Setup

From the repository root:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r pipeline/requirements.txt
pip install -r surrogate_2/requirements.txt
pip install notebook
cd server && npm install && cd ..
```

If you want LLM-based neutralization instead of fallback-only stubs, set:

```bash
export OPENAI_API_KEY="your_api_key_here"
```

## Running the Notebook

Launch Jupyter from the repository root so the notebook resolves paths like `output/...` correctly:

```bash
jupyter notebook pipeline/demo_pipeline_refactor.ipynb
```

Inside the notebook:

- set `USE_LLM = True` to use the OpenAI-based neutralizer,
- set `USE_LLM = False` to use only heuristic fallback replacements,
- run all cells in order.

## Required Input Data

The notebook expects previously collected artifacts under `output/<site>/`, especially:

- `features.xlsx`
- `request.json`
- `request_id.json`
- `response/*.txt`

These files are used to connect feature rows back to the original downloaded JavaScript sources.

## Generated Files

During the refactoring flow, the notebook writes:

- `temp_3.csv`: raw neutralization responses.
- `temp_4_with_changes.csv`: only rows where the refactor produced a real change.
- `refactored_code.csv`: original method definitions, refactored code, and change summaries.
- `output/<site>/surrogate2/<script_file>`: final per-site rewritten JavaScript files.

## How Neutralization Works

The LLM prompt in `surrogate_2/llm_neutralize.py` asks for replacements that:

- remove tracking behavior such as beaconing, analytics calls, fingerprinting, or exfiltration,
- keep function signatures intact for full function replacements,
- preserve control flow and expected return values when possible,
- avoid introducing new dependencies or unrelated rewrites.

If the LLM is unavailable, the fallback logic uses simple safe stubs such as:

- `true` for `sendBeacon`-like behavior,
- `Promise.resolve(new Response(...))` for `fetch`-like behavior,
- `undefined` or a minimal function stub for generic cases.

## Chrome Surrogate Export

After generating `output/<site>/surrogate2/`, you can mirror those files into a Chrome override layout with:

```bash
python generateSurrogateForChrome2.py
```

This copies neutralized scripts into `server/surrogates_2/` using the original request URLs to rebuild the directory structure.

## Notes and Limitations

- This repository builds on Not.js artifacts and code, but the main contribution here is the **LLM-based refactoring step**.
- The notebook currently works from already-collected outputs in `output/`; it is best viewed as a refactoring layer on top of the original data collection pipeline.
- Neutralization is best-effort. The prompt tries to preserve page behavior, but some scripts may still require manual review.
- The standalone `surrogate_2/main.py` script uses `server/output/`, while the notebook demo in this repo currently operates on the root-level `output/` directory.

## Summary

This project extends Not.js from **classification** to **actionable mitigation**: instead of only labeling suspicious JavaScript, it rewrites candidate functions into neutralized surrogates that aim to disable tracking without breaking the webpage.