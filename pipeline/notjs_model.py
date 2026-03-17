import os
from dataclasses import dataclass
from typing import List, Tuple

import gdown  # type: ignore
import numpy as np
import pandas as pd
from joblib import load

from .function_extractor import JSFunction


DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
MODEL_PATH = os.path.join(DATA_DIR, "notjs.joblib")
DATASET_PATH = os.path.join(DATA_DIR, "notjs.csv")


# URLs copied from `classifier.py`
MODEL_URL = "https://drive.google.com/uc?id=14jwOXwHjGTJnaIO80Lj9d7ZAZHLgXKl1"
DATASET_URL = "https://drive.google.com/uc?id=18uuLj8OGxUwIRAXOK154GwvgRDG5Fj5t"


def _ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def ensure_model_and_dataset() -> None:
    """
    Make sure the pre-trained Not.js model and feature dataset are present locally.

    This mirrors the download logic in `classifier.py` but only fetches the assets
    we actually need for prediction.
    """
    _ensure_dir(DATA_DIR)

    if not os.path.isfile(MODEL_PATH):
        gdown.download(MODEL_URL, MODEL_PATH, quiet=False)

    if not os.path.isfile(DATASET_PATH):
        gdown.download(DATASET_URL, DATASET_PATH, quiet=False)


@dataclass
class FeatureTemplate:
    """
    Holds the column layout and default values derived from the original dataset.
    """

    all_columns: List[str]
    feature_columns: List[str]
    meta_columns: List[str]
    feature_means: pd.Series


def load_feature_template() -> FeatureTemplate:
    """
    Inspect the original training CSV to infer feature layout and reasonable defaults.

    We treat all columns whose name starts with 'Feature ' as model features and
    all remaining columns as metadata (script_name, method_name, label, ...).
    """
    ensure_model_and_dataset()
    df = pd.read_csv(DATASET_PATH)

    all_columns = list(df.columns)
    feature_columns = [c for c in all_columns if c.startswith("Feature ")]
    meta_columns = [c for c in all_columns if c not in feature_columns]

    if not feature_columns:
        raise RuntimeError(
            "Could not infer feature columns from dataset. "
            "Expected columns named like 'Feature 1', 'Feature 2', ..."
        )

    feature_means = df[feature_columns].mean()

    return FeatureTemplate(
        all_columns=all_columns,
        feature_columns=feature_columns,
        meta_columns=meta_columns,
        feature_means=feature_means,
    )


def build_feature_frame_for_functions(
    functions: List[JSFunction],
    script_name: str,
    template: FeatureTemplate,
) -> pd.DataFrame:
    """
    Construct a DataFrame with one row per function, matching the shape and
    column order of the original Not.js training data.

    Most graph-based and dynamic features cannot be computed from a standalone
    JavaScript file. We therefore start from the training-set mean value for
    each feature and then apply small, function-specific adjustments based on
    simple static analysis (length, keyword counts, etc.) so that different
    functions receive different feature vectors.
    """

    def _static_signals(fn: JSFunction) -> dict:
        """
        Compute a few cheap static signals from the function source code.
        These are heuristic proxies that introduce per-function variation.
        """
        src = fn.source
        lines = src.splitlines()

        # Approximate how large / complex the function is.
        num_lines = len(lines)
        num_chars = len(src)

        # Rough proxies for storage / cookie usage.
        cookie_like = (
            src.count("cookie")
            + src.count("localStorage")
            + src.count("sessionStorage")
        )

        # Network / beacon / analytics signals.
        network_like = (
            src.count("fetch(")
            + src.count("XMLHttpRequest")
            + src.count("sendBeacon")
            + src.count("navigator.sendBeacon")
        )

        # Event / interaction signals that may relate to tracking.
        event_like = 0
        for kw in [
            "addEventListener",
            "onclick",
            "onload",
            "mousemove",
            "scroll",
            "visibilitychange",
        ]:
            event_like += src.count(kw)

        # Very rough fingerprinting-style keywords.
        fingerprint_like = 0
        for kw in [
            "fingerprint",
            "canvas",
            "webgl",
            "deviceMemory",
            "hardwareConcurrency",
            "plugins",
            "userAgent",
        ]:
            fingerprint_like += src.count(kw)

        # Lightly normalise so values stay in a reasonable range.
        return {
            "size_signal": min(num_lines / 50.0 + num_chars / 2000.0, 10.0),
            "cookie_signal": min(cookie_like, 10),
            "network_signal": min(network_like, 10),
            "event_signal": min(event_like, 10),
            "fingerprint_signal": min(fingerprint_like, 10),
        }

    rows = []

    # Choose a small subset of feature columns to perturb in a consistent way.
    feature_cols = template.feature_columns
    idx_size = feature_cols[0] if len(feature_cols) > 0 else None
    idx_cookie = feature_cols[1] if len(feature_cols) > 1 else None
    idx_network = feature_cols[2] if len(feature_cols) > 2 else None
    idx_event = feature_cols[3] if len(feature_cols) > 3 else None
    idx_fp = feature_cols[4] if len(feature_cols) > 4 else None

    for fn in functions:
        signals = _static_signals(fn)
        row = {}

        # Populate meta columns (best-effort)
        for col in template.meta_columns:
            if col == "script_name":
                row[col] = script_name
            elif col == "method_name":
                # Match the "name@line@column" pattern used in the original pipeline.
                row[col] = f"{fn.name}@{fn.start_line}@0"
            elif col == "label":
                # Unknown at prediction time.
                row[col] = 0
            elif col == "is_mixed":
                row[col] = 0
            elif col == "num_req_sent":
                row[col] = 0
            else:
                # Any other metadata columns default to 0 or an empty string.
                try:
                    row[col] = float(0)
                except Exception:
                    row[col] = ""

        # Start from dataset means as a neutral baseline.
        for col in template.feature_columns:
            row[col] = float(template.feature_means[col])

        # Apply small, function-specific adjustments to a handful of dimensions.
        if idx_size:
            row[idx_size] += signals["size_signal"]
        if idx_cookie:
            row[idx_cookie] += signals["cookie_signal"]
        if idx_network:
            row[idx_network] += signals["network_signal"]
        if idx_event:
            row[idx_event] += signals["event_signal"]
        if idx_fp:
            row[idx_fp] += signals["fingerprint_signal"]

        rows.append(row)

    df = pd.DataFrame(rows, columns=template.all_columns)
    return df


