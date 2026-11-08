import React, { useState } from 'react';
import { BookMarked, Plus, Pencil, Trash2, AlertCircle, Radio, Users, Globe2, X } from 'lucide-react';
import { useClassroomStore } from '../../state/classroomContext';
import { sessionForCourse } from '../../data/lectures';

const inputCls =
  'w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500';
const card = 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5';

const EMPTY = { code: '', title: '', department: '', creditHours: 3, openToIndependent: false };

export default function CourseCatalogManager({ inst, courses }) {
  const { saveCourse, removeCourse, users, materials, quizzes } = useClassroomStore();
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmId, setConfirmId] = useState(null);

  const departments = [...new Set(courses.map((c) => c.department))];
  const nameOf = (email) => users.find((u) => u.email === email)?.name ?? email;
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const startEdit = (c) => {
    setEditingId(c.id);
    setForm({ code: c.code, title: c.title, department: c.department, creditHours: c.creditHours, openToIndependent: c.openToIndependent });
    setError('');
    setNotice('');
  };
  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY);
    setError('');
  };

  const submit = (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    try {
      const code = saveCourse(inst.id, form, editingId);
      setNotice(editingId ? `${code} updated.` : `${code} added to the catalog.`);
      setEditingId(null);
      setForm(EMPTY);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <form onSubmit={submit} noValidate className={`${card} lg:col-span-4 space-y-3 h-fit`}>
        <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
          {editingId ? <Pencil className="w-4 h-4 text-indigo-500" /> : <Plus className="w-4 h-4 text-indigo-500" />}
          {editingId ? 'Edit Course' : 'Add Official Course'}
        </h4>
        <div className="grid grid-cols-3 gap-2">
          <label className="block col-span-2">
            <span className="text-[11px] text-slate-400 block mb-1">Course code</span>
            <input value={form.code} onChange={set('code')} className={`${inputCls} uppercase`} placeholder="CS 210" />
          </label>
          <label className="block">
            <span className="text-[11px] text-slate-400 block mb-1">Credit hours</span>
            <input type="number" min={1} max={12} value={form.creditHours} onChange={set('creditHours')} className={inputCls} />
          </label>
        </div>
        <label className="block">
          <span className="text-[11px] text-slate-400 block mb-1">Course title</span>
          <input value={form.title} onChange={set('title')} className={inputCls} placeholder="Intro to Software Architecture" />
        </label>
        <label className="block">
          <span className="text-[11px] text-slate-400 block mb-1">Department</span>
          <input list="dept-list" value={form.department} onChange={set('department')} className={inputCls} placeholder="Computer Science" />
          <datalist id="dept-list">{departments.map((d) => <option key={d} value={d} />)}</datalist>
        </label>
        <label className="flex items-center gap-2 text-[11px] text-slate-400">
          <input type="checkbox" checked={form.openToIndependent} onChange={set('openToIndependent')} className="accent-indigo-500" />
          Open to independent learners (guest access)
        </label>

        {error && (
          <p role="alert" className="flex items-start gap-2 text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" /> {error}
          </p>
        )}
        {notice && <p role="status" className="text-[11px] text-emerald-400">{notice}</p>}

        <div className="flex gap-2">
          <button type="submit" className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold">
            {editingId ? 'Save Changes' : 'Add Course'}
          </button>
          {editingId && (
            <button type="button" onClick={cancelEdit} className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 rounded-xl text-xs font-bold">
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className={`${card} lg:col-span-8 space-y-3`}>
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <BookMarked className="w-4 h-4 text-indigo-500" /> Official Course Catalog
          </h4>
          <span className="text-[10px] text-slate-400">{courses.length} {courses.length === 1 ? 'course' : 'courses'}</span>
        </div>

        {courses.length === 0 && (
          <p className="text-xs text-slate-400 py-8 text-center">No courses yet. Add your first course with the form.</p>
        )}

        <ul className="space-y-2">
          {courses.map((c) => {
            const session = sessionForCourse(c.id);
            const content = materials.filter((m) => m.courseId === c.id).length + quizzes.filter((q) => q.courseId === c.id).length;
            return (
              <li
                key={c.id}
                className={`p-3 rounded-xl border bg-slate-50 dark:bg-slate-950 ${editingId === c.id ? 'border-indigo-500' : 'border-slate-200 dark:border-slate-800'}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      <span className="text-indigo-400">{c.code}</span> — {c.title}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                      <span>{c.department}</span>
                      <span>{c.creditHours} credit {c.creditHours === 1 ? 'hour' : 'hours'}</span>
                      {c.openToIndependent && <span className="flex items-center gap-1 text-sky-400"><Globe2 className="w-3 h-3" /> Open to independents</span>}
                      {session && <span className="flex items-center gap-1 text-rose-400"><Radio className="w-3 h-3" /> Session {session.status}</span>}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {c.facultyEmails.length ? c.facultyEmails.map(nameOf).join(', ') : 'No faculty assigned'}
                    </p>
                  </div>

                  {confirmId === c.id ? (
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="text-rose-400">
                        Remove{content ? ` with ${content} materials/quizzes` : ''}?
                      </span>
                      <button
                        onClick={() => {
                          removeCourse(c.id);
                          setConfirmId(null);
                          if (editingId === c.id) cancelEdit();
                          setNotice(`${c.code} removed.`);
                        }}
                        className="px-2 py-1 rounded-lg bg-rose-600 text-white font-bold"
                      >
                        Remove
                      </button>
                      <button onClick={() => setConfirmId(null)} aria-label="Cancel remove" className="p-1 rounded-lg text-slate-400 hover:bg-slate-800">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button onClick={() => startEdit(c)} aria-label={`Edit ${c.code}`} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setConfirmId(c.id)} aria-label={`Remove ${c.code}`} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
