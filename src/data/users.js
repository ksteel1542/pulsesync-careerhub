// Seed roster records so the admin Faculty/Student rosters aren't empty.
// passwordHash is null, so these are display-only: nobody can sign in as them.

const seed = (name, email, role, institutionId, createdAt) => ({
  name,
  email,
  role,
  institutionId,
  avatarUrl: null,
  passwordHash: null,
  createdAt,
});

export const SEED_USERS = [
  seed('Dr. Priya Raman', 'priya.raman@ogu.edu', 'instructor', 'ogu', '2025-02-01T00:00:00Z'),
  seed('Dr. Elena Varga', 'elena.varga@ogu.edu', 'instructor', 'ogu', '2025-02-03T00:00:00Z'),
  seed('Amara Okonkwo', 'amara.o@ogu.edu', 'student', 'ogu', '2025-09-01T00:00:00Z'),
  seed('Lucas Martin', 'lucas.m@ogu.edu', 'student', 'ogu', '2025-09-02T00:00:00Z'),
  seed('Chen Wei', 'chen.w@ogu.edu', 'student', 'ogu', '2025-09-04T00:00:00Z'),
  seed('Prof. Daniel Okafor', 'daniel.okafor@northridge.edu', 'instructor', 'nri', '2025-03-10T00:00:00Z'),
  seed('Hannah Becker', 'hannah.b@northridge.edu', 'student', 'nri', '2025-09-05T00:00:00Z'),
  seed('Ravi Patel', 'ravi.p@northridge.edu', 'student', 'nri', '2025-09-06T00:00:00Z'),
];
