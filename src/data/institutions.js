// Seed institutions. New ones are added at runtime via "Register Institution / College".
// `emailDomain` drives mock verification: a student/instructor is verified for an
// institution when their email ends in that domain AND the institution is verified.

export const INDEPENDENT_ID = 'independent';
export const INDEPENDENT_OPTION = { id: INDEPENDENT_ID, name: 'Join as Independent Student' };

export const SEED_INSTITUTIONS = [
  {
    id: 'ogu',
    name: 'Open Global University',
    emailDomain: 'ogu.edu',
    accreditationId: 'OGU-ACC-10432',
    country: 'United Kingdom',
    contactEmail: 'registrar@ogu.edu',
    status: 'verified', // 'verified' | 'pending'
    createdAt: '2025-01-15T00:00:00Z',
  },
  {
    id: 'nri',
    name: 'Northridge Online Institute',
    emailDomain: 'northridge.edu',
    accreditationId: 'NRI-REG-55871',
    country: 'United States',
    contactEmail: 'admissions@northridge.edu',
    status: 'verified',
    createdAt: '2025-03-02T00:00:00Z',
  },
];
