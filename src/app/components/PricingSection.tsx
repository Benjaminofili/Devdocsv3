import { usePaystackCheckout } from '../../hooks/usePaystackCheckout';
import { useApp } from '../context/AppContext';
import { toast } from 'sonner';
import { CheckCircle, Zap } from 'lucide-react';

export function PricingSection() {
  const { user, tier } = useApp();
  const { initializeCheckout, isLoading, error } = usePaystackCheckout();

  const handleUpgrade = async () => {
    if (!user || !user.email) {
      toast.error("Please log in with GitHub first!");
      return;
    }

    await initializeCheckout({
      email: user.email,
      amount: 600000, // ₦6,000 in Kobo
      userId: user.id,
    });
  };

  if (tier === 'premium') {
    return (
      <div className="p-8 bg-zinc-900 border border-violet-500/30 rounded-2xl text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-violet-500/20 flex items-center justify-center mx-auto">
          <Zap className="w-8 h-8 text-violet-400" />
        </div>
        <h3 className="text-2xl text-zinc-100" style={{ fontWeight: 700 }}>You are a Premium Member!</h3>
        <p className="text-zinc-400 max-w-sm mx-auto">Enjoy unlimited generations, all README sections, and priority support.</p>
      </div>
    );
  }

  return (
    <div className="p-8 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl text-zinc-100" style={{ fontWeight: 700 }}>DevDocs Premium</h3>
          <p className="text-zinc-500 text-sm mt-1">Unlock the full power of AI documentation</p>
        </div>
        <div className="text-right">
          <p className="text-3xl text-zinc-100" style={{ fontWeight: 700 }}>₦6,000</p>
          <p className="text-zinc-500 text-xs">per month</p>
        </div>
      </div>

      <ul className="grid sm:grid-cols-2 gap-3">
        {[
          'Unlimited generations',
          'All 20+ README sections',
          'Unlimited saved READMEs',
          'Private repository support',
          'Custom documentation templates',
          'Priority AI processing'
        ].map(feature => (
          <li key={feature} className="flex items-center gap-2.5 text-zinc-400 text-sm">
            <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            {feature}
          </li>
        ))}
      </ul>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs text-center">
          {error}
        </div>
      )}

      <button 
        onClick={handleUpgrade} 
        disabled={isLoading}
        className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-xl transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
        style={{ fontWeight: 600 }}
      >
        {isLoading ? (
          <>
            <span className="w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
            Initializing Checkout...
          </>
        ) : (
          <>
            <Zap className="w-4 h-4" />
            Upgrade to Premium Now
          </>
        )}
      </button>
      
      <p className="text-center text-zinc-600 text-xs">
        Secure payment powered by Paystack. Cancel anytime.
      </p>
    </div>
  );
}
