import { useState } from 'react';
import { X, Lock, Zap, Heart, Briefcase, CheckCircle, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';

const FEATURE_LABELS: Record<string, string> = {
  'private-repos': 'Private Repository Analysis',
  'premium-ai': 'Premium AI Models',
  'unlimited-generations': 'Unlimited Generations',
  'version-history': 'Version History',
  'custom-templates': 'Custom Templates',
  'team-features': 'Team Features',
  'export-formats': 'Multiple Export Formats',
  'advanced-sections': 'Advanced README Sections',
};

type Step = 'form' | 'followup' | 'success';
type Value = 'nice' | 'timesaver' | 'need';

export function WaitlistModal() {
  const { waitlistOpen, waitlistFeature, closeWaitlist, user } = useApp();
  const [step, setStep] = useState<Step>('form');
  const [email, setEmail] = useState(user ? 'demo@example.com' : '');
  const [useCase, setUseCase] = useState('');
  const [value, setValue] = useState<Value | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!waitlistOpen) return null;

  const featureLabel = FEATURE_LABELS[waitlistFeature] || waitlistFeature;

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 800));
    setSubmitting(false);
    setStep('followup');
  };

  const handleValueSelect = async (v: Value) => {
    setValue(v);
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 600));
    setSubmitting(false);
    setStep('success');
  };

  const handleClose = () => {
    closeWaitlist();
    setTimeout(() => { setStep('form'); setEmail(user ? 'demo@example.com' : ''); setUseCase(''); setValue(null); }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md shadow-2xl shadow-black/50">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
              <Lock className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <p className="text-zinc-100 text-sm" style={{ fontWeight: 600 }}>Premium Feature</p>
              <p className="text-zinc-500 text-xs">{featureLabel}</p>
            </div>
          </div>
          <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          {step === 'form' && (
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <p className="text-zinc-300 text-sm mb-4">
                  Join the waitlist to get early access to <span className="text-indigo-400">{featureLabel}</span> and other premium features.
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-zinc-400 text-xs uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div className="space-y-2">
                <label className="text-zinc-400 text-xs uppercase tracking-wider">What would you use this for? <span className="text-zinc-600 normal-case">(optional)</span></label>
                <textarea
                  value={useCase}
                  onChange={e => setUseCase(e.target.value)}
                  placeholder="e.g., I manage 20+ repos and need to keep docs up to date..."
                  rows={3}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : null}
                {submitting ? 'Joining...' : 'Join Waitlist'}
              </button>
            </form>
          )}

          {step === 'followup' && (
            <div className="space-y-4">
              <p className="text-zinc-300 text-sm">
                One quick question — how valuable would <span className="text-indigo-400">{featureLabel}</span> be to you?
              </p>
              <div className="space-y-3">
                {[
                  { id: 'nice' as Value, icon: Heart, label: 'Nice-to-have', desc: 'Would be cool but not urgent', color: 'zinc' },
                  { id: 'timesaver' as Value, icon: Zap, label: 'Time-saver', desc: 'Would noticeably improve my workflow', color: 'amber' },
                  { id: 'need' as Value, icon: Briefcase, label: 'Need it for work', desc: 'Blocking me or my team right now', color: 'indigo' },
                ].map(({ id, icon: Icon, label, desc, color }) => (
                  <button
                    key={id}
                    onClick={() => handleValueSelect(id)}
                    disabled={submitting}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left
                      ${value === id
                        ? `border-${color === 'indigo' ? 'indigo' : color === 'amber' ? 'amber' : 'zinc'}-500 bg-${color === 'indigo' ? 'indigo' : color === 'amber' ? 'amber' : 'zinc'}-500/10`
                        : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                      } disabled:opacity-50`}
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 ${color === 'indigo' ? 'text-indigo-400' : color === 'amber' ? 'text-amber-400' : 'text-zinc-400'}`} />
                    <div>
                      <p className="text-zinc-200 text-sm" style={{ fontWeight: 500 }}>{label}</p>
                      <p className="text-zinc-500 text-xs">{desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center space-y-4 py-2">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto">
                <CheckCircle className="w-7 h-7 text-emerald-400" />
              </div>
              <div>
                <p className="text-zinc-100 text-base" style={{ fontWeight: 600 }}>You're on the list!</p>
                <p className="text-zinc-400 text-sm mt-1">We'll notify you when {featureLabel} becomes available.</p>
              </div>
              <div className="flex items-center justify-center gap-2 py-3 px-4 bg-zinc-800 rounded-xl border border-zinc-700">
                <Users className="w-4 h-4 text-indigo-400" />
                <span className="text-zinc-300 text-sm"><span className="text-indigo-400" style={{ fontWeight: 600 }}>247 developers</span> waiting for this feature</span>
              </div>
              <button
                onClick={handleClose}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg py-2.5 text-sm transition-colors border border-zinc-700"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
