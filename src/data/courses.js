// Official course catalog seeds. Institution admins add/edit/remove courses at runtime.
// `facultyEmails` = instructors (or pending invitees) assigned to teach the course.

export const SEED_COURSES = [
  {
    id: 'c-cs210',
    institutionId: 'ogu',
    code: 'CS 210',
    title: 'Intro to Software Architecture',
    department: 'Computer Science',
    creditHours: 3,
    openToIndependent: false,
    facultyEmails: ['priya.raman@ogu.edu'],
  },
  {
    id: 'c-cs455',
    institutionId: 'ogu',
    code: 'CS 455',
    title: 'Cloud-Native Systems',
    department: 'Computer Science',
    creditHours: 3,
    openToIndependent: true, // public seminar series
    facultyEmails: ['elena.varga@ogu.edu'],
  },
  {
    id: 'c-ds540',
    institutionId: 'nri',
    code: 'DS 540',
    title: 'Advanced Data Science',
    department: 'Data Science',
    creditHours: 4,
    openToIndependent: false,
    facultyEmails: ['daniel.okafor@northridge.edu'],
  },
];