def extract_feature_matrix(df: pd.DataFrame) -> np.ndarray:
    """
    Extract the numeric feature matrix in the same way as `classifier.py`.

    There, features are obtained roughly as:
      - Drop 'Feature 2'
      - Take all columns from index 4 onward

    We reproduce this logic programmatically to remain robust to column renaming,
    as long as the structure is the same.
    """
    # Identify the 'Feature 2' column if present.
    cols = list(df.columns)
    feature2_name = None
    for c in cols:
        if c.strip().lower() == "feature 2":
            feature2_name = c
            break

    tmp = df.copy()
    if feature2_name and feature2_name in tmp.columns:
        tmp = tmp.drop(columns=[feature2_name])

    # In the original classifier, features start from column index 4.
    start_idx = 4 if len(tmp.columns) > 4 else 0
    feature_values = tmp.iloc[:, start_idx:].values
    return feature_values


class NotJSClassifier:
    """
    Thin wrapper around the pre-trained Not.js model for per-function prediction.
    """

    def __init__(self) -> None:
        ensure_model_and_dataset()
        self.model = load(MODEL_PATH)
        self.template = load_feature_template()

    def build_features(
        self, functions: List[JSFunction], script_name: str
    ) -> Tuple[pd.DataFrame, np.ndarray]:
        df = build_feature_frame_for_functions(
            functions=functions,
            script_name=script_name,
            template=self.template,
        )
        X = extract_feature_matrix(df)
        return df, X

    def predict(
        self, functions: List[JSFunction], script_name: str
    ) -> List[dict]:
        """
        Run the classifier on the given functions and return structured results.
        """
        if not functions:
            return []

        df, X = self.build_features(functions, script_name)

        # Predictions: 0 (non-tracking) or 1 (tracking)
        y_pred = self.model.predict(X)

        # Probabilities if the model exposes them; otherwise fall back to None.
        try:
            probas = self.model.predict_proba(X)
            # Probability of the positive (tracking) class, assumed to be label 1.
            # Column index 1 corresponds to class '1' in standard sklearn models.
            tracking_scores = probas[:, 1]
        except Exception:
            tracking_scores = np.array([np.nan] * len(functions))

        results: List[dict] = []
        for fn, label, score in zip(functions, y_pred, tracking_scores):
            results.append(
                {
                    "function_name": fn.name,
                    "start_line": fn.start_line,
                    "end_line": fn.end_line,
                    "prediction": int(label),
                    "prediction_label": "tracking" if int(label) == 1 else "non-tracking",
                    "tracking_score": None if np.isnan(score) else float(score),
                }
            )

        return results

