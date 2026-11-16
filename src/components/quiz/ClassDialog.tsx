"use client";

import { useState } from "react";
import { CheckIcon } from "../icons";
import Dialog from "../dashboard/Dialog";
import { QUIZ_MINUTES, bankTitle, groupById, istDay, questionsFor, studyClassById, studyClassGroups } from "@/data/dailyQuiz";
import type { AppUser } from "@/lib/auth";
import { setStudyClass, useMyQuizzes } from "@/lib/dailyQuiz";

/** Lets a learner change the class chosen at registration. The Daily Quiz follows the new class. */
export default function ClassDialog({ user, onClose }: { user: AppUser; onClose: () => void }) {
  const current = studyClassById(user.studyClass);
  const [choice, setChoice] = useState(current?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const history = useMyQuizzes(user.uid);
  // A paper already started today keeps its questions; the new class applies to the next one.
  const today = history?.find((a) => a.day === istDay());
  const picked = studyClassById(choice);
  const group = picked ? groupById(picked.group) : undefined;
  const changed = !!picked && picked.id !== current?.id;

  const save = async () => {
    if (!picked || !changed) return;
    setSaving(true);
    setError("");
    try {
      await setStudyClass(user.uid, picked.id);
      setSaved(true);
    } catch (err) {
      console.error("Could not change class", err);
      setError("Couldn't change your class. Please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  if (saved && picked)
    return (
      <Dialog title="Class changed" onClose={onClose}>
        <div className="py-6 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-spark-500 text-forest-900">
            <CheckIcon className="h-7 w-7" />
          </span>
          <p className="mt-4 font-semibold text-forest-950">You&apos;re now in {picked.label}</p>
          <p className="mt-1 text-sm text-slate-600">
            {today ? "Today's quiz stays as it is. From tomorrow, your daily quiz is set for your new class." : "Your next daily quiz is set for your new class."}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-6 rounded-full bg-forest-700 px-7 py-3 text-sm font-semibold text-white transition hover:bg-forest-600"
          >
            Done
          </button>
        </div>
      </Dialog>
    );

  return (
    <Dialog title="Change class" onClose={onClose}>
      <p className="mt-1 text-sm text-slate-600">
        Your daily quiz questions are set for your class.
        {current ? (
          <>
            {" "}
            You&apos;re in <strong className="text-forest-900">{current.label}</strong>.
          </>
        ) : (
          " You haven't chosen a class yet."
        )}
      </p>
      <label className="mt-5 block">
        <span className="mb-1.5 block text-sm font-medium text-forest-900">Class / Standard / Course</span>
        <select
          value={choice}
          onChange={(e) => setChoice(e.target.value)}
          disabled={saving}
          className="w-full rounded-2xl border border-forest-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-forest-300"
        >
          <option value="">Select your class or course</option>
          {studyClassGroups.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      {group && changed && (
        <p className="mt-4 rounded-2xl bg-forest-50 px-4 py-3 text-sm text-forest-900">
          New paper: <strong>{questionsFor(group.id)} questions</strong> on {group.banks.map(bankTitle).join(", ")}, in {QUIZ_MINUTES} minutes.
          {today && " Today's quiz stays as it is; the change applies from tomorrow."}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={save}
        disabled={!changed || saving}
        className="mt-6 w-full rounded-full bg-forest-700 py-3.5 text-sm font-semibold text-white shadow-lg shadow-forest-700/20 transition hover:bg-forest-600 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Change class"}
      </button>
    </Dialog>
  );
}
