import { useEffect } from 'react';
import { X, Zap, Lock, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TIERS, TierId } from '../../../shared/tiers.config'; // Adjust path if needed
import { useApp } from '../context/AppContext';
import { auth } from '../../lib/firebase/auth';
import { toast } from 'sonner';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetTier: TierId;
  triggerReason: 'private-repos' | 'premium-sections' | 'usage-limit' | null;
}

export function UpgradeModal({ isOpen, onClose, targetTier, triggerReason }: UpgradeModalProps) {
  const { user, refreshUser } = useApp();

  // Safely get tier config with fallback
  const tierConfig = targetTier && TIERS[targetTier] ? TIERS[targetTier] : TIERS.pro;

  const formattedPrice = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  }).format(tierConfig.priceMonthlyNGN / 100);

  const handleCheckout = async () => {
    if (!user) {
      toast.error('Please sign in to upgrade');
      return;
    }

    const selectedPlan: TierId = targetTier && TIERS[targetTier] ? targetTier : 'pro';
    const planConfig = TIERS[selectedPlan];
    const planCode = planConfig?.paystackPlanCode;

    console.log('🔍 Checkout Debug:', {
      targetTier,
      selectedPlan,
      planCode,
      hasUser: !!user,
      userEmail: user.email,
    });

    if (!planCode) {
      toast.error('Payment configuration error. Please contact support.');
      return;
    }

    try {
      toast.loading('Initializing secure checkout...');

      // ✅ Get Firebase user and token directly from auth instance
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('Not authenticated. Please sign in again.');
      }

      const idToken = await currentUser.getIdToken();

      const res = await fetch('/api/paystack/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          email: currentUser.email || user.email,
          userId: currentUser.uid,
          plan: selectedPlan,
        }),
      });

      const data = await res.json();
      toast.dismiss();

      if (!res.ok || !data.authorization_url) {
        throw new Error(data.error || 'Checkout failed');
      }

      // Open Paystack Inline Popup
      if ((window as any).PaystackPop) {
        const handler = (window as any).PaystackPop.setup({
          key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
          email: currentUser.email || user.email,
          ref: data.reference,
          callback: () => {
            toast.success('🎉 Payment successful! Unlocking features...');
            refreshUser();
            onClose();
          },
          onClose: () => toast.info('Checkout closed'),
        });
        handler.openIframe();
      } else {
        // Fallback to redirect
        window.location.href = data.authorization_url;
      }

    } catch (error) {
      toast.dismiss();
      const errorMessage = error instanceof Error ? error.message : 'Failed to start checkout';
      toast.error(errorMessage);
      console.error('Checkout error:', error);
    }
  };

  const getHeadline = () => {
    switch (triggerReason) {
      case 'private-repos': return 'Unlock Private Repositories';
      case 'premium-sections': return 'Unlock Premium Sections';
      case 'usage-limit': return "You've reached your monthly limit";
      default: return `Upgrade to ${tierConfig.name}`;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl"
          >
            <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300">
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-indigo-500/20 rounded-lg">
                <Zap className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-zinc-100">{getHeadline()}</h2>
                <p className="text-zinc-400 text-sm">Analyze and document your proprietary codebase — safely and securely.</p>
              </div>
            </div>

            {/* Plan Tabs */}
            <div className="grid grid-cols-2 gap-2 mb-6">
              <button className={`p-3 rounded-lg border ${targetTier === 'pro' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>
                <div className="font-semibold">Pro Freelancer</div>
                <div className="text-sm">₦6,000 / mo</div>
              </button>
              <button className={`p-3 rounded-lg border ${targetTier === 'agency' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>
                <div className="font-semibold">Agency Team</div>
                <div className="text-sm">₦35,000 / mo</div>
              </button>
            </div>

            {/* Features List */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>{tierConfig.generationsPerMonth} README generations / month</span>
              </div>
              {tierConfig.allowPrivateRepos && (
                <div className="flex items-center gap-2 text-sm text-zinc-300">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Private repository support</span>
                </div>
              )}
              {tierConfig.premiumSectionsEnabled && (
                <div className="flex items-center gap-2 text-sm text-zinc-300">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Premium sections (API Docs, Architecture, DB Schema)</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Full generation history ({tierConfig.historyDays === Infinity ? 'unlimited' : `${tierConfig.historyDays} days`})</span>
              </div>
              {tierConfig.removeWatermark && (
                <div className="flex items-center gap-2 text-sm text-zinc-300">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>No watermark on generated READMEs</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Priority AI processing</span>
              </div>
            </div>

            {/* Upgrade Button */}
            <button
              onClick={handleCheckout}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4" /> Upgrade to {tierConfig.name}
            </button>

            <p className="text-center text-zinc-600 text-xs mt-4">
              Secured by Paystack • Cancel anytime
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
