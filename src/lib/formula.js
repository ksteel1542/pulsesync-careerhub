// Safe formula engine for Inventor's Lab simulations.
// Parses arithmetic with a recursive-descent parser and evaluates the AST —
// user-entered formulas are never passed to eval()/new Function().
//
// Supported: numbers, variables, + - * / ^, parentheses, unary minus,
// constants pi and e, and the functions listed in FUNCS.

// sin/cos are bounded by 1, so results within 1e-12 of zero are floating-point noise
// (e.g. sin(pi) ≈ 1.2e-16). Snap them so sin(180°) shows 0, without touching
// genuinely tiny values elsewhere (physical constants etc.).
const snapTrig = (fn) => (x) => {
  const y = fn(x);
  return Math.abs(y) < 1e-12 ? 0 : y;
};

const FUNCS = {
  sin: snapTrig(Math.sin), cos: snapTrig(Math.cos), tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan,
  sqrt: Math.sqrt, abs: Math.abs, ln: Math.log, log: Math.log10, exp: Math.exp,
  min: Math.min, max: Math.max, pow: Math.pow, round: Math.round, floor: Math.floor, ceil: Math.ceil,
};
const CONSTS = { pi: Math.PI, e: Math.E };
// Own-property checks only, so names like “constructor” or “toString” never resolve via Object.prototype
const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

function tokenize(src) {
  const tokens = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    const rest = src.slice(i);
    const num = /^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(rest);
    if (num) {
      tokens.push({ t: 'num', v: parseFloat(num[0]) });
      i += num[0].length;
      continue;
    }
    const id = /^[A-Za-z_][A-Za-z0-9_]*/.exec(rest);
    if (id) {
      tokens.push({ t: 'id', v: id[0] });
      i += id[0].length;
      continue;
    }
    if ('+-*/^(),'.includes(c)) {
      tokens.push({ t: c });
      i++;
      continue;
    }
    throw new Error(`Unexpected character “${c}”`);
  }
  return tokens;
}

export function parseExpression(src) {
  const toks = tokenize(src);
  if (!toks.length) throw new Error('Formula is empty');
  let p = 0;
  const peek = () => toks[p];
  const eat = (t) => {
    if (toks[p]?.t !== t) throw new Error(`Expected “${t}”`);
    return toks[p++];
  };

  function expr() {
    let n = term();
    while (peek() && (peek().t === '+' || peek().t === '-')) {
      const op = toks[p++].t;
      n = { op, a: n, b: term() };
    }
    return n;
  }
  function term() {
    let n = unary();
    while (peek() && (peek().t === '*' || peek().t === '/')) {
      const op = toks[p++].t;
      n = { op, a: n, b: unary() };
    }
    return n;
  }
  function unary() {
    if (peek()?.t === '-') {
      p++;
      return { op: 'neg', a: unary() };
    }
    if (peek()?.t === '+') {
      p++;
      return unary();
    }
    return power();
  }
  function power() {
    const base = primary();
    if (peek()?.t === '^') {
      p++;
      return { op: '^', a: base, b: unary() }; // right-associative
    }
    return base;
  }
  function primary() {
    const tk = toks[p++];
    if (!tk) throw new Error('Formula ends unexpectedly');
    if (tk.t === 'num') return { num: tk.v };
    if (tk.t === 'id') {
      if (peek()?.t === '(') {
        if (!has(FUNCS, tk.v)) throw new Error(`Unknown function “${tk.v}”`);
        p++;
        const args = [];
        if (peek()?.t !== ')') {
          args.push(expr());
          while (peek()?.t === ',') {
            p++;
            args.push(expr());
          }
        }
        eat(')');
        return { fn: tk.v, args };
      }
      return { id: tk.v };
    }
    if (tk.t === '(') {
      const n = expr();
      eat(')');
      return n;
    }
    throw new Error(`Unexpected “${tk.t}”`);
  }

  const ast = expr();
  if (p < toks.length) throw new Error(`Unexpected “${toks[p].v ?? toks[p].t}”`);
  return ast;
}

export function evaluate(ast, scope) {
  if ('num' in ast) return ast.num;
  if ('id' in ast) {
    if (has(scope, ast.id)) return Number(scope[ast.id]);
    if (has(CONSTS, ast.id)) return CONSTS[ast.id];
    throw new Error(`No value for “${ast.id}”`);
  }
  if ('fn' in ast) return FUNCS[ast.fn](...ast.args.map((a) => evaluate(a, scope)));
  const a = evaluate(ast.a, scope);
  switch (ast.op) {
    case 'neg': return -a;
    case '+': return a + evaluate(ast.b, scope);
    case '-': return a - evaluate(ast.b, scope);
    case '*': return a * evaluate(ast.b, scope);
    case '/': return a / evaluate(ast.b, scope);
    case '^': return a ** evaluate(ast.b, scope);
    default: throw new Error(`Unknown operator ${ast.op}`);
  }
}

function collectIds(ast, out) {
  if ('id' in ast) {
    if (!has(CONSTS, ast.id)) out.add(ast.id);
  } else if ('fn' in ast) ast.args.forEach((a) => collectIds(a, out));
  else if ('op' in ast) {
    collectIds(ast.a, out);
    if (ast.b) collectIds(ast.b, out);
  }
  return out;
}

/**
 * Compile "output = expression" (or a bare expression) into
 * { output, expression, ast, variables }. Throws a readable Error if invalid.
 */
export function compileFormula(source) {
  const src = source.trim();
  const eq = src.indexOf('=');
  let output = 'result';
  let expression = src;
  if (eq !== -1) {
    output = src.slice(0, eq).trim();
    expression = src.slice(eq + 1).trim();
    if (!IDENT.test(output)) throw new Error('Left side of “=” must be a single name, e.g. R = v^2 / g');
  }
  const ast = parseExpression(expression);
  return { output, expression, ast, variables: [...collectIds(ast, new Set())] };
}

/**
 * Parse variable definitions, one per line:  name = default [min, max] unit
 * e.g. "v = 20 [0, 100] m/s". Range and unit are optional.
 */
export function parseVariableSpecs(text) {
  const specs = Object.create(null); // no prototype, so a variable named "__proto__" is just a key
  text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((line, i) => {
      const m = /^([A-Za-z_]\w*)\s*=\s*(-?\d*\.?\d+)(?:\s*\[\s*(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)\s*\])?\s*(.*)$/.exec(line);
      if (!m) throw new Error(`Variable line ${i + 1} should look like “v = 20 [0, 100] m/s”`);
      const [, name, value, min, max, unit] = m;
      const spec = { value: Number(value), unit: unit.trim() };
      if (min !== undefined) {
        spec.min = Number(min);
        spec.max = Number(max);
        if (spec.min >= spec.max) throw new Error(`“${name}” range must have min < max`);
      }
      specs[name] = spec;
    });
  return specs;
}

export const FORMULA_FUNCTIONS = Object.keys(FUNCS);
