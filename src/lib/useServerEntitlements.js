import { useEffect } from 'react';
import { useClassroomStore } from '../state/classroomContext';

/**
 * When someone signs in, ask the payments server for their confirmed subscription
 * (written by the Stripe/Paystack webhook) and apply it to the local store.
 * The server is the source of truth for paid plans; failures are silent so the
 * app still works when the payments server isn't running.
 */
export function useServerEntitlements() {
  const { currentUser, setUserPlan, setInstitutionPlan } = useClassroomStore();
  const email = currentUser?.email;
  const role = currentUser?.role;
  const institutionId = currentUser?.institutionId;

  useEffect(() => {
    if (!email) return undefined;
    const ctrl = new AbortController();
    const isAdmin = role === 'institution_admin';
    const query = isAdmin ? `institutionId=${encodeURIComponent(institutionId)}` : `userId=${encodeURIComponent(email)}`;

    fetch(`/api/payments/subscription?${query}`, { signal: ctrl.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const sub = data?.subscription;
        if (!sub?.tier) return;
        try {
          if (isAdmin) setInstitutionPlan(institutionId, sub.tier);
          else if (sub.tier === 'pro' || sub.tier === 'free') setUserPlan(sub.tier);
        } catch {
          /* e.g. Pro already included via an Enterprise institution: nothing to apply */
        }
      })
      .catch(() => {
        /* server offline or aborted: keep local state */
      });
    return () => ctrl.abort();
  }, [email, role, institutionId, setUserPlan, setInstitutionPlan]);
}
