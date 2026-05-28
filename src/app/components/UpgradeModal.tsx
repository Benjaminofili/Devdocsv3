import { useState } from 'react';
import { X, Lock, Zap, CheckCircle, ArrowRight, Shield, GitBranch, Layers } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { usePaystackCheckout } from '../../hooks/usePaystackCheckout';
import { TIERS, type TierId } from '../../../shared/tiers.config';

// ─── Reason-specific copy ────────────────────────────────────────────────────
const REASON_COPY: Record<string, { headline: string; subline: string; icon: typeof Lock }> = {
  'private-repos': {
    headline: 'Unlock Private Repositories',
    subline: 'Analyze and document your proprietary codebase — safely and securely.',
    icon: Lock,
  },
  'premium-sections': {
    headline: 'Unlock Premium Sections',
    subline: 'Generate API docs, architecture diagrams, and database schema documentation.',
    icon: Layers,
  },
  'usage-limit': {
    headline: 'Monthly Limit Reached',
    subline: 'You\'ve used all your free generations this month. Upgrade to keep building.',
    icon: Zap,
  },
};

// ─── Per-tier feature lists ───────────────────────────────────────────────────
const TIER_FEATURES: Record<string, string[]> = {
  pro: [
    '100 README generations / month',
    'Private repository support',
    'Premium sections (API Docs, Architecture, DB Schema)',
    'Full generation history (1 year)',
    'No watermark on generated READMEs',
    'Priority AI processing',
  ],
  agency: [
    '500 README generations / month',
    'Everything in Pro',
    'Unlimited generation history',
    'Team-friendly usage',
    'Dedicated support',
  ],
};

// ─── Props ────────────────────────────────────────────────────────────────────
interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetTier: TierId;
  triggerReason: 'private-repos' | 'premium-sections' | 'usage-limit' | null;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function UpgradeModal({ isOpen, onClose, targetTier, triggerReason }: UpgradeModalProps) {
  const { user } = useApp();
  const { initializeCheckout, isLoading, error } = usePaystackCheckout();
  const [selectedTier, setSelectedTier] = useState<'pro' | 'agency'>(
    targetTier === 'agency' ? 'agency' : 'pro',
  );

  if (!isOpen) return null;

  const tierConfig = TIERS[selectedTier];
  const reason = triggerReason ? REASON_COPY[triggerReason] : REASON_COPY['usage-limit'];
  const ReasonIcon = reason.icon;

  const handleUpgrade = async () => {
    if (!user?.email) {
      return;
    }
    await initializeCheckout({
      email: user.email,
      amount: tierConfig.priceMonthlyNGN,
      userId: user.id,
      plan: tierConfig.paystackPlanCode,
    });
  };

  const formatPrice = (kobo: number) => {
    return `₦${(kobo / 100).toLocaleString('en-NG')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-md shadow-2xl shadow-black/60 overflow-hidden">
        {/* Gradient accent top bar */}
        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />

        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/30 flex items-center justify-center">
              <ReasonIcon className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-zinc-100 text-base" style={{ fontWeight: 700 }}>
                {reason.headline}
              </h2>
              <p className="text-zinc-500 text-xs mt-0.5 max-w-xs">{reason.subline}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 pb-6 space-y-5">
          {/* Tier Selector */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-800/60 rounded-xl border border-zinc-700/50">
            {(['pro', 'agency'] as const).map((tier) => (
              <button
                key={tier}
                onClick={() => setSelectedTier(tier)}
                className={`relative flex flex-col items-center py-2.5 px-3 rounded-lg text-sm transition-all ${
                  selectedTier === tier
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                    : 'text-zinc-400 hover:text-zinc-300'
                }`}
                style={{ fontWeight: selectedTier === tier ? 600 : 400 }}
              >
                <span>{TIERS[tier].name}</span>
                <span className={`text-xs mt-0.5 ${selectedTier === tier ? 'text-indigo-200' : 'text-zinc-600'}`}>
                  {formatPrice(TIERS[tier].priceMonthlyNGN)} / mo
                </span>
              </button>
            ))}
          </div>

          {/* Features */}
          <ul className="space-y-2.5">
            {(TIER_FEATURES[selectedTier] ?? []).map((feature) => (
              <li key={feature} className="flex items-center gap-3 text-sm text-zinc-300">
                <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                {feature}
              </li>
            ))}
          </ul>

          {/* No user logged in warning */}
          {!user && (
            <div className="flex items-center gap-2.5 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <Shield className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <p className="text-amber-300 text-xs">
                Please <span className="font-semibold">log in with GitHub</span> first to upgrade your account.
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs text-center">
              {error}
            </div>
          )}

          {/* CTA */}
          <button
            onClick={handleUpgrade}
            disabled={isLoading || !user}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:from-zinc-700 disabled:to-zinc-700 disabled:text-zinc-500 text-white rounded-xl transition-all shadow-lg shadow-indigo-500/20 disabled:shadow-none"
            style={{ fontWeight: 600 }}
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Redirecting to Paystack…
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Upgrade to {TIERS[selectedTier].name}
                <ArrowRight className="w-4 h-4 ml-auto" />
              </>
            )}
          </button>

          {/* Trust footer */}
          <div className="flex items-center justify-center gap-4 pt-1">
            <div className="flex items-center gap-1.5 text-zinc-600 text-xs">
              <Shield className="w-3 h-3" />
              <span>Secured by Paystack</span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-600 text-xs">
              <GitBranch className="w-3 h-3" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
