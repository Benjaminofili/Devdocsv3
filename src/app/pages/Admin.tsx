import { useState } from 'react';
import {
  Users, Zap, FileText, TrendingUp, Shield, Github,
  AlertCircle, BarChart3, Activity, Clock, RefreshCw, Star
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { useApp } from '../context/AppContext';
import { Link } from 'react-router';

const STATS = {
  totalUsers: 1247,
  anonymousUsers: 893,
  freeUsers: 321,
  premiumUsers: 33,
  totalGenerations: 28463,
  generationsToday: 847,
  savedReadmes: 4210,
  waitlistEntries: 247,
};

const DAILY_GENERATIONS = [
  { day: 'Mon', gens: 620 },
  { day: 'Tue', gens: 750 },
  { day: 'Wed', gens: 811 },
  { day: 'Thu', gens: 700 },
  { day: 'Fri', gens: 940 },
  { day: 'Sat', gens: 520 },
  { day: 'Sun', gens: 470 },
];

const WEEKLY_USERS = [
  { week: 'W1', users: 180 },
  { week: 'W2', users: 240 },
  { week: 'W3', users: 310 },
  { week: 'W4', users: 290 },
  { week: 'W5', users: 380 },
  { week: 'W6', users: 420 },
  { week: 'W7', users: 510 },
  { week: 'W8', users: 610 },
];

const POPULAR_STACKS = [
  { name: 'Next.js', count: 4821, pct: 17 },
  { name: 'React', count: 3944, pct: 14 },
  { name: 'Node.js / Express', count: 3102, pct: 11 },
  { name: 'Python / FastAPI', count: 2800, pct: 10 },
  { name: 'Vue.js', count: 1920, pct: 7 },
  { name: 'Django', count: 1450, pct: 5 },
  { name: 'Laravel', count: 1200, pct: 4 },
];

const WAITLIST = [
  { feature: 'private-repos', label: 'Private Repositories', count: 89 },
  { feature: 'custom-templates', label: 'Custom Templates', count: 64 },
  { feature: 'team-features', label: 'Team Features', count: 47 },
  { feature: 'premium-ai', label: 'Premium AI Models', count: 31 },
  { feature: 'export-formats', label: 'Multiple Export Formats', count: 16 },
];

const RECENT_USERS = [
  { name: 'Sarah Chen', username: 'schen', tier: 'free', joined: '2h ago', gens: 8 },
  { name: 'Marcus Webb', username: 'marcwebb', tier: 'premium', joined: '4h ago', gens: 34 },
  { name: 'Priya Singh', username: 'psingh', tier: 'free', joined: '6h ago', gens: 3 },
  { name: 'Anon user', username: '—', tier: 'anonymous', joined: '8h ago', gens: 5 },
  { name: 'Tom Rivera', username: 'tomr', tier: 'free', joined: '12h ago', gens: 12 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm">
      <p className="text-zinc-400 text-xs mb-1">{label}</p>
      <p className="text-zinc-100" style={{ fontWeight: 600 }}>{payload[0].value.toLocaleString()}</p>
    </div>
  );
};

export function Admin() {
  const { tier } = useApp();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 1000));
    setRefreshing(false);
  };

  if (tier !== 'premium') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-5">
          <Shield className="w-8 h-8 text-zinc-600" />
        </div>
        <h2 className="text-zinc-100 text-2xl mb-2" style={{ fontWeight: 700 }}>Admin access required</h2>
        <p className="text-zinc-400 max-w-md mb-6">This panel is restricted to admin users. Switch to Premium tier in the demo to preview.</p>
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400" />
          <span className="text-amber-400 text-sm">Use the Demo Tier switcher in the header to preview</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-zinc-100 text-2xl" style={{ fontWeight: 700 }}>Admin Panel</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Platform overview and usage statistics</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            All systems operational
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors text-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: STATS.totalUsers.toLocaleString(), sub: `+24 today`, icon: Users, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' },
          { label: 'Generations Today', value: STATS.generationsToday.toLocaleString(), sub: `${STATS.totalGenerations.toLocaleString()} total`, icon: Zap, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
          { label: 'Saved READMEs', value: STATS.savedReadmes.toLocaleString(), sub: 'across all users', icon: FileText, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
          { label: 'Waitlist Entries', value: STATS.waitlistEntries.toString(), sub: 'premium interest', icon: Star, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
        ].map(({ label, value, sub, icon: Icon, color, bg }) => (
          <div key={label} className="p-5 bg-zinc-900 border border-zinc-800 rounded-xl">
            <div className={`w-9 h-9 rounded-lg border flex items-center justify-center mb-3 ${bg}`}>
              <Icon className={`w-4.5 h-4.5 ${color}`} style={{ width: 18, height: 18 }} />
            </div>
            <p className="text-zinc-100 text-2xl" style={{ fontWeight: 700 }}>{value}</p>
            <p className="text-zinc-500 text-xs mt-0.5">{label}</p>
            <p className="text-zinc-600 text-xs mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* User tier breakdown */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { tier: 'Anonymous', count: STATS.anonymousUsers, pct: Math.round((STATS.anonymousUsers / STATS.totalUsers) * 100), color: 'bg-zinc-600', textColor: 'text-zinc-400' },
          { tier: 'Free', count: STATS.freeUsers, pct: Math.round((STATS.freeUsers / STATS.totalUsers) * 100), color: 'bg-indigo-500', textColor: 'text-indigo-400' },
          { tier: 'Premium', count: STATS.premiumUsers, pct: Math.round((STATS.premiumUsers / STATS.totalUsers) * 100), color: 'bg-violet-500', textColor: 'text-violet-400' },
        ].map(({ tier: t, count, pct, color, textColor }) => (
          <div key={t} className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <span className={`text-sm ${textColor}`} style={{ fontWeight: 600 }}>{t}</span>
              <span className="text-zinc-400 text-sm">{count.toLocaleString()} users</span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
            </div>
            <p className="text-zinc-600 text-xs mt-2">{pct}% of total</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Daily Generations */}
        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 className="w-4 h-4 text-indigo-400" />
            <span className="text-zinc-200 text-sm" style={{ fontWeight: 600 }}>Generations This Week</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={DAILY_GENERATIONS} barSize={28}>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} cursor={false} />
              <Bar dataKey="gens" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* User Growth */}
        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-zinc-200 text-sm" style={{ fontWeight: 600 }}>User Growth (8 Weeks)</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={WEEKLY_USERS}>
              <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} />
              <YAxis hide />
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="users"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, fill: '#10b981', strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Popular stacks + Waitlist */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Popular stacks */}
        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-violet-400" />
            <span className="text-zinc-200 text-sm" style={{ fontWeight: 600 }}>Popular Stacks</span>
          </div>
          <div className="space-y-3">
            {POPULAR_STACKS.map(({ name, count, pct }) => (
              <div key={name} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-300">{name}</span>
                  <span className="text-zinc-500 text-xs">{count.toLocaleString()} · {pct}%</span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full"
                    style={{ width: `${pct * 5}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Waitlist */}
        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-400" />
            <span className="text-zinc-200 text-sm" style={{ fontWeight: 600 }}>Feature Waitlist</span>
          </div>
          <div className="space-y-3">
            {WAITLIST.map(({ feature, label, count }) => (
              <div key={feature} className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl">
                <div className="flex-1">
                  <p className="text-zinc-300 text-sm">{label}</p>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/15 rounded-lg">
                  <Users className="w-3 h-3 text-amber-400" />
                  <span className="text-amber-400 text-xs" style={{ fontWeight: 600 }}>{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Users */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 p-5 border-b border-zinc-800">
          <Users className="w-4 h-4 text-indigo-400" />
          <span className="text-zinc-200 text-sm" style={{ fontWeight: 600 }}>Recent Users</span>
        </div>
        <div className="divide-y divide-zinc-800">
          {RECENT_USERS.map((u, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/40 to-violet-500/40 border border-zinc-700 flex items-center justify-center text-zinc-300 text-xs" style={{ fontWeight: 700 }}>
                {u.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-zinc-200 text-sm" style={{ fontWeight: 500 }}>{u.name}</p>
                {u.username !== '—' && <p className="text-zinc-600 text-xs">@{u.username}</p>}
              </div>
              <span className={`px-2 py-0.5 rounded text-xs hidden sm:block ${
                u.tier === 'premium' ? 'bg-violet-500/20 text-violet-400' :
                u.tier === 'free' ? 'bg-indigo-500/20 text-indigo-400' :
                'bg-zinc-700 text-zinc-400'
              }`}>{u.tier}</span>
              <div className="flex items-center gap-1.5 text-zinc-500 text-xs">
                <Zap className="w-3 h-3" /> {u.gens} gens
              </div>
              <div className="flex items-center gap-1.5 text-zinc-600 text-xs hidden md:flex">
                <Clock className="w-3 h-3" /> {u.joined}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
