import React, { useState, useEffect } from 'react';
import { Shield, ShieldCheck, ShieldAlert, Database, Users, Monitor, RefreshCw, ExternalLink } from 'lucide-react';
import { useFirebase } from './FirebaseProvider';
import { db, isGuestUser } from '../firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/firestoreError';

export default function DefenseCenter() {
  const { user } = useFirebase();
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  useEffect(() => {
    if (!user || isGuestUser(user)) return;

    const docRef = doc(db, 'defense_progress', user.uid);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setCompletedSteps(docSnap.data().completedSteps || []);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const toggleStep = async (stepId: string) => {
    if (!user) return;

    const newSteps = completedSteps.includes(stepId)
      ? completedSteps.filter(id => id !== stepId)
      : [...completedSteps, stepId];

    if (isGuestUser(user)) {
      setCompletedSteps(newSteps);
      return;
    }

    const path = `defense_progress/${user.uid}`;
    try {
      await setDoc(doc(db, 'defense_progress', user.uid), {
        userId: user.uid,
        completedSteps: newSteps
      });
    } catch (error) {
      console.error('Error updating defense progress:', error);
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const strategies = [
    {
      id: 'edr',
      title: 'Endpoint Protection (EDR)',
      desc: 'Deploy advanced Endpoint Detection and Response tools that use behavioral analysis to stop zero-day ransomware.',
      icon: Monitor,
      learnMoreUrl: 'https://www.cisa.gov/topics/cyber-threats-and-advisories/ransomware',
      tips: [
        { id: 'realtime', text: 'Enable real-time scanning' },
        { id: 'powershell', text: 'Block unauthorized PowerShell execution' },
        { id: 'rename', text: 'Monitor for mass file renames' }
      ]
    },
    {
      id: 'backups',
      title: 'Immutable Backups',
      desc: 'Maintain offline or immutable backups that cannot be deleted or encrypted by the attacker even if they gain admin access.',
      icon: Database,
      learnMoreUrl: 'https://www.cisa.gov/sites/default/files/publications/CISA_MS-ISAC_Ransomware_Guide_S508C.pdf',
      tips: [
        { id: '321', text: 'Follow the 3-2-1 rule' },
        { id: 'test', text: 'Test restoration regularly' },
        { id: 'cloud', text: 'Use cloud-native immutable storage' }
      ]
    },
    {
      id: 'users',
      title: 'User Awareness',
      desc: 'Train employees to recognize phishing attempts, which are the primary entry point for most ransomware infections.',
      icon: Users,
      learnMoreUrl: 'https://www.cisa.gov/stopransomware',
      tips: [
        { id: 'phish', text: 'Conduct phishing simulations' },
        { id: 'mfa', text: 'Enforce MFA on all accounts' },
        { id: 'report', text: 'Establish clear reporting protocols' }
      ]
    }
  ];

  return (
    <div className="space-y-12">
      <header className="space-y-4">
        <h2 className="text-4xl font-bold tracking-tighter">Defense & Mitigation</h2>
        <p className="text-ink/60 max-w-2xl font-serif italic">
          A multi-layered defense strategy is the only way to effectively minimize the risk and impact of an attack.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {strategies.map((s) => (
          <div key={s.id} className="p-8 border border-line bg-white flex flex-col h-full">
            <div className="w-12 h-12 bg-success/10 text-success flex items-center justify-center rounded mb-6">
              <s.icon className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-4">{s.title}</h3>
            <p className="text-sm text-ink/60 leading-relaxed mb-6">{s.desc}</p>
            <ul className="space-y-2 mb-8 flex-1">
              {s.tips.map((tip) => (
                <li 
                  key={tip.id} 
                  onClick={() => toggleStep(tip.id)}
                  className="flex items-start gap-2 text-[11px] font-medium cursor-pointer group"
                >
                  <div className={`w-4 h-4 border border-line rounded flex items-center justify-center transition-colors shrink-0 mt-0.5 ${
                    completedSteps.includes(tip.id) ? 'bg-success border-success text-bg' : 'group-hover:border-success'
                  }`}>
                    {completedSteps.includes(tip.id) && <ShieldCheck className="w-3 h-3" />}
                  </div>
                  <span className={completedSteps.includes(tip.id) ? 'opacity-50 line-through' : ''}>
                    {tip.text}
                  </span>
                </li>
              ))}
            </ul>
            <a 
              href={s.learnMoreUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-accent hover:text-ink transition-colors mt-auto"
            >
              Learn More <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        ))}
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 pt-12 border-t border-line">
        <div className="space-y-6">
          <div className="col-header">Incident Response Framework</div>
          <div className="space-y-4">
            {[
              { step: '01', title: 'Isolation', desc: 'Immediately disconnect infected systems from the network to prevent lateral movement.' },
              { step: '02', title: 'Identification', desc: 'Determine the ransomware variant and the scope of the infection.' },
              { step: '03', title: 'Containment', desc: 'Block attacker C2 (Command & Control) domains and reset compromised credentials.' },
              { step: '04', title: 'Recovery', desc: 'Restore data from clean backups and verify system integrity before reconnecting.' }
            ].map((item) => (
              <div key={item.step} className="flex gap-6 p-4 hover:bg-white transition-colors">
                <span className="font-mono text-2xl font-bold text-accent opacity-30">{item.step}</span>
                <div>
                  <h4 className="font-bold mb-1">{item.title}</h4>
                  <p className="text-xs text-ink/60 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-8 bg-ink text-bg space-y-6">
          <div className="flex items-center gap-3 text-danger">
            <ShieldAlert className="w-6 h-6" />
            <span className="font-bold uppercase tracking-widest text-xs">Critical Warning</span>
          </div>
          <h3 className="text-2xl font-bold">To Pay or Not to Pay?</h3>
          <p className="text-sm text-bg/70 leading-relaxed">
            Law enforcement agencies (FBI, Europol) strongly discourage paying the ransom. 
            Paying does not guarantee you will get your data back, and it funds future 
            criminal operations. Furthermore, some attackers may target you again, 
            knowing you are willing to pay.
          </p>
          <div className="pt-4">
            <button className="w-full py-4 border border-bg/20 hover:bg-bg hover:text-ink font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4" /> Download IR Template
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
