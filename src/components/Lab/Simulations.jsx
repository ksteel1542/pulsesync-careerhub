import React, { useEffect, useMemo, useState } from 'react';
import { Sigma, GitBranch, Play, Pause, SkipBack, SkipForward, RotateCcw, AlertCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceDot, ResponsiveContainer } from 'recharts';
import { compileFormula, evaluate } from '../../lib/formula';

// Chart tokens (dark simulation panel): one series → one hue, recessive grid/axes
const CHART = { line: '#818cf8', grid: '#1e293b', axis: '#64748b', surface: '#0f172a', cursor: '#475569' };
const SWEEP_SAMPLES = 60;

const fmt = (n) => {
  if (!Number.isFinite(n)) return null;
  const abs = Math.abs(n);
  if (abs !== 0 && (abs >= 1e6 || abs < 1e-3)) return n.toExponential(3);
  return Number(n.toFixed(abs >= 100 ? 1 : 4)).toLocaleString();
};

/** Live formula calculator: sliders for ranged variables, number inputs otherwise. */
export function FormulaSim({ formula }) {
  const compiled = useMemo(() => {
    try {
      return compileFormula(formula.source);
    } catch (err) {
      return { error: err.message };
    }
  }, [formula.source]);

  const [values, setValues] = useState(() =>
    Object.fromEntries((compiled.variables || []).map((v) => [v, formula.vars?.[v]?.value ?? 1]))
  );
  // Variables with a [min, max] range can be swept on the chart's x-axis
  // Ordered as the author listed them in `vars`, so their first variable is the default sweep
  const rangedVars = Object.keys(formula.vars || {}).filter(
    (v) => (compiled.variables || []).includes(v) && formula.vars[v].min !== undefined
  );
  const [sweepVar, setSweepVar] = useState(rangedVars[0] ?? null);

  if (compiled.error) {
    return <p className="text-[11px] text-rose-400 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> {compiled.error}</p>;
  }

  let result = null;
  let evalError = null;
  try {
    result = fmt(evaluate(compiled.ast, values));
  } catch (err) {
    evalError = err.message;
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
        <Sigma className="w-3.5 h-3.5 text-indigo-400" /> Formula calculator
      </p>
      <code className="block text-[11px] font-mono text-pink-300 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 overflow-x-auto">
        {compiled.output} = {compiled.expression}
      </code>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {compiled.variables.map((name) => {
          const spec = formula.vars?.[name] || {};
          const ranged = spec.min !== undefined && spec.max !== undefined;
          const step = spec.step ?? (ranged ? (spec.max - spec.min) / 200 : 'any');
          const set = (e) => setValues((v) => ({ ...v, [name]: e.target.value === '' ? '' : Number(e.target.value) }));
          return (
            <label key={name} className="block text-[11px] text-slate-400">
              <span className="flex justify-between mb-1">
                <span className="font-mono font-bold text-slate-200">{name}</span>
                <span>
                  {values[name]} {spec.unit}
                </span>
              </span>
              {ranged ? (
                <input type="range" min={spec.min} max={spec.max} step={step} value={values[name]} onChange={set} className="w-full accent-indigo-500" aria-label={name} />
              ) : (
                <input
                  type="number"
                  step="any"
                  value={values[name]}
                  onChange={set}
                  aria-label={name}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              )}
            </label>
          );
        })}
      </div>

      {sweepVar && (
        <SweepChart
          compiled={compiled}
          values={values}
          sweepVar={sweepVar}
          rangedVars={rangedVars}
          onSweepVar={setSweepVar}
          vars={formula.vars}
          outputUnit={formula.outputUnit}
        />
      )}

      <div className="flex items-baseline gap-2 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30" aria-live="polite">
        <span className="font-mono text-xs text-indigo-300">{compiled.output} =</span>
        {result !== null ? (
          <span className="text-xl font-black text-white">
            {result} <span className="text-xs font-semibold text-slate-400">{formula.outputUnit}</span>
          </span>
        ) : (
          <span className="text-xs text-amber-400">{evalError || 'Undefined for these inputs (check for division by zero or invalid ranges).'}</span>
        )}
      </div>
    </div>
  );
}

