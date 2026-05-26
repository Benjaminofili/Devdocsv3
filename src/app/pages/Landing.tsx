import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { motion } from 'motion/react';
import {
  ArrowRight, Github, Zap, CheckCircle, Code2, Layers, FileText,
  GitBranch, Terminal, Sparkles, Clock, Users, Star, ChevronRight,
  Package, Shield, Globe
} from 'lucide-react';

import type { FileContent } from '../../api/analyze';
import { DevDocsIcon } from '../components/DevDocsIcon';
import { SEOHead } from '../components/SEOHead';

const MOCK_TERMINAL_LINES = [
  { type: 'cmd',     text: '$ devdocs generate github.com/user/my-api' },
  { type: 'info',    text: '→ Analyzing repository...' },
  { type: 'success', text: '✓ Stack detected: Node.js + Express + TypeScript' },
  { type: 'info',    text: '→ Generating sections...' },
  { type: 'success', text: '✓ Header & Badges' },
  { type: 'success', text: '✓ Installation Guide' },
  { type: 'success', text: '✓ API Documentation' },
  { type: 'success', text: '✓ Environment Variables' },
  { type: 'success', text: '✓ Docker Setup' },
  { type: 'done',    text: '🎉 README.md generated in 12s' },
];

const LINE_DELAYS_MS = [0, 900, 1600, 2500, 3200, 3900, 4600, 5300, 6000, 7000];
const RESET_AFTER_MS = 11000;

function AnimatedTerminal() {
  const [visibleCount, setVisibleCount] = useState(0);
  const iterRef = useRef(0);

  useEffect(() => {
    const id = ++iterRef.current;
    setVisibleCount(0);

    const timers: ReturnType<typeof setTimeout>[] = [];

    MOCK_TERMINAL_LINES.forEach((_, i) => {
      timers.push(
        setTimeout(() => {
          if (iterRef.current !== id) return;
          setVisibleCount(i + 1);
        }, LINE_DELAYS_MS[i])
      );
    });

    const resetTimer = setTimeout(() => {
      if (iterRef.current !== id) return;
      iterRef.current++;
      setVisibleCount(0);
      // restart
      setTimeout(() => {
        if (iterRef.current === id + 1) iterRef.current = id; // re-trigger useEffect by bumping state indirectly
        setVisibleCount(v => (v === 0 ? -1 : 0)); // force re-render
      }, 200);
    }, RESET_AFTER_MS);

    timers.push(resetTimer);
    return () => timers.forEach(clearTimeout);
  }, [visibleCount === -1 ? -1 : 0]); // eslint-disable-line

  // Simpler loop: re-run effect by tracking a "cycle" number
  return null; // handled below
}

// Self-contained looping terminal
function LoopingTerminal() {
  const [cycle, setCycle] = useState(0);
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    setVisibleCount(0);
    const timers: ReturnType<typeof setTimeout>[] = [];

    MOCK_TERMINAL_LINES.forEach((_, i) => {
      timers.push(
        setTimeout(() => setVisibleCount(i + 1), LINE_DELAYS_MS[i])
      );
    });

    // reset and loop
    timers.push(
      setTimeout(() => {
        setCycle(c => c + 1);
      }, RESET_AFTER_MS)
    );

    return () => timers.forEach(clearTimeout);
  }, [cycle]);

  const lineColors: Record<string, string> = {
    cmd:     'text-zinc-200',
    info:    'text-zinc-500',
    success: 'text-emerald-400',
    done:    'text-indigo-400',
  };

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-2xl overflow-hidden shadow-2xl shadow-black/60">
      {/* Terminal header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-zinc-800 border-b border-zinc-700">
        <div className="w-3 h-3 rounded-full bg-red-500/80" />
        <div className="w-3 h-3 rounded-full bg-amber-500/80" />
        <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
        <span className="ml-2 text-zinc-500 text-xs font-mono">devdocs terminal</span>
      </div>
      {/* Terminal content */}
      <div className="p-4 font-mono text-sm space-y-1.5 min-h-[280px]">
        {MOCK_TERMINAL_LINES.slice(0, visibleCount).map((line, i) => (
          <motion.div
            key={`${cycle}-${i}`}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25 }}
            className={`${lineColors[line.type]} ${line.type === 'done' ? 'mt-3' : ''}`}
          >
            {line.text}
          </motion.div>
        ))}
        {/* Blinking cursor */}
        <div className="flex items-center gap-1 mt-2">
          <span className="text-zinc-500">$</span>
          <span className="w-2 h-4 bg-indigo-400 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

const FEATURES = [
  {
    icon: Zap,
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10 border-indigo-500/20',
    title: 'AI Stack Detection',
    desc: 'Automatically detects frameworks, languages, package managers, Docker, CI/CD, testing setups, and more from your repo.',
  },
  {
    icon: Shield,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    title: 'Standards-Compliant',
    desc: 'Generates README files that follow community best practices — badges, proper structure, clear setup instructions.',
  },
  {
    icon: Globe,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10 border-violet-500/20',
    title: 'Production-Ready',
    desc: 'No generic placeholder text. Real content based on your actual codebase, ready to push without edits.',
  },
];

