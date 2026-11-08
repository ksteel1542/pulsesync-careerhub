import { INDEPENDENT_ID } from '../data/institutions';

/**
 * Decide whether `user` may enter `course`, and with which in-room role.
 * Mock rules — enforce server-side when the API layer exists:
 *  - The institution must be verified.
 *  - Verified members of the course's institution get in (faculty → instructor controls).
 *  - Courses flagged `openToIndependent` admit anyone with student controls.
 *  - Members whose email doesn't match the institution domain are blocked.
 * @returns {{ allowed: boolean, roomRole: 'instructor'|'student'|null, reason: string }}
 */
export function checkCourseAccess(user, course, institution) {
  if (!user) return { allowed: false, roomRole: null, reason: 'Sign in to join this course.' };
  if (institution?.status !== 'verified') {
    return { allowed: false, roomRole: null, reason: `${institution?.name ?? 'This institution'} is pending verification.` };
  }

  const isMember = user.institutionId === course.institutionId;
  if (isMember && user.verified) {
    const faculty = user.role === 'instructor';
    return { allowed: true, roomRole: faculty ? 'instructor' : 'student', reason: faculty ? `Faculty access — ${institution.name}` : `Enrolled via ${institution.name}` };
  }
  if (course.openToIndependent) {
    return { allowed: true, roomRole: 'student', reason: 'Open course — guest access' };
  }
  if (isMember) {
    return {
      allowed: false,
      roomRole: null,
      reason: `Your ${institution.name} membership isn't verified. Sign up with your @${institution.emailDomain} email to join.`,
    };
  }
  return { allowed: false, roomRole: null, reason: `${course.code} is restricted to enrolled ${institution.name} students.` };
}

/** Courses shown in a user's Distance Learning Catalog. */
export function catalogCoursesFor(user, courses, institutions) {
  if (!user) return [];
  const verified = new Set(institutions.filter((i) => i.status === 'verified').map((i) => i.id));
  if (user.institutionId === INDEPENDENT_ID) {
    return courses.filter((c) => c.openToIndependent && verified.has(c.institutionId));
  }
  return courses.filter((c) => c.institutionId === user.institutionId && verified.has(c.institutionId));
}

/** Courses an instructor may publish materials/quizzes to: their institution's catalog, assigned ones first. */
export function hostableCoursesFor(user, courses) {
  if (user?.role !== 'instructor' || !user.verified) return [];
  const mine = (c) => (c.facultyEmails.includes(user.email) ? 0 : 1);
  return courses
    .filter((c) => c.institutionId === user.institutionId)
    .sort((a, b) => mine(a) - mine(b) || a.code.localeCompare(b.code));
}
