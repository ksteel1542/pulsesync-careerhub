import React, { useState } from 'react';
import {
  Lock, Mail, User, KeyRound, Building2, GraduationCap, Presentation, RefreshCw, AlertCircle, BadgeCheck, Globe, Landmark,
} from 'lucide-react';
import { INDEPENDENT_ID, INDEPENDENT_OPTION } from '../../data/institutions';
import { PRESET_AVATARS } from '../../data/avatars';
import { useClassroomStore } from '../../state/classroomContext';
import Avatar from '../common/Avatar';

const inputCls =
  'w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500';

const MODES = [
  ['signin', 'Sign In'],
  ['signup', 'Sign Up'],
  ['institution', 'Register Institution'],
];

const COUNTRIES = [
  'Australia', 'Canada', 'France', 'Germany', 'Ghana', 'India', 'Ireland', 'Kenya', 'Netherlands',
  'New Zealand', 'Nigeria', 'Singapore', 'South Africa', 'Spain', 'United Arab Emirates', 'United Kingdom', 'United States',
];

export default function AuthGate() {
  const { institutions, signIn, signUp, registerInstitution } = useClassroomStore();
  const verifiedInstitutions = institutions.filter((i) => i.status === 'verified');

  const [mode, setMode] = useState('signin');
  const [form, setForm] = useState({
    name: '', email: '', password: '', institutionId: verifiedInstitutions[0]?.id ?? INDEPENDENT_ID, role: 'student',
  });
  const [inst, setInst] = useState({ name: '', accreditationId: '', contactEmail: '', country: '', password: '', autoApprove: false });
  const [avatarId, setAvatarId] = useState(PRESET_AVATARS[0].id); // preset id or 'custom'
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setI = (key) => (e) => setInst((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const selectedInst = institutions.find((i) => i.id === form.institutionId);
  const isIndependent = form.institutionId === INDEPENDENT_ID;
  const chosenAvatarUrl = avatarId === 'custom' ? customAvatarUrl.trim() : PRESET_AVATARS.find((a) => a.id === avatarId)?.url;

  const switchMode = (m) => {
    setMode(m);
    setError('');
  };

  const pickInstitution = (e) => {
    const institutionId = e.target.value;
    setForm((f) => ({ ...f, institutionId, role: institutionId === INDEPENDENT_ID ? 'student' : f.role }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'signin') await signIn(form);
      else if (mode === 'institution') await registerInstitution(inst);
      else {
        if (avatarId === 'custom' && !customAvatarUrl.trim()) throw new Error('Paste an image URL or pick a preset avatar.');
        await signUp({ ...form, avatarUrl: chosenAvatarUrl });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex justify-center py-6">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-5">
        <div className="text-center space-y-1">
          <div className="w-11 h-11 mx-auto rounded-xl bg-indigo-600/15 flex items-center justify-center">
            {mode === 'institution' ? <Landmark className="w-5 h-5 text-indigo-400" /> : <Lock className="w-5 h-5 text-indigo-400" />}
          </div>
          <h2 className="font-extrabold text-lg text-slate-900 dark:text-white">
            {mode === 'institution' ? 'Register Institution / College' : 'Virtual Classroom Access'}
          </h2>
          <p className="text-xs text-slate-400">
            {mode === 'institution'
              ? 'Create an admin portal to publish your course catalog and manage faculty and students.'
              : 'Sign in with your institution account to join live lectures.'}
          </p>
        </div>

        <div role="tablist" aria-label="Account type" className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          {MODES.map(([m, label]) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => switchMode(m)}
              className={`py-1.5 px-1 rounded-lg text-[11px] font-bold transition ${mode === m ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-3" noValidate>
          {/* ---------- Sign in ---------- */}
          {mode === 'signin' && (
            <>
              <Field icon={Mail} label="Email">
                <input type="email" value={form.email} onChange={set('email')} autoComplete="email" className={inputCls} placeholder="you@ogu.edu" />
              </Field>
              <Field icon={KeyRound} label="Password">
                <input type="password" value={form.password} onChange={set('password')} autoComplete="current-password" className={inputCls} placeholder="••••••••" />
              </Field>
              <p className="text-[10px] text-slate-500">Institution admins sign in with their official contact email.</p>
            </>
          )}

          {/* ---------- Student / instructor sign up ---------- */}
          {mode === 'signup' && (
            <>
              <Field icon={User} label="Full Name">
                <input value={form.name} onChange={set('name')} autoComplete="name" className={inputCls} placeholder="Jane Doe" />
              </Field>
              <Field icon={Mail} label="Email">
                <input type="email" value={form.email} onChange={set('email')} autoComplete="email" className={inputCls} placeholder="you@ogu.edu" />
              </Field>
              <Field icon={KeyRound} label="Password">
                <input type="password" value={form.password} onChange={set('password')} autoComplete="new-password" className={inputCls} placeholder="At least 8 characters" />
              </Field>

              <Field icon={Building2} label="Institution">
                <select value={form.institutionId} onChange={pickInstitution} className={`${inputCls} appearance-none`}>
                  {verifiedInstitutions.map((i) => (
                    <option key={i.id} value={i.id}>{i.name}</option>
                  ))}
                  <option value={INDEPENDENT_OPTION.id}>{INDEPENDENT_OPTION.name}</option>
                </select>
              </Field>
              <p className="text-[10px] text-slate-400 -mt-1">
                {isIndependent
                  ? 'Independent students can join open courses only.'
                  : `Use your @${selectedInst?.emailDomain} email to verify enrollment.`}
              </p>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span id="avatar-label" className="text-[11px] text-slate-400">Profile avatar</span>
                  <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
                    Preview <Avatar name={form.name || 'You'} src={chosenAvatarUrl} size="sm" />
                  </span>
                </div>
                <div role="radiogroup" aria-labelledby="avatar-label" className="grid grid-cols-8 gap-1.5">
                  {PRESET_AVATARS.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      role="radio"
                      aria-checked={avatarId === a.id}
                      aria-label={a.label}
                      title={a.label}
                      onClick={() => setAvatarId(a.id)}
                      className={`rounded-full p-0.5 transition ${avatarId === a.id ? 'ring-2 ring-indigo-500 scale-110' : 'opacity-70 hover:opacity-100'}`}
                    >
                      <img src={a.url} alt="" className="w-full aspect-square rounded-full" />
                    </button>
                  ))}
                </div>
                <label className="flex items-center gap-2 mt-2 text-[11px] text-slate-400">
                  <input
                    type="checkbox"
                    checked={avatarId === 'custom'}
                    onChange={(e) => setAvatarId(e.target.checked ? 'custom' : PRESET_AVATARS[0].id)}
                    className="accent-indigo-500"
                  />
                  Use an image URL instead
                </label>
                {avatarId === 'custom' && (
                  <input
                    type="url"
                    value={customAvatarUrl}
                    onChange={(e) => setCustomAvatarUrl(e.target.value)}
                    className={`${inputCls} pl-3 mt-1.5`}
                    placeholder="https://example.com/photo.jpg"
                    aria-label="Avatar image URL"
                  />
                )}
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block mb-1">I am joining as</span>
                <div className="grid grid-cols-2 gap-2">
                  <RoleOption active={form.role === 'student'} onClick={() => setForm((f) => ({ ...f, role: 'student' }))} icon={GraduationCap} label="Student" />
                  <RoleOption
                    active={form.role === 'instructor'}
                    disabled={isIndependent}
                    onClick={() => setForm((f) => ({ ...f, role: 'instructor' }))}
                    icon={Presentation}
                    label="Instructor / Faculty"
                  />
                </div>
              </div>
            </>
          )}

          {/* ---------- Institution registration ---------- */}
          {mode === 'institution' && (
            <>
              <Field icon={Building2} label="Institution Name">
                <input value={inst.name} onChange={setI('name')} autoComplete="organization" className={inputCls} placeholder="e.g. Lakeside Community College" />
              </Field>
              <Field icon={BadgeCheck} label="Accreditation / Registration ID">
                <input value={inst.accreditationId} onChange={setI('accreditationId')} autoComplete="off" className={`${inputCls} uppercase`} placeholder="e.g. LCC-ACC-20931" />
              </Field>
              <Field icon={Mail} label="Official Contact Email">
                <input type="email" value={inst.contactEmail} onChange={setI('contactEmail')} autoComplete="off" className={inputCls} placeholder="registrar@yourcollege.edu" />
              </Field>
              <p className="text-[10px] text-slate-400 -mt-1">
                This becomes your admin login. Its domain is used to verify your faculty and students.
              </p>
              <Field icon={Globe} label="Country / Location">
                <input list="country-list" value={inst.country} onChange={setI('country')} autoComplete="country-name" className={inputCls} placeholder="Start typing a country" />
                <datalist id="country-list">
                  {COUNTRIES.map((c) => <option key={c} value={c} />)}
                </datalist>
              </Field>
              <Field icon={KeyRound} label="Admin Password">
                <input type="password" value={inst.password} onChange={setI('password')} autoComplete="new-password" className={inputCls} placeholder="At least 8 characters" />
              </Field>

              {import.meta.env.DEV && (
                <label className="flex items-start gap-2 text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2">
                  <input type="checkbox" checked={inst.autoApprove} onChange={setI('autoApprove')} className="accent-amber-500 mt-0.5" />
                  <span>
                    <strong>Dev only:</strong> simulate instant approval. Otherwise the institution starts as <em>Pending Verification</em>.
                  </span>
                </label>
              )}
            </>
          )}

          {error && (
            <p role="alert" className="flex items-start gap-2 text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" /> {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {busy && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            {mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Register Institution'}
          </button>
        </form>

        <p className="text-center text-[10px] text-slate-500">Demo mode: accounts are kept in memory and cleared on page reload.</p>
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, children }) {
  return (
    <label className="block">
      <span className="text-[11px] text-slate-400 block mb-1">{label}</span>
      <span className="relative block">
        <Icon className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        {children}
      </span>
    </label>
  );
}

function RoleOption({ active, disabled, onClick, icon: Icon, label }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition disabled:opacity-40 disabled:cursor-not-allowed ${
        active ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-slate-200 dark:border-slate-800 text-slate-400'
      }`}
    >
      <Icon className="w-4 h-4" /> {label}
    </button>
  );
}
