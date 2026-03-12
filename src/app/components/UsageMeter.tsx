import { useApp } from '../context/AppContext';
import { Zap, AlertTriangle } from 'lucide-react';

export function UsageMeter() {
  const { usage, tier } = useApp();

  if (tier === 'premium') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-violet-500/10 border border-violet-500/20 rounded-lg">
        <Zap className="w-3.5 h-3.5 text-violet-400" />
        <span className="text-violet-400 text-xs" style={{ fontWeight: 600 }}>Premium</span>
        <span className="text-zinc-500 text-xs">∞ remaining</span>
      </div>
    );
  }

  const pct = usage.limit === Infinity ? 0 : (usage.used / usage.limit) * 100;
  const isNearLimit = pct >= 80;
  const isAtLimit = usage.remaining === 0;

  const barColor = isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-amber-500' : 'bg-emerald-500';
  const textColor = isAtLimit ? 'text-red-400' : isNearLimit ? 'text-amber-400' : 'text-emerald-400';

  return (
    <div className="flex items-center gap-2.5">
      {isAtLimit && <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />}
      <div className="flex flex-col gap-1 min-w-[90px]">
        <div className="flex items-center justify-between">
          <span className={`text-xs ${textColor}`} style={{ fontWeight: 500 }}>
            {usage.used}/{usage.limit === Infinity ? '∞' : usage.limit}
          </span>
          {isAtLimit && (
            <span className="text-red-400 text-xs hidden sm:block">
              {tier === 'anonymous' ? 'Sign in for 50/day' : 'Resets at midnight'}
            </span>
          )}
          {isNearLimit && !isAtLimit && (
            <span className="text-amber-400 text-xs hidden sm:block">{usage.remaining} left</span>
          )}
        </div>
        <div className="h-1.5 w-24 bg-zinc-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
