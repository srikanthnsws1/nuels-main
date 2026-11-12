"""Uploads the Daily Quiz question banks to Firestore.

Usage (after `npx.cmd firebase-tools login`):
    python scripts/daily-quiz/upload.py                     # live project
    python scripts/daily-quiz/upload.py --emulator 8085     # local emulator (testing)

banks*.json hold the banks as {"id", "questions": [[question, correct, wrong, wrong, wrong], ...]}.
Section titles and which banks make up each class group's paper live in src/data/quizPatterns.json
(shared with the app). After changing a group's sections, run this script so quizPaperKeys matches.

Options are shuffled with a seed taken from the question text, so the order never changes between
uploads. Papers store question positions, so banks are append-only: add new questions at the END.
The script refuses to upload if an existing question was changed, removed or moved (unless --force).

Writes:
    quizBanks/{id}             title + questions (no answers), readable by signed-in users
    quizKeys/{id}              answers (admins only; the rules use it to check scores)
    quizKeys/{id}/items/{n}    one answer each, released per question after a learner submits
    quizPaperKeys/{group}      the group's sections, questions per section and every answer key on its paper
                               (the rules check new papers and scores against it)
"""
import glob
import hashlib
import json
import os
import random
import subprocess
import sys
import urllib.error
import urllib.request

PROJECT = "nuelsmart-fb72e"
HERE = os.path.dirname(os.path.abspath(__file__))
PATTERNS = os.path.join(HERE, "..", "..", "src", "data", "quizPatterns.json")


def load_banks():
    """Every bank from banks*.json, checked against the patterns."""
    patterns = json.load(open(PATTERNS, encoding="utf-8"))
    banks = []
    for path in sorted(glob.glob(os.path.join(HERE, "banks*.json"))):
        banks += json.load(open(path, encoding="utf-8"))
    ids = [b["id"] for b in banks]
    dupes = {i for i in ids if ids.count(i) > 1}
    assert not dupes, f"banks defined twice: {dupes}"
    for b in banks:
        assert b["id"] in patterns["banks"], f"{b['id']} has no title in quizPatterns.json"
        b["title"] = patterns["banks"][b["id"]]
    for g, spec in patterns["groups"].items():
        for bid in spec["banks"]:
            if bid in ids:
                n = len(next(b for b in banks if b["id"] == bid)["questions"])
                assert n >= spec["perSection"], f"{bid} needs at least {spec['perSection']} questions for group {g}"
    return banks, patterns


def build(bank):
    """Rows -> questions [{q, o, f?}], answers [index of correct option].

    A row is [q, correct, wrong, wrong, wrong], or for figure questions {"q", "fig", "a": [correct, wrong x3]}
    where fig and any option may be an SVG drawing ("<svg ...>")."""
    questions, answers = [], []
    for row in bank["questions"]:
        if isinstance(row, dict):
            q, fig, (correct, *wrong) = row["q"], row.get("fig"), row["a"]
        else:
            (q, correct, *wrong), fig = row, None
        assert len(wrong) == 3, f"{bank['id']}: '{q}' needs exactly 3 wrong options"
        options = [correct, *wrong]
        assert len(set(options)) == 4, f"{bank['id']}: '{q}' has duplicate options"
        random.Random(hashlib.sha256((q + (fig or "")).encode()).hexdigest()).shuffle(options)
        questions.append({"q": q, "o": options, **({"f": fig} if fig else {})})
        answers.append(options.index(correct))
    return questions, answers


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


def plain(v):
    """Firestore REST value -> Python."""
    if "stringValue" in v:
        return v["stringValue"]
    if "integerValue" in v:
        return int(v["integerValue"])
    if "arrayValue" in v:
        return [plain(x) for x in v["arrayValue"].get("values", [])]
    if "mapValue" in v:
        return {k: plain(x) for k, x in v["mapValue"].get("fields", {}).items()}
    return None


def access_token():
    subprocess.run("npx --yes firebase-tools projects:list", shell=True, capture_output=True, timeout=120)
    cfg = json.load(open(os.path.expanduser("~/.config/configstore/firebase-tools.json"), encoding="utf-8"))
    cwd = os.getcwd()
    email = None
    for p, e in cfg.get("activeAccounts", {}).items():
        if os.path.normcase(p) == os.path.normcase(cwd):
            email = e
            break
    if email:
        if cfg.get("user", {}).get("email") == email:
            return cfg.get("tokens", {}).get("access_token")
        for acc in cfg.get("additionalAccounts", []):
            if acc.get("user", {}).get("email") == email:
                return acc.get("tokens", {}).get("access_token")
    return cfg.get("tokens", {}).get("access_token")


def main(argv):
    sys.stdout.reconfigure(errors="replace")
    emulator = argv[argv.index("--emulator") + 1] if "--emulator" in argv else None
    force = "--force" in argv
    if emulator:
        host, token = f"http://127.0.0.1:{emulator}", "owner"
    else:
        host, token = "https://firestore.googleapis.com", access_token()
    root = f"projects/{PROJECT}/databases/(default)/documents"

    def call(method, path, body=None):
        req = urllib.request.Request(f"{host}/v1/{path}", method=method, data=json.dumps(body).encode() if body else None,
                                     headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read() or b"{}")

    banks, patterns = load_banks()
    only = argv[argv.index("--only") + 1].split(",") if "--only" in argv else None
    writes = []
    keys = {}
    for bank in banks:
        questions, answers = build(bank)
        keys[bank["id"]] = answers
        if only and bank["id"] not in only:
            continue
        try:
            old = plain({"mapValue": call("GET", f"{root}/quizBanks/{bank['id']}")})
            sig = lambda x: (x["q"], x.get("f"))
            old_q = [sig(x) for x in old.get("questions", [])]
            if old_q != [sig(x) for x in questions[: len(old_q)]] and not force:
                sys.exit(f"{bank['id']}: existing questions were changed or reordered. Only add new ones at the end (or pass --force).")
        except urllib.error.HTTPError as e:
            if e.code != 404:
                raise
        doc = lambda path, fields: {"update": {"name": f"{root}/{path}", "fields": {k: value(v) for k, v in fields.items()}}}
        writes.append(doc(f"quizBanks/{bank['id']}", {"title": bank["title"], "questions": questions, "count": len(questions)}))
        writes.append(doc(f"quizKeys/{bank['id']}", {"answers": answers}))
        writes += [doc(f"quizKeys/{bank['id']}/items/{n}", {"a": a}) for n, a in enumerate(answers)]
        print(f"{bank['id']:8} {bank['title']:46} {len(questions)} questions")

    # One key document per group paper, for every group whose banks are all present.
    for g, spec in patterns["groups"].items():
        if all(b in keys for b in spec["banks"]):
            fields = {"banks": spec["banks"], "perSection": spec["perSection"], "answers": {b: keys[b] for b in spec["banks"]}}
            writes.append({"update": {"name": f"{root}/quizPaperKeys/{g}", "fields": {k: value(v) for k, v in fields.items()}}})
        else:
            print(f"group {g}: missing banks {[b for b in spec['banks'] if b not in keys]}, its quiz stays closed")

    for i in range(0, len(writes), 400):
        call("POST", f"{root}:commit", {"writes": writes[i : i + 400]})
    print(f"Uploaded {len(banks)} banks ({len(writes)} documents).")


if __name__ == "__main__":
    main(sys.argv[1:])
