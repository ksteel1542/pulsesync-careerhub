// Procedural glTF models for seed posts, so the 3D viewer works offline with
// no third-party model hosts. Output is a self-contained data: URI.

/** Symmetric NACA 4-digit profile (e.g. t = 0.12 for NACA 0012) as a closed loop of [x, y], chord = 1. */
export function nacaSymmetricProfile(t = 0.12, n = 40) {
  const yt = (x) => 5 * t * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x ** 2 + 0.2843 * x ** 3 - 0.1036 * x ** 4); // closed trailing edge
  const xs = Array.from({ length: n + 1 }, (_, i) => (1 - Math.cos((Math.PI * i) / n)) / 2); // cosine spacing: dense at LE/TE
  const upper = [...xs].reverse().map((x) => [x, yt(x)]); // TE → LE
  const lower = xs.slice(1, -1).map((x) => [x, -yt(x)]); // LE → TE, endpoints shared with upper
  return [...upper, ...lower];
}

function toBase64(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** Extrude a 2D profile along the span (X axis) into a closed solid; returns a glTF 2.0 data URI. */
export function extrudeProfileToGltf(profile, { chord = 1, span = 3, color = [0.39, 0.4, 0.95] } = {}) {
  const m = profile.length;
  const positions = [];
  for (const z of [-span / 2, span / 2]) {
    // span along X, chord along Z (origin at quarter-chord) so the default camera sees the wing broadside
    for (const [x, y] of profile) positions.push(z, y * chord, (x - 0.25) * chord);
  }
  // cap centres
  const cx = (profile.reduce((s, p) => s + p[0], 0) / m - 0.25) * chord;
  positions.push(-span / 2, 0, cx, span / 2, 0, cx);
  const cA = 2 * m;
  const cB = 2 * m + 1;

  const indices = [];
  for (let k = 0; k < m; k++) {
    const k1 = (k + 1) % m;
    const a0 = k, a1 = k1, b0 = m + k, b1 = m + k1;
    indices.push(a0, b0, a1, a1, b0, b1); // skin
    indices.push(cA, a1, a0); // root cap
    indices.push(cB, b0, b1); // tip cap
  }

  const pos = new Float32Array(positions);
  const idx = new Uint16Array(indices);
  const buf = new Uint8Array(pos.byteLength + idx.byteLength);
  buf.set(new Uint8Array(pos.buffer), 0);
  buf.set(new Uint8Array(idx.buffer), pos.byteLength);

  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pos.length; i += 3) {
    for (let a = 0; a < 3; a++) {
      min[a] = Math.min(min[a], pos[i + a]);
      max[a] = Math.max(max[a], pos[i + a]);
    }
  }

  const gltf = {
    asset: { version: '2.0', generator: 'PulseSync procedural' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1, material: 0 }] }],
    materials: [{ pbrMetallicRoughness: { baseColorFactor: [...color, 1], metallicFactor: 0.35, roughnessFactor: 0.45 }, doubleSided: true }],
    buffers: [{ byteLength: buf.byteLength, uri: `data:application/octet-stream;base64,${toBase64(buf)}` }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: pos.byteLength, target: 34962 },
      { buffer: 0, byteOffset: pos.byteLength, byteLength: idx.byteLength, target: 34963 },
    ],
    accessors: [
      { bufferView: 0, componentType: 5126, count: pos.length / 3, type: 'VEC3', min, max },
      { bufferView: 1, componentType: 5123, count: idx.length, type: 'SCALAR' },
    ],
  };
  return `data:model/gltf+json;base64,${btoa(JSON.stringify(gltf))}`;
}
