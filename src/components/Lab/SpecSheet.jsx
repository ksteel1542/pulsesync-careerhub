import React from 'react';
import { ClipboardList } from 'lucide-react';

/** Compact engineering spec grid: Field / Value / Unit. */
export default function SpecSheet({ specs }) {
  return (
    <section aria-label="Spec sheet" className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      <h4 className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1.5">
        <ClipboardList className="w-3 h-3" /> Spec Sheet
      </h4>
      <dl className="grid grid-cols-2 sm:grid-cols-3">
        {specs.map((s, i) => (
          <div key={i} className="bg-white dark:bg-slate-950 px-3 py-2 min-w-0 outline outline-1 outline-slate-200 dark:outline-slate-800">
            <dt className="text-[10px] text-slate-500 truncate" title={s.field}>{s.field}</dt>
            <dd className="text-xs font-bold text-slate-900 dark:text-white tabular-nums break-words">
              {s.value}
              {s.unit && <span className="ml-1 text-[10px] font-semibold text-slate-500">{s.unit}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
