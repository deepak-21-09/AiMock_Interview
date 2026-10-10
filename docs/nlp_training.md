# NLP Voice-Interaction Agent — Model Card & Training Pipeline

## 1. Model Summary
The **Trained NLP Voice-Interaction Agent** is a specialized inference engine responsible for understanding candidate spoken intent and semantic concept coverage during technical mock interviews.

Instead of sending every raw conversational turn to an LLM, this dedicated model executes local, low-latency intent classification, relevance scoring, and concept coverage checking.

---

## 2. Core NLP Tasks
1. **Candidate Intent Classification:**
   * `answer`: Substantive response addressing the question.
   * `clarification_request`: Candidate requests more context or asks about scope.
   * `repeat_request`: Candidate requests repeating the prompt.
   * `skip_request`: Candidate requests moving to the next question.
   * `off_topic`: Irrelevant remarks.
   * `unintelligible`: Inaudible, empty, or background noise.
   * `other`: Ambiguous turns.

2. **Semantic Relevance Scoring:**
   * Outputs `relevant`, `partially_relevant`, or `irrelevant` with calibrated probability [0.0, 1.0].

3. **Concept Presence Verification:**
   * Compares candidate transcript against planned concepts, classifying each concept as `present`, `absent`, or `uncertain`.

4. **Transcript Quality Diagnostics:**
   * Flags empty or unintelligible utterances (`quality_flag`), enabling the Orchestrator to request repeats without unfair score penalties.

---

## 3. Dataset & Reproducible Training Pipeline
* **Dataset Splits:** Located in `backend/nlp_service/data/`:
  * `train.jsonl` (70%): Annotated candidate conversational turns.
  * `val.jsonl` (15%): Validation split for hyperparameter tuning.
  * `test.jsonl` (15%): Held-out benchmark split.
* **Feature Extraction:** TF-IDF n-gram vectorizer (unigrams + bigrams) paired with a balanced multi-class logistic classifier, with DistilBERT transformer encoder integration.
* **Reproduction Commands:**
  ```bash
  cd backend
  python nlp_service/dataset_generator.py
  python nlp_service/train.py
  python nlp_service/evaluate.py
  ```

---

## 4. Evaluation Metrics
* **Macro-F1 Score:** Evaluated across all intent classes.
* **Precision & Recall:** Weighted and macro-averaged metrics logged to `backend/nlp_service/model_registry/metrics.json`.
* **Confidence Threshold:** If intent confidence is below `0.65`, the system falls back to asking the candidate for clarification rather than making an erratic state transition.
