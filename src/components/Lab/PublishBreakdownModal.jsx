import React, { useEffect, useRef, useState } from 'react';
import { X, AlertCircle, Eye, Pencil, FlaskConical, Plus, Trash2, Upload } from 'lucide-react';
import { LAB_CATEGORIES, CODE_LANGUAGES, SPEC_SUGGESTIONS } from '../../data/labBreakdowns';
import { EquationBlock } from './Equation';
import { formatBytes } from '../../config/pricing';
import { PRESET_AVATARS } from '../../data/avatars';
import { compileFormula, parseVariableSpecs, FORMULA_FUNCTIONS } from '../../lib/formula';
import Avatar from '../common/Avatar';
import Markdown from './Markdown';

const inputCls =
  'w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500';
const labelCls = 'text-[11px] text-slate-400 block mb-1';

const MAX_TAGS = 8;
const MAX_SPECS = 16;
const MAX_EQUATIONS = 6;
const MAX_MEDIA_BYTES = 25 * 1024 * 1024;
const MEDIA_TYPES = { glb: '3d', gltf: '3d', png: 'image', jpg: 'image', jpeg: 'image', webp: 'image', svg: 'image' };
const MEDIA_ACCEPT = Object.keys(MEDIA_TYPES).map((e) => `.${e}`).join(',');
const extOf = (name) => (name.split('?')[0].split('#')[0].match(/\.([a-z0-9]+)$/i)?.[1] || '').toLowerCase();

let rowSeq = 0;
const specRow = (field = '') => ({ id: ++rowSeq, field, value: '', unit: '' });

function buildSpecs(rows) {
  const filled = rows.filter((r) => r.field.trim() || r.value.trim() || r.unit.trim());
  if (filled.length > MAX_SPECS) throw new Error(`Spec sheet: at most ${MAX_SPECS} rows.`);
  return filled.map((r, i) => {
    const field = r.field.trim();
    const value = r.value.trim();
    if (!field || !value) throw new Error(`Spec sheet row ${i + 1}: both Field Name and Value are required.`);
    if (field.length > 40 || value.length > 60 || r.unit.trim().length > 16) {
      throw new Error(`Spec sheet row ${i + 1}: keep field ≤ 40, value ≤ 60 and unit ≤ 16 characters.`);
    }
    return { field, value, unit: r.unit.trim() };
  });
}

function buildMedia(f, storage) {
  const caption = f.mediaCaption.trim().slice(0, 140);
  if (f.mediaFile) {
    const kind = MEDIA_TYPES[extOf(f.mediaFile.name)];
    if (!kind) throw new Error('Attachment must be .glb / .gltf (3D) or .png / .jpg / .webp / .svg (blueprint).');
    if (f.mediaFile.size > MAX_MEDIA_BYTES) throw new Error('Attachment must be 25 MB or smaller.');
    if (storage && storage.usedBytes + f.mediaFile.size > storage.limitBytes) {
      const err = new Error(
        `Not enough Lab storage: this file is ${formatBytes(f.mediaFile.size)} and you have ${formatBytes(Math.max(0, storage.limitBytes - storage.usedBytes))} left of ${formatBytes(storage.limitBytes)}.`
      );
      err.code = 'quota';
      throw err;
    }
    // Mock upload: browser-local blob URL until a storage API exists
    return { kind, src: URL.createObjectURL(f.mediaFile), caption: caption || f.mediaFile.name, local: true, bytes: f.mediaFile.size };
  }
  const url = f.mediaUrl.trim();
  if (!url) return null;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Attachment link must be a full https:// URL.');
  }
  if (parsed.protocol !== 'https:') throw new Error('Attachment link must use https://');
  const kind = MEDIA_TYPES[extOf(parsed.pathname)];
  if (!kind) throw new Error('Attachment link must end in .glb, .gltf, .png, .jpg, .webp or .svg.');
  return { kind, src: parsed.href, caption };
}

