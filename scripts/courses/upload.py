"""Adds courses to the live catalog (Firestore `catalog/{slug}`), hidden until an admin prices them.

Usage (after `npx.cmd firebase-tools login`):
    python scripts/courses/upload.py scripts/courses/tech-courses.json

Each course gets one module ("What you'll learn") whose topics become its lessons, mentor
"Nuel Smart Faculty", and a placeholder price of ₹1. Admin → Courses won't show a course to
students until a real price is set. Courses that already exist are skipped, so admin edits are kept.

With --update, existing courses get their syllabus fields refreshed (title, description, topics,
lesson count, chapter number and unit); price, visibility and mentor are never touched:
    python scripts/courses/upload.py scripts/courses/class10-maths.json --update
"""
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request

PROJECT = "nuelsmart-fb72e"
BASE = f"https://firestore.googleapis.com/v1/projects/{PROJECT}/databases/(default)/documents"


def access_token() -> str:
    subprocess.run("npx --yes firebase-tools projects:list", shell=True, capture_output=True, timeout=120)
    cfg = json.load(open(os.path.expanduser("~/.config/configstore/firebase-tools.json"), encoding="utf-8"))
    return cfg["tokens"]["access_token"]


def slugify(title: str) -> str:  # same as slugify() in src/lib/catalog.ts
    s = title.lower().replace("&", " and ")
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")[:60]


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


def request(token, method, path, body=None):
    req = urllib.request.Request(f"{BASE}/{path}", method=method, data=json.dumps(body).encode() if body else None,
                                 headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read() or b"{}")


def main(path, update=False):
    token = access_token()
    for c in json.load(open(path, encoding="utf-8")):
        slug = c.get("slug") or slugify(c["title"])
        try:
            request(token, "GET", f"catalog/{slug}")
            if not update:
                print(f"skip   {slug} (already exists)")
                continue
            fields = {
                "title": c["title"],
                "description": c["description"],
                "lessons": len(c["topics"]),
                "modules": [{"title": c.get("moduleTitle", "What you'll learn"), "topics": c["topics"]}],
                **{k: c[k] for k in ("chapterNo", "unit") if k in c},
            }
            mask = "&".join(f"updateMask.fieldPaths={k}" for k in fields)
            request(token, "PATCH", f"catalog/{slug}?{mask}&currentDocument.exists=true", {"fields": {k: value(v) for k, v in fields.items()}})
            print(f"update {slug}")
            continue
        except urllib.error.HTTPError as e:
            if e.code != 404:
                raise
        doc = {
            "title": c["title"],
            "description": c["description"],
            "category": c["category"],
            "level": c["level"],
            "mentor": c.get("mentor", "Nuel Smart Faculty"),
            "image": c["image"],
            "lessons": len(c["topics"]),
            "hours": c.get("hours", 0),
            # Without a price the course stays hidden at a ₹1 placeholder until an admin prices it.
            "price": c.get("price", 1),
            "oldPrice": c.get("oldPrice", c.get("price", 1)),
            "hidden": c.get("hidden", "price" not in c),
            "modules": [{"title": c.get("moduleTitle", "What you'll learn"), "topics": c["topics"]}],
        }
        for extra in ("group", "chapterNo", "unit"):
            if extra in c:
                doc[extra] = c[extra]
        # currentDocument.exists=false: create only, never overwrite.
        request(token, "PATCH", f"catalog/{slug}?currentDocument.exists=false", {"fields": {k: value(v) for k, v in doc.items()}})
        print(f"added  {slug}")


if __name__ == "__main__":
    main(sys.argv[1], update="--update" in sys.argv[2:])
