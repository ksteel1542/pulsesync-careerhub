import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, Link2, Download, ExternalLink, Trash2, BookOpen, X, AlertCircle } from 'lucide-react';
import { useClassroomStore } from '../../state/classroomContext';

const inputCls =
  'w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500';

const formatSize = (bytes) =>
  bytes < 1024 ? `${bytes} B` : bytes < 1024 ** 2 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 ** 2).toFixed(1)} MB`;

const isHttpUrl = (s) => {
  try {
    return ['http:', 'https:'].includes(new URL(s).protocol);
  } catch {
    return false;
  }
};

export default function StudyMaterials({ course, user, roomRole, hostableCourses }) {
  const { materials, removeMaterial } = useClassroomStore();
  const isInstructor = roomRole === 'instructor';
  const courseMaterials = materials
    .filter((m) => m.courseId === course.id)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  return (
    <div className={`grid grid-cols-1 gap-6 ${isInstructor ? 'lg:grid-cols-12' : ''}`}>
      {isInstructor && (
        <div className="lg:col-span-5">
          <UploadForm course={course} user={user} hostableCourses={hostableCourses} />
        </div>
      )}

      <div className={`${isInstructor ? 'lg:col-span-7' : ''} bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3`}>
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-500" /> {course.code} Study Materials
          </h4>
          <span className="text-[10px] text-slate-400">
            {courseMaterials.length} {courseMaterials.length === 1 ? 'item' : 'items'}
          </span>
        </div>

        {courseMaterials.length === 0 && (
          <p className="text-xs text-slate-400 py-6 text-center">
            {isInstructor ? 'Nothing published yet. Use the form to share your first document.' : 'Your instructor hasn’t published any materials for this course yet.'}
          </p>
        )}

        <ul className="space-y-2">
          {courseMaterials.map((m) => (
            <li key={m.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex gap-3 items-start">
              <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                {m.kind === 'link' ? <Link2 className="w-4 h-4 text-indigo-400" /> : <FileText className="w-4 h-4 text-indigo-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white">{m.title}</p>
                {m.description && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{m.description}</p>}
                <p className="text-[10px] text-slate-500 mt-1">
                  {m.kind === 'link' ? 'External link' : m.fileName}
                  {m.sizeLabel && ` • ${m.sizeLabel}`} • {m.publishedBy} • {new Date(m.publishedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <a
                  href={m.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  {...(m.kind === 'file' ? { download: m.fileName } : {})}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5"
                >
                  {m.kind === 'link' ? <ExternalLink className="w-3 h-3" /> : <Download className="w-3 h-3" />}
                  {m.kind === 'link' ? 'View Material' : 'Download'}
                </a>
                {isInstructor && (
                  <button
                    onClick={() => removeMaterial(m.id)}
                    aria-label={`Remove ${m.title}`}
                    title="Remove"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function UploadForm({ course, user, hostableCourses }) {
  const { addMaterial } = useClassroomStore();
  const fileInput = useRef(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');
  const [file, setFile] = useState(null);
  const [targetCourseId, setTargetCourseId] = useState(course.id);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const pickFile = (f) => {
    if (!f) return;
    setFile(f);
    setLink('');
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''));
  };

  const submit = (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    if (!title.trim()) return setError('Give the document a title.');
    if (!file && !link.trim()) return setError('Attach a file or paste a link.');
    if (!file && !isHttpUrl(link.trim())) return setError('Links must start with http:// or https://');

    addMaterial({
      courseId: targetCourseId,
      title: title.trim(),
      description: description.trim(),
      // Mock upload: the file is served from a browser-local blob URL until a storage API exists.
      url: file ? URL.createObjectURL(file) : link.trim(),
      fileName: file ? file.name : null,
      kind: file ? 'file' : 'link',
      sizeLabel: file ? formatSize(file.size) : null,
      publishedBy: user.name,
    });

    const target = hostableCourses.find((c) => c.id === targetCourseId);
    setNotice(`Published to ${target?.code ?? 'course'}.`);
    setTitle('');
    setDescription('');
    setLink('');
    setFile(null);
    if (fileInput.current) fileInput.current.value = '';
  };

  return (
    <form onSubmit={submit} noValidate className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
      <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
        <UploadCloud className="w-4 h-4 text-indigo-500" /> Publish Study Material
      </h4>

      <label className="block">
        <span className="text-[11px] text-slate-400 block mb-1">Target course</span>
        <select value={targetCourseId} onChange={(e) => setTargetCourseId(e.target.value)} className={inputCls}>
          {hostableCourses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code} — {c.title}{c.facultyEmails.includes(user.email) ? ' (assigned to you)' : ''}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-[11px] text-slate-400 block mb-1">Document title</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="e.g. Week 8 Slides" />
      </label>

      <label className="block">
        <span className="text-[11px] text-slate-400 block mb-1">Description</span>
        <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className={`${inputCls} resize-none`} placeholder="What should students do with this?" />
      </label>

      {/* Dropzone */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => fileInput.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && fileInput.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          pickFile(e.dataTransfer.files?.[0]);
        }}
        className={`rounded-xl border-2 border-dashed p-4 text-center cursor-pointer transition ${
          dragOver ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400'
        }`}
      >
        <input ref={fileInput} type="file" className="hidden" onChange={(e) => pickFile(e.target.files?.[0])} />
        {file ? (
          <div className="flex items-center justify-center gap-2 text-xs text-slate-700 dark:text-slate-200">
            <FileText className="w-4 h-4 text-indigo-400" /> {file.name} <span className="text-slate-500">({formatSize(file.size)})</span>
            <button
              type="button"
              aria-label="Remove file"
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
                if (fileInput.current) fileInput.current.value = '';
              }}
              className="text-slate-400 hover:text-rose-400"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <>
            <UploadCloud className="w-6 h-6 mx-auto text-slate-400" />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Drop a file here or click to browse</p>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 text-[10px] text-slate-500">
        <span className="flex-1 h-px bg-slate-200 dark:bg-slate-800" /> or link to a file <span className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
      </div>

      <label className="block">
        <span className="sr-only">File link / download URL</span>
        <input
          value={link}
          disabled={!!file}
          onChange={(e) => setLink(e.target.value)}
          className={`${inputCls} disabled:opacity-40`}
          placeholder="https://drive.example.edu/week8-slides.pdf"
        />
      </label>

      {error && (
        <p role="alert" className="flex items-center gap-2 text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
        </p>
      )}
      {notice && <p role="status" className="text-[11px] text-emerald-400">{notice}</p>}

      <button type="submit" className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold">
        Publish Material
      </button>
    </form>
  );
}
