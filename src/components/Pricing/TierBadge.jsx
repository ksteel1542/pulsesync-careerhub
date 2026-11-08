import React from 'react';
import { Crown, Building2, Sparkles } from 'lucide-react';
import { useClassroomStore } from '../../state/classroomContext';
import { INSTITUTION_PLANS } from '../../config/pricing';

const pill = 'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider whitespace-nowrap border';

/** Header badge: the viewer's current tier plus an upgrade / manage entry point. */
export default function TierBadge() {
  const { subscription, currentUser, institutions, openPricing } = useClassroomStore();

  // Institution admins see their school's B2B plan and seat usage
  if (currentUser?.role === 'institution_admin') {
    const inst = institutions.find((i) => i.id === currentUser.institutionId);
    const { tier, maxSeats, currentSeatsUsed } = inst.subscription;
    return (
      <button
        onClick={() => openPricing()}
        title="Manage institution plan"
        className={`${pill} bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20`}
      >
        <Building2 className="w-3 h-3" /> {INSTITUTION_PLANS[tier].name} plan
        <span className="normal-case tracking-normal font-semibold text-emerald-300/80">
          {currentSeatsUsed}/{maxSeats === null ? '∞' : maxSeats.toLocaleString()} seats
        </span>
      </button>
    );
  }

  if (subscription.tier === 'free') {
    const left = subscription.aiGenerationsLeft;
    return (
      <div className="flex items-center gap-1.5">
        <span
          className={`${pill} bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 border-slate-200 dark:border-slate-700`}
          title={`${left} AI generation${left === 1 ? '' : 's'} left on the Free plan`}
        >
          Free tier
          <span className={`normal-case tracking-normal font-semibold ${left === 0 ? 'text-rose-400' : 'text-slate-400'}`}>
            {left} AI left
          </span>
        </span>
        <button
          onClick={() => openPricing()}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-md shadow-indigo-500/20"
        >
          <Sparkles className="w-3 h-3" /> <span className="hidden xl:inline">Upgrade to</span> Pro
        </button>
      </div>
    );
  }

  const enterprise = subscription.tier === 'enterprise';
  return (
    <button
      onClick={() => openPricing()}
      title={enterprise ? `Pro features included with ${subscription.includedVia}` : 'Manage your plan'}
      className={`${pill} ${
        enterprise
          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
          : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/40 hover:bg-indigo-500/20'
      }`}
    >
      {enterprise ? <Building2 className="w-3 h-3" /> : <Crown className="w-3 h-3" />} {enterprise ? 'Enterprise' : 'Pro'}
    </button>
  );
}
