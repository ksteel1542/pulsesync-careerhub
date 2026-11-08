import React, { useMemo, useRef, useState } from 'react';
import { ClassroomStoreContext } from './classroomContext';
import { SEED_MATERIALS, SEED_QUIZZES } from '../data/classroomContent';
import { SEED_INSTITUTIONS, INDEPENDENT_ID } from '../data/institutions';
import { SEED_COURSES } from '../data/courses';
import { SEED_USERS } from '../data/users';
import { SEED_BREAKDOWNS } from '../data/labBreakdowns';
import { EMAIL_RE, FREE_EMAIL_DOMAINS, emailDomainOf, hashPassword } from '../lib/mockAuth';
import { B2C_PLANS, INSTITUTION_PLANS, DEFAULT_INSTITUTION_PLAN, DEFAULT_BILLING_CYCLE } from '../config/pricing';

// App-wide state: institutions, course catalogs, accounts, faculty invitations,
// study materials, quizzes, quiz attempts, Inventor's Lab posts, subscriptions
// and the signed-in session.
// In-memory only (cleared on reload). Each action maps 1:1 to a future API call.

const newId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const now = () => new Date().toISOString();
const normCode = (code) => code.trim().toUpperCase().replace(/\s+/g, ' ');
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24);
const fail = (msg) => {
  throw new Error(msg);
};

const freeSubscription = () => ({ tier: 'free', billingCycle: DEFAULT_BILLING_CYCLE, aiGenerationsLeft: B2C_PLANS.free.aiGenerations });
const institutionPlanOf = (inst) => INSTITUTION_PLANS[inst?.subscription?.tier] ?? INSTITUTION_PLANS[DEFAULT_INSTITUTION_PLAN];
const studentSeatsUsed = (users, institutionId) => users.filter((u) => u.role === 'student' && u.institutionId === institutionId).length;

/** Public view of an account record (never includes the password hash). */
function toPublicUser(rec, institutions) {
  if (!rec) return null;
  const inst = institutions.find((i) => i.id === rec.institutionId);
  const instVerified = inst?.status === 'verified';
  const verified =
    rec.role === 'institution_admin'
      ? instVerified
      : !!inst && instVerified && rec.email.endsWith(`@${inst.emailDomain}`);

  // Verified members of an Enterprise institution get Pro-level features via their school
  const stored = rec.subscription ?? freeSubscription();
  const enterpriseMember = rec.role !== 'institution_admin' && verified && inst?.subscription?.tier === 'enterprise';
  const tier = enterpriseMember ? 'enterprise' : stored.tier; // 'free' | 'pro' | 'enterprise'

  return {
    name: rec.name,
    email: rec.email,
    role: rec.role, // 'student' | 'instructor' | 'institution_admin'
    institutionId: rec.institutionId,
    institution: rec.institutionId === INDEPENDENT_ID ? 'Independent Learner' : inst?.name ?? 'Unknown institution',
    institutionStatus: inst?.status ?? null, // 'verified' | 'pending' | null
    verified,
    avatarUrl: rec.avatarUrl,
    createdAt: rec.createdAt,
    subscription: {
      tier,
      billingCycle: stored.billingCycle,
      aiGenerationsLeft: tier === 'free' ? stored.aiGenerationsLeft : null, // null = unlimited
      includedVia: enterpriseMember ? inst.name : null,
    },
  };
}

