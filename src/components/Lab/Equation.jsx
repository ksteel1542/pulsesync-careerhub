import React, { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

// KaTeX options for user-supplied LaTeX:
//  - trust: false   → \href, \url, \htmlClass etc. are disabled (no links/HTML injection)
//  - throwOnError: false → bad LaTeX renders as red source text instead of crashing
//  - maxSize / maxExpand → cap sizes and macro expansion so a post can't freeze the page
const OPTIONS = { throwOnError: false, trust: false, strict: 'ignore', maxSize: 20, maxExpand: 300, output: 'htmlAndMathml' };

function renderTex(tex, displayMode) {
  try {
    return katex.renderToString(tex, { ...OPTIONS, displayMode });
  } catch {
    return null;
  }
}

/**
 * Renders LaTeX with KaTeX. The HTML comes from KaTeX's renderer (which escapes
 * input and, with trust:false, emits no links or raw HTML) — never from user text directly.
 */
export default function Equation({ tex, display = false, className = '' }) {
  const html = useMemo(() => renderTex(tex, display), [tex, display]);
  if (html === null) return <code className={className}>{tex}</code>;
  const Tag = display ? 'div' : 'span';
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

/** Display-style equation panel used on breakdown cards. */
export function EquationBlock({ equations }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-2 divide-y divide-slate-200 dark:divide-slate-800">
      {equations.map((tex, i) => (
        <Equation key={i} tex={tex} display className="py-1 overflow-x-auto text-slate-900 dark:text-slate-100" />
      ))}
    </div>
  );
}
