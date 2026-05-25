"""
TruthLens — Fake News Detection Model Trainer
=============================================
Datasets (all auto-download from HuggingFace unless noted):

  CONFIRMED WORKING — open-access, no authentication needed:
  - GonzaloA/fake_news                                (~40k)
  - ErfanMoosaviMonazzah/fake-news-detection-English  (~38k)
  - mrm8488/fake-news                                 (~44k)
  - daviddaubner/misinformation-detection             (~23k)
  - Pulk17/Fake-News-Detection-dataset                (~30k)
  - Reyansh4/Fake-News-Classification                 (~20k)
  - x-g85/x_g85_fn_dataset                           (~95k)  ← NEW replaces gagan+misinfo
  - Arko007/ultimate-fake-news-dataset                (sample 200k from 9.25M)

  MANUAL (local CSV files — optional):
  - ISOT     → data/isot/Fake.csv + True.csv
  - WELFake  → data/welfake/WELFake_Dataset.csv

  REMOVED (confirmed broken/gated):
  - ioverho/misinfo-general          ← gated
  - gagan3012/fake-news              ← no data files
  - ucsbnlp/liar                     ← dataset scripts broken
  - newsmediabias/* (both)           ← gated

Usage:
  pip install -r requirements_model.txt
  python Train_model.py

Output:
  model/fake_news_model.pkl
"""

import os
import re
import pickle
import numpy as np
import pandas as pd
from pathlib import Path

from sklearn.linear_model import LogisticRegression
from sklearn.svm import LinearSVC
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import VotingClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
from sklearn.pipeline import Pipeline

try:
    from datasets import load_dataset
    HF_AVAILABLE = True
except ImportError:
    HF_AVAILABLE = False
    print("[WARN] 'datasets' not found. pip install datasets")

# Use Path throughout so Windows backslashes are never an issue
MODEL_DIR = Path("model")
MODEL_DIR.mkdir(parents=True, exist_ok=True)
MODEL_PATH = MODEL_DIR / "fake_news_model.pkl"


# ═══════════════════════════════════════════════════════════
# 1. TEXT CLEANING
# ═══════════════════════════════════════════════════════════

_AGENCY_RE = re.compile(
    r'^[A-Z ,\(\)]+(?:Reuters|AP|AFP|BBC|CNN|NPR|Bloomberg)[\w\s,\(\)]*?[-—]\s*',
    re.IGNORECASE
)
_LEAKAGE_WORDS = [
    "reuters", "associated press", "bloomberg", "getty images",
    "fox news", "breitbart", "infowars", "daily mail"
]

