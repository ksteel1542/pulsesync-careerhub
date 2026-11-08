import { PRESET_AVATARS } from './avatars';
import { nacaSymmetricProfile, extrudeProfileToGltf } from '../lib/gltf';

export const LAB_CATEGORIES = [
  { id: 'aero', label: 'Aerodynamics & Fluid Dynamics', short: 'Aero & Fluids', cls: 'bg-sky-500/10 text-sky-400 border-sky-500/30' },
  { id: 'automotive', label: 'Automotive Engineering', short: 'Automotive', cls: 'bg-rose-500/10 text-rose-400 border-rose-500/30' },
  { id: 'robotics', label: 'Mechatronics & Robotics', short: 'Robotics', cls: 'bg-violet-500/10 text-violet-400 border-violet-500/30' },
  { id: 'electrical', label: 'Electrical / IoT', short: 'Electrical / IoT', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  { id: 'physics', label: 'Applied Physics', short: 'Applied Physics', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  { id: 'software', label: 'Software Architecture', short: 'Software', cls: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' },
];

export const CODE_LANGUAGES = ['javascript', 'typescript', 'python', 'cpp', 'c', 'rust', 'go', 'java', 'matlab', 'sql', 'bash', 'text'];

// Quick-add field names for the spec sheet builder
export const SPEC_SUGGESTIONS = ['Max RPM', 'Voltage', 'Current Draw', 'Torque Output', 'Reynolds Number', 'Drag Coefficient', 'Mass', 'Power', 'Gear Ratio', 'Efficiency'];

const avatar = (id) => PRESET_AVATARS.find((a) => a.id === id)?.url ?? null;

// Blueprint-style drivetrain schematic (inline SVG, no external assets)
const DRIVETRAIN_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 260" font-family="monospace">
<rect width="640" height="260" fill="#0b2a4a"/>
<g stroke="#1e4a78" stroke-width="1">${Array.from({ length: 33 }, (_, i) => `<line x1="${i * 20}" y1="0" x2="${i * 20}" y2="260"/>`).join('')}${Array.from({ length: 14 }, (_, i) => `<line x1="0" y1="${i * 20}" x2="640" y2="${i * 20}"/>`).join('')}</g>
<g fill="none" stroke="#cfe8ff" stroke-width="2">
<rect x="30" y="90" width="110" height="80" rx="6"/><rect x="200" y="100" width="120" height="60" rx="6"/>
<rect x="380" y="105" width="90" height="50" rx="6"/><circle cx="560" cy="130" r="48"/><circle cx="560" cy="130" r="18"/>
<line x1="140" y1="130" x2="200" y2="130"/><line x1="320" y1="130" x2="380" y2="130"/><line x1="470" y1="130" x2="542" y2="130"/>
</g>
<g fill="#cfe8ff" font-size="12" text-anchor="middle">
<text x="85" y="134">ENGINE</text><text x="260" y="128">6-SPD</text><text x="260" y="144">GEARBOX</text>
<text x="425" y="128">FINAL</text><text x="425" y="144">DRIVE</text><text x="560" y="200">WHEEL r=0.317m</text>
<text x="85" y="190" font-size="10">7200 RPM MAX</text><text x="260" y="180" font-size="10">G1 3.36 … G6 0.69</text><text x="425" y="175" font-size="10">3.73 : 1</text>
</g>
<text x="20" y="28" fill="#7fb3e6" font-size="13">DWG-014 DRIVETRAIN LAYOUT — NOT TO SCALE</text>
</svg>`)}`;

// Seed breakdowns (fictional authors). Formulas use the safe syntax in src/lib/formula.js;
// equations are LaTeX rendered with KaTeX.
export const SEED_BREAKDOWNS = [
  {
    id: 'bd-seed-aero',
    title: 'NACA 0012 Wing Section: Lift vs Airspeed and Angle of Attack',
    category: 'aero',
    tags: ['Aerodynamics', 'Thin-Airfoil Theory', 'CFD', 'Python'],
    author: { name: 'Dr. Ines Carvalho', avatarUrl: avatar('atom'), affiliation: 'Aerospace Lecturer' },
    authorEmail: null,
    publishedAt: '2026-11-07T09:00:00Z',
    body: [
      'A symmetric NACA 0012 section, 0.25 m chord. Below stall, thin-airfoil theory gives $C_L \\approx 2\\pi\\alpha$ (α in radians), so lift grows **linearly with angle** and **with the square of airspeed**.',
      '',
      '### Validity limits',
      '- Pre-stall only (roughly α < 12° at this Reynolds number)',
      '- Ignores finite-span (induced) effects. A real wing’s lift slope is lower.',
    ].join('\n'),
    equations: [
      'L = \\tfrac{1}{2}\\,\\rho\\, v^{2}\\, C_L\\, S, \\qquad C_L \\approx 2\\pi\\alpha',
      'F_d = \\tfrac{1}{2}\\,\\rho\\, v^{2}\\, C_D\\, A',
      'Re = \\dfrac{\\rho\\, v\\, c}{\\mu}',
    ],
    specs: [
      { field: 'Profile', value: 'NACA 0012', unit: '' },
      { field: 'Chord (c)', value: '0.25', unit: 'm' },
      { field: 'Span', value: '1.2', unit: 'm' },
      { field: 'Reynolds Number @ 30 m/s', value: '≈ 5.1 × 10⁵', unit: '' },
      { field: 'Drag Coefficient (C_D)', value: '≈ 0.011', unit: '' },
      { field: 'Stall Angle', value: '≈ 12', unit: '°' },
    ],
    code: {
      language: 'python',
      content: [
        'import numpy as np',
        '',
        'rho, c, mu = 1.225, 0.25, 1.81e-5',
        'v = np.linspace(5, 60, 12)            # m/s',
        'alpha = np.radians(6)',
        'CL = 2 * np.pi * alpha                # thin-airfoil theory',
        'lift_per_m = 0.5 * rho * v**2 * CL * c  # N per metre of span',
        'Re = rho * v * c / mu',
      ].join('\n'),
    },
    formula: {
      source: 'L = 0.5 * rho * v^2 * (2 * pi * alpha * pi / 180) * S',
      outputUnit: 'N',
      vars: {
        v: { value: 30, min: 0, max: 60, unit: 'm/s' },
        alpha: { value: 6, min: 0, max: 12, unit: '°' },
        rho: { value: 1.225, min: 0.9, max: 1.3, unit: 'kg/m³' },
        S: { value: 0.3, min: 0.05, max: 2, unit: 'm²' },
      },
    },
    steps: null,
    media: {
      kind: '3d',
      src: extrudeProfileToGltf(nacaSymmetricProfile(0.12, 40), { chord: 0.25, span: 1.2, color: [0.35, 0.55, 0.95] }),
      caption: 'Procedurally generated NACA 0012 wing segment (0.25 m chord × 1.2 m span).',
    },
  },
  {
    id: 'bd-seed-auto',
    title: 'Gear Ratios to Road Speed: 6-Speed Manual Drivetrain Breakdown',
    category: 'automotive',
    tags: ['Drivetrain', 'Gearbox', 'Vehicle Dynamics'],
    author: { name: 'Marco Bellini', avatarUrl: avatar('fox'), affiliation: 'Powertrain Engineer' },
    authorEmail: null,
    publishedAt: '2026-11-05T14:30:00Z',
    body: [
      'Road speed in each gear follows from engine speed, the gear ratio, the final drive and the tyre’s rolling radius.',
      '',
      'Tall top gears (ratio < 1, *overdrive*) drop cruise RPM for economy. Short first gears multiply torque for launch. Slide the **gear** ratio in the calculator to see each gear’s top speed at the 7,200 RPM limiter.',
    ].join('\n'),
    equations: [
      'v_{\\text{km/h}} = \\dfrac{2\\pi r \\cdot \\text{RPM}}{G_i \\cdot G_f} \\cdot \\dfrac{60}{1000}',
      'T_{\\text{wheel}} = T_{\\text{engine}} \\cdot G_i \\cdot G_f \\cdot \\eta',
    ],
    specs: [
      { field: 'Max RPM', value: '7,200', unit: 'rpm' },
      { field: 'Torque Output (peak)', value: '320', unit: 'N·m' },
      { field: 'Final Drive', value: '3.73', unit: ': 1' },
      { field: 'Gear Ratios 1–6', value: '3.36 / 2.07 / 1.43 / 1.10 / 0.87 / 0.69', unit: '' },
      { field: 'Tyre', value: '225/45 R17', unit: '' },
      { field: 'Driveline Efficiency (η)', value: '≈ 0.88', unit: '' },
    ],
    code: null,
    formula: {
      source: 'kmh = rpm / (gear * final) * 2 * pi * r * 60 / 1000',
      outputUnit: 'km/h',
      vars: {
        rpm: { value: 7200, min: 800, max: 7200, unit: 'rpm' },
        gear: { value: 1.1, min: 0.6, max: 3.5, unit: ': 1' },
        final: { value: 3.73, min: 2.5, max: 4.5, unit: ': 1' },
        r: { value: 0.317, min: 0.25, max: 0.4, unit: 'm' },
      },
    },
    steps: null,
    media: { kind: 'image', src: DRIVETRAIN_SVG, caption: 'DWG-014: engine → gearbox → final drive → wheel.' },
  },
  {
    id: 'bd-seed-robot',
    title: '2-DOF Robotic Arm: Servo Torque Budget and Control Loop',
    category: 'robotics',
    tags: ['Servo', 'Arduino', 'PID', 'Kinematics'],
    author: { name: 'Aiko Tanaka', avatarUrl: avatar('globe'), affiliation: 'Robotics Student' },
    authorEmail: null,
    publishedAt: '2026-11-03T11:10:00Z',
    body: [
      'The shoulder servo carries the worst-case load when the arm is **horizontal**: the payload at full reach plus the link’s own weight acting at its midpoint.',
      '',
      'Keep at least a **2× margin** against stall torque. Servos run hot and lose torque well before stall.',
    ].join('\n'),
    equations: ['\\tau_{\\text{shoulder}} = g\\left(m_p L + m_l \\dfrac{L}{2}\\right)'],
    specs: [
      { field: 'Servo', value: 'MG996R', unit: '' },
      { field: 'Stall Torque', value: '1.08', unit: 'N·m @ 6 V' },
      { field: 'Voltage', value: '6.0', unit: 'V' },
      { field: 'Current Draw (stall)', value: '2.5', unit: 'A' },
      { field: 'Link Length (L)', value: '0.18', unit: 'm' },
      { field: 'Payload (m_p)', value: '0.2', unit: 'kg' },
    ],
    code: {
      language: 'cpp',
      content: [
        '#include <Servo.h>',
        'Servo shoulder;',
        'float kp = 0.8, ki = 0.02, kd = 0.15, integral = 0, prevErr = 0;',
        '',
        'void loop() {',
        '  float err = targetDeg - readEncoderDeg();',
        '  integral += err;',
        '  float out = kp * err + ki * integral + kd * (err - prevErr);',
        '  prevErr = err;',
        '  shoulder.write(constrain(currentDeg + out, 0, 180));',
        '  delay(10); // 100 Hz loop',
        '}',
      ].join('\n'),
    },
    formula: {
      source: 'tau = g * (mp * L + ml * L / 2)',
      outputUnit: 'N·m',
      vars: {
        g: { value: 9.81, unit: 'm/s²' },
        mp: { value: 0.2, min: 0, max: 1, unit: 'kg' },
        ml: { value: 0.08, min: 0.01, max: 0.5, unit: 'kg' },
        L: { value: 0.18, min: 0.05, max: 0.5, unit: 'm' },
      },
    },
    steps: [
      { label: 'Read encoder', detail: 'Sample the joint angle from the magnetic encoder at 100 Hz.' },
      { label: 'Compute error', detail: 'error = target − measured angle (degrees).' },
      { label: 'PID output', detail: 'u = Kp·e + Ki·Σe + Kd·Δe, clamped to the servo’s 0–180° command range.' },
      { label: 'Actuate', detail: 'Write the new command; the servo’s internal loop drives the motor.' },
      { label: 'Repeat', detail: 'Loop every 10 ms. Log the error to tune the gains.' },
    ],
    media: null,
  },
  {
    id: 'bd-seed-esp',
    title: 'ESP32 Soil-Moisture Node: Deep-Sleep Battery Budget',
    category: 'electrical',
    tags: ['ESP32', 'C++', 'IoT', 'MQTT', 'Low Power'],
    author: { name: 'Kwame Asante', avatarUrl: avatar('bulb'), affiliation: 'Embedded Systems Hobbyist' },
    authorEmail: null,
    publishedAt: '2026-11-04T16:40:00Z',
    body: [
      'The node wakes, reads a capacitive sensor, publishes over MQTT, then deep-sleeps.',
      '',
      'Battery life is set by the **average current** across one wake/sleep cycle. The Wi-Fi burst dominates, so shortening `activeSec` matters far more than shaving sleep current.',
    ].join('\n'),
    equations: ['I_{\\text{avg}} = \\dfrac{I_a t_a + I_s t_s}{t_a + t_s}, \\qquad t_{\\text{life}} = \\dfrac{C}{I_{\\text{avg}}}'],
    specs: [
      { field: 'MCU', value: 'ESP32-WROOM-32', unit: '' },
      { field: 'Voltage', value: '3.7', unit: 'V LiPo' },
      { field: 'Current Draw (Wi-Fi TX)', value: '160', unit: 'mA' },
      { field: 'Deep-Sleep Current', value: '10', unit: 'µA' },
      { field: 'Battery Capacity', value: '2000', unit: 'mAh' },
    ],
    code: {
      language: 'cpp',
      content: [
        '#define SLEEP_SECONDS 600',
        '',
        'void setup() {',
        '  int moisture = analogRead(SENSOR_PIN);',
        '  connectWifi();',
        '  mqtt.publish("garden/bed1/moisture", String(moisture).c_str());',
        '  esp_sleep_enable_timer_wakeup(SLEEP_SECONDS * 1000000ULL);',
        '  esp_deep_sleep_start();',
        '}',
      ].join('\n'),
    },
    formula: {
      source: 'hours = capacity / ((activeMa * activeSec + sleepMa * sleepSec) / (activeSec + sleepSec))',
      outputUnit: 'h',
      vars: {
        capacity: { value: 2000, min: 200, max: 6000, unit: 'mAh' },
        activeMa: { value: 160, min: 20, max: 300, unit: 'mA' },
        activeSec: { value: 2, min: 0.5, max: 30, unit: 's' },
        sleepMa: { value: 0.01, min: 0.005, max: 5, unit: 'mA' },
        sleepSec: { value: 600, min: 10, max: 3600, unit: 's' },
      },
    },
    steps: null,
    media: null,
  },
  {
    id: 'bd-seed-physics',
    title: 'Projectile Range: Why 45° Is Optimal on Flat Ground',
    category: 'physics',
    tags: ['Kinematics', 'Calculus', 'Simulation'],
    author: { name: 'Dr. Ines Carvalho', avatarUrl: avatar('atom'), affiliation: 'Physics Lecturer' },
    authorEmail: null,
    publishedAt: '2026-11-02T09:00:00Z',
    body: [
      'Ignoring drag, $\\sin 2\\theta$ peaks at 1 when $2\\theta = 90°$, so maximum range is at **θ = 45°**.',
      '',
      '### Where this breaks down',
      '1. Launch height above the landing point favours angles below 45°.',
      '2. Air drag shortens high arcs more, also pushing the optimum lower.',
    ].join('\n'),
    equations: ['R = \\dfrac{v^{2} \\sin 2\\theta}{g}', 'R_{\\max} = \\dfrac{v^{2}}{g} \\quad \\text{at } \\theta = 45^\\circ'],
    specs: [],
    code: null,
    formula: {
      source: 'R = v^2 * sin(2 * theta * pi / 180) / g',
      outputUnit: 'm',
      vars: {
        v: { value: 20, min: 1, max: 100, unit: 'm/s' },
        theta: { value: 45, min: 0, max: 90, unit: '°' },
        g: { value: 9.81, min: 1, max: 25, unit: 'm/s²' },
      },
    },
    steps: null,
    media: null,
  },
  {
    id: 'bd-seed-ws',
    title: 'Real-time Cursor Sync over WebSockets with Lamport Clocks',
    category: 'software',
    tags: ['Node.js', 'WebSockets', 'Distributed Systems'],
    author: { name: 'Maya Lindqvist', avatarUrl: avatar('rocket'), affiliation: 'Staff Engineer' },
    authorEmail: null,
    publishedAt: '2026-11-06T10:15:00Z',
    body: [
      '## Problem',
      'Collaborative editors need every client to apply concurrent edits in the **same order**, even when messages arrive out of order.',
      '',
      '## Approach',
      '- Each client keeps a Lamport counter and stamps every operation.',
      '- The server is a thin relay: it never rewrites operations, it only broadcasts them.',
      '- Peers sort by `(clock, clientId)` so ties break deterministically.',
    ].join('\n'),
    equations: ['C_{\\text{recv}} = \\max(C_{\\text{local}},\\, C_{\\text{msg}}) + 1'],
    specs: [
      { field: 'Transport', value: 'WebSocket (RFC 6455)', unit: '' },
      { field: 'p95 Broadcast Latency', value: '38', unit: 'ms' },
      { field: 'Peak Connections', value: '12,000', unit: 'per node' },
    ],
    code: {
      language: 'javascript',
      content: [
        '// Client: stamp and send an operation',
        'let clock = 0;',
        'function sendOp(socket, op) {',
        '  clock += 1;',
        '  socket.send(JSON.stringify({ ...op, clock, clientId: socket.id }));',
        '}',
        '',
        '// Receiving side: advance local clock past anything we have seen',
        'function onOp(msg) {',
        '  clock = Math.max(clock, msg.clock) + 1;',
        '  pending.push(msg);',
        '  pending.sort((a, b) => a.clock - b.clock || a.clientId.localeCompare(b.clientId));',
        '}',
      ].join('\n'),
    },
    formula: null,
    steps: [
      { label: 'Local edit', detail: 'User types; the client increments its Lamport clock to 7 and stamps the op.' },
      { label: 'Emit over WebSocket', detail: 'The op is sent as JSON over the open socket, with no HTTP round trip.' },
      { label: 'Server relay', detail: 'The server validates the schema and broadcasts to every other client in the room.' },
      { label: 'Peer clock merge', detail: 'Each peer sets clock = max(local, 7) + 1, so later ops always sort after this one.' },
      { label: 'Deterministic apply', detail: 'Peers sort pending ops by (clock, clientId) and apply them. All replicas converge.' },
    ],
    media: null,
  },
];