/** Turns the form into a breakdown object, or throws a readable Error. */
function buildPost(f, currentUser, storage) {
  const title = f.title.trim();
  if (title.length < 5 || title.length > 120) throw new Error('Project title must be 5–120 characters.');
  if (!LAB_CATEGORIES.some((c) => c.id === f.category)) throw new Error('Choose a category.');
  const tags = [...new Set(f.tags.split(',').map((t) => t.trim()).filter(Boolean))];
  if (tags.length > MAX_TAGS) throw new Error(`Use at most ${MAX_TAGS} tags.`);
  if (tags.some((t) => t.length > 24)) throw new Error('Each tag must be 24 characters or fewer.');
  if (f.body.trim().length < 20) throw new Error('Write-up must be at least 20 characters.');

  const equations = f.equations.split('\n').map((l) => l.trim()).filter(Boolean);
  if (equations.length > MAX_EQUATIONS) throw new Error(`Use at most ${MAX_EQUATIONS} equations.`);
  if (equations.some((e) => e.length > 500)) throw new Error('Each equation must be 500 characters or fewer.');
  const specs = buildSpecs(f.specs);

  let formula = null;
  if (f.formula.trim()) {
    let compiled;
    try {
      compiled = compileFormula(f.formula);
    } catch (err) {
      throw new Error(`Formula: ${err.message}`);
    }
    let vars;
    try {
      vars = parseVariableSpecs(f.variables);
    } catch (err) {
      throw new Error(`Variables: ${err.message}`);
    }
    const unknown = Object.keys(vars).filter((v) => !compiled.variables.includes(v));
    if (unknown.length) throw new Error(`Variables not used in the formula: ${unknown.join(', ')}`);
    formula = { source: f.formula.trim(), outputUnit: f.outputUnit.trim(), vars: { ...vars } };
  } else if (f.variables.trim()) {
    throw new Error('Variables were given but the formula is empty.');
  }

  const steps = f.steps
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const idx = l.indexOf(':');
      return idx > 0 ? { label: l.slice(0, idx).trim(), detail: l.slice(idx + 1).trim() } : { label: l, detail: '' };
    });
  if (steps.length === 1) throw new Error('A logic walkthrough needs at least 2 steps.');

  let author;
  if (currentUser) {
    author = { name: currentUser.name, avatarUrl: currentUser.avatarUrl, affiliation: currentUser.institution };
  } else {
    if (!f.authorName.trim()) throw new Error('Enter a display name, or sign in via Virtual Classroom.');
    author = { name: f.authorName.trim(), avatarUrl: PRESET_AVATARS.find((a) => a.id === f.avatarId)?.url ?? null, affiliation: 'Guest' };
  }

  return {
    title,
    category: f.category,
    tags,
    author,
    authorEmail: currentUser?.email ?? null,
    body: f.body.trim(),
    equations,
    specs,
    code: f.code.trim() ? { language: f.language, content: f.code.replace(/\s+$/, '') } : null,
    formula,
    steps: steps.length ? steps : null,
    media: buildMedia(f, storage), // last: may create a blob URL, so only after everything else validated
  };
}

