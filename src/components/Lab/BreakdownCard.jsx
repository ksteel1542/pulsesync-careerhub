import React, { useState } from 'react';
import { Cpu, Trash2, Box, Image as ImageIcon, Sigma, GitBranch } from 'lucide-react';
import { LAB_CATEGORIES } from '../../data/labBreakdowns';
import Avatar from '../common/Avatar';
import Markdown, { CodeBlock } from './Markdown';
import { EquationBlock } from './Equation';
import SpecSheet from './SpecSheet';
import BlueprintViewer from './BlueprintViewer';
import { FormulaSim, LogicFlowSim } from './Simulations';

export default function BreakdownCard({ post, canDelete, onDelete }) {
  const [simOn, setSimOn] = useState(false);
  const category = LAB_CATEGORIES.find((c) => c.id === post.category);
  const hasSim = !!(post.media || post.formula || post.steps?.length);
  const simId = `sim-${post.id}`;

  // What the toggle will reveal, so readers know before opening it
  const simParts = [
    post.media?.kind === '3d' && { icon: Box, label: '3D model' },
    post.media?.kind === 'image' && { icon: ImageIcon, label: 'Blueprint' },
    post.formula && { icon: Sigma, label: 'Parameter sliders' },
    post.steps?.length && { icon: GitBranch, label: 'Logic walkthrough' },
  ].filter(Boolean);

  return (
    <article className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 min-w-0">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={post.author.name} src={post.author.avatarUrl} size="md" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{post.author.name}</p>
            <p className="text-[10px] text-slate-500 truncate">
              {post.author.affiliation && `${post.author.affiliation} • `}
              {new Date(post.publishedAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {category && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${category.cls}`} title={category.label}>
              {category.short}
            </span>
          )}
          {canDelete && (
            <button onClick={onDelete} aria-label={`Delete “${post.title}”`} title="Delete your breakdown" className="p-1 rounded text-slate-400 hover:text-rose-400">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </header>

      <div className="space-y-2">
        <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug">{post.title}</h3>
        {post.tags.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Tech stack and science tags">
            {post.tags.map((t) => (
              <li key={t} className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{t}</li>
            ))}
          </ul>
        )}
      </div>

      <Markdown text={post.body} />
      {post.equations?.length > 0 && <EquationBlock equations={post.equations} />}
      {post.specs?.length > 0 && <SpecSheet specs={post.specs} />}
      {post.code?.content && <CodeBlock language={post.code.language} content={post.code.content} />}

      {hasSim && (
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              role="switch"
              aria-checked={simOn}
              aria-controls={simId}
              onClick={() => setSimOn((v) => !v)}
              className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300"
            >
              <span className={`relative inline-flex w-9 h-5 rounded-full transition ${simOn ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${simOn ? 'translate-x-4' : ''}`} />
              </span>
              <Cpu className="w-3.5 h-3.5 text-indigo-400" /> Interactive Simulation / Blueprint
            </button>
            <span className="flex flex-wrap gap-2 text-[10px] text-slate-500">
              {simParts.map(({ icon: Icon, label }) => (
                <span key={label} className="flex items-center gap-1"><Icon className="w-3 h-3" /> {label}</span>
              ))}
            </span>
          </div>
          {simOn && (
            <div id={simId} className="space-y-5 p-4 rounded-xl bg-slate-900 border border-slate-800">
              {post.media && <BlueprintViewer media={post.media} title={post.title} />}
              {post.steps?.length > 0 && <LogicFlowSim steps={post.steps} />}
              {post.formula && <FormulaSim formula={post.formula} />}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