const HOW_IT_WORKS = [
  { step: '01', icon: Github, title: 'Paste Your Repo URL', desc: 'Enter any public GitHub repo link or pick from your repos if signed in.' },
  { step: '02', icon: Layers, title: 'Review Stack Detection', desc: 'AI scans your codebase and identifies your tech stack, tools, and project structure.' },
  { step: '03', icon: CheckCircle, title: 'Choose Sections', desc: 'Pick which README sections to generate. Required, recommended, and premium options.' },
  { step: '04', icon: Sparkles, title: 'Get Your README', desc: 'Preview, edit, copy, or download your professional README in seconds.' },
];

const TIERS = [
  {
    name: 'Anonymous',
    price: 'Free',
    desc: 'No sign up needed',
    color: 'border-zinc-700',
    badge: 'bg-zinc-700 text-zinc-300',
    highlight: false,
    features: ['5 generations / day', '6 basic sections', 'No account required', 'Copy & download'],
    cta: 'Start Generating',
    ctaStyle: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200',
  },
  {
    name: 'Free',
    price: 'Free',
    desc: 'Sign in with GitHub',
    color: 'border-indigo-500/50',
    badge: 'bg-indigo-500/20 text-indigo-300',
    highlight: true,
    features: ['50 generations / day', '12 sections', 'Save up to 10 READMEs', 'Generation history', 'Repo picker'],
    cta: 'Sign in with GitHub',
    ctaStyle: 'bg-indigo-600 hover:bg-indigo-500 text-white',
  },
  {
    name: 'Premium',
    price: 'Coming Soon',
    desc: 'Join the waitlist',
    color: 'border-violet-500/40',
    badge: 'bg-violet-500/20 text-violet-300',
    highlight: false,
    features: ['Unlimited generations', 'All sections', 'Unlimited saves', 'Private repos', 'Custom templates', 'Team features'],
    cta: 'Join Waitlist',
    ctaStyle: 'bg-violet-600/30 hover:bg-violet-600/50 text-violet-300 border border-violet-500/30',
  },
];

const STATS = [
  { value: '12,400+', label: 'READMEs Generated' },
  { value: '340ms',   label: 'Avg. Detection Time' },
  { value: '98%',     label: 'Accuracy Rate' },
  { value: '50+',     label: 'Stacks Supported' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as any } },
};

const stagger = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.1 } },
};

