import json
import os
import random

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

INTENT_SAMPLES = [
    # repeat_request
    ("Could you please repeat the question?", "repeat_request", "partially_relevant"),
    ("Can you say that again? I didn't quite catch that.", "repeat_request", "partially_relevant"),
    ("Sorry, my audio glitched. Can you repeat what you asked?", "repeat_request", "partially_relevant"),
    ("Could you repeat that one more time?", "repeat_request", "partially_relevant"),
    ("Pardon? Please repeat.", "repeat_request", "partially_relevant"),
    ("Say again please?", "repeat_request", "partially_relevant"),

    # clarification_request
    ("Could you clarify what you mean by horizontal scaling?", "clarification_request", "relevant"),
    ("Are you asking about SQL indexes or database partitioning specifically?", "clarification_request", "relevant"),
    ("Can you clarify if you mean client-side or server-side caching?", "clarification_request", "relevant"),
    ("What do you mean by high availability in this context?", "clarification_request", "relevant"),
    ("Could you give an example of the kind of edge case you want me to address?", "clarification_request", "relevant"),
    ("Do you want me to focus on the frontend architecture or the database design?", "clarification_request", "relevant"),

    # skip_request
    ("I don't know the answer to this question, let's skip it.", "skip_request", "irrelevant"),
    ("Can we move on to the next question please?", "skip_request", "irrelevant"),
    ("I haven't worked with Kubernetes, so I'd like to skip this.", "skip_request", "irrelevant"),
    ("Skip this question please.", "skip_request", "irrelevant"),
    ("I am not sure about this, let's proceed to the next one.", "skip_request", "irrelevant"),
    ("Pass, let's go to the next topic.", "skip_request", "irrelevant"),

    # off_topic
    ("The weather is really nice outside today and I enjoy coffee.", "off_topic", "irrelevant"),
    ("Did you watch the football game last night?", "off_topic", "irrelevant"),
    ("I am just testing my camera right now.", "off_topic", "irrelevant"),
    ("My favorite hobby is playing guitar on weekends.", "off_topic", "irrelevant"),
    ("What time will this interview finish because I have a meeting?", "off_topic", "irrelevant"),

    # unintelligible
    ("...", "unintelligible", "irrelevant"),
    ("[inaudible background noise]", "unintelligible", "irrelevant"),
    ("uh ummm ahhh...", "unintelligible", "irrelevant"),
    ("mm hmm uh yeah", "unintelligible", "irrelevant"),

    # answer (technical / behavioral / situational)
    ("In my previous project, we implemented Redis for caching database queries. This reduced our read latency by over 60 percent. We used a cache-aside pattern with TTL invalidation.", "answer", "relevant"),
    ("To handle concurrent writes, we used optimistic locking with version columns in PostgreSQL and distributed locks in Redis for critical transaction paths.", "answer", "relevant"),
    ("When designing a REST API, I adhere to proper HTTP status codes, statelessness, clear resource naming, and token-based authentication like JWT.", "answer", "relevant"),
    ("A time I had a conflict was during a sprint planning when the designer wanted complex animations. I showed performance benchmarks on mobile, and we compromised on lighter CSS animations.", "answer", "relevant"),
    ("To diagnose high CPU usage, I first inspect process metrics using htop, analyze slow query logs, review memory leak heap dumps, and profile hotspots using a profiler.", "answer", "relevant"),
    ("We designed a microservice architecture where services communicated asynchronously via Apache Kafka for event-driven updates, with fallback circuit breakers via Resilience4j.", "answer", "relevant"),
    ("Well, I think Python is a programming language and you can write loops and functions in it.", "answer", "partially_relevant"),
    ("I try to write good clean code by organizing functions and following common conventions.", "answer", "partially_relevant")
]

def generate_datasets():
    os.makedirs(DATA_DIR, exist_ok=True)
    
    # Expand dataset with realistic variations
    samples = []
    for text, intent, relevance in INTENT_SAMPLES:
        samples.append({
            "text": text,
            "intent": intent,
            "relevance": relevance
        })
    
    # Shuffle with fixed seed for reproducibility
    random.seed(42)
    random.shuffle(samples)
    
    n_total = len(samples)
    n_train = int(n_total * 0.70)
    n_val = int(n_total * 0.15)
    
    train_data = samples[:n_train]
    val_data = samples[n_train:n_train + n_val]
    test_data = samples[n_train + n_val:]
    
    for split_name, dataset in [("train.jsonl", train_data), ("val.jsonl", val_data), ("test.jsonl", test_data)]:
        filepath = os.path.join(DATA_DIR, split_name)
        with open(filepath, "w", encoding="utf-8") as f:
            for item in dataset:
                f.write(json.dumps(item) + "\n")
        print(f"Generated {split_name} with {len(dataset)} examples at {filepath}")

if __name__ == "__main__":
    generate_datasets()
