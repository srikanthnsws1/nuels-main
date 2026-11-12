"use client";

import { useState } from "react";
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, ClipboardIcon, GraduationIcon, StarIcon, UsersIcon } from "../icons";
import { Card, CardTitle, EmptyState, StatTiles } from "./ui";
import type { AppUser } from "@/lib/auth";
import { allQuizGroups, bankTitle, dayLabel, groupById, istDay, quizGroups, sectionColors, sectionLetter } from "@/data/dailyQuiz";
import { formatDuration, paperTotal, saveReward, sectionScores, useQuizAttempts, useQuizRewards, type DailyAttempt } from "@/lib/dailyQuiz";

type Period = "day" | "week" | "month" | "quarter" | "half" | "year";
const periods: { id: Period; label: string }[] = [
  { id: "day", label: "Daily" },
  { id: "week", label: "Weekly" },
  { id: "month", label: "Monthly" },
  { id: "quarter", label: "Quarterly" },
  { id: "half", label: "Half-yearly" },
  { id: "year", label: "Annual" },
];

const DAY_MS = 86_400_000;
const dayOf = (y: number, m: number, d = 1) => Math.floor(Date.UTC(y, m, d) / DAY_MS);
const monthName = (m: number) => new Date(Date.UTC(2000, m, 1)).toLocaleDateString("en-IN", { month: "long", timeZone: "UTC" });
const shortMonth = (m: number) => new Date(Date.UTC(2000, m, 1)).toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" });

/** First and last quiz day of a period, `offset` periods back from today, plus a label. */
function rangeFor(period: Period, offset: number): { from: number; to: number; label: string; month?: string } {
  const today = istDay();
  if (period === "day") {
    const d = today - offset;
    return { from: d, to: d, label: dayLabel(d) };
  }
  if (period === "week") {
    const weekday = (new Date(today * DAY_MS).getUTCDay() + 6) % 7; // Monday = 0
    const from = today - weekday - offset * 7;
    return { from, to: from + 6, label: `${dayLabel(from)} – ${dayLabel(from + 6)}` };
  }
  const now = new Date(today * DAY_MS);
  const span = { month: 1, quarter: 3, half: 6, year: 12 }[period];
  const startMonth = Math.floor(now.getUTCMonth() / span) * span;
  const totalMonths = now.getUTCFullYear() * 12 + startMonth - offset * span;
  const y = Math.floor(totalMonths / 12);
  const m = totalMonths % 12;
  const from = dayOf(y, m);
  const to = dayOf(y, m + span) - 1;
  const label =
    period === "month"
      ? `${monthName(m)} ${y}`
      : period === "quarter"
        ? `Q${m / 3 + 1} (${shortMonth(m)} – ${shortMonth(m + 2)}) ${y}`
        : period === "half"
          ? `${m === 0 ? "H1 (Jan – Jun)" : "H2 (Jul – Dec)"} ${y}`
          : `${y}`;
  return { from, to, label, month: period === "month" ? `${y}-${String(m + 1).padStart(2, "0")}` : undefined };
}

type Row = { uid: string; name: string; memberId?: string; institution?: string; group: string; quizzes: number; points: number; best: number; avgPct: number; sumPct: number; time: number };

const pctOf = (p: DailyAttempt) => (paperTotal(p) ? Math.round(((p.score ?? 0) / paperTotal(p)) * 100) : 0);

/**
 * Ranks learners by the sum of their paper percentages (so a 10-question Class 1 paper counts the same as a
 * 30-question Class 10 one, and every quiz taken adds up), then average score, then the least total time.
 */