def clean_text(text: str) -> str:
    if not isinstance(text, str):
        return ""
    text = _AGENCY_RE.sub("", text)
    text = text.lower()
    for word in _LEAKAGE_WORDS:
        text = text.replace(word, "")
    text = re.sub(r"http\S+|www\S+", " ", text)
    text = re.sub(r"[^a-z0-9\s'.,!?-]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


# ═══════════════════════════════════════════════════════════
# 2. SHARED HELPERS
# ═══════════════════════════════════════════════════════════

def _to_plain_df(df: pd.DataFrame) -> pd.DataFrame:
    """Convert PyArrow-backed columns to plain numpy dtypes for sklearn."""
    return df.convert_dtypes(dtype_backend="numpy_nullable")


def _hf(dataset_id, splits, text_cols, label_col,
        label_map=None, sample=None, extra_args=None):
    """
    Generic HuggingFace loader.
    label_map: maps source label values → 0 (FAKE) or 1 (REAL).
               If None, label_col is cast to int directly (0=FAKE, 1=REAL).
    """
    if not HF_AVAILABLE:
        return pd.DataFrame()
    try:
        kwargs = extra_args or {}
        dataset = load_dataset(dataset_id, **kwargs)

        if isinstance(splits, str):
            splits = [splits]

        frames = [dataset[s].to_pandas() for s in splits if s in dataset]
        if not frames:
            print(f"[SKIP] {dataset_id}: no matching splits found")
            return pd.DataFrame()

        df = pd.concat(frames, ignore_index=True)

        if sample and len(df) > sample:
            df = df.sample(sample, random_state=42)

        # Build combined text column
        available = [c for c in text_cols if c in df.columns]
        if not available:
            print(f"[SKIP] {dataset_id}: none of {text_cols} found in {list(df.columns)}")
            return pd.DataFrame()

        df["text"] = df[available[0]].fillna("").astype(str)
        if len(available) > 1:
            df["text"] = df["text"] + " " + df[available[1]].fillna("").astype(str)

        if label_col not in df.columns:
            print(f"[SKIP] {dataset_id}: label column '{label_col}' not found")
            return pd.DataFrame()

        if label_map:
            df["label"] = df[label_col].apply(
                lambda x: label_map.get(str(x).lower().strip(), -1)
            )
            df = df[df["label"] != -1]
        else:
            df["label"] = pd.to_numeric(df[label_col], errors="coerce")
            df = df.dropna(subset=["label"])
            df["label"] = df["label"].astype(int)

        short_name = dataset_id.split("/")[-1]
        print(f"[HF/{short_name}] Loaded {len(df):,} rows")
        return _to_plain_df(df[["text", "label"]])

    except Exception as e:
        print(f"[SKIP] {dataset_id}: {e}")
        return pd.DataFrame()


# ═══════════════════════════════════════════════════════════
# 3. DATASET LOADERS
# ═══════════════════════════════════════════════════════════

def load_gonzalo_hf():
    """GonzaloA/fake_news — 40k rows, 0=FAKE 1=REAL"""
    return _hf(
        "GonzaloA/fake_news",
        ["train", "validation", "test"],
        ["title", "text"],
        "label",
    )


def load_erfan_hf():
    """ErfanMoosaviMonazzah — 38k rows, 0=FAKE 1=REAL"""
    return _hf(
        "ErfanMoosaviMonazzah/fake-news-detection-dataset-English",
        ["train", "test"],
        ["text"],
        "label",
    )


def load_mrm8488_hf():
    """mrm8488/fake-news ~44k rows. Source labels 1=FAKE — invert to standard 0=FAKE 1=REAL."""
    df = _hf("mrm8488/fake-news", ["train", "test"], ["title", "text"], "label")
    if not df.empty:
        df["label"] = 1 - df["label"]
    return df


def load_daviddaubner_hf():
    """daviddaubner/misinformation-detection — 23k rows, 0=FAKE 1=REAL"""
    return _hf(
        "daviddaubner/misinformation-detection",
        ["train", "test"],
        ["text"],
        "label",
    )


def load_pulk17_hf():
    """
    Pulk17/Fake-News-Detection-dataset — 30k rows, open access.
    Viewer confirmed: label 0=REAL 1=FAKE → invert to standard 0=FAKE 1=REAL.
    """
    df = _hf(
        "Pulk17/Fake-News-Detection-dataset",
        ["train"],
        ["title", "text"],
        "label",
    )
    if not df.empty:
        df["label"] = 1 - df["label"]  # viewer: 0=REAL 1=FAKE → invert to standard
    return df


def load_reyansh4_hf():
    """
    Reyansh4/Fake-News-Classification — 20k rows, open access.
    Uses string labels 'FAKE'/'REAL' → mapped to 0/1.
    """
    if not HF_AVAILABLE:
        return pd.DataFrame()
    try:
        dataset = load_dataset("Reyansh4/Fake-News-Classification")
        frames = [dataset[s].to_pandas() for s in dataset.keys()]
        df = pd.concat(frames, ignore_index=True)

        # Find text column
        text_col = next(
            (c for c in ["text", "content", "article", "title", "news"] if c in df.columns),
            None
        )
        if text_col is None:
            print(f"[SKIP] Reyansh4: no text column in {list(df.columns)}")
            return pd.DataFrame()
        df["text"] = df[text_col].fillna("").astype(str)

        # Find label column
        label_col = next(
            (c for c in ["label", "class", "target", "fake", "is_fake"] if c in df.columns),
            None
        )
        if label_col is None:
            print(f"[SKIP] Reyansh4: no label column in {list(df.columns)}")
            return pd.DataFrame()

        # Handle both string and numeric labels
        lbl_map = {"fake": 0, "false": 0, "0": 0, "real": 1, "true": 1, "1": 1}
        series = df[label_col].astype(str).str.lower().str.strip()
        df["label"] = series.map(lbl_map)
        # Fallback: try numeric
        mask = df["label"].isna()
        if mask.any():
            df.loc[mask, "label"] = pd.to_numeric(df.loc[mask, label_col], errors="coerce")

        df = df.dropna(subset=["label"])
        df["label"] = df["label"].astype(int)
        print(f"[HF/Fake-News-Classification] Loaded {len(df):,} rows")
        return _to_plain_df(df[["text", "label"]])
    except Exception as e:
        print(f"[SKIP] Reyansh4/Fake-News-Classification: {e}")
        return pd.DataFrame()


def load_xg85_hf():
    """
    x-g85/x_g85_fn_dataset — 95k rows, open access, MIT license.
    Confirmed schema: text (string) + label (int64, 0/1). Train/test/valid splits.
    This is the largest single clean source after ultimate.
    """
    return _hf(
        "x-g85/x_g85_fn_dataset",
        ["train", "test", "valid"],
        ["text"],
        "label",
        extra_args={"name": "processed"},
    )


def load_ultimate_hf():
    """Arko007 mega-dataset — sample 200k. 0=FAKE 1=REAL via label_binary col."""
    if not HF_AVAILABLE:
        return pd.DataFrame()
    try:
        dataset = load_dataset(
            "Arko007/ultimate-fake-news-dataset",
            split="train",
            verification_mode="no_checks",
        )
        n = min(200_000, len(dataset))
        dataset = dataset.shuffle(seed=42).select(range(n))
        df = dataset.to_pandas()

        # Find text column
        text_col = next(
            (c for c in ["text", "content", "body", "article"] if c in df.columns), None
        )
        if text_col is None:
            print("[SKIP] ultimate: no text column")
            return pd.DataFrame()
        df["text"] = df[text_col].fillna("").astype(str)

        # label_binary is the standard column for this dataset
        label_col = next(
            (c for c in ["label_binary", "label", "is_fake"] if c in df.columns), None
        )
        if label_col is None:
            print("[SKIP] ultimate: no label column")
            return pd.DataFrame()

        df["label"] = pd.to_numeric(df[label_col], errors="coerce")
        df = df.dropna(subset=["label"])
        df["label"] = df["label"].astype(int)
        # NOTE: this dataset is heavily REAL-biased (~97% label=1=REAL).
        # Do NOT invert — the balancing step below handles class imbalance.
        pct_ones = (df["label"] == 1).mean()
        print(f"[ultimate] label=1 (REAL) is {pct_ones:.0%} — keeping as-is, balancer will equalise")
        print(f"[HF/ultimate] Loaded {len(df):,} rows")
        return _to_plain_df(df[["text", "label"]])
    except Exception as e:
        print(f"[SKIP] ultimate: {e}")
        return pd.DataFrame()


# ── Manual local datasets ──────────────────────────────────

def load_isot(data_dir="data/isot"):
    fake_path = Path(data_dir) / "Fake.csv"
    true_path = Path(data_dir) / "True.csv"
    if not fake_path.exists() or not true_path.exists():
        print(f"[SKIP] ISOT not found at {data_dir}/")
        return pd.DataFrame()
    fake = pd.read_csv(fake_path)
    fake["label"] = 0
    real = pd.read_csv(true_path)
    real["label"] = 1
    df = pd.concat([fake, real], ignore_index=True)
    df["text"] = (
        df.get("title", pd.Series([""] * len(df))).fillna("").astype(str)
        + " "
        + df.get("text", pd.Series([""] * len(df))).fillna("").astype(str)
    )
    print(f"[ISOT] Loaded {len(df):,} rows")
    return _to_plain_df(df[["text", "label"]])


def load_welfake(data_dir="data/welfake"):
    path = Path(data_dir) / "WELFake_Dataset.csv"
    if not path.exists():
        print(f"[SKIP] WELFake not found at {path}")
        return pd.DataFrame()
    df = pd.read_csv(path)
    df["text"] = (
        df.get("title", pd.Series([""] * len(df))).fillna("").astype(str)
        + " "
        + df.get("text", pd.Series([""] * len(df))).fillna("").astype(str)
    )
    df["label"] = 1 - df["label"].astype(int)   # WELFake: 1=Fake → invert
    print(f"[WELFake] Loaded {len(df):,} rows")
    return _to_plain_df(df[["text", "label"]])


# ═══════════════════════════════════════════════════════════
# 4. BUILD DATASET
# ═══════════════════════════════════════════════════════════

def build_dataset() -> pd.DataFrame:
    loaders = [
        # Manual local (skipped silently if not present)
        load_isot,
        load_welfake,
        # HuggingFace — all confirmed open-access
        load_gonzalo_hf,
        load_erfan_hf,
        load_mrm8488_hf,
        load_daviddaubner_hf,
        load_pulk17_hf,        # 30k
        load_reyansh4_hf,      # 20k
        load_xg85_hf,          # 95k — NEW, replaces gagan+misinfo
        load_ultimate_hf,      # 200k sample
    ]

    frames = []
    for loader in loaders:
        try:
            df = loader()
            if not df.empty:
                frames.append(df)
        except Exception as e:
            print(f"[ERROR] {loader.__name__}: {e}")

    if not frames:
        raise RuntimeError("No data loaded! Check your internet connection.")

    df = pd.concat(frames, ignore_index=True)
    df = _to_plain_df(df)
    df["text"]  = df["text"].astype(str)
    df["label"] = pd.to_numeric(df["label"], errors="coerce")

    df = df.dropna(subset=["text", "label"])
    df["text"]  = df["text"].apply(clean_text)
    df = df[df["text"].str.len() > 80]      # drop near-empty texts
    df = df[df["text"].str.split().str.len() >= 10]  # minimum 10 words
    df = df.drop_duplicates(subset=["text"]) # remove cross-dataset duplicates
    df["label"] = df["label"].astype(int)
    df = df[df["label"].isin([0, 1])]       # sanity: only valid labels

    fake_n = int((df["label"] == 0).sum())
    real_n = int((df["label"] == 1).sum())
    pct_fake = fake_n / max(len(df), 1)
    print(f"\n[DATA] Total: {len(df):,} | FAKE: {fake_n:,} | REAL: {real_n:,}")
    print(f"[AUDIT] Pre-balance split — FAKE: {pct_fake:.1%}  REAL: {1-pct_fake:.1%}")
    if pct_fake < 0.20 or pct_fake > 0.80:
        print("[WARN] !! Severe imbalance — a dataset label convention is likely wrong !!")

    # Balance classes if >3:1 ratio
    ratio = max(fake_n, real_n) / max(min(fake_n, real_n), 1)
    if ratio > 3:
        print(f"[DATA] Class imbalance ({ratio:.1f}x) — undersampling majority class")
        min_n   = min(fake_n, real_n)
        fake_df = df[df["label"] == 0].sample(min_n, random_state=42)
        real_df = df[df["label"] == 1].sample(min_n, random_state=42)
        df = pd.concat([fake_df, real_df]).sample(frac=1, random_state=42)
        print(f"[DATA] Balanced to {len(df):,} rows ({min_n:,} per class)")

    return df


# ═══════════════════════════════════════════════════════════
# 5. TRAIN
# ═══════════════════════════════════════════════════════════

def train(df: pd.DataFrame) -> Pipeline:
    X = df["text"].to_numpy(dtype=object)
    y = df["label"].to_numpy(dtype=int)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.15, random_state=42, stratify=y
    )
    print(f"[TRAIN] {len(X_train):,} train | {len(X_test):,} test")

    from sklearn.pipeline import FeatureUnion

    # Word n-grams: catches phrases like "anonymous source", "share before deleted"
    word_vec = TfidfVectorizer(
        max_features=200_000,
        ngram_range=(1, 3),
        sublinear_tf=True,
        min_df=3,
        analyzer="word",
        strip_accents="unicode",
    )
    # Char n-grams: catches ALL-CAPS, !!! abuse, sensational punctuation patterns
    char_vec = TfidfVectorizer(
        max_features=100_000,
        ngram_range=(3, 5),
        sublinear_tf=True,
        min_df=5,
        analyzer="char_wb",
    )
    features = FeatureUnion([("word", word_vec), ("char", char_vec)])

    lr  = LogisticRegression(C=8.0, max_iter=1000, solver="lbfgs", class_weight="balanced")
    svm = CalibratedClassifierCV(LinearSVC(C=1.5, max_iter=3000, class_weight="balanced"), cv=3)
    ensemble = VotingClassifier(
        estimators=[("lr", lr), ("svm", svm)],
        voting="soft",
        weights=[2, 1],
    )

    pipeline = Pipeline([("features", features), ("clf", ensemble)])

    print("[TRAIN] Fitting… (may take a few minutes)")
    pipeline.fit(X_train, y_train)

    y_pred = pipeline.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"\n[EVAL] Accuracy: {acc:.4f}")
    print(classification_report(y_test, y_pred, target_names=["FAKE", "REAL"]))

    # ── Save model — use Path so Windows backslashes never cause issues ──
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(pipeline, f)

    # Verify the file actually exists after saving
    if MODEL_PATH.exists():
        size_kb = MODEL_PATH.stat().st_size // 1024
        print(f"\n[SAVE] Model saved → {MODEL_PATH.resolve()} ({size_kb:,} KB)")
    else:
        print(f"\n[ERROR] Model file not found after save! Path: {MODEL_PATH.resolve()}")

    return pipeline


