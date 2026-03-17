### Overview

This `pipeline` package provides a lightweight, file-based way to use the existing **Not.js** classifier at the **function granularity**.

Given a JavaScript file (e.g., `original.js`), the pipeline:

- **Parses the file** and extracts individual functions.
- **Builds feature vectors** that match the layout of the original Not.js training data.
- **Loads the pre-trained Not.js model** (`data/notjs.joblib`).
- **Classifies each function** as **tracking** or **non-tracking**.
- **Returns structured JSON results** for downstream use.

This is a *standalone*, lightweight wrapper around the original end‑to‑end pipeline described in the paper (crawler → graph builder → feature extractor → classifier).

---

### Components

- `function_extractor.py`
  - Uses `esprima` to parse JavaScript.
  - Extracts all function-like constructs (function declarations, function expressions, arrow functions, class methods).
  - For each function it records:
    - `name` (best-effort, falls back to `<anonymous>@L<line>`),
    - `start_line`,
    - `end_line`,
    - `source` (the function body as text).

- `notjs_model.py`
  - Downloads (if needed) and loads:
    - `data/notjs.joblib` – the trained classifier.
    - `data/notjs.csv` – the original function-level dataset.
  - Infers the **feature layout** by treating all columns whose name starts with `Feature ` as model features.
  - Builds a **feature template**:
    - Keeps column order identical to the training CSV.
    - Uses column-wise means as default values for `Feature *` columns (graph / dynamic features we cannot recompute from a single JS file).
  - Wraps the model in `NotJSClassifier`, which:
    - Accepts a list of extracted functions.
    - Builds a compatible DataFrame and feature matrix.
    - Returns per-function predictions and (if available) tracking probabilities.

- `pipeline.py`
  - User-facing entry points:
    - `classify_js_file(path: str) -> List[dict]`
    - `classify_js_source(source: str, script_name: str = "<inline>") -> List[dict]`
  - Also exposes a small CLI:
    - `python -m pipeline.pipeline path/to/file.js --pretty`

---

### Installation

Inside the Not.js repository root, install the minimal Python dependencies for this pipeline:

```bash
pip install esprima gdown joblib numpy pandas
```

If you have not yet downloaded the Not.js model and dataset, the first call to the pipeline will do so automatically using the same Google Drive URLs as `classifier.py`:

- `data/notjs.joblib`
- `data/notjs.csv`

---

### Usage Examples

- **Classify `original.js` from the repo root:**

```bash
cd Not.js
python -m pipeline.pipeline original.js --pretty
```

This will print a list of objects like:

```json
[
  {
    "function_name": "someFunction",
    "start_line": 120,
    "end_line": 160,
    "prediction": 1,
    "prediction_label": "tracking",
    "tracking_score": 0.91
  },
  {
    "function_name": "anotherFunction",
    "start_line": 200,
    "end_line": 240,
    "prediction": 0,
    "prediction_label": "non-tracking",
    "tracking_score": 0.08
  }
]
```

- **Use from Python code:**

```python
from pipeline.pipeline import classify_js_file

results = classify_js_file("original.js")
for r in results:
    print(r["function_name"], r["prediction_label"], r["tracking_score"])
```

---

### Notes and Limitations

- The original Not.js classifier was trained on **dynamic graph-based features** collected by the full pipeline (Chrome extension + server + graph builder).
- In this lightweight setting, we cannot reconstruct those graphs from a single static JS file.
- To preserve compatibility, this implementation:
  - Reuses the original **trained model** and **dataset schema**.
  - Fills graph/dynamic feature columns with their **training-set mean values** as a neutral baseline.
- This means:
  - The classifier **receives correctly-shaped inputs**, but
  - Predictions may be less accurate than those obtained via the full instrumentation pipeline.

You can incrementally improve fidelity by replacing the placeholder logic in `notjs_model.py` with richer static or dynamic analyses that approximate the original feature definitions.

