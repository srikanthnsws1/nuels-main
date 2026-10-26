# Mock tests

Each lesson can have a mock test: **10 multiple-choice questions (A–D), 10 minutes, one attempt**. A test
unlocks when the student marks its lesson done. Students find them under **Course → Mock tests**; scores
also show in the **Performance report**.

## How it works (free plan, no server code)

Questions are stored in Firestore:

| Collection | Holds | Who can read it |
|---|---|---|
| `questionBanks/{course}_{lessonId}` | the 10 questions and their 4 options | students enrolled in the course |
| `answerKeys/{course}_{lessonId}` | the correct option for each question + explanations | a student only after submitting that test |
| `mockTests/{student}_{course}_{lessonId}` | the student's single attempt and score | that student and admins |

`firestore.rules` enforce the rest: the start time comes from Firebase's clock, a test can be submitted
only once and only within 10 minutes (plus 45 seconds' grace), and the saved score must match the
answer key. Admins can delete an attempt in Firestore to let a student retake a test.

Lesson ids are `m{module}-l{lesson}`: `m1-l1` is module 1, lesson 1; `m1-l2` is module 1, lesson 2.

## Adding or editing tests

1. Edit or copy `scripts/mock-tests/python-for-data-analysis.json`. Each test needs exactly 10 questions,
   and each question one `correct` option, three `wrong` options and a short `explanation`.
2. Upload (needs `npx.cmd firebase-tools login` once):
   ```powershell
   python scripts/mock-tests/upload.py scripts/mock-tests/python-for-data-analysis.json
   ```
   Options are shuffled automatically, and re-running updates the same tests.

Currently stored: **Python for Data Analysis**, Test 1 (Variables and data types) and Test 2 (Loops and
conditions). Lessons without a stored test show "Coming soon".

## Later: AI-generated questions

`functions/src/mockTests.ts` can generate fresh questions with Claude for every lesson automatically.
It needs the Firebase Blaze plan and an Anthropic API key, and it isn't deployed. Ask to switch it on
when you upgrade.
