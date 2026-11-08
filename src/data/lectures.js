// Mock live/scheduled/recorded sessions. Each session belongs to a catalog course
// (see ./courses.js) — course code, institution and access rules come from the course.

export const MOCK_LECTURES = [
  {
    id: 'lec-1',
    courseId: 'c-cs210',
    title: 'Intro to Software Architecture - University Session',
    instructor: { name: 'Dr. Priya Raman', title: 'Associate Professor, Computer Science' },
    status: 'live', // 'live' | 'scheduled' | 'ended'
    startsAt: '2026-11-08T14:00:00Z',
    durationMins: 90,
    attendees: 128,
    topic: 'Layered vs. hexagonal architecture & dependency inversion',
    tags: ['Architecture', 'Design Patterns', 'SOLID'],
    students: [
      { id: 's-1', name: 'Amara O.', muted: false, camOn: true },
      { id: 's-2', name: 'Lucas M.', muted: true, camOn: true },
      { id: 's-3', name: 'Chen W.', muted: true, camOn: false },
      { id: 's-4', name: 'Fatima K.', muted: true, camOn: true },
      { id: 's-5', name: 'Diego R.', muted: true, camOn: false },
      { id: 's-6', name: 'Sofia L.', muted: false, camOn: true },
    ],
    messages: [
      { id: 'm-1', author: 'Amara O.', role: 'student', text: 'Is hexagonal architecture the same as ports & adapters?', ts: '14:06' },
      { id: 'm-2', author: 'Dr. Priya Raman', role: 'instructor', text: 'Yes — same idea, different name. Great question!', ts: '14:07' },
      { id: 'm-3', author: 'Chen W.', role: 'student', text: 'Will the slides be shared after class?', ts: '14:11' },
    ],
  },
  {
    id: 'lec-2',
    courseId: 'c-ds540',
    title: 'Advanced Data Science Distance Cohort',
    instructor: { name: 'Prof. Daniel Okafor', title: 'Lead Instructor, Data Science' },
    status: 'scheduled',
    startsAt: '2026-11-10T17:30:00Z',
    durationMins: 120,
    attendees: 64,
    topic: 'Bayesian A/B testing and causal inference in production',
    tags: ['Statistics', 'Python', 'Causal Inference'],
    students: [
      { id: 's-7', name: 'Hannah B.', muted: true, camOn: true },
      { id: 's-8', name: 'Ravi P.', muted: true, camOn: true },
      { id: 's-9', name: 'Grace N.', muted: true, camOn: false },
    ],
    messages: [
      { id: 'm-4', author: 'Prof. Daniel Okafor', role: 'instructor', text: 'Please install PyMC before Tuesday’s session.', ts: '09:00' },
    ],
  },
  {
    id: 'lec-3',
    courseId: 'c-cs455',
    title: 'Cloud-Native Systems Seminar (Recorded)',
    instructor: { name: 'Dr. Elena Varga', title: 'Senior Lecturer, Distributed Systems' },
    status: 'ended',
    startsAt: '2026-11-05T16:00:00Z',
    durationMins: 75,
    attendees: 203,
    topic: 'Kubernetes operators and reconciliation loops',
    tags: ['Kubernetes', 'Cloud', 'DevOps'],
    students: [],
    messages: [],
  },
];

export const sessionForCourse = (courseId) => MOCK_LECTURES.find((l) => l.courseId === courseId) || null;
