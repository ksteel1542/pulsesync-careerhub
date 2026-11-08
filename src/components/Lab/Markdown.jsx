import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import Equation from './Equation';

// Minimal, safe Markdown renderer: builds React elements (no HTML injection).
// Supports #/##/### headings, paragraphs, - / * bullets, 1. ordered lists,
// ``` fenced code blocks, $$display math$$, $inline math$ (KaTeX), `inline code`
// and **bold**. Links are intentionally
// not rendered, so posts can't carry javascript: URLs.

const BLOCK_START = /^(```|\$\$|#{1,3}\s|\s*[-*]\s+|\s*\d+\.\s+)/;
// $…$ with no space just inside the dollars, so prices like “$5 and $10” stay text
const INLINE = /(`[^`]+`|\*\*[^*]+\*\*|\$(?!\s)[^$\n]+?(?<!\s)\$)/g;

function parseBlocks(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('```')) {
      const language = line.slice(3).trim();
      const buf = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) buf.push(lines[i++]);
      i++; // closing fence (or end of text)
      blocks.push({ type: 'code', language, content: buf.join('\n') });
      continue;
    }
    if (line.trim().startsWith('$$')) {
      const one = /^\s*\$\$(.+)\$\$\s*$/.exec(line); // $$ … $$ on one line
      if (one) {
        blocks.push({ type: 'math', tex: one[1] });
        i++;
        continue;
      }
      const buf = [line.trim().slice(2)];
      i++;
      while (i < lines.length && !lines[i].includes('$$')) buf.push(lines[i++]);
      if (i < lines.length) buf.push(lines[i++].split('$$')[0]);
      blocks.push({ type: 'math', tex: buf.join('\n').trim() });
      continue;
    }
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      blocks.push({ type: 'h', level: h[1].length, text: h[2] });
      i++;
      continue;
    }
    const listType = /^\s*[-*]\s+/.test(line) ? 'ul' : /^\s*\d+\.\s+/.test(line) ? 'ol' : null;
    if (listType) {
      const re = listType === 'ul' ? /^\s*[-*]\s+/ : /^\s*\d+\.\s+/;
      const items = [];
      while (i < lines.length && re.test(lines[i])) items.push(lines[i++].replace(re, ''));
      blocks.push({ type: listType, items });
      continue;
    }
    if (!line.trim()) {
      i++;
      continue;
    }
    const buf = [];
    while (i < lines.length && lines[i].trim() && !BLOCK_START.test(lines[i])) buf.push(lines[i++]);
    blocks.push({ type: 'p', text: buf.join(' ') });
  }
  return blocks;
}

function Inline({ text }) {
  const parts = text.split(INLINE).filter(Boolean);
  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code key={i} className="px-1 py-px rounded bg-slate-200 dark:bg-slate-800 text-[0.95em] font-mono text-pink-600 dark:text-pink-300">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.length > 2 && part.startsWith('$') && part.endsWith('$')) {
      return <Equation key={i} tex={part.slice(1, -1)} />;
    }
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={i} className="font-bold text-slate-900 dark:text-white">{part.slice(2, -2)}</strong>;
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

export default function Markdown({ text }) {
  return (
    <div className="space-y-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
      {parseBlocks(text).map((b, i) => {
        if (b.type === 'code') return <CodeBlock key={i} language={b.language} content={b.content} />;
        if (b.type === 'math') return <Equation key={i} tex={b.tex} display className="overflow-x-auto text-slate-900 dark:text-slate-100" />;
        if (b.type === 'h') {
          const cls = ['', 'text-sm', 'text-[13px]', 'text-xs'][b.level];
          return <p key={i} className={`${cls} font-bold text-slate-900 dark:text-white pt-1`}><Inline text={b.text} /></p>;
        }
        if (b.type === 'ul' || b.type === 'ol') {
          const List = b.type;
          return (
            <List key={i} className={`${b.type === 'ul' ? 'list-disc' : 'list-decimal'} pl-5 space-y-0.5`}>
              {b.items.map((it, j) => <li key={j}><Inline text={it} /></li>)}
            </List>
          );
        }
        return <p key={i}><Inline text={b.text} /></p>;
      })}
    </div>
  );
}

export function CodeBlock({ language, content }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable (e.g. insecure context) — ignore */
    }
  };
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-800 bg-slate-900">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{language || 'code'}</span>
        <button onClick={copy} className="text-[10px] font-bold text-slate-400 hover:text-white flex items-center gap-1" aria-label="Copy code">
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />} {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-[11px] leading-relaxed font-mono text-slate-200"><code>{content}</code></pre>
    </div>
  );
}
