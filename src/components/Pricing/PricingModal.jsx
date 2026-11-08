import React, { useEffect, useRef, useState } from 'react';
import { X, Check, Sparkles, Building2, Briefcase, AlertCircle, Crown, RefreshCw, Lock } from 'lucide-react';
import { useClassroomStore } from '../../state/classroomContext';
import { startCheckout } from '../../lib/payments';
import {
  B2C_PLANS, INSTITUTION_PLANS, INSTITUTION_PLAN_ORDER, JOB_RADAR_PRICING, formatPrice, formatBytes,
} from '../../config/pricing';

const REASONS = {
  ai: `You’ve used all ${B2C_PLANS.free.aiGenerations} free AI generations. Upgrade to Pro for unlimited.`,
  storage: `That upload would exceed the ${formatBytes(B2C_PLANS.free.labStorageBytes)} of Lab storage on the Free plan.`,
};

const btn = 'w-full py-2.5 rounded-xl text-xs font-bold transition disabled:cursor-not-allowed';
const devLink = 'w-full text-[10px] text-amber-400/80 hover:text-amber-300 underline underline-offset-2';
const IS_DEV = import.meta.env.DEV;

export default function PricingModal({ onNavigate }) {
  const { pricing, closePricing, subscription, currentUser, institutions, setUserPlan, setInstitutionPlan } = useClassroomStore();
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busyPlan, setBusyPlan] = useState(null); // plan id while creating a checkout session
  const closeRef = useRef(null);

  const isAdmin = currentUser?.role === 'institution_admin';
  const myInstitution = isAdmin ? institutions.find((i) => i.id === currentUser.institutionId) : null;
  const tier = subscription.tier;

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && closePricing();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closePricing]);

  const run = (fn, success) => {
    setError('');
    setNotice('');
    try {
      fn();
      setNotice(success);
    } catch (err) {
      setError(err.message);
    }
  };

  // Real payment: server creates a Stripe/Paystack session and we redirect to it.
  // The plan only changes once the provider's webhook confirms payment.
  const checkout = async (planTier) => {
    setError('');
    setNotice('');
    setBusyPlan(planTier);
    try {
      await startCheckout({
        planTier,
        userId: currentUser.email, // mock accounts have no separate id yet
        userEmail: currentUser.email,
        institutionId: isAdmin ? myInstitution.id : undefined,
      });
      // Navigating away; keep the busy state until the page unloads
    } catch (err) {
      setError(err.message);
      setBusyPlan(null);
    }
  };

  const goToSignIn = () => {
    closePricing();
    onNavigate('classroom');
  };

  // ---- Pro column call-to-action depends on who is looking ----
  let proCta;
  if (!currentUser) proCta = <button onClick={goToSignIn} className={`${btn} bg-indigo-600 hover:bg-indigo-500 text-white`}>Sign in to upgrade</button>;
  else if (isAdmin) proCta = <button disabled className={`${btn} bg-slate-800 text-slate-500`}>Individual plans only</button>;
  else if (subscription.includedVia) proCta = <button disabled className={`${btn} bg-emerald-500/10 text-emerald-400 border border-emerald-500/30`}>Included with {subscription.includedVia}</button>;
  else if (tier === 'pro') proCta = <button disabled className={`${btn} bg-indigo-500/10 text-indigo-300 border border-indigo-500/30`}>Current plan</button>;
  else {
    proCta = (
      <div className="space-y-1.5">
        <button
          onClick={() => checkout('pro')}
          disabled={!!busyPlan}
          className={`${btn} bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-md shadow-indigo-500/30 flex items-center justify-center gap-2 disabled:opacity-70`}
        >
          {busyPlan === 'pro' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
          {busyPlan === 'pro' ? 'Redirecting to secure checkout…' : `Upgrade to Pro: ${formatPrice(B2C_PLANS.pro.priceMonthly)}/mo`}
        </button>
        {IS_DEV && (
          <button onClick={() => run(() => setUserPlan('pro'), 'Simulated: you’re on Pro (no payment taken).')} className={devLink}>
            Simulate upgrade without payment (dev only)
          </button>
        )}
      </div>
    );
  }

  let freeCta;
  if (tier === 'free' && !isAdmin) freeCta = <button disabled className={`${btn} bg-slate-800 text-slate-400`}>Current plan</button>;
  else if (tier === 'pro') {
    // Paid cancellations must go through the provider (Stripe customer portal / Paystack manage link),
    // whose webhook then downgrades the account. Only a dev-only simulation is offered here.
    freeCta = IS_DEV ? (
      <button onClick={() => run(() => setUserPlan('free'), 'Simulated: switched to Free.')} className={`${btn} border border-amber-500/40 text-amber-300 hover:border-amber-400`}>
        Simulate downgrade (dev only)
      </button>
    ) : (
      <button disabled className={`${btn} bg-slate-800 text-slate-500`} title="Manage or cancel from the link in your billing email">
        Manage billing to downgrade
      </button>
    );
  } else freeCta = <button disabled className={`${btn} bg-slate-800 text-slate-500`}>{isAdmin ? 'Individual plans only' : 'Included'}</button>;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto">
      <div role="dialog" aria-modal="true" aria-labelledby="pricing-title" className="w-full max-w-5xl my-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl">
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 id="pricing-title" className="font-extrabold text-lg text-slate-900 dark:text-white">Plans & Pricing</h2>
            <p className="text-xs text-slate-400 mt-0.5">Billed monthly in USD. Cancel anytime.</p>
          </div>
          <button ref={closeRef} onClick={closePricing} aria-label="Close pricing" className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {pricing.reason && REASONS[pricing.reason] && (
            <p role="status" className="flex items-center gap-2 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" /> {REASONS[pricing.reason]}
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
            {/* FREE */}
            <PlanColumn
              title="Free"
              price={formatPrice(B2C_PLANS.free.priceMonthly)}
              blurb="Get started with core career tools."
              features={B2C_PLANS.free.features}
              current={tier === 'free' && !isAdmin}
              cta={freeCta}
            />

            {/* PRO */}
            <PlanColumn
              title="Pro"
              price={formatPrice(B2C_PLANS.pro.priceMonthly)}
              blurb="For active job seekers and inventors."
              features={B2C_PLANS.pro.features}
              highlight
              badge="Most popular"
              current={tier === 'pro' || tier === 'enterprise'}
              cta={proCta}
            />

            {/* B2B */}
            <section className="flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-5 space-y-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" /> B2B Institutions
                </p>
                <p className="text-[11px] text-slate-400 mt-1">Virtual classrooms, course catalogs and rosters. Members of Enterprise schools get Pro features.</p>
              </div>
              <ul className="space-y-2 flex-1">
                {INSTITUTION_PLAN_ORDER.map((id) => {
                  const plan = INSTITUTION_PLANS[id];
                  const isCurrent = myInstitution?.subscription.tier === id;
                  const tooSmall = isAdmin && plan.maxSeats !== null && myInstitution.subscription.currentSeatsUsed > plan.maxSeats;
                  return (
                    <li
                      key={id}
                      className={`rounded-xl border p-3 ${isCurrent ? 'border-emerald-500/60 bg-emerald-500/5' : 'border-slate-200 dark:border-slate-800'}`}
                    >
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{plan.name}</span>
                        <span className="text-sm font-black text-slate-900 dark:text-white">
                          {formatPrice(plan.priceMonthly)}<span className="text-[10px] font-semibold text-slate-500">/mo</span>
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {plan.maxSeats === null ? 'Unlimited students' : `Up to ${plan.maxSeats.toLocaleString()} students`}
                        {plan.streamingHours !== null && ` • ${plan.streamingHours} hrs live streaming`}
                      </p>
                      {isAdmin && (
                        <>
                          <button
                            disabled={isCurrent || tooSmall || !!busyPlan}
                            onClick={() => checkout(id)}
                            title={tooSmall ? `You have ${myInstitution.subscription.currentSeatsUsed} students; this plan allows ${plan.maxSeats}.` : undefined}
                            className={`mt-2 w-full py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 disabled:cursor-not-allowed ${
                              isCurrent
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'border border-slate-700 text-slate-300 hover:border-emerald-500 hover:text-emerald-400 disabled:opacity-50'
                            }`}
                          >
                            {busyPlan === id && <RefreshCw className="w-3 h-3 animate-spin" />}
                            {isCurrent
                              ? `Current plan • ${myInstitution.subscription.currentSeatsUsed} seats used`
                              : busyPlan === id
                              ? 'Redirecting to checkout…'
                              : tooSmall
                              ? 'Too few seats for your roster'
                              : `Subscribe to ${plan.name}`}
                          </button>
                          {IS_DEV && !isCurrent && !tooSmall && (
                            <button
                              onClick={() => run(() => setInstitutionPlan(myInstitution.id, id), `Simulated: ${myInstitution.name} is now on ${plan.name}.`)}
                              className={`${devLink} mt-1`}
                            >
                              Simulate without payment (dev only)
                            </button>
                          )}
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
              {!isAdmin && (
                currentUser ? (
                  <p className="text-[11px] text-slate-500">Institution plans are managed by your school’s admin.</p>
                ) : (
                  <button onClick={goToSignIn} className={`${btn} border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10`}>
                    Register your institution
                  </button>
                )
              )}
            </section>
          </div>

          {(notice || error) && (
            <p role={error ? 'alert' : 'status'} className={`text-xs ${error ? 'text-rose-400' : 'text-emerald-400'}`}>{error || notice}</p>
          )}

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs">
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-indigo-400" /> For employers: Job & Grant Radar
            </span>
            <span className="text-slate-400">
              {JOB_RADAR_PRICING.standardListing.name}: <strong className="text-slate-200">{formatPrice(JOB_RADAR_PRICING.standardListing.price)}/{JOB_RADAR_PRICING.standardListing.unit}</strong>
            </span>
            <span className="text-slate-400">
              {JOB_RADAR_PRICING.featuredBannerAddon.name}: <strong className="text-slate-200">+{formatPrice(JOB_RADAR_PRICING.featuredBannerAddon.price)}</strong>
            </span>
          </div>

          <p className="text-[10px] text-slate-500 text-center flex items-center justify-center gap-1">
            <Lock className="w-3 h-3" /> Payments are handled on Stripe or Paystack’s secure checkout. Your plan updates once payment is confirmed.
          </p>
        </div>
      </div>
    </div>
  );
}

function PlanColumn({ title, price, blurb, features, highlight, badge, current, cta }) {
  return (
    <section
      className={`relative flex flex-col rounded-2xl p-5 space-y-4 border ${
        highlight ? 'border-indigo-500 bg-indigo-500/5 shadow-lg shadow-indigo-500/10' : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950'
      }`}
    >
      {badge && (
        <span className="absolute -top-2.5 left-5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> {badge}
        </span>
      )}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          {highlight && <Crown className="w-3.5 h-3.5 text-indigo-400" />} {title}
          {current && <span className="ml-auto normal-case tracking-normal text-[10px] text-emerald-400">● Your plan</span>}
        </p>
        <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
          {price}<span className="text-xs font-semibold text-slate-500">/mo</span>
        </p>
        <p className="text-[11px] text-slate-400 mt-1">{blurb}</p>
      </div>
      <ul className="space-y-2 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
            <Check className={`w-3.5 h-3.5 shrink-0 mt-px ${highlight ? 'text-indigo-400' : 'text-slate-500'}`} /> {f}
          </li>
        ))}
      </ul>
      {cta}
    </section>
  );
}
