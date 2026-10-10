"""
Reproducible Training Pipeline for Voice Interaction NLP Agent.
Fine-tunes a Transformer / classifier on labeled candidate interview turns.
Logs Macro-F1, Precision, Recall, and Confusion Matrix.
"""
import os
import json
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, f1_score, precision_score, recall_score, confusion_matrix
import joblib

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
MODEL_REGISTRY = os.path.join(os.path.dirname(__file__), "model_registry")

def load_data(split_name: str):
    path = os.path.join(DATA_DIR, f"{split_name}.jsonl")
    texts, labels = [], []
    if not os.path.exists(path):
        raise FileNotFoundError(f"Dataset split not found at {path}. Run dataset_generator.py first.")
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            item = json.loads(line)
            texts.append(item["text"])
            labels.append(item["intent"])
    return texts, labels

def train():
    os.makedirs(MODEL_REGISTRY, exist_ok=True)
    print("Loading datasets...")
    train_texts, train_labels = load_data("train")
    val_texts, val_labels = load_data("val")
    test_texts, test_labels = load_data("test")

    print(f"Train size: {len(train_texts)}, Val size: {len(val_texts)}, Test size: {len(test_texts)}")

    # Feature extraction via TF-IDF n-grams
    vectorizer = TfidfVectorizer(ngram_range=(1, 2), max_features=1500)
    X_train = vectorizer.fit_transform(train_texts)
    X_test = vectorizer.transform(test_texts)

    # Train classifier baseline
    clf = LogisticRegression(class_weight="balanced", max_iter=200)
    clf.fit(X_train, train_labels)

    y_pred = clf.predict(X_test)

    macro_f1 = f1_score(test_labels, y_pred, average="macro", zero_division=0)
    precision = precision_score(test_labels, y_pred, average="macro", zero_division=0)
    recall = recall_score(test_labels, y_pred, average="macro", zero_division=0)
    cm = confusion_matrix(test_labels, y_pred).tolist()

    metrics = {
        "macro_f1": round(float(macro_f1), 4),
        "precision": round(float(precision), 4),
        "recall": round(float(recall), 4),
        "confusion_matrix": cm,
        "classes": sorted(list(set(train_labels))),
        "version_tag": "nlp-intent-clf-v1.0.0"
    }

    # Save artifacts
    model_save_path = os.path.join(MODEL_REGISTRY, "nlp_classifier.joblib")
    vec_save_path = os.path.join(MODEL_REGISTRY, "tfidf_vectorizer.joblib")
    metrics_path = os.path.join(MODEL_REGISTRY, "metrics.json")

    joblib.dump(clf, model_save_path)
    joblib.dump(vectorizer, vec_save_path)

    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)

    print("\n--- Training Completed ---")
    print(f"Macro-F1: {macro_f1:.4f}")
    print(f"Precision: {precision:.4f}")
    print(f"Recall: {recall:.4f}")
    print(f"Saved model and metrics to {MODEL_REGISTRY}")
    print("\nClassification Report:\n", classification_report(test_labels, y_pred, zero_division=0))

if __name__ == "__main__":
    train()
