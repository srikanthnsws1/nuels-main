"""Uploads mock-test question banks to Firestore.

Usage (from the project folder, after `npx.cmd firebase-tools login`):
    python scripts/mock-tests/upload.py scripts/mock-tests/python-for-data-analysis.json

For each test it writes:
  questionBanks/{slug}_{lessonId}  questions + 4 shuffled options each (no answers)
  answerKeys/{slug}_{lessonId}     correct option index per question + explanations
Re-running overwrites the same tests (it doesn't touch students' attempts).
Uses the Firebase CLI's saved login, so it acts as the project owner.
"""
import json
import os
import random
import subprocess
import sys
import urllib.request

PROJECT = "nuelsmart-fb72e"
BASE = f"https://firestore.googleapis.com/v1/projects/{PROJECT}/databases/(default)/documents"


def access_token() -> str:
    # Any CLI call refreshes the saved token.
    subprocess.run("npx --yes firebase-tools projects:list", shell=True, capture_output=True, timeout=120)
    cfg = json.load(open(os.path.expanduser("~/.config/configstore/firebase-tools.json"), encoding="utf-8"))
    return cfg["tokens"]["access_token"]


def value(v):
    if isinstance(v, bool):
        return {"booleanValue": v}
    if isinstance(v, int):
        return {"integerValue": str(v)}
    if isinstance(v, str):
        return {"stringValue": v}
    if isinstance(v, list):
        return {"arrayValue": {"values": [value(x) for x in v]}}
    if isinstance(v, dict):
        return {"mapValue": {"fields": {k: value(x) for k, x in v.items()}}}
    raise TypeError(type(v))


def put(token: str, path: str, data: dict):
    body = json.dumps({"fields": {k: value(v) for k, v in data.items()}}).encode()
    req = urllib.request.Request(f"{BASE}/{path}", data=body, method="PATCH",
                                 headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    with urllib.request.urlopen(req) as r:
        r.read()


def main(path: str):
    bank = json.load(open(path, encoding="utf-8"))
    slug = bank["slug"]
    token = access_token()
    for t in bank["tests"]:
        test_id = f"{slug}_{t['lessonId']}"
        rng = random.Random(test_id)  # same shuffle every run
        questions, answers, explanations = [], [], []
        assert len(t["questions"]) == 10, f"{test_id}: needs exactly 10 questions"
        for q in t["questions"]:
            assert len(q["wrong"]) == 3, f"{test_id}: each question needs 3 wrong options"
            options = [q["correct"], *q["wrong"]]
            rng.shuffle(options)
            questions.append({"question": q["question"], "options": options})
            answers.append(options.index(q["correct"]))
            explanations.append(q.get("explanation", ""))
        put(token, f"questionBanks/{test_id}", {"slug": slug, "lessonId": t["lessonId"], "lessonTitle": t["lessonTitle"], "questions": questions})
        put(token, f"answerKeys/{test_id}", {"answers": answers, "explanations": explanations})
        print(f"uploaded {test_id}: answers {''.join('ABCD'[a] for a in answers)}")


if __name__ == "__main__":
    main(sys.argv[1])