/** Step-through walkthrough of a system's logic flow. */
export function LogicFlowSim({ steps }) {
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const last = steps.length - 1;

  // Autoplay: advance one step per tick and stop on the final step
  useEffect(() => {
    if (!playing || current >= last) return undefined;
    const t = setTimeout(() => {
      const next = current + 1;
      setCurrent(next);
      if (next >= last) setPlaying(false);
    }, 1400);
    return () => clearTimeout(t);
  }, [playing, current, last]);

  const btn = 'p-1.5 rounded-lg text-slate-300 bg-slate-800 hover:bg-slate-700 disabled:opacity-30';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
          <GitBranch className="w-3.5 h-3.5 text-indigo-400" /> Logic walkthrough — step {current + 1} of {steps.length}
        </p>
        <div className="flex gap-1">
          <button className={btn} onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0} aria-label="Previous step"><SkipBack className="w-3.5 h-3.5" /></button>
          <button
            className={btn}
            onClick={() => {
              if (current >= last) setCurrent(0);
              setPlaying((p) => !p);
            }}
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button className={btn} onClick={() => setCurrent((c) => Math.min(last, c + 1))} disabled={current === last} aria-label="Next step"><SkipForward className="w-3.5 h-3.5" /></button>
          <button className={btn} onClick={() => { setPlaying(false); setCurrent(0); }} aria-label="Reset"><RotateCcw className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      <ol className="flex flex-wrap items-center gap-1.5">
        {steps.map((s, i) => (
          <li key={i} className="flex items-center gap-1.5">
            <button
              onClick={() => { setPlaying(false); setCurrent(i); }}
              aria-current={i === current ? 'step' : undefined}
              className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition ${
                i === current
                  ? 'bg-indigo-600 text-white border-indigo-500'
                  : i < current
                  ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                  : 'border-slate-700 text-slate-500'
              }`}
            >
              {i + 1}. {s.label}
            </button>
            {i < last && <span className={`h-px w-3 ${i < current ? 'bg-indigo-500' : 'bg-slate-700'}`} />}
          </li>
        ))}
      </ol>

      <p className="text-xs text-slate-200 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 min-h-[2.5rem]" aria-live="polite">
        {steps[current].detail || steps[current].label}
      </p>
    </div>
  );
}

/** Plots the formula output across one variable's range, holding the others at their slider values. */
function SweepChart({ compiled, values, sweepVar, rangedVars, onSweepVar, vars, outputUnit }) {
  const spec = vars[sweepVar];
  const data = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= SWEEP_SAMPLES; i++) {
      const x = spec.min + ((spec.max - spec.min) * i) / SWEEP_SAMPLES;
      try {
        const y = evaluate(compiled.ast, { ...values, [sweepVar]: x });
        if (Number.isFinite(y)) pts.push({ x, y });
      } catch {
        /* skip undefined points */
      }
    }
    return pts;
  }, [compiled, values, sweepVar, spec.min, spec.max]);

  let currentY = null;
  try {
    currentY = evaluate(compiled.ast, values);
  } catch {
    /* no marker */
  }
  const currentX = Number(values[sweepVar]);
  const unit = (u) => (u ? ` (${u})` : '');
  const title = `${compiled.output}${unit(outputUnit)} vs ${sweepVar}${unit(spec.unit)}`;
  const tableRows = data.filter((_, i) => i % 10 === 0);

  if (data.length < 2) return <p className="text-[11px] text-amber-400">Output is undefined across this range — nothing to plot.</p>;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold text-slate-300">{title}</p>
        {rangedVars.length > 1 && (
          <label className="text-[10px] text-slate-400 flex items-center gap-1.5">
            Sweep
            <select
              value={sweepVar}
              onChange={(e) => onSweepVar(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-md px-1.5 py-0.5 text-[10px] font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              {rangedVars.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>
        )}
      </div>
      <div className="h-44" role="img" aria-label={`Line chart of ${title}`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={CHART.grid} vertical={false} />
            <XAxis
              dataKey="x"
              type="number"
              domain={[spec.min, spec.max]}
              tickFormatter={(v) => fmt(v)}
              tick={{ fill: CHART.axis, fontSize: 10 }}
              stroke={CHART.grid}
              tickLine={false}
            />
            <YAxis tickFormatter={(v) => fmt(v)} tick={{ fill: CHART.axis, fontSize: 10 }} stroke={CHART.grid} tickLine={false} width={52} />
            <Tooltip
              cursor={{ stroke: CHART.cursor, strokeWidth: 1 }}
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <div className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[11px] shadow-lg">
                    <p className="text-slate-400 font-mono">{sweepVar} = {fmt(payload[0].payload.x)} {spec.unit}</p>
                    <p className="text-slate-100 font-bold font-mono">{compiled.output} = {fmt(payload[0].payload.y)} {outputUnit}</p>
                  </div>
                ) : null
              }
            />
            <Line type="monotone" dataKey="y" stroke={CHART.line} strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: CHART.surface, strokeWidth: 2 }} isAnimationActive={false} />
            {Number.isFinite(currentY) && currentX >= spec.min && currentX <= spec.max && (
              <ReferenceDot x={currentX} y={currentY} r={5} fill={CHART.line} stroke={CHART.surface} strokeWidth={2} />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <details className="text-[10px] text-slate-400">
        <summary className="cursor-pointer select-none hover:text-slate-200">Show values as a table</summary>
        <table className="mt-1 w-full font-mono">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="font-semibold py-0.5">{sweepVar}{unit(spec.unit)}</th>
              <th className="font-semibold py-0.5 text-right">{compiled.output}{unit(outputUnit)}</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((r) => (
              <tr key={r.x} className="border-t border-slate-800">
                <td className="py-0.5">{fmt(r.x)}</td>
                <td className="py-0.5 text-right text-slate-200">{fmt(r.y)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