function leaderboard(papers: DailyAttempt[]): Row[] {
  const by = new Map<string, Row>();
  for (const p of papers) {
    const r = by.get(p.uid) ?? { uid: p.uid, name: p.name, memberId: p.memberId, institution: p.institution, group: p.group, quizzes: 0, points: 0, best: 0, avgPct: 0, sumPct: 0, time: 0 };
    r.quizzes++;
    r.points += p.score ?? 0;
    r.best = Math.max(r.best, pctOf(p));
    r.sumPct += pctOf(p);
    r.time += p.timeTaken ?? 0;
    by.set(p.uid, r);
  }
  return [...by.values()]
    .map((r) => ({ ...r, avgPct: Math.round(r.sumPct / r.quizzes) }))
    .sort((a, b) => b.sumPct - a.sumPct || b.avgPct - a.avgPct || a.time - b.time);
}

const bands = [
  { label: "80 – 100%", min: 80, tone: "bg-emerald-500" },
  { label: "60 – 79%", min: 60, tone: "bg-spark-500" },
  { label: "40 – 59%", min: 40, tone: "bg-amber-400" },
  { label: "Below 40%", min: 0, tone: "bg-red-400" },
];

function Bar({ label, value, max, tone, suffix = "" }: { label: string; value: number; max: number; tone: string; suffix?: string }) {
  return (
    <li>
      <div className="flex justify-between gap-3 text-sm">
        <span className="font-medium text-forest-900">{label}</span>
        <span className="font-semibold text-forest-950">
          {value}
          {suffix}
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-forest-50">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${max ? (value / max) * 100 : 0}%` }} />
      </div>
    </li>
  );
}

