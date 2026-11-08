import React, { useState } from 'react';
import { GraduationCap, Search, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useClassroomStore } from '../../state/classroomContext';
import Avatar from '../common/Avatar';

export default function StudentRoster({ inst, students }) {
  const { attempts } = useClassroomStore();
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const rows = students
    .filter((s) => !q || s.name.toLowerCase().includes(q) || s.email.includes(q))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-indigo-500" /> Registered Distance-Learning Students
        </h4>
        <label className="relative">
          <span className="sr-only">Search students</span>
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or email"
            className="w-56 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </label>
      </div>

      {students.length === 0 ? (
        <p className="text-xs text-slate-400 py-8 text-center">
          No students registered yet. Students join by signing up with {inst.name} selected
          {inst.status !== 'verified' && ' (available once your institution is verified)'}.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[10px] uppercase text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <th className="py-2 pr-3 font-bold">Student</th>
                <th className="py-2 pr-3 font-bold">Enrollment</th>
                <th className="py-2 pr-3 font-bold">Registered</th>
                <th className="py-2 font-bold text-right">Quiz attempts</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const verified = s.email.endsWith(`@${inst.emailDomain}`);
                const mine = attempts.filter((a) => a.email === s.email);
                const avg = mine.length ? Math.round(mine.reduce((sum, a) => sum + a.percentage, 0) / mine.length) : null;
                return (
                  <tr key={s.email} className="border-b border-slate-100 dark:border-slate-800/60">
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={s.name} src={s.avatarUrl} size="sm" />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 dark:text-white truncate">{s.name}</p>
                          <p className="text-[10px] text-slate-500 truncate">{s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 pr-3">
                      {verified ? (
                        <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Verified</span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> Unverified email</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-slate-500">{new Date(s.createdAt).toLocaleDateString()}</td>
                    <td className="py-2.5 text-right text-slate-500">{mine.length ? `${mine.length} • avg ${avg}%` : '—'}</td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-400">No students match “{query}”.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
