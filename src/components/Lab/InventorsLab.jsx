import React, { useCallback, useState } from 'react';
import { FlaskConical, Plus, Search } from 'lucide-react';
import { LAB_CATEGORIES } from '../../data/labBreakdowns';
import { useClassroomStore } from '../../state/classroomContext';
import { planLimitsFor } from '../../config/pricing';
import BreakdownCard from './BreakdownCard';
import PublishBreakdownModal from './PublishBreakdownModal';

export default function InventorsLab() {
  const { breakdowns, addBreakdown, removeBreakdown, currentUser, subscription, openPricing } = useClassroomStore();
  const limits = planLimitsFor(subscription.tier);
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [notice, setNotice] = useState('');
  const closeModal = useCallback(() => setPublishing(false), []);

  const q = query.trim().toLowerCase();
  const visible = breakdowns
    .filter((b) => category === 'all' || b.category === category)
    .filter(
      (b) =>
        !q ||
        b.title.toLowerCase().includes(q) ||
        b.tags.some((t) => t.toLowerCase().includes(q)) ||
        b.author.name.toLowerCase().includes(q) ||
        b.specs?.some((sp) => sp.field.toLowerCase().includes(q) || sp.value.toLowerCase().includes(q))
    )
    // Priority placement: posts by Pro/Enterprise authors first, then newest
    .sort((a, b) => Number(!!b.priority) - Number(!!a.priority) || b.publishedAt.localeCompare(a.publishedAt));

  // Own posts: matching account email, or guest posts while signed out (same browser session)
  const canDelete = (b) => (currentUser ? b.authorEmail === currentUser.email : b.authorEmail === null && b.guest === true);
  // Lab storage used by the current author (uploaded files only; links don't count)
  const storage = {
    usedBytes: breakdowns.filter(canDelete).reduce((sum, b) => sum + (b.media?.bytes ?? 0), 0),
    limitBytes: limits.labStorageBytes,
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-indigo-500" /> Inventor’s Lab
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Engineering breakdowns across aero, automotive, robotics, electronics, physics and software, with equations, spec sheets, 3D models and live simulations.</p>
          </div>
          <button
            onClick={() => {
              setNotice('');
              setPublishing(true);
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-500/20"
          >
            <Plus className="w-3.5 h-3.5" /> Publish Breakdown
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-1.5">
            {[{ id: 'all', label: 'All' }, ...LAB_CATEGORIES].map((c) => (
              <button
                key={c.id}
                aria-pressed={category === c.id}
                onClick={() => setCategory(c.id)}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition ${
                  category === c.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-200'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <label className="relative">
            <span className="sr-only">Search breakdowns</span>
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title, tag, author or spec"
              className="w-60 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </label>
        </div>
        {notice && <p role="status" className="text-[11px] text-emerald-400">{notice}</p>}
      </div>

      {visible.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-10">No breakdowns match these filters.</p>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
          {visible.map((b) => (
            <BreakdownCard key={b.id} post={b} canDelete={canDelete(b)} onDelete={() => removeBreakdown(b.id)} />
          ))}
        </div>
      )}

      {publishing && (
        <PublishBreakdownModal
          currentUser={currentUser}
          onClose={closeModal}
          storage={storage}
          onSeePlans={() => openPricing('storage')}
          onPublish={(post) => {
            addBreakdown({ ...post, guest: !currentUser, authorTier: subscription.tier, priority: limits.labPriority });
            setPublishing(false);
            setCategory('all');
            setQuery('');
            setNotice(`Published “${post.title}”.`);
          }}
        />
      )}
    </div>
  );
}
