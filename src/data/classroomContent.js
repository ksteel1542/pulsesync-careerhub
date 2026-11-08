// Seed study materials and quizzes so the student view has something to show
// before any instructor publishes. Keyed to course ids in ./courses.js.

const textFile = (body) => `data:text/plain;charset=utf-8,${encodeURIComponent(body)}`;

export const SEED_MATERIALS = [
  {
    id: 'mat-seed-1',
    courseId: 'c-cs210',
    title: 'Lecture 7 Notes — Hexagonal Architecture',
    description: 'Summary of ports & adapters, dependency inversion, and a worked example.',
    url: textFile('CS 210 — Lecture 7 Notes\n\n1. Ports define what the core needs.\n2. Adapters implement ports for real infrastructure.\n3. Dependencies point inward, toward the domain.\n'),
    fileName: 'cs210-lecture7-notes.txt',
    kind: 'file',
    sizeLabel: '1 KB',
    publishedBy: 'Dr. Priya Raman',
    publishedAt: '2026-11-07T18:00:00Z',
  },
  {
    id: 'mat-seed-2',
    courseId: 'c-cs210',
    title: 'Reading: The Clean Architecture',
    description: 'Required pre-reading for next week’s session.',
    url: 'https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html',
    fileName: null,
    kind: 'link',
    sizeLabel: null,
    publishedBy: 'Dr. Priya Raman',
    publishedAt: '2026-11-06T12:00:00Z',
  },
];

export const SEED_QUIZZES = [
  {
    id: 'quiz-seed-1',
    courseId: 'c-cs210',
    title: 'Architecture Fundamentals Check',
    passMark: 70,
    createdBy: 'Dr. Priya Raman',
    createdAt: '2026-11-07T18:05:00Z',
    questions: [
      {
        id: 'q-seed-1',
        text: 'In hexagonal architecture, what defines what the application core needs from the outside world?',
        options: { A: 'Adapters', B: 'Ports', C: 'Controllers', D: 'Repositories' },
        correct: 'B',
        points: 2,
      },
      {
        id: 'q-seed-2',
        text: 'Which principle says high-level modules should not depend on low-level modules?',
        options: { A: 'Single Responsibility', B: 'Open/Closed', C: 'Dependency Inversion', D: 'Liskov Substitution' },
        correct: 'C',
        points: 2,
      },
      {
        id: 'q-seed-3',
        text: 'In a layered architecture, which direction should dependencies usually point?',
        options: { A: 'Toward the UI', B: 'Toward the database', C: 'Toward the domain', D: 'In any direction' },
        correct: 'C',
        points: 1,
      },
    ],
  },
];
