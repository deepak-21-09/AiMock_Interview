"""
Evaluation script to benchmark model against held-out test splits.
"""
import os
import json
import joblib
from sklearn.metrics import classification_report, confusion_matrix

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
MODEL_REGISTRY = os.path.join(os.path.dirname(__file__), "model_registry")

def evaluate_model():
    model_path = os.path.join(MODEL_REGISTRY, "nlp_classifier.joblib")
    vec_path = os.path.join(MODEL_REGISTRY, "tfidf_vectorizer.joblib")
    test_path = os.path.join(DATA_DIR, "test.jsonl")

    if not os.path.exists(model_path) or not os.path.exists(vec_path):
        print("Model artifacts not found. Run train.py first.")
        return

    clf = joblib.load(model_path)
    vec = joblib.load(vec_path)

    texts, labels = [], []
    with open(test_path, "r", encoding="utf-8") as f:
        for line in f:
            item = json.loads(line)
            texts.append(item["text"])
            labels.append(item["intent"])

    X_test = vec.transform(texts)
    y_pred = clf.predict(X_test)

    print("=== MODEL EVALUATION REPORT ===")
    print(classification_report(labels, y_pred, zero_division=0))
    print("Confusion Matrix:\n", confusion_matrix(labels, y_pred))

if __name__ == "__main__":
    evaluate_model()