export default function PublishBreakdownModal({ currentUser, onClose, onPublish, storage, onSeePlans }) {
  const [f, setF] = useState({
    title: '', category: 'aero', tags: '', body: '', code: '', language: 'python',
    formula: '', variables: '', outputUnit: '', steps: '', authorName: '', avatarId: PRESET_AVATARS[2].id,
    equations: '', specs: [specRow()], mediaFile: null, mediaUrl: '', mediaCaption: '',
  });
  const fileInput = useRef(null);
  const updateSpec = (id, key, value) => setF((s) => ({ ...s, specs: s.specs.map((r) => (r.id === id ? { ...r, [key]: value } : r)) }));
  const addSpec = (field = '') =>
    setF((s) => {
      // Fill the first empty row if there is one, otherwise append
      const empty = s.specs.find((r) => !r.field && !r.value && !r.unit);
      if (empty) return { ...s, specs: s.specs.map((r) => (r === empty ? { ...r, field } : r)) };
      return s.specs.length >= MAX_SPECS ? s : { ...s, specs: [...s.specs, specRow(field)] };
    });
  const removeSpec = (id) => setF((s) => ({ ...s, specs: s.specs.length > 1 ? s.specs.filter((r) => r.id !== id) : [specRow()] }));
  const equationLines = f.equations.split('\n').map((l) => l.trim()).filter(Boolean);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState(null);
  const firstField = useRef(null);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  useEffect(() => {
    firstField.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = (e) => {
    e.preventDefault();
    try {
      onPublish(buildPost(f, currentUser, storage));
    } catch (err) {
      setError(err.message);
      setErrorCode(err.code ?? null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <form
        onSubmit={submit}
        noValidate
        role="dialog"
        aria-modal="true"
        aria-labelledby="publish-title"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl my-8"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 id="publish-title" className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-indigo-500" /> Publish Breakdown
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-200"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="block sm:col-span-2">
              <span className={labelCls}>Project title</span>
              <input ref={firstField} value={f.title} onChange={set('title')} className={inputCls} placeholder="e.g. Reverse-engineering a BLE heart-rate strap" maxLength={120} />
            </label>
            <label className="block">
              <span className={labelCls}>Category</span>
              <select value={f.category} onChange={set('category')} className={inputCls}>
                {LAB_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </label>
          </div>

          <label className="block">
            <span className={labelCls}>Tech stack / science tags (comma separated, max {MAX_TAGS})</span>
            <input value={f.tags} onChange={set('tags')} className={inputCls} placeholder="Python, WebSockets, IoT" />
          </label>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-slate-400">Write-up (Markdown: #, -, 1., **bold**, `code`, ``` blocks)</span>
              <button type="button" onClick={() => setPreview((p) => !p)} className="text-[10px] font-bold text-indigo-400 flex items-center gap-1">
                {preview ? <Pencil className="w-3 h-3" /> : <Eye className="w-3 h-3" />} {preview ? 'Edit' : 'Preview'}
              </button>
            </div>
            {preview ? (
              <div className="min-h-[8rem] p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                {f.body.trim() ? <Markdown text={f.body} /> : <p className="text-xs text-slate-500">Nothing to preview yet.</p>}
              </div>
            ) : (
              <textarea
                rows={6}
                value={f.body}
                onChange={set('body')}
                className={`${inputCls} font-mono resize-y`}
                placeholder={'## Architecture\n- Sensor → MQTT broker → stream processor\n- Why we chose **at-least-once** delivery'}
                aria-label="Write-up"
              />
            )}
          </div>

          <fieldset className="space-y-2">
            <legend className="text-[11px] font-bold text-slate-300 mb-1">Formula / physics block (optional, LaTeX, one equation per line)</legend>
            <textarea
              rows={2}
              value={f.equations}
              onChange={set('equations')}
              className={`${inputCls} font-mono resize-y`}
              placeholder={'F_d = \\tfrac{1}{2} \\rho v^2 C_D A\nRe = \\dfrac{\\rho v c}{\\mu}'}
              aria-label="Equations in LaTeX"
              spellCheck={false}
            />
            {equationLines.length > 0 && <EquationBlock equations={equationLines.slice(0, MAX_EQUATIONS)} />}
            <p className="text-[10px] text-slate-500">You can also write inline math as $…$ or a display equation as $$…$$ in the write-up.</p>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-[11px] font-bold text-slate-300 mb-1">Spec sheet (optional)</legend>
            <div className="flex flex-wrap gap-1">
              {SPEC_SUGGESTIONS.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => addSpec(sug)}
                  className="text-[10px] px-2 py-0.5 rounded-md border border-slate-300 dark:border-slate-700 text-slate-500 hover:border-indigo-400 hover:text-indigo-400"
                >
                  + {sug}
                </button>
              ))}
            </div>
            <div className="space-y-1.5">
              <div className="grid grid-cols-[1fr_1fr_5rem_1.75rem] gap-1.5 text-[10px] text-slate-500 px-0.5">
                <span>Field Name</span><span>Value</span><span>Unit</span><span />
              </div>
              {f.specs.map((r, i) => (
                <div key={r.id} className="grid grid-cols-[1fr_1fr_5rem_1.75rem] gap-1.5">
                  <input value={r.field} onChange={(e) => updateSpec(r.id, 'field', e.target.value)} className={inputCls} placeholder="Max RPM" aria-label={`Spec ${i + 1} field name`} maxLength={40} />
                  <input value={r.value} onChange={(e) => updateSpec(r.id, 'value', e.target.value)} className={inputCls} placeholder="7,200" aria-label={`Spec ${i + 1} value`} maxLength={60} />
                  <input value={r.unit} onChange={(e) => updateSpec(r.id, 'unit', e.target.value)} className={inputCls} placeholder="rpm" aria-label={`Spec ${i + 1} unit`} maxLength={16} />
                  <button type="button" onClick={() => removeSpec(r.id)} aria-label={`Remove spec row ${i + 1}`} className="text-slate-400 hover:text-rose-400 flex items-center justify-center">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => addSpec()}
              disabled={f.specs.length >= MAX_SPECS}
              className="text-[11px] font-bold text-indigo-400 flex items-center gap-1 disabled:opacity-40"
            >
              <Plus className="w-3 h-3" /> Add spec row
            </button>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-[11px] font-bold text-slate-300 mb-1">Code snippet (optional)</legend>
            <select value={f.language} onChange={set('language')} className={`${inputCls} w-40`} aria-label="Code language">
              {CODE_LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            <textarea rows={5} value={f.code} onChange={set('code')} className={`${inputCls} font-mono resize-y`} placeholder="// paste the key snippet" aria-label="Code snippet" spellCheck={false} />
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-[11px] font-bold text-slate-300 mb-1">Formula simulation (optional)</legend>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <input value={f.formula} onChange={set('formula')} className={`${inputCls} font-mono sm:col-span-3`} placeholder="R = v^2 * sin(2 * theta * pi / 180) / g" aria-label="Formula" spellCheck={false} />
              <input value={f.outputUnit} onChange={set('outputUnit')} className={inputCls} placeholder="Result unit (m)" aria-label="Result unit" />
            </div>
            <textarea
              rows={3}
              value={f.variables}
              onChange={set('variables')}
              className={`${inputCls} font-mono resize-y`}
              placeholder={'v = 20 [0, 100] m/s\ntheta = 45 [0, 90] °\ng = 9.81'}
              aria-label="Variables"
              spellCheck={false}
            />
            <p className="text-[10px] text-slate-500">
              One variable per line: <code className="font-mono">name = default [min, max] unit</code>. A range adds a slider. Operators + − * / ^,
              constants pi and e, functions: {FORMULA_FUNCTIONS.join(', ')}. Formulas are parsed, never executed as code.
            </p>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-[11px] font-bold text-slate-300 mb-1">3D model / blueprint (optional)</legend>
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInput}
                type="file"
                accept={MEDIA_ACCEPT}
                className="hidden"
                onChange={(e) => setF((s) => ({ ...s, mediaFile: e.target.files?.[0] ?? null, mediaUrl: '' }))}
              />
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="px-3 py-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-[11px] font-bold text-slate-500 hover:border-indigo-400 hover:text-indigo-400 flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" /> {f.mediaFile ? f.mediaFile.name : 'Upload .glb / .gltf / image'}
              </button>
              {f.mediaFile && (
                <button
                  type="button"
                  onClick={() => {
                    setF((s) => ({ ...s, mediaFile: null }));
                    if (fileInput.current) fileInput.current.value = '';
                  }}
                  className="text-[10px] text-slate-400 hover:text-rose-400"
                >
                  Remove
                </button>
              )}
              <span className="text-[10px] text-slate-500">or</span>
              <input
                value={f.mediaUrl}
                onChange={set('mediaUrl')}
                disabled={!!f.mediaFile}
                className={`${inputCls} flex-1 min-w-[12rem] disabled:opacity-40`}
                placeholder="https://…/wing.glb"
                aria-label="Attachment link"
              />
            </div>
            <input value={f.mediaCaption} onChange={set('mediaCaption')} className={inputCls} placeholder="Caption (optional)" aria-label="Attachment caption" maxLength={140} />
            <p className="text-[10px] text-slate-500">
              3D models: .glb is best (a .gltf must embed its buffers). Up to 25 MB per file. Linked files must allow cross-origin loading.
              {storage && ` Lab storage: ${formatBytes(storage.usedBytes)} of ${formatBytes(storage.limitBytes)} used.`}
            </p>
          </fieldset>

          <label className="block">
            <span className="text-[11px] font-bold text-slate-300 block mb-1">Logic walkthrough steps (optional, one per line: “Label: detail”)</span>
            <textarea
              rows={3}
              value={f.steps}
              onChange={set('steps')}
              className={`${inputCls} resize-y`}
              placeholder={'Sensor read: ADC samples the probe every 10 min\nPublish: MQTT QoS 1 to broker\nAlert: stream job flags readings below threshold'}
            />
          </label>

          {currentUser ? (
            <p className="flex items-center gap-2 text-[11px] text-slate-400">
              Publishing as <Avatar name={currentUser.name} src={currentUser.avatarUrl} size="xs" /> <strong className="text-slate-200">{currentUser.name}</strong>
            </p>
          ) : (
            <fieldset className="space-y-2">
              <legend className="text-[11px] font-bold text-slate-300 mb-1">Author (you’re not signed in)</legend>
              <input value={f.authorName} onChange={set('authorName')} className={inputCls} placeholder="Display name" aria-label="Display name" />
              <div role="radiogroup" aria-label="Avatar" className="flex gap-1.5">
                {PRESET_AVATARS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    role="radio"
                    aria-checked={f.avatarId === a.id}
                    aria-label={a.label}
                    onClick={() => setF((s) => ({ ...s, avatarId: a.id }))}
                    className={`w-7 h-7 rounded-full p-0.5 ${f.avatarId === a.id ? 'ring-2 ring-indigo-500' : 'opacity-60 hover:opacity-100'}`}
                  >
                    <img src={a.url} alt="" className="w-full h-full rounded-full" />
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {error && (
            <p role="alert" className="flex items-start gap-2 text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
              <span className="flex-1">{error}</span>
              {errorCode === 'quota' && onSeePlans && (
                <button type="button" onClick={onSeePlans} className="shrink-0 font-bold text-indigo-300 hover:text-white underline">
                  See plans
                </button>
              )}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-200 dark:border-slate-800">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-400">Cancel</button>
          <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold">Publish Breakdown</button>
        </div>
      </form>
    </div>
  );
}
