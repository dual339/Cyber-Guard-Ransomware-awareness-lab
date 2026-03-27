import React from 'react';
import { motion } from 'motion/react';
import { Shield, AlertTriangle, Key, ShieldCheck, ArrowRight, Search, BookOpen } from 'lucide-react';
import { View } from '../types';

interface DashboardProps {
  setView: (view: View) => void;
}

export default function Dashboard({ setView }: DashboardProps) {
  const cards = [
    {
      id: 'about',
      title: 'About Ransomware',
      desc: 'Start with the attack lifecycle, business impact, and common extortion tactics.',
      icon: BookOpen,
      color: 'text-ink',
      bg: 'bg-white',
    },
    {
      id: 'lab',
      title: 'Encryption Lab',
      desc: 'Understand the cryptographic foundations of ransomware.',
      icon: Key,
      color: 'text-accent',
      bg: 'bg-accent/10',
    },
    {
      id: 'phishing',
      title: 'Malware Analyzer',
      desc: 'Analyze suspicious links for phishing and malicious patterns.',
      icon: Search,
      color: 'text-warning',
      bg: 'bg-warning/10',
    },
    {
      id: 'simulator',
      title: 'Threat Simulator',
      desc: 'Visualize the impact of an attack in a safe, sandboxed environment.',
      icon: AlertTriangle,
      color: 'text-danger',
      bg: 'bg-danger/10',
    },
    {
      id: 'defense',
      title: 'Defense Center',
      desc: 'Learn how to protect, detect, and respond to security threats.',
      icon: ShieldCheck,
      color: 'text-success',
      bg: 'bg-success/10',
    },
  ];

  return (
    <div className="space-y-12">
      <section className="space-y-4">
        <h1 className="text-6xl font-bold tracking-tighter leading-none">
          DEFEND AGAINST<br />
          <span className="text-accent">DIGITAL EXTORTION.</span>
        </h1>
        <p className="text-xl text-ink/60 max-w-2xl font-serif italic">
          Ransomware is one of the most significant threats to modern organizations. 
          Understanding its mechanics is the first step toward building a resilient defense.
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
        {cards.map((card, idx) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            onClick={() => setView(card.id as View)}
            className="group p-8 border border-line bg-bg hover:bg-ink hover:text-bg transition-all cursor-pointer flex flex-col justify-between h-80"
          >
            <div>
              <div className={`w-12 h-12 ${card.bg} ${card.color} flex items-center justify-center rounded mb-6 group-hover:bg-bg group-hover:text-ink transition-colors`}>
                <card.icon className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold mb-2">{card.title}</h3>
              <p className="opacity-60 text-sm leading-relaxed">{card.desc}</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
              Explore Module <ArrowRight className="w-4 h-4" />
            </div>
          </motion.div>
        ))}
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-8">
        <div className="p-10 border border-line bg-white space-y-6">
          <div className="col-header">About Ransomware</div>
          <h2 className="text-4xl font-bold tracking-tight">What Ransomware Actually Does</h2>
          <p className="text-sm text-ink/70 leading-relaxed">
            Ransomware is a form of malicious software that blocks access to systems or encrypts files
            and then demands payment for recovery. Modern variants often go further by stealing data,
            disabling backups, and pressuring victims with public leak threats.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 bg-bg border border-line space-y-2">
              <div className="text-[10px] uppercase tracking-widest font-bold text-accent">Initial Access</div>
              <p className="text-xs text-ink/65 leading-relaxed">
                Attackers commonly enter through phishing emails, weak passwords, exposed remote access,
                or unpatched software.
              </p>
            </div>
            <div className="p-5 bg-bg border border-line space-y-2">
              <div className="text-[10px] uppercase tracking-widest font-bold text-accent">Execution</div>
              <p className="text-xs text-ink/65 leading-relaxed">
                Once inside, they move laterally, identify valuable systems, exfiltrate data, and encrypt
                documents, backups, and shared storage.
              </p>
            </div>
            <div className="p-5 bg-bg border border-line space-y-2">
              <div className="text-[10px] uppercase tracking-widest font-bold text-accent">Extortion</div>
              <p className="text-xs text-ink/65 leading-relaxed">
                Victims are pressured to pay for decryption, prevent data leaks, or restore operations
                faster than incident response can recover.
              </p>
            </div>
          </div>
        </div>

        <div className="p-10 border border-line bg-bg space-y-6">
          <div className="col-header">Why It Matters</div>
          <div className="space-y-4">
            {[
              'Operational shutdowns can stop finance, healthcare, logistics, and customer support.',
              'Data theft turns ransomware into both an availability and privacy incident.',
              'Recovery often requires restoration, forensics, credential resets, and legal response.',
              'Paying a ransom does not guarantee clean restoration or prevent future targeting.'
            ].map((item) => (
              <div key={item} className="flex gap-3 items-start text-sm text-ink/70 leading-relaxed">
                <Shield className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="p-12 border border-line bg-ink text-bg">
        <div className="max-w-3xl space-y-6">
          <div className="col-header text-bg/50">Security Briefing</div>
          <h2 className="text-4xl font-bold tracking-tight">The Anatomy of an Attack</h2>
          <p className="text-bg/70 leading-relaxed">
            Modern ransomware doesn't just encrypt files; it often exfiltrates sensitive data 
            (Double Extortion) and targets backups to ensure the victim has no choice but to pay. 
            This lab provides the technical knowledge needed to recognize these patterns before they 
            compromise your infrastructure.
          </p>
          <div className="grid grid-cols-2 gap-8 pt-6">
            <div>
              <div className="text-3xl font-mono font-bold text-accent">90%</div>
              <div className="text-[10px] uppercase tracking-widest opacity-50">Attacks via Phishing</div>
            </div>
            <div>
              <div className="text-3xl font-mono font-bold text-accent">21 Days</div>
              <div className="text-[10px] uppercase tracking-widest opacity-50">Average Dwell Time</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