export function ClassroomStoreProvider({ children }) {
  const [institutions, setInstitutions] = useState(SEED_INSTITUTIONS);
  const [courses, setCourses] = useState(SEED_COURSES);
  const [users, setUsers] = useState(SEED_USERS); // full records incl. passwordHash
  const [invitations, setInvitations] = useState([]); // { id, institutionId, email, name, invitedAt }
  const [materials, setMaterials] = useState(SEED_MATERIALS);
  const [quizzes, setQuizzes] = useState(SEED_QUIZZES);
  const [attempts, setAttempts] = useState([]); // { id, quizId, email, name, percentage, passed, at }
  const [breakdowns, setBreakdowns] = useState(SEED_BREAKDOWNS); // Inventor's Lab posts
  const [sessionEmail, setSessionEmail] = useState(null);
  const [guestAiLeft, setGuestAiLeft] = useState(B2C_PLANS.free.aiGenerations); // signed-out visitors are on Free
  const [pricing, setPricing] = useState({ open: false, reason: null }); // pricing modal

  // Latest state for validation inside async/stable actions
  const latest = useRef();
  latest.current = { institutions, courses, users, invitations, sessionEmail, guestAiLeft };

  const currentUser = useMemo(
    () => toPublicUser(users.find((u) => u.email === sessionEmail), institutions),
    [users, sessionEmail, institutions]
  );

  const actions = useMemo(
    () => ({
      // ---------------- Auth ----------------
      async signUp({ name, email, password, role, institutionId, avatarUrl }) {
        email = email.trim().toLowerCase();
        const { institutions: insts, users: us } = latest.current;
        const isIndependent = institutionId === INDEPENDENT_ID;
        if (!name.trim()) fail('Full name is required.');
        if (!EMAIL_RE.test(email)) fail('Enter a valid email address.');
        if (password.length < 8) fail('Password must be at least 8 characters.');
        if (!['student', 'instructor'].includes(role)) fail('Choose Student or Instructor / Faculty.');
        if (!isIndependent && insts.find((i) => i.id === institutionId)?.status !== 'verified') fail('Select a verified institution.');
        if (role === 'instructor' && isIndependent) fail('Instructor/Faculty accounts must belong to an institution.');
        if (avatarUrl && !/^(https:\/\/|data:image\/)/.test(avatarUrl)) fail('Avatar image URL must start with https://');
        if (us.some((u) => u.email === email)) fail('An account with this email already exists. Sign in instead.');
        if (role === 'student' && !isIndependent) {
          const inst = insts.find((i) => i.id === institutionId);
          const plan = institutionPlanOf(inst);
          if (plan.maxSeats !== null && studentSeatsUsed(us, institutionId) >= plan.maxSeats) {
            fail(`${inst.name} has used all ${plan.maxSeats} student seats on its ${plan.name} plan. Ask your institution to upgrade.`);
          }
        }

        const passwordHash = await hashPassword(password);
        setUsers((prev) => [
          ...prev,
          { name: name.trim(), email, role, institutionId, avatarUrl: avatarUrl || null, passwordHash, createdAt: now(), subscription: freeSubscription() },
        ]);
        // An invited instructor who signs up becomes an active roster member
        if (role === 'instructor') setInvitations((prev) => prev.filter((i) => !(i.email === email && i.institutionId === institutionId)));
        setSessionEmail(email);
      },

      async signIn({ email, password }) {
        email = email.trim().toLowerCase();
        const rec = latest.current.users.find((u) => u.email === email);
        if (!rec?.passwordHash || rec.passwordHash !== (await hashPassword(password))) fail('Incorrect email or password.');
        setSessionEmail(email);
      },

      async registerInstitution({ name, accreditationId, contactEmail, country, password, autoApprove }) {
        name = name.trim();
        accreditationId = accreditationId.trim().toUpperCase();
        contactEmail = contactEmail.trim().toLowerCase();
        country = country.trim();
        const { institutions: insts, users: us } = latest.current;
        const domain = emailDomainOf(contactEmail);

        if (name.length < 3) fail('Institution name is required.');
        if (!/^[A-Z0-9][A-Z0-9-]{3,29}$/.test(accreditationId)) fail('Accreditation / Registration ID should be 4–30 letters, numbers or dashes.');
        if (!EMAIL_RE.test(contactEmail)) fail('Enter a valid official contact email.');
        if (FREE_EMAIL_DOMAINS.includes(domain)) fail(`Use your institution’s official email domain, not a personal provider like ${domain}.`);
        if (!country) fail('Country / location is required.');
        if (password.length < 8) fail('Password must be at least 8 characters.');
        if (insts.some((i) => i.name.toLowerCase() === name.toLowerCase())) fail(`${name} is already registered.`);
        if (insts.some((i) => i.accreditationId === accreditationId)) fail('That accreditation / registration ID is already registered.');
        if (insts.some((i) => i.emailDomain === domain)) fail(`An institution using @${domain} is already registered.`);
        if (us.some((u) => u.email === contactEmail)) fail('An account with this email already exists. Sign in instead.');

        const passwordHash = await hashPassword(password);
        const id = `${slugify(name)}-${Math.random().toString(36).slice(2, 6)}`;
        setInstitutions((prev) => [
          ...prev,
          {
            id, name, emailDomain: domain, accreditationId, country, contactEmail,
            status: autoApprove ? 'verified' : 'pending',
            createdAt: now(),
            subscription: { tier: DEFAULT_INSTITUTION_PLAN },
          },
        ]);
        setUsers((prev) => [
          ...prev,
          { name, email: contactEmail, role: 'institution_admin', institutionId: id, avatarUrl: null, passwordHash, createdAt: now(), subscription: freeSubscription() },
        ]);
        setSessionEmail(contactEmail);
      },

      approveInstitution: (id) => setInstitutions((prev) => prev.map((i) => (i.id === id ? { ...i, status: 'verified' } : i))),

      signOut: () => setSessionEmail(null),

      // ---------------- Billing (demo: no payment is processed) ----------------
      /**
       * Spend one AI generation. Returns true if allowed; false when a Free user
       * (or signed-out visitor) has none left. Pro/Enterprise are unlimited.
       */
      consumeAiGeneration() {
        const cur = latest.current;
        const rec = cur.sessionEmail ? cur.users.find((u) => u.email === cur.sessionEmail) : null;
        if (!rec) {
          if (cur.guestAiLeft <= 0) return false;
          cur.guestAiLeft -= 1; // keep the ref in sync so rapid double-clicks can't overspend
          setGuestAiLeft((n) => Math.max(0, n - 1));
          return true;
        }
        const left = toPublicUser(rec, cur.institutions).subscription.aiGenerationsLeft;
        if (left === null) return true;
        if (left <= 0) return false;
        const spend = (u) => (u.email === rec.email ? { ...u, subscription: { ...(u.subscription ?? freeSubscription()), aiGenerationsLeft: Math.max(0, left - 1) } } : u);
        cur.users = cur.users.map(spend);
        setUsers((prev) => prev.map(spend));
        return true;
      },

      /** Switch the signed-in user between Free and Pro. Demo stand-in for a checkout flow. */
      setUserPlan(tier) {
        const cur = latest.current;
        if (!B2C_PLANS[tier]) fail('Unknown plan.');
        const rec = cur.users.find((u) => u.email === cur.sessionEmail);
        if (!rec) fail('Sign in to change your plan.');
        if (rec.role === 'institution_admin') fail('Institution accounts are billed on an institutional plan.');
        const pub = toPublicUser(rec, cur.institutions);
        if (pub.subscription.includedVia) fail(`Pro features are already included with ${pub.subscription.includedVia}.`);
        const subscription = { tier, billingCycle: DEFAULT_BILLING_CYCLE, aiGenerationsLeft: tier === 'pro' ? null : B2C_PLANS.free.aiGenerations };
        setUsers((prev) => prev.map((u) => (u.email === rec.email ? { ...u, subscription } : u)));
      },

      /** Change an institution's B2B plan (admin only). Blocks downgrades below current seat usage. */
      setInstitutionPlan(institutionId, tier) {
        const cur = latest.current;
        const plan = INSTITUTION_PLANS[tier];
        if (!plan) fail('Unknown plan.');
        const rec = cur.users.find((u) => u.email === cur.sessionEmail);
        if (rec?.role !== 'institution_admin' || rec.institutionId !== institutionId) fail('Only this institution’s admin can change its plan.');
        const used = studentSeatsUsed(cur.users, institutionId);
        if (plan.maxSeats !== null && used > plan.maxSeats) fail(`You have ${used} students; the ${plan.name} plan allows ${plan.maxSeats}.`);
        setInstitutions((prev) => prev.map((i) => (i.id === institutionId ? { ...i, subscription: { tier } } : i)));
      },

      openPricing: (reason = null) => setPricing({ open: true, reason }),
      closePricing: () => setPricing({ open: false, reason: null }),

      // ---------------- Course catalog (institution admin) ----------------
      saveCourse(institutionId, data, courseId = null) {
        const code = normCode(data.code || '');
        const title = (data.title || '').trim();
        const department = (data.department || '').trim();
        const creditHours = Number(data.creditHours);
        if (!code || code.length > 12) fail('Course code is required (max 12 characters), e.g. CS 210.');
        if (!title) fail('Course title is required.');
        if (!department) fail('Department is required.');
        if (!Number.isInteger(creditHours) || creditHours < 1 || creditHours > 12) fail('Credit hours must be a whole number from 1 to 12.');
        const dup = latest.current.courses.some((c) => c.institutionId === institutionId && c.id !== courseId && c.code === code);
        if (dup) fail(`${code} already exists in your catalog.`);

        const fields = { code, title, department, creditHours, openToIndependent: !!data.openToIndependent };
        if (courseId) {
          setCourses((prev) => prev.map((c) => (c.id === courseId ? { ...c, ...fields } : c)));
        } else {
          setCourses((prev) => [...prev, { id: newId('course'), institutionId, facultyEmails: [], ...fields }]);
        }
        return code;
      },

      removeCourse(courseId) {
        setCourses((prev) => prev.filter((c) => c.id !== courseId));
        setMaterials((prev) => {
          prev.filter((m) => m.courseId === courseId && m.url?.startsWith('blob:')).forEach((m) => URL.revokeObjectURL(m.url));
          return prev.filter((m) => m.courseId !== courseId);
        });
        setQuizzes((prev) => prev.filter((q) => q.courseId !== courseId));
      },

      // ---------------- Faculty roster (institution admin) ----------------
      inviteFaculty(institutionId, { name, email }) {
        email = email.trim().toLowerCase();
        const { institutions: insts, users: us, invitations: invs } = latest.current;
        const inst = insts.find((i) => i.id === institutionId);
        if (!EMAIL_RE.test(email)) fail('Enter a valid email address.');
        if (!email.endsWith(`@${inst.emailDomain}`)) fail(`Faculty must use an @${inst.emailDomain} address so their account verifies.`);
        const existing = us.find((u) => u.email === email);
        if (existing?.role === 'instructor' && existing.institutionId === institutionId) fail('This instructor is already on your roster.');
        if (existing) fail('That email is already registered to another account.');
        if (invs.some((i) => i.email === email && i.institutionId === institutionId)) fail('An invitation is already pending for this email.');
        setInvitations((prev) => [...prev, { id: newId('inv'), institutionId, email, name: (name || '').trim(), invitedAt: now() }]);
      },

      revokeInvitation(invitationId) {
        const inv = latest.current.invitations.find((i) => i.id === invitationId);
        if (!inv) return;
        setInvitations((prev) => prev.filter((i) => i.id !== invitationId));
        setCourses((prev) =>
          prev.map((c) => (c.institutionId === inv.institutionId ? { ...c, facultyEmails: c.facultyEmails.filter((e) => e !== inv.email) } : c))
        );
      },

      toggleAssignment: (courseId, email) =>
        setCourses((prev) =>
          prev.map((c) =>
            c.id !== courseId
              ? c
              : { ...c, facultyEmails: c.facultyEmails.includes(email) ? c.facultyEmails.filter((e) => e !== email) : [...c.facultyEmails, email] }
          )
        ),

      // ---------------- Study materials & quizzes ----------------
      addMaterial: (m) => setMaterials((prev) => [{ ...m, id: newId('mat'), publishedAt: now() }, ...prev]),
      removeMaterial: (id) =>
        setMaterials((prev) => {
          const target = prev.find((m) => m.id === id);
          if (target?.url?.startsWith('blob:')) URL.revokeObjectURL(target.url);
          return prev.filter((m) => m.id !== id);
        }),
      addQuiz: (q) => setQuizzes((prev) => [{ ...q, id: newId('quiz'), createdAt: now() }, ...prev]),
      removeQuiz: (id) => setQuizzes((prev) => prev.filter((q) => q.id !== id)),
      recordAttempt: (a) => setAttempts((prev) => [...prev, { ...a, id: newId('att'), at: now() }]),

      // ---------------- Inventor's Lab ----------------
      addBreakdown: (b) => setBreakdowns((prev) => [{ ...b, id: newId('bd'), publishedAt: now() }, ...prev]),
      removeBreakdown: (id) =>
        setBreakdowns((prev) => {
          const target = prev.find((b) => b.id === id);
          if (target?.media?.src?.startsWith('blob:')) URL.revokeObjectURL(target.media.src);
          return prev.filter((b) => b.id !== id);
        }),
    }),
    []
  );

  // Institutions as consumers see them: subscription = { tier, maxSeats, currentSeatsUsed } (seats counted live)
  const institutionsView = useMemo(
    () =>
      institutions.map((i) => {
        const plan = institutionPlanOf(i);
        return { ...i, subscription: { tier: plan.id, maxSeats: plan.maxSeats, currentSeatsUsed: studentSeatsUsed(users, i.id) } };
      }),
    [institutions, users]
  );

  // Subscription for whoever is using the app right now (signed-out visitors are on Free)
  const subscription = useMemo(
    () => currentUser?.subscription ?? { tier: 'free', billingCycle: DEFAULT_BILLING_CYCLE, aiGenerationsLeft: guestAiLeft, includedVia: null },
    [currentUser, guestAiLeft]
  );

  const value = useMemo(
    () => ({
      institutions: institutionsView, courses, users, invitations, materials, quizzes, attempts, breakdowns,
      currentUser, subscription, pricing, ...actions,
    }),
    [institutionsView, courses, users, invitations, materials, quizzes, attempts, breakdowns, currentUser, subscription, pricing, actions]
  );

  return <ClassroomStoreContext.Provider value={value}>{children}</ClassroomStoreContext.Provider>;
}

