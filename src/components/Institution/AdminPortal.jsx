import React, { useState } from 'react';
import { Landmark, BookMarked, Presentation, GraduationCap, LogOut, Clock, ShieldCheck, BadgeCheck, Globe, Mail } from 'lucide-react';
import { useClassroomStore } from '../../state/classroomContext';
import CourseCatalogManager from './CourseCatalogManager';
import FacultyRoster from './FacultyRoster';
import StudentRoster from './StudentRoster';

const TABS = [
  { id: 'courses', label: 'Course Catalog', icon: BookMarked },
  { id: 'faculty', label: 'Faculty Roster', icon: Presentation },
  { id: 'students', label: 'Student Roster', icon: GraduationCap },
];

export default function AdminPortal() {
  const { currentUser, institutions, courses, users, invitations, approveInstitution, signOut } = useClassroomStore();
  const [tab, setTab] = useState('courses');

  const inst = institutions.find((i) => i.id === currentUser.institutionId);
  const instCourses = courses.filter((c) => c.institutionId === inst.id).sort((a, b) => a.code.localeCompare(b.code));
  const faculty = users.filter((u) => u.role === 'instructor' && u.institutionId === inst.id);
  const invites = invitations.filter((i) => i.institutionId === inst.id);
  const students = users.filter((u) => u.role === 'student' && u.institutionId === inst.id);
  const counts = { courses: instCourses.length, faculty: faculty.length + invites.length, students: students.length };
  const pending = inst.status !== 'verified';

  return (
    <div className="space-y-6">
      {/* INSTITUTION HEADER */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shrink-0">
            <Landmark className="w-6 h-6 text-white" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-extrabold text-lg text-slate-900 dark:text-white">{inst.name}</h2>
              {pending ? (
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-400 border-amber-500/30 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Pending Verification
                </span>
              ) : (
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Verified
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 flex flex-wrap gap-x-3 gap-y-1">
              <span className="flex items-center gap-1"><BadgeCheck className="w-3 h-3" /> {inst.accreditationId}</span>
              <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {inst.country}</span>
              <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {inst.contactEmail}</span>
              <span>Faculty & students verify with <strong className="text-slate-300">@{inst.emailDomain}</strong></span>
            </p>
          </div>
        </div>
        <button onClick={signOut} className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>

      {pending && (
        <div role="status" className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-amber-300 max-w-2xl">
            <strong>Pending verification.</strong> You can prepare your catalog and invite faculty now, but your institution won’t appear at
            sign-up and your courses won’t be visible to students until it’s approved.
          </p>
          {import.meta.env.DEV && (
            <button
              onClick={() => approveInstitution(inst.id)}
              className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-amber-500 text-slate-950 hover:bg-amber-400"
            >
              Approve now (dev only)
            </button>
          )}
        </div>
      )}

      {/* TABS */}
      <div role="tablist" aria-label="Administration" className="flex gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 w-fit max-w-full overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition ${
              tab === id ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Icon className="w-3.5 h-3.5" /> {label}
            <span className={`text-[10px] px-1.5 rounded-full ${tab === id ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-800'}`}>{counts[id]}</span>
          </button>
        ))}
      </div>

      {tab === 'courses' && <CourseCatalogManager inst={inst} courses={instCourses} />}
      {tab === 'faculty' && <FacultyRoster inst={inst} courses={instCourses} faculty={faculty} invites={invites} />}
      {tab === 'students' && <StudentRoster inst={inst} students={students} />}
    </div>
  );
}