# ═══════════════════════════════════════════════════════════
# 6. INFERENCE HELPER
# ═══════════════════════════════════════════════════════════

def predict(pipeline: Pipeline, text: str) -> dict:
    cleaned = clean_text(text)
    proba = pipeline.predict_proba([cleaned])[0]
    label = "FAKE" if proba[0] > proba[1] else "REAL"
    return {
        "label":      label,
        "confidence": round(float(max(proba)), 4),
        "scores":     {
            "fake": round(float(proba[0]), 4),
            "real": round(float(proba[1]), 4),
        },
    }


# ═══════════════════════════════════════════════════════════
# 7. ENTRY POINT
# ═══════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("=" * 55)
    print("  TruthLens Model Trainer")
    print("=" * 55)

    df       = build_dataset()
    pipeline = train(df)

    test_cases = [
        # ── REAL: neutral tone, named sources, verifiable facts ───────
        "The Federal Reserve held interest rates steady at its June meeting, citing persistent inflation concerns.",
        "Researchers at Johns Hopkins University published a peer-reviewed study on hypertension treatments.",
        "Apple Inc. reported quarterly earnings of $94.9 billion, exceeding analyst expectations.",
        "The World Health Organization issued updated guidelines on antibiotic resistance on Tuesday.",
        # ── FAKE: sensational language, anonymous sources, conspiracy ─
        "SHOCKING: Government puts microchips in vaccines!! SHARE BEFORE DELETED!!",
        "Anonymous insider reveals politicians are secretly controlling the weather.",
        "5G towers confirmed to cause memory loss — doctors paid to stay silent.",
        "BREAKING: Soros funds secret army to overthrow election — share before banned!",
        "Doctors DONT want you to know this ONE cure that destroys cancer overnight!!",
        # ── Borderline ────────────────────────────────────────────────
        "A recent study suggests eating chocolate daily may improve cognitive function.",
        "Some experts warn the economy could collapse within months due to hidden debt.",
    ]
    # Note: this model detects WRITING STYLE (sensationalism, anonymous sourcing,
    # emotional language). It is NOT a fact-checker — current-events factual
    # accuracy is handled by the Gemini+web-search layer in the server.

    print("\n[TEST] Sample predictions:")
    for text in test_cases:
        result = predict(pipeline, text)
        print(f"  {result['label']:4s} ({result['confidence']:.0%}) — {text[:80]}")