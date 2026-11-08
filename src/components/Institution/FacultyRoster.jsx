import React, { useState } from 'react';
import { UserPlus, Presentation, AlertCircle, Mail, X, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useClassroomStore } from '../../state/classroomContext';
import Avatar from '../common/Avatar';

const inputCls =
  'w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500';
const card = 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5';

export default function FacultyRoster({ inst, courses, faculty, invites }) {
  const { inviteFaculty, revokeInvitation, toggleAssignment } = useClassroomStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const submit = (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    try {
      inviteFaculty(inst.id, { name, email });
      setNotice(`Invitation recorded for ${email.trim().toLowerCase()}. They join by signing up as Instructor / Faculty with this email.`);
      setName('');
      setEmail('');
    } catch (err) {
      setError(err.message);
    }
  };

  const rows = [
    ...faculty.map((u) => ({
      key: u.email,
      email: u.email,
      name: u.name,
      avatarUrl: u.avatarUrl,
      status: 'active',
      verified: inst.status === 'verified' && u.email.endsWith(`@${inst.emailDomain}`),
    })),
    ...invites.map((i) => ({ key: i.id, inviteId: i.id, email: i.email, name: i.name || i.email.split('@')[0], status: 'invited' })),
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <form onSubmit={submit} noValidate className={`${card} lg:col-span-4 space-y-3 h-fit`}>
        <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-indigo-500" /> Invite Instructor
        </h4>
        <label className="block">
          <span className="text-[11px] text-slate-400 block mb-1">Name (optional)</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Dr. Jane Doe" />
        </label>
        <label className="block">
          <span className="text-[11px] text-slate-400 block mb-1">Faculty email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder={`name@${inst.emailDomain}`} />
        </label>
        {error && (
          <p role="alert" className="flex items-start gap-2 text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" /> {error}
          </p>
        )}
        {notice && <p role="status" className="text-[11px] text-emerald-400">{notice}</p>}
        <button type="submit" className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold">
          Send Invitation
        </button>
        <p className="text-[10px] text-slate-500">Demo mode: no email is sent. The invite is recorded on the roster.</p>
      </form>

      <div className={`${card} lg:col-span-8 space-y-3`}>
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Presentation className="w-4 h-4 text-indigo-500" /> Faculty & Course Assignments
          </h4>
          <span className="text-[10px] text-slate-400">{faculty.length} active • {invites.length} invited</span>
        </div>

        {rows.length === 0 && <p className="text-xs text-slate-400 py-8 text-center">No faculty yet. Invite your first instructor.</p>}
        {rows.length > 0 && courses.length === 0 && (
          <p className="text-[11px] text-amber-400">Add courses in the Course Catalog tab to assign faculty.</p>
        )}

        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.key} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center gap-3">
                <Avatar name={r.name} src={r.avatarUrl} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{r.name}</p>
                  <p className="text-[10px] text-slate-500 truncate">{r.email}</p>
                </div>
                {r.status === 'invited' ? (
                  <>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30 flex items-center gap-1">
                      <Mail className="w-3 h-3" /> Invited
                    </span>
                    <button onClick={() => revokeInvitation(r.inviteId)} aria-label={`Revoke invitation for ${r.email}`} title="Revoke invitation" className="p-1 rounded text-slate-400 hover:text-rose-400">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                      r.verified ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    }`}
                  >
                    {r.verified ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />} Active
                  </span>
                )}
              </div>

              {courses.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pl-11">
                  <span className="text-[10px] text-slate-500 mr-1">Teaches:</span>
                  {courses.map((c) => {
                    const on = c.facultyEmails.includes(r.email);
                    return (
                      <button
                        key={c.id}
                        aria-pressed={on}
                        title={`${on ? 'Unassign from' : 'Assign to'} ${c.code} — ${c.title}`}
                        onClick={() => toggleAssignment(c.id, r.email)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition ${
                          on ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-300 dark:border-slate-700 text-slate-500 hover:border-indigo-400'
                        }`}
                      >
                        {c.code}
                      </button>
                    );
                  })}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