export function Landing() {
  return (
    <div className="text-zinc-100">
      <SEOHead
        title="AI-Powered README Generator"
        description="Generate professional README files for your GitHub repositories in seconds. AI-powered stack detection, best-practice templates, and instant markdown output."
        path="/"
      />
      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/30 via-zinc-950 to-zinc-950" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        {/* Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-16 pb-20 sm:pt-24 sm:pb-28">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left content */}
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-xs">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI-Powered README Generation</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl text-zinc-50" style={{ fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.05 }}>
                Stop writing<br />
                <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-400 bg-clip-text text-transparent">
                  READMEs from scratch
                </span>
              </h1>

              <p className="text-zinc-400 text-lg leading-relaxed max-w-lg">
                Paste a GitHub URL. Get a professional README in seconds. Built for junior developers who aren't sure where to start, and senior devs who don't have time.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  to="/generate"
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30"
                  style={{ fontWeight: 600 }}
                >
                  <Zap className="w-4 h-4" />
                  Generate README Free
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="https://github.com/yourusername/devdocs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-colors border border-zinc-700"
                  style={{ fontWeight: 500 }}
                >
                  <Github className="w-4 h-4" />
                  View on GitHub
                </a>
              </div>

              <div className="flex items-center gap-6 text-sm text-zinc-500">
                <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-emerald-500" /> No signup needed</span>
                <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-emerald-500" /> 5 free/day</span>
                <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-emerald-500" /> Instant results</span>
              </div>
            </motion.div>

            {/* Right - Animated Terminal */}
            <motion.div
              className="relative"
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut', delay: 0.15 }}
            >
              <LoopingTerminal />
              {/* Glow under terminal */}
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-3/4 h-12 bg-indigo-600/20 blur-xl rounded-full" />
            </motion.div>
          </div>

          {/* Stats */}
          <motion.div
            className="mt-16 pt-10 border-t border-zinc-800 grid grid-cols-2 sm:grid-cols-4 gap-6"
            variants={stagger}
            initial="hidden"
            animate="show"
          >
            {STATS.map(({ value, label }) => (
              <motion.div key={label} className="text-center" variants={fadeUp}>
                <p className="text-2xl text-zinc-100" style={{ fontWeight: 700 }}>{value}</p>
                <p className="text-zinc-500 text-sm mt-0.5">{label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 border-t border-zinc-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            className="text-center mb-12"
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
          >
            <p className="text-indigo-400 text-sm mb-3" style={{ fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Features</p>
            <h2 className="text-3xl sm:text-4xl text-zinc-100" style={{ fontWeight: 700, letterSpacing: '-0.03em' }}>Everything you need</h2>
            <p className="text-zinc-400 text-lg mt-3 max-w-xl mx-auto">From stack detection to polished output — no configuration needed.</p>
          </motion.div>
          <motion.div
            className="grid md:grid-cols-3 gap-6"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
          >
            {FEATURES.map(({ icon: Icon, color, bg, title, desc }) => (
              <motion.div
                key={title}
                variants={fadeUp}
                className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-zinc-700 transition-colors group"
              >
                <div className={`w-11 h-11 rounded-xl border flex items-center justify-center mb-4 ${bg}`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <h3 className="text-zinc-100 mb-2" style={{ fontWeight: 600 }}>{title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 border-t border-zinc-800/50 bg-zinc-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            className="text-center mb-14"
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
          >
            <p className="text-emerald-400 text-sm mb-3" style={{ fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>How it works</p>
            <h2 className="text-3xl sm:text-4xl text-zinc-100" style={{ fontWeight: 700, letterSpacing: '-0.03em' }}>Four steps to a better README</h2>
          </motion.div>
          <motion.div
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
          >
            {HOW_IT_WORKS.map(({ step, icon: Icon, title, desc }, i) => (
              <motion.div key={step} className="relative group" variants={fadeUp}>
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden lg:block absolute top-6 left-[calc(100%-1px)] w-full h-px bg-gradient-to-r from-zinc-700 to-transparent z-10" />
                )}
                <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-zinc-700 transition-colors h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/20 flex items-center justify-center">
                      <Icon className="w-4.5 h-4.5 text-indigo-400" style={{ width: 18, height: 18 }} />
                    </div>
                    <span className="text-zinc-600 text-xs font-mono">{step}</span>
                  </div>
                  <h3 className="text-zinc-100 mb-2 text-sm" style={{ fontWeight: 600 }}>{title}</h3>
                  <p className="text-zinc-500 text-sm leading-relaxed">{desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Tiers */}
      <section className="py-20 border-t border-zinc-800/50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <motion.div
            className="text-center mb-12"
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
          >
            <p className="text-violet-400 text-sm mb-3" style={{ fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Pricing</p>
            <h2 className="text-3xl sm:text-4xl text-zinc-100" style={{ fontWeight: 700, letterSpacing: '-0.03em' }}>Simple, transparent</h2>
            <p className="text-zinc-400 text-lg mt-3">Start free. Upgrade only when you need more.</p>
          </motion.div>
          <motion.div
            className="grid md:grid-cols-3 gap-5"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
          >
            {TIERS.map(({ name, price, desc, color, badge, highlight, features, cta, ctaStyle }) => (
              <motion.div
                key={name}
                variants={fadeUp}
                className={`relative p-6 bg-zinc-900 border ${color} rounded-2xl flex flex-col ${highlight ? 'shadow-lg shadow-indigo-500/10' : ''}`}
              >
                {highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-indigo-600 rounded-full text-white text-xs" style={{ fontWeight: 600 }}>
                    Most Popular
                  </div>
                )}
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs px-2.5 py-1 rounded-full ${badge}`} style={{ fontWeight: 600 }}>{name}</span>
                  </div>
                  <p className="text-zinc-100 text-2xl mt-3" style={{ fontWeight: 700 }}>{price}</p>
                  <p className="text-zinc-500 text-sm">{desc}</p>
                </div>
                <ul className="space-y-2.5 mb-6 flex-1">
                  {features.map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-zinc-400">
                      <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to="/generate" className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm transition-colors ${ctaStyle}`} style={{ fontWeight: 500 }}>
                  {cta} <ChevronRight className="w-4 h-4" />
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-16 border-t border-zinc-800/50">
        <motion.div
          className="max-w-3xl mx-auto px-4 sm:px-6 text-center"
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
        >
          <div className="relative inline-block mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-2xl shadow-indigo-500/30 mx-auto">
              <Terminal className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="text-3xl sm:text-4xl text-zinc-100 mb-4" style={{ fontWeight: 700, letterSpacing: '-0.03em' }}>
            Your repo deserves a great README
          </h2>
          <p className="text-zinc-400 text-lg mb-8">
            Stop putting it off. Generate a professional README in the next 60 seconds — no account required.
          </p>
          <Link
            to="/generate"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl transition-all shadow-lg shadow-indigo-500/25 text-base"
            style={{ fontWeight: 600 }}
          >
            <Zap className="w-5 h-5" />
            Generate My README Now
            <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-zinc-600 text-sm">
          <div className="flex items-center gap-2">
            <DevDocsIcon size={18} />
            <span>DevDocs V2</span>
            <span className="px-2 py-0.5 bg-zinc-800 rounded text-xs font-mono">v2.0.0</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="https://github.com/yourusername/devdocs" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-zinc-400 transition-colors">
              <Github className="w-4 h-4" /> GitHub
            </a>
            <Link to="/generate" className="hover:text-zinc-400 transition-colors">Generate</Link>
            <span>Built with ❤️ for devs</span>
          </div>
        </div>
      </footer>
    </div>
  );
}