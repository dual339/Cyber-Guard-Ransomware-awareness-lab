import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  ArrowRight,
  Database,
  FileWarning,
  Play,
  Pause,
  Lock,
  Network,
  Shield,
  ShieldAlert,
  Siren,
  Users,
} from 'lucide-react';
import { View } from '../types';

interface AboutRansomwareProps {
  setView: (view: View) => void;
}

const ATTACK_FLOW = [
  {
    step: '01',
    title: 'Initial Access',
    description:
      'Ransomware operators commonly enter through phishing emails, stolen credentials, exposed remote access, and unpatched services.',
    icon: Users,
    signal: 'Credential theft, phishing lure, exposed VPN',
  },
  {
    step: '02',
    title: 'Lateral Movement',
    description:
      'After access is established, attackers map the environment, escalate privileges, and move toward backups, file shares, and domain controllers.',
    icon: ShieldAlert,
    signal: 'Privilege escalation, admin tooling, discovery',
  },
  {
    step: '03',
    title: 'Data Theft',
    description:
      'Many crews quietly collect sensitive files before encryption so they can threaten public exposure if recovery from backups succeeds.',
    icon: Database,
    signal: 'Archive staging, outbound transfer, cloud sync abuse',
  },
  {
    step: '04',
    title: 'Encryption And Extortion',
    description:
      'Files are encrypted, backups are disrupted, and victims are pressured with ransom notes, leak threats, or business outage timelines.',
    icon: FileWarning,
    signal: 'Mass file rewrite, ransom note, service disruption',
  },
];

const OPERATOR_PLAYBOOK = [
  { title: 'Entry', icon: Network, detail: 'Find a weak door into the environment.' },
  { title: 'Control', icon: ShieldAlert, detail: 'Gain admin rights and remove obstacles.' },
  { title: 'Pressure', icon: Lock, detail: 'Encrypt or lock critical business assets.' },
  { title: 'Demand', icon: Siren, detail: 'Use downtime and leak threats to force payment.' },
];

const IMPACT_AREAS = [
  'Business operations can stop immediately when critical systems become unavailable.',
  'Sensitive data may be stolen before encryption, turning the event into a breach as well as an outage.',
  'Incident response requires containment, restoration, legal review, and identity cleanup.',
  'Paying a ransom does not guarantee recovery, clean systems, or protection from repeat targeting.',
];

const DEMO_REEL = [
  {
    title: 'Phishing Lure Arrives',
    caption: 'A malicious attachment or login lure lands in a user inbox and creates the first foothold.',
    signal: 'Email warning, fake invoice, spoofed login prompt',
    tone: 'warning',
  },
  {
    title: 'Privilege Abuse Begins',
    caption: 'Stolen credentials or remote access let the intruder move toward file shares, admin tools, and backups.',
    signal: 'Unusual admin session, MFA fatigue, privilege escalation',
    tone: 'danger',
  },
  {
    title: 'Data Is Staged',
    caption: 'Sensitive data may be copied or prepared for exfiltration before encryption so extortion pressure increases.',
    signal: 'Archive staging, outbound transfer spike, cloud sync misuse',
    tone: 'warning',
  },
  {
    title: 'Encryption Hits',
    caption: 'Files become unavailable, users see ransom notes, and the business is forced into incident response mode.',
    signal: 'Mass file rename, backup disruption, ransom note',
    tone: 'danger',
  },
];

