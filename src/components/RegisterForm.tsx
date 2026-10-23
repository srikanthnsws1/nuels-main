"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowRightIcon, BookIcon, CheckIcon, EyeIcon, EyeOffIcon, GraduationIcon } from "./icons";
import Reveal from "./motion/Reveal";
import AvatarPicker from "./AvatarPicker";
import MentorVerificationModal from "./MentorVerificationModal";
import { authErrorMessage, greetingName, homeFor, register, signOut, type AppUser, type Role } from "@/lib/auth";
import { countries, districtsByState, indianStates, syllabusOptions } from "@/data/locations";

const passwordRules = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One number", test: (p: string) => /\d/.test(p) },
  { label: "One special character", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

const strengthStyles = ["bg-forest-100", "bg-red-400", "bg-amber-400", "bg-spark-500", "bg-forest-600"];
const strengthLabels = ["", "Weak", "Fair", "Good", "Strong"];

const field =
  "w-full rounded-2xl border bg-white px-4 py-3.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:shadow-lg focus:shadow-forest-900/5";

export default function RegisterForm({ defaultRole }: { defaultRole?: Role }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryRole = searchParams.get("role") === "instructor" || searchParams.get("role") === "mentor" ? "mentor" : "student";
  const [role, setRole] = useState<Role>(defaultRole || queryRole);

  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [photo, setPhoto] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [institution, setInstitution] = useState("");
  const [syllabus, setSyllabus] = useState("");
  const [country, setCountry] = useState("India");
  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  const [mandal, setMandal] = useState("");
  const [city, setCity] = useState("");
  const [terms, setTerms] = useState(false);
  const [whatsapp, setWhatsapp] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [created, setCreated] = useState<AppUser | null>(null);
  const [showVerification, setShowVerification] = useState(false);

  const nameError = submitted && name.trim().length < 2 ? "Please enter your full name." : "";
  const emailError = submitted && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "Please enter a valid email address." : "";
  const phoneError =
    submitted && !/^(\+91[\s-]?)?[6-9]\d{9}$/.test(phone.replace(/\s/g, "")) ? "Please enter a valid 10-digit mobile number." : "";
  const passwordError = submitted && !passwordRules.every((r) => r.test(password)) ? "Password does not meet requirements." : "";
  const confirmError = submitted && (!confirm ? "Please confirm your password." : confirm !== password ? "Passwords do not match." : "");
  const termsError = submitted && !terms ? "Please accept the Terms & Privacy Policy to continue." : "";
  const nicknameError = nickname.trim() && !/^[\p{L}\p{N} ._-]{2,30}$/u.test(nickname.trim()) ? "Use 2–30 letters, numbers, spaces, dots or dashes." : "";
  const required = (v: string, label: string) => (submitted && !v.trim() ? `Please enter your ${label}.` : "");
  const institutionError = required(institution, role === "mentor" ? "institution or organisation" : "school or college name");
  const syllabusError = required(syllabus, "syllabus, board or university");
  const countryError = required(country, "country");
  const stateError = required(state, "state");
  const districtError = required(district, "district");
  const cityError = required(city, "village or city");
  const inIndia = country === "India";
  const districtSuggestions = inIndia ? (districtsByState[state] ?? []) : [];

  const strength = password ? passwordRules.filter((r) => r.test(password)).length : 0;
  const confirmMatches = confirm.length > 0 && confirm === password;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setErrorMsg("");

    const missingDetails = [institution, syllabus, country, state, district, city].some((v) => !v.trim());
    if (
      name.trim().length < 2 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !/^(\+91[\s-]?)?[6-9]\d{9}$/.test(phone.replace(/\s/g, "")) ||
      missingDetails ||
      !!nicknameError ||
      !passwordRules.every((r) => r.test(password)) ||
      confirm !== password ||
      !terms
    ) {
      return;
    }

    setLoading(true);
    try {
      const user = await register({
        name: name.trim(),
        email: email.trim(),
        phone: phone.replace(/\s/g, ""),
        password,
        role,
        profile: { institution, syllabus, country, state, district, mandal, city, nickname, photo, whatsappOptIn: whatsapp },
      });
      // Instructor applicants can't use a dashboard until an admin approves them, so end the session.
      if (user.requestedRole === "mentor") {
        await signOut();
        setShowVerification(true);
      }
      setCreated(user);
      setLoading(false);
    } catch (err) {
      setErrorMsg(authErrorMessage(err));
      setLoading(false);
    }
  };

  const inputBorder = (hasError: boolean) =>
    hasError ? "border-red-300 focus:border-red-400" : "border-forest-100 focus:border-forest-300";

  if (created) {
    const tutor = created.requestedRole === "mentor";
    return (
      <Reveal immediate>
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-spark-500 text-forest-900">
            {created.photo ? (
              // eslint-disable-next-line @next/next/no-img-element -- data URL avatar
              <img src={created.photo} alt="" className="h-full w-full object-cover" />
            ) : (
              <CheckIcon className="h-8 w-8" />
            )}
          </span>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-forest-950 sm:text-3xl">
              Welcome, {greetingName(created)}!
            </h2>
            <p className="text-sm text-slate-600">{tutor ? "Your instructor application is in." : "Your student account is ready."}</p>
          </div>
        </div>

        {created.memberId && (
          <div className="mt-6 rounded-2xl bg-forest-700 p-5 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-spark-400">{tutor ? "Your Tutor ID" : "Your Student ID"}</p>
            <p className="mt-1 font-mono text-4xl font-bold tracking-[0.2em] text-white">{created.memberId}</p>
            <p className="mt-2 text-xs text-forest-100">Keep this ID handy: it identifies you across Nuel Smart.</p>
          </div>
        )}

        <p className="mt-6 text-sm leading-relaxed text-slate-600">
          {tutor && (
            <>
              Your mentor account is under verification. Our admin team will review your application and switch on your mentor
              dashboard once it&apos;s approved.{" "}
            </>
          )}
          Please verify your email using the link we sent to <strong className="text-forest-800">{created.email}</strong>.
        </p>
        <button
          type="button"
          onClick={() => router.push(tutor ? "/" : homeFor[created.role])}
          className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-forest-700 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-forest-600"
        >
          {tutor ? "Back to home" : "Go to my dashboard"} <ArrowRightIcon className="h-4 w-4" />
        </button>
        {showVerification && <MentorVerificationModal email={created.email} onClose={() => setShowVerification(false)} />}
      </Reveal>
    );
  }

  return (
    <Reveal immediate>
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-forest-950 sm:text-4xl">Create your account</h2>
        <p className="mt-2 text-sm text-slate-600 sm:text-base">
          Join Nuel Smart to learn high-income skills or mentor the next generation.
        </p>
      </div>

      {/* Account Type Selector */}
      <div className="mt-6 rounded-2xl border border-forest-100 bg-forest-50/60 p-1.5">
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => setRole("student")}
            className={`flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-xs sm:text-sm font-semibold transition ${
              role === "student"
                ? "bg-white text-forest-950 shadow-sm shadow-forest-900/10 border border-forest-200"
                : "text-slate-600 hover:text-forest-900"
            }`}
          >
            <GraduationIcon className={`h-4 w-4 ${role === "student" ? "text-forest-700" : "text-slate-400"}`} />
            Learner / Student
          </button>

          <button
            type="button"
            onClick={() => setRole("mentor")}
            className={`flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-xs sm:text-sm font-semibold transition ${
              role === "mentor"
                ? "bg-white text-forest-950 shadow-sm shadow-forest-900/10 border border-forest-200"
                : "text-slate-600 hover:text-forest-900"
            }`}
          >
            <BookIcon className={`h-4 w-4 ${role === "mentor" ? "text-forest-700" : "text-slate-400"}`} />
            Tutor / Instructor
          </button>
        </div>
      </div>

      <div className="mt-2 text-xs text-slate-500">
        {role === "student" ? (
          <p>🎓 Creating a <strong>Student Account</strong>: access courses, live sessions, project feedback.</p>
        ) : (
          <p>💼 Creating an <strong>Instructor Account</strong>: manage courses, conduct sessions, review learners.</p>
        )}
      </div>

      <form onSubmit={submit} noValidate className="mt-6 space-y-4">
        <div>
          <label htmlFor="reg-name" className="mb-1.5 block text-sm font-medium text-forest-900">
            Full Name
          </label>
          <input
            id="reg-name"
            autoComplete="name"
            placeholder="Priya Nair"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`${field} ${inputBorder(!!nameError)}`}
          />
          {nameError && <p className="mt-1.5 text-xs font-medium text-red-600">{nameError}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
          <div>
            <label htmlFor="reg-nickname" className="mb-1.5 block text-sm font-medium text-forest-900">
              Username / Nickname <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              id="reg-nickname"
              autoComplete="nickname"
              maxLength={30}
              placeholder="What should we call you?"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className={`${field} ${inputBorder(!!nicknameError)}`}
            />
            {nicknameError ? (
              <p className="mt-1.5 text-xs font-medium text-red-600">{nicknameError}</p>
            ) : (
              <p className="mt-1.5 text-xs text-slate-500">We&apos;ll greet you with this when you log in.</p>
            )}
          </div>
          <AvatarPicker value={photo} onChange={setPhoto} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="reg-email" className="mb-1.5 block text-sm font-medium text-forest-900">
              Email Address
            </label>
            <input
              id="reg-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`${field} ${inputBorder(!!emailError)}`}
            />
            {emailError && <p className="mt-1.5 text-xs font-medium text-red-600">{emailError}</p>}
          </div>

          <div>
            <label htmlFor="reg-phone" className="mb-1.5 block text-sm font-medium text-forest-900">
              Mobile Number
            </label>
            <input
              id="reg-phone"
              type="tel"
              autoComplete="tel"
              placeholder="98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={`${field} ${inputBorder(!!phoneError)}`}
            />
            {phoneError && <p className="mt-1.5 text-xs font-medium text-red-600">{phoneError}</p>}
          </div>
        </div>

        {/* Education */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="reg-institution" className="mb-1.5 block text-sm font-medium text-forest-900">
              {role === "mentor" ? "Institution / Organisation" : "School / College Name"}
            </label>
            <input
              id="reg-institution"
              autoComplete="organization"
              placeholder={role === "mentor" ? "e.g. Infosys, Osmania University" : "e.g. ZPHS Narsapur, CBIT"}
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              className={`${field} ${inputBorder(!!institutionError)}`}
            />
            {institutionError && <p className="mt-1.5 text-xs font-medium text-red-600">{institutionError}</p>}
          </div>
          <div>
            <label htmlFor="reg-syllabus" className="mb-1.5 block text-sm font-medium text-forest-900">
              Syllabus / Board / University
            </label>
            <input
              id="reg-syllabus"
              list="reg-syllabus-options"
              autoComplete="off"
              placeholder="e.g. CBSE, JNTU Hyderabad"
              value={syllabus}
              onChange={(e) => setSyllabus(e.target.value)}
              className={`${field} ${inputBorder(!!syllabusError)}`}
            />
            <datalist id="reg-syllabus-options">
              {syllabusOptions.map((o) => (
                <option key={o} value={o} />
              ))}
            </datalist>
            {syllabusError && <p className="mt-1.5 text-xs font-medium text-red-600">{syllabusError}</p>}
          </div>
        </div>

        {/* Location */}
        <fieldset className="rounded-2xl border border-forest-100 p-4">
          <legend className="px-1 text-sm font-semibold text-forest-900">Your location</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="reg-country" className="mb-1.5 block text-sm font-medium text-forest-900">
                Country
              </label>
              <select
                id="reg-country"
                autoComplete="country-name"
                value={country}
                onChange={(e) => {
                  setCountry(e.target.value);
                  setState("");
                  setDistrict("");
                }}
                className={`${field} ${inputBorder(!!countryError)}`}
              >
                {countries.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              {countryError && <p className="mt-1.5 text-xs font-medium text-red-600">{countryError}</p>}
            </div>
            <div>
              <label htmlFor="reg-state" className="mb-1.5 block text-sm font-medium text-forest-900">
                State
              </label>
              {inIndia ? (
                <select
                  id="reg-state"
                  autoComplete="address-level1"
                  value={state}
                  onChange={(e) => {
                    setState(e.target.value);
                    setDistrict("");
                  }}
                  className={`${field} ${inputBorder(!!stateError)} ${state ? "" : "text-slate-400"}`}
                >
                  <option value="">Select state</option>
                  {indianStates.map((s) => (
                    <option key={s} className="text-slate-800">
                      {s}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id="reg-state"
                  autoComplete="address-level1"
                  placeholder="State / Province"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className={`${field} ${inputBorder(!!stateError)}`}
                />
              )}
              {stateError && <p className="mt-1.5 text-xs font-medium text-red-600">{stateError}</p>}
            </div>
            <div>
              <label htmlFor="reg-district" className="mb-1.5 block text-sm font-medium text-forest-900">
                District
              </label>
              <input
                id="reg-district"
                list="reg-district-options"
                autoComplete="off"
                placeholder={districtSuggestions.length ? "Start typing to pick" : "District"}
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className={`${field} ${inputBorder(!!districtError)}`}
              />
              <datalist id="reg-district-options">
                {districtSuggestions.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
              {districtError && <p className="mt-1.5 text-xs font-medium text-red-600">{districtError}</p>}
            </div>
            <div>
              <label htmlFor="reg-mandal" className="mb-1.5 block text-sm font-medium text-forest-900">
                Mandal / Tehsil <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input
                id="reg-mandal"
                autoComplete="off"
                placeholder="Mandal / Tehsil / Taluk"
                value={mandal}
                onChange={(e) => setMandal(e.target.value)}
                className={`${field} ${inputBorder(false)}`}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="reg-city" className="mb-1.5 block text-sm font-medium text-forest-900">
                Village / City
              </label>
              <input
                id="reg-city"
                autoComplete="address-level2"
                placeholder="Village, town or city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className={`${field} ${inputBorder(!!cityError)}`}
              />
              {cityError && <p className="mt-1.5 text-xs font-medium text-red-600">{cityError}</p>}
            </div>
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="reg-password" className="mb-1.5 block text-sm font-medium text-forest-900">
              Create Password
            </label>
            <div className="relative">
              <input
                id="reg-password"
                type={showPassword ? "text" : "password"}
                autoComplete="off"
                placeholder="At least 8 chars"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${field} pr-12 ${inputBorder(!!passwordError)}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-forest-50 hover:text-forest-700"
              >
                {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
              </button>
            </div>
            {passwordError && <p className="mt-1.5 text-xs font-medium text-red-600">{passwordError}</p>}
          </div>

          <div>
            <label htmlFor="reg-confirm" className="mb-1.5 block text-sm font-medium text-forest-900">
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="reg-confirm"
                type={showConfirm ? "text" : "password"}
                autoComplete="off"
                placeholder="Re-enter password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={`${field} pr-12 ${confirmMatches ? "!border-forest-400" : inputBorder(!!confirmError)}`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={showConfirm ? "Hide password" : "Show password"}
                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-forest-50 hover:text-forest-700"
              >
                {showConfirm ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
              </button>
            </div>
            {confirmMatches && (
              <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-forest-600">
                <CheckIcon className="h-3.5 w-3.5" /> Passwords match
              </p>
            )}
            {confirmError && !confirmMatches && <p className="mt-1.5 text-xs font-medium text-red-600">{confirmError}</p>}
          </div>
        </div>

        {/* Password Strength Checklist */}
        <div className="rounded-2xl bg-forest-50/70 p-4">
          <div className="flex items-center gap-3">
            <div className="grid flex-1 grid-cols-4 gap-1.5">
              {passwordRules.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-colors ${i < strength ? strengthStyles[strength] : "bg-forest-100"}`}
                />
              ))}
            </div>
            <span className="w-12 text-right text-xs font-semibold text-forest-700">{strengthLabels[strength]}</span>
          </div>
          <ul className="mt-2.5 grid gap-1.5 text-xs sm:grid-cols-2">
            {passwordRules.map((r) => {
              const ok = r.test(password);
              return (
                <li key={r.label} className={`flex items-center gap-1.5 ${ok ? "text-forest-700 font-medium" : "text-slate-500"}`}>
                  <span
                    className={`flex h-3.5 w-3.5 items-center justify-center rounded-full ${
                      ok ? "bg-forest-600 text-white" : "border border-slate-300"
                    }`}
                  >
                    {ok && <CheckIcon className="h-2.5 w-2.5" />}
                  </span>
                  {r.label}
                </li>
              );
            })}
          </ul>
        </div>

        <label className="flex items-start gap-3 rounded-2xl border border-forest-100 bg-forest-50/60 p-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={whatsapp}
            onChange={(e) => setWhatsapp(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded accent-forest-700"
          />
          <span>
            <strong className="font-semibold text-forest-900">Send me a welcome message on WhatsApp</strong> with my{" "}
            {role === "mentor" ? "Tutor" : "Student"} ID and login details, and important account updates, at the mobile
            number above. <span className="text-slate-500">(Optional. Reply STOP anytime to unsubscribe.)</span>
          </span>
        </label>

        <div>
          <label className="flex items-start gap-3 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded accent-forest-700"
            />
            <span>
              I agree to the <span className="font-medium text-forest-700">Terms &amp; Conditions</span> and{" "}
              <span className="font-medium text-forest-700">Privacy Policy</span>.
            </span>
          </label>
          {termsError && <p className="mt-1.5 text-xs font-medium text-red-600">{termsError}</p>}
        </div>

        {errorMsg && (
          <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {errorMsg}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-forest-700 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-forest-700/20 transition hover:bg-forest-600 disabled:opacity-70"
        >
          {loading ? "Creating Account…" : role === "mentor" ? "Create Instructor Account" : "Create Student Account"}
          {!loading && <ArrowRightIcon className="h-4 w-4" />}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link href={role === "mentor" ? "/tutor/login" : "/login"} className="font-semibold text-forest-700 hover:text-forest-600">
          Sign in here
        </Link>
      </p>
    </Reveal>
  );
}