/** Admin: how students performed in the Daily Quiz over any period, and the month's best performer. */
export default function AdminQuizReports({ me }: { me: AppUser }) {
  const [period, setPeriod] = useState<Period>("day");
  const [offset, setOffset] = useState(0);
  const [group, setGroup] = useState<string>("all");
  const [showAll, setShowAll] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const range = rangeFor(period, offset);
  const { rows, error: loadError } = useQuizAttempts(range.from, range.to);
  const rewards = useQuizRewards();

  const papers = (rows ?? []).filter((p) => p.score !== undefined && (group === "all" || p.group === group));
  const board = leaderboard(papers);
  const pcts = papers.map(pctOf);
  const avg = pcts.length ? Math.round(pcts.reduce((s, p) => s + p, 0) / pcts.length) : null;
  // Average per section bank, over the papers that had it (one group: its paper order; all groups: by title).
  const sectionTotals = new Map<string, { got: number; of: number }>();
  for (const p of papers) {
    const scores = sectionScores(p);
    for (const [b, picks] of Object.entries(p.picks)) {
      const t = sectionTotals.get(b) ?? { got: 0, of: 0 };
      t.got += scores[b] ?? 0;
      t.of += picks.length;
      sectionTotals.set(b, t);
    }
  }
  const order = group === "all" ? [...sectionTotals.keys()].sort((a, b) => bankTitle(a).localeCompare(bankTitle(b))) : (groupById(group)?.banks ?? []).filter((b) => sectionTotals.has(b));
  const sectionAvg = order.map((b, i) => ({
    id: b,
    label: group === "all" ? bankTitle(b) : `${sectionLetter(i)}. ${bankTitle(b)}`,
    color: sectionColors[i % sectionColors.length].color,
    avg: Math.round((sectionTotals.get(b)!.got / sectionTotals.get(b)!.of) * 100),
  }));
  const groupOptions = [...quizGroups, ...allQuizGroups.filter((g) => g.legacy && rows?.some((r) => r.group === g.id))];
  const spread = bands.map((b, i) => ({ ...b, count: pcts.filter((p) => p >= b.min && (i === 0 || p < bands[i - 1].min)).length }));
  const reward = range.month ? rewards?.find((r) => r.month === range.month) : undefined;
  const winner = board[0];
  const monthOver = period === "month" && range.to < istDay();

  const stats = [
    { label: "Papers submitted", value: rows === null ? "—" : papers.length, icon: ClipboardIcon },
    { label: "Students taking part", value: rows === null ? "—" : board.length, icon: UsersIcon },
    { label: "Average score", value: avg === null ? "—" : `${avg}%`, icon: CheckIcon },
    { label: "Top score", value: pcts.length ? `${Math.max(...pcts)}%` : "—", icon: StarIcon },
  ];

  const markRewarded = async () => {
    if (!winner || !range.month) return;
    const note = window.prompt(`Record ${winner.name} as the best performer of ${range.label}? Add the reward given (optional):`, "Gift voucher");
    if (note === null) return;
    setBusy(true);
    setError("");
    try {
      await saveReward(
        { month: range.month, uid: winner.uid, name: winner.name, ...(winner.memberId ? { memberId: winner.memberId } : {}), points: winner.points, quizzes: winner.quizzes, avgPct: winner.avgPct, ...(note.trim() ? { note: note.trim() } : {}) },
        me.uid,
      );
    } catch {
      setError("Couldn't save the reward. Check your connection and Firestore rules.");
    } finally {
      setBusy(false);
    }
  };

  const visibleBoard = showAll ? board : board.slice(0, 10);

  return (
    <div className="space-y-6">
      <Card id="daily-quiz">
        <CardTitle title="Daily Quiz reports" />
        <p className="mt-1 text-sm text-slate-500">How students are doing in the daily quiz, by period and class.</p>

        <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto">
          {periods.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={period === p.id}
              onClick={() => {
                setPeriod(p.id);
                setOffset(0);
                setShowAll(false);
              }}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${period === p.id ? "bg-forest-700 text-white" : "border border-forest-100 text-slate-600 hover:bg-forest-50"}`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setOffset((o) => o + 1)} aria-label="Previous period" className="flex h-9 w-9 items-center justify-center rounded-full border border-forest-100 text-forest-700 hover:bg-forest-50">
              <ArrowLeftIcon className="h-4 w-4" />
            </button>
            <p className="min-w-0 text-base font-bold text-forest-950">{range.label}</p>
            <button
              type="button"
              onClick={() => setOffset((o) => Math.max(0, o - 1))}
              disabled={offset === 0}
              aria-label="Next period"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-forest-100 text-forest-700 hover:bg-forest-50 disabled:opacity-40"
            >
              <ArrowRightIcon className="h-4 w-4" />
            </button>
          </div>
          <select
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            aria-label="Class group"
            className="rounded-full border border-forest-100 bg-white px-4 py-2 text-sm font-medium text-forest-900 outline-none focus:border-forest-300"
          >
            <option value="all">All classes</option>
            {groupOptions.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
        {(loadError || error) && <p className="mt-4 text-sm font-medium text-red-600">{loadError || error}</p>}
      </Card>

      <StatTiles stats={stats} />

      {rows !== null && papers.length === 0 ? (
        <Card>
          <EmptyState icon={GraduationIcon} title="No quiz results for this period" />
        </Card>
      ) : (
        <>
          {period === "month" && winner && (
            <section className="flex flex-wrap items-center gap-4 rounded-3xl border border-spark-500/60 bg-gradient-to-r from-spark-500/20 to-white p-5 sm:p-6">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-spark-500 text-forest-900">
                <StarIcon className="h-7 w-7" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-forest-700">
                  Best performer · {range.label}
                  {!monthOver && " (so far)"}
                </p>
                <p className="mt-0.5 text-xl font-bold text-forest-950">
                  {winner.name} {winner.memberId && <span className="font-mono text-sm text-forest-600">{winner.memberId}</span>}
                </p>
                <p className="text-sm text-slate-600">
                  {winner.points} marks from {winner.quizzes} {winner.quizzes === 1 ? "quiz" : "quizzes"} · {winner.avgPct}% average · {groupById(winner.group)?.label ?? winner.group}
                  {winner.institution && ` · ${winner.institution}`}
                </p>
              </div>
              {reward ? (
                <p className="rounded-2xl bg-white px-4 py-2 text-sm text-forest-800">
                  <CheckIcon className="mr-1 inline h-4 w-4 text-emerald-600" />
                  Rewarded: <strong>{reward.name}</strong>
                  {reward.note && ` · ${reward.note}`}
                </p>
              ) : (
                <button
                  type="button"
                  onClick={markRewarded}
                  disabled={busy || !monthOver}
                  title={monthOver ? undefined : "You can reward the winner once the month is over"}
                  className="rounded-full bg-forest-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-forest-600 disabled:opacity-50"
                >
                  {busy ? "Saving…" : monthOver ? "Mark as rewarded" : "Reward after month ends"}
                </button>
              )}
            </section>
          )}

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardTitle title="Average by section" />
              <ul className="mt-5 space-y-4">
                {sectionAvg.map((s) => (
                  <Bar key={s.id} label={s.label} value={s.avg} max={100} tone={s.color} suffix="%" />
                ))}
              </ul>
            </Card>
            <Card>
              <CardTitle title="Score spread" />
              <ul className="mt-5 space-y-4">
                {spread.map((b) => (
                  <Bar key={b.label} label={b.label} value={b.count} max={Math.max(1, ...spread.map((x) => x.count))} tone={b.tone} />
                ))}
              </ul>
            </Card>
          </div>

          <Card>
            <CardTitle title={`Leaderboard · ${range.label}`} action={<span className="text-sm text-slate-500">{board.length} students</span>} />
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-[11px] uppercase tracking-wider text-slate-400">
                  <tr>
                    {["Rank", "Student", "Class", "School / college", "Quizzes", "Marks", "Average", "Best", "Avg time"].map((h) => (
                      <th key={h} className="pb-3 pr-4 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-forest-100">
                  {visibleBoard.map((r, i) => (
                    <tr key={r.uid}>
                      <td className="py-3 pr-4">
                        <span
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                            i === 0 ? "bg-spark-500 text-forest-900" : i < 3 ? "bg-forest-100 text-forest-800" : "text-slate-500"
                          }`}
                        >
                          {i + 1}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="block font-semibold text-forest-950">{r.name}</span>
                        {r.memberId && <span className="font-mono text-xs font-semibold text-forest-600">{r.memberId}</span>}
                      </td>
                      <td className="py-3 pr-4 text-slate-600">{groupById(r.group)?.label ?? r.group}</td>
                      <td className="max-w-[14rem] truncate py-3 pr-4 text-slate-600">{r.institution || "—"}</td>
                      <td className="py-3 pr-4 text-slate-600">{r.quizzes}</td>
                      <td className="py-3 pr-4 font-bold text-forest-950">{r.points}</td>
                      <td className="py-3 pr-4 font-semibold text-forest-700">{r.avgPct}%</td>
                      <td className="py-3 pr-4 text-slate-600">
                        {r.best}%
                      </td>
                      <td className="py-3 text-slate-600">{formatDuration(Math.round(r.time / r.quizzes))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {board.length > 10 && (
              <button type="button" onClick={() => setShowAll((s) => !s)} className="mt-4 text-sm font-semibold text-forest-700 hover:text-forest-500">
                {showAll ? "Show top 10" : `Show all ${board.length} students`}
              </button>
            )}
          </Card>
        </>
      )}

      {rewards && rewards.length > 0 && (
        <Card>
          <CardTitle title="Monthly rewards" />
          <ul className="mt-4 divide-y divide-forest-100">
            {rewards.map((r) => (
              <li key={r.month} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <span>
                  <span className="block font-semibold text-forest-950">
                    {monthName(Number(r.month.slice(5)) - 1)} {r.month.slice(0, 4)}: {r.name} {r.memberId && <span className="font-mono text-xs text-forest-600">{r.memberId}</span>}
                  </span>
                  <span className="text-xs text-slate-500">
                    {r.points} marks · {r.quizzes} {r.quizzes === 1 ? "quiz" : "quizzes"} · {r.avgPct}% average
                  </span>
                </span>
                {r.note && <span className="rounded-full bg-spark-500/25 px-3 py-1 text-xs font-semibold text-forest-800">{r.note}</span>}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