export default function AboutRansomware({ setView }: AboutRansomwareProps) {
  const [demoIndex, setDemoIndex] = useState(0);
  const [demoPlaying, setDemoPlaying] = useState(true);
  const activeDemo = DEMO_REEL[demoIndex];

  useEffect(() => {
    if (!demoPlaying) {
      return;
    }

    const interval = setInterval(() => {
      setDemoIndex((prev) => (prev + 1) % DEMO_REEL.length);
    }, 2800);

    return () => clearInterval(interval);
  }, [demoPlaying]);

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden border border-line bg-ink text-bg">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(217,119,6,0.22),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(220,38,38,0.18),transparent_40%)]" />
        <div className="relative grid gap-8 p-10 lg:grid-cols-[1.15fr_0.85fr] lg:p-14">
          <div className="space-y-6">
            <div className="col-header text-bg/50">About Ransomware</div>
            <h1 className="text-5xl font-bold tracking-tighter leading-none">
              UNDERSTAND THE
              <br />
              BUSINESS OF
              <span className="text-accent"> DIGITAL EXTORTION.</span>
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-bg/75">
              Ransomware is malicious software designed to block access to systems or encrypt data
              until the victim pays. Modern crews operate like businesses: they gain access, steal
              data, disrupt recovery paths, and then pressure organizations with financial and public
              exposure threats.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setView('simulator')}
                className="px-5 py-3 bg-accent text-ink font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-all"
              >
                Open Threat Simulator
              </button>
              <button
                onClick={() => setView('defense')}
                className="px-5 py-3 border border-bg/20 text-bg font-bold text-xs uppercase tracking-widest hover:bg-bg hover:text-ink transition-all"
              >
                Go To Defense Center
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Primary Entry', value: 'Phishing', icon: AlertTriangle },
              { label: 'High-Value Target', value: 'Backups', icon: Database },
              { label: 'Operator Goal', value: 'Extortion', icon: FileWarning },
              { label: 'Best Counter', value: 'Prepared Defense', icon: Shield },
            ].map((item) => (
              <div key={item.label} className="border border-bg/10 bg-white/5 p-5 space-y-3 backdrop-blur-sm">
                <item.icon className="w-5 h-5 text-accent" />
                <div className="text-[10px] uppercase tracking-widest text-bg/45">{item.label}</div>
                <div className="text-2xl font-bold tracking-tight">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        {OPERATOR_PLAYBOOK.map((item, idx) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08 }}
            className="border border-line bg-white p-6 space-y-4"
          >
            <item.icon className="w-6 h-6 text-danger" />
            <div className="text-[10px] font-bold uppercase tracking-widest text-ink/35">
              Operator Playbook
            </div>
            <h2 className="text-2xl font-bold tracking-tight">{item.title}</h2>
            <p className="text-sm leading-relaxed text-ink/65">{item.detail}</p>
          </motion.div>
        ))}
      </section>

      <section className="border border-line bg-white p-8 lg:p-10 space-y-8 overflow-hidden">
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <div className="space-y-2">
            <div className="col-header">Demo Video</div>
            <h2 className="text-4xl font-bold tracking-tight">How a ransomware incident unfolds</h2>
          </div>
          <button
            onClick={() => setDemoPlaying((prev) => !prev)}
            className="inline-flex items-center gap-2 px-4 py-3 border border-line text-xs font-bold uppercase tracking-widest hover:bg-ink hover:text-bg transition-all"
          >
            {demoPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {demoPlaying ? 'Pause Demo' : 'Play Demo'}
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] items-stretch">
          <div className="relative min-h-[360px] border border-line bg-ink text-bg overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(217,119,6,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(220,38,38,0.2),transparent_35%)]" />
            <motion.div
              key={activeDemo.title}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative h-full p-8 lg:p-10 flex flex-col justify-between"
            >
              <div className="space-y-5">
                <div className="inline-flex items-center gap-2 border border-white/10 bg-white/5 px-3 py-2 text-[10px] uppercase tracking-widest text-bg/55">
                  Training Walkthrough
                  <span className="text-accent normal-case tracking-normal font-medium">
                    Scene {demoIndex + 1} of {DEMO_REEL.length}
                  </span>
                </div>
                <h3 className="text-5xl font-bold tracking-tight max-w-xl">{activeDemo.title}</h3>
                <p className="max-w-2xl text-sm leading-relaxed text-bg/75">{activeDemo.caption}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {['User Inbox', 'Admin Access', 'Business Files'].map((panel, idx) => (
                  <div
                    key={panel}
                    className={`border p-4 backdrop-blur-sm ${
                      idx <= demoIndex ? 'border-danger/25 bg-danger/10' : 'border-white/10 bg-white/5'
                    }`}
                  >
                    <div className="text-[10px] uppercase tracking-widest text-bg/45 mb-2">{panel}</div>
                    <div className="text-lg font-bold">
                      {idx < demoIndex ? 'Impacted' : idx === demoIndex ? 'Under Pressure' : 'Monitoring'}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          <div className="space-y-4">
            {DEMO_REEL.map((scene, idx) => (
              <button
                key={scene.title}
                onClick={() => setDemoIndex(idx)}
                className={`w-full border p-5 text-left transition-all ${
                  idx === demoIndex ? 'border-ink bg-bg' : 'border-line bg-white hover:border-ink/35'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="font-bold text-lg tracking-tight">{scene.title}</div>
                  <div className="text-[10px] uppercase tracking-widest font-bold opacity-40">
                    Scene {idx + 1}
                  </div>
                </div>
                <div className="mt-2 text-sm leading-relaxed text-ink/65">{scene.signal}</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="border border-line bg-white p-8 lg:p-10 space-y-8">
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <div className="space-y-2">
            <div className="col-header">Attack Timeline</div>
            <h2 className="text-4xl font-bold tracking-tight">How a ransomware intrusion typically unfolds</h2>
          </div>
          <div className="text-[10px] uppercase tracking-widest font-bold text-ink/35">
            From first foothold to extortion
          </div>
        </div>

        <div className="space-y-0">
          {ATTACK_FLOW.map((step, idx) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.06 }}
              className="grid grid-cols-[72px_1fr] gap-5 md:grid-cols-[96px_28px_1fr]"
            >
              <div className="py-6 flex md:justify-center">
                <div className="text-3xl font-mono font-bold tracking-tight text-accent/85">{step.step}</div>
              </div>

              <div className="hidden md:flex justify-center">
                <div className="w-px bg-line/20 relative">
                  <div className="absolute top-8 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-danger border-4 border-bg" />
                </div>
              </div>

              <div className="py-6 border-t border-line/10 first:border-t-0 space-y-3">
                <div className="flex items-center gap-3">
                  <step.icon className="w-5 h-5 text-danger" />
                  <h3 className="text-2xl font-bold tracking-tight">{step.title}</h3>
                </div>
                <p className="max-w-3xl text-sm leading-relaxed text-ink/66">{step.description}</p>
                <div className="inline-flex items-center gap-2 border border-warning/20 bg-warning/5 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-warning">
                  Common Signal
                  <span className="text-ink/55 normal-case tracking-normal font-medium">{step.signal}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="border border-line bg-bg p-8 space-y-5">
          <div className="col-header">Why Attacks Work</div>
          <h2 className="text-3xl font-bold tracking-tight">Ransomware succeeds when identity, visibility, and recovery are weak.</h2>
          <p className="text-sm leading-relaxed text-ink/65">
            The point is rarely just encryption. Attackers look for ways to create maximum urgency:
            stolen credentials, administrative access, broken backups, and data theft all multiply the
            pressure to pay quickly.
          </p>
          <button
            onClick={() => setView('phishing')}
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-accent hover:text-ink transition-colors"
          >
            Inspect Phishing Indicators <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="border border-line bg-white p-8 space-y-5">
          <div className="col-header">Operational Impact</div>
          <div className="space-y-4">
            {IMPACT_AREAS.map((item) => (
              <div key={item} className="flex items-start gap-3 border-b border-line/10 pb-4 last:border-b-0 last:pb-0">
                <ShieldAlert className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <p className="text-sm leading-relaxed text-ink/68">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
