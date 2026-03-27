import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Image as ImageIcon, 
  Database, 
  AlertTriangle, 
  Play, 
  RotateCcw, 
  ShieldCheck,
  Terminal,
  Lock,
  Unlock,
  Zap,
  UploadCloud,
  EyeOff,
  Clock,
  History,
  Users,
  Skull,
  Trash2,
  Copy,
  Check,
  Download,
} from 'lucide-react';
import { MockFile } from '../types';
import { useFirebase } from './FirebaseProvider';
import { db, isGuestUser } from '../firebase';
import { collection, addDoc, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/firestoreError';

const INITIAL_FILES: MockFile[] = [
  { id: '1', name: 'financial_report_2023.pdf', content: 'Sensitive financial data...', isEncrypted: false, type: 'doc' },
  { id: '2', name: 'customer_list.csv', content: 'Email, Name, Purchase History...', isEncrypted: false, type: 'data' },
  { id: '3', name: 'product_roadmap.png', content: '[Binary Image Data]', isEncrypted: false, type: 'img' },
  { id: '4', name: 'payroll_q4.xlsx', content: 'Employee salaries and bonuses...', isEncrypted: false, type: 'data' },
  { id: '5', name: 'legal_contract_v2.docx', content: 'Confidential legal agreement...', isEncrypted: false, type: 'doc' },
  { id: '6', name: 'backup_config.json', content: 'Backup server credentials...', isEncrypted: false, type: 'data' },
];

type AttackProfile = {
  id: string;
  name: string;
  description: string;
  speed: number;
  initialLogs: string[];
  processName: string;
  icon: any;
  type: 'encrypt' | 'wipe';
};

const ATTACK_PROFILES: AttackProfile[] = [
  {
    id: 'fast',
    name: 'Fast Encrypt',
    description: 'High-speed encryption focused on maximum damage.',
    speed: 300,
    initialLogs: ['CRITICAL: High-CPU usage detected.', 'Rapid file modification detected.'],
    processName: 'crypt_svc.exe',
    icon: Zap,
    type: 'encrypt'
  },
  {
    id: 'exfil',
    name: 'Data Exfiltration',
    description: 'Uploads sensitive data before encryption.',
    speed: 1200,
    initialLogs: ['ALERT: Outbound traffic spike detected.', 'Exfiltrating sensitive documents...'],
    processName: 'net_sync.exe',
    icon: UploadCloud,
    type: 'encrypt'
  },
  {
    id: 'stealth',
    name: 'Stealth Mode',
    description: 'Low-priority process to avoid detection.',
    speed: 2500,
    initialLogs: ['System check: Background task started.', 'Analyzing file entropy...'],
    processName: 'win_update_host.exe',
    icon: EyeOff,
    type: 'encrypt'
  },
  {
    id: 'raas',
    name: 'RaaS Affiliate',
    description: 'Slower, stealthier, targets specific high-value file types.',
    speed: 3500,
    initialLogs: ['Establishing C2 connection...', 'Downloading payload...', 'Targeting high-value documents...'],
    processName: 'affiliate_tool.exe',
    icon: Users,
    type: 'encrypt'
  },
  {
    id: 'wiper',
    name: 'Wiper Malware',
    description: 'Destructive, rapid file deletion. No recovery possible.',
    speed: 150,
    initialLogs: ['CRITICAL: Master Boot Record modification attempt.', 'Initiating recursive deletion...'],
    processName: 'disk_wipe.sys',
    icon: Skull,
    type: 'wipe'
  }
];


export default function Simulator() {
  const { user } = useFirebase();
  const [files, setFiles] = useState<MockFile[]>(INITIAL_FILES);
  const [isSimulating, setIsSimulating] = useState(false);
  const [logs, setLogs] = useState<string[]>(['System initialized. Waiting for trigger...']);
  const [progress, setProgress] = useState(0);
  const [showRansomNote, setShowRansomNote] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<AttackProfile>(ATTACK_PROFILES[0]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [history, setHistory] = useState<any[]>([]);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [ransomAmountUsd, setRansomAmountUsd] = useState(24500);

  const WALLET_ADDRESS = "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh";
  const estimatedBtcAmount = (ransomAmountUsd / 49000).toFixed(3);
  const formattedUsdAmount = ransomAmountUsd.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

  const copyToClipboard = () => {
    navigator.clipboard.writeText(WALLET_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadRansomNote = () => {
    const noteContent = `
=========================================
!!! YOUR FILES HAVE BEEN ENCRYPTED !!!
=========================================

Many of your documents, photos, videos, databases and other files are no longer accessible because they have been encrypted. Maybe you are busy looking for a way to recover your files, but do not waste your time.

Nobody can recover your files without our decryption service.

Price: ${estimatedBtcAmount} BTC (~ ${formattedUsdAmount} USD)
Bitcoin Wallet Address: ${WALLET_ADDRESS}

Payment is accepted in Bitcoin only.
`;
    const blob = new Blob([noteContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'README_DECRYPT.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (!user || isGuestUser(user)) return;
    const q = query(collection(db, 'simulations'), orderBy('timestamp', 'desc'), limit(5));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHistory(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'simulations');
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    let interval: any;
    if (isSimulating) {
      const start = Date.now();
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - start) / 1000));
      }, 100);
    } else if (!isSimulating && elapsedTime !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isSimulating]);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev.slice(-9), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const toggleEncryption = (id: string) => {
    if (isSimulating) return;
    setFiles(prev => {
      const newFiles = prev.map(f => f.id === id ? { ...f, isEncrypted: !f.isEncrypted } : f);
      const encryptedCount = newFiles.filter(f => f.isEncrypted).length;
      setProgress((encryptedCount / newFiles.length) * 100);
      return newFiles;
    });
  };

  const runSimulation = async () => {
    if (!user) return;
    
    setIsSimulating(true);
    addLog(`CRITICAL: Unauthorized process detected: "${selectedProfile.processName}"`);
    selectedProfile.initialLogs.forEach(log => addLog(log));
    addLog('Scanning local directories...');
    
    for (let i = 0; i < files.length; i++) {
      if (files[i].isEncrypted || files[i].isDeleted) continue;
      
      await new Promise(r => setTimeout(r, selectedProfile.speed));
      setFiles(prev => {
        const newFiles = prev.map((f, idx) => {
          if (idx === i) {
            return selectedProfile.type === 'wipe' 
              ? { ...f, isDeleted: true } 
              : { ...f, isEncrypted: true };
          }
          return f;
        });
        const affectedCount = newFiles.filter(f => f.isEncrypted || f.isDeleted).length;
        setProgress((affectedCount / newFiles.length) * 100);
        return newFiles;
      });
      addLog(`${selectedProfile.type === 'wipe' ? 'Deleted' : 'Encrypted'}: ${files[i].name}`);
    }

    const finalAffectedCount = files.length;
    if (selectedProfile.type === 'wipe') {
      addLog('Wipe complete. System partition corrupted.');
      addLog('CRITICAL: No ransom note dropped. Recovery impossible.');
    } else {
      addLog('Encryption complete. Dropping ransom note: README_DECRYPT.txt');
      setShowRansomNote(true);
    }
    
    // Save to Firestore
    const path = 'simulations';
    if (isGuestUser(user)) {
      addLog('Demo mode active. Cloud sync skipped.');
    } else {
      try {
        await addDoc(collection(db, path), {
          userId: user.uid,
          timestamp: new Date().toISOString(),
          filesEncrypted: selectedProfile.type === 'encrypt' ? finalAffectedCount : 0,
          filesDeleted: selectedProfile.type === 'wipe' ? finalAffectedCount : 0,
          status: 'completed',
          attackType: selectedProfile.type
        });
        addLog('Simulation data synced to secure cloud vault.');
      } catch (error) {
        console.error('Error saving simulation:', error);
        addLog('Warning: Cloud sync failed.');
        setSyncError('Failed to sync simulation data to the cloud. Please check your connection or permissions.');
        handleFirestoreError(error, OperationType.CREATE, path);
      }
    }
    
    setIsSimulating(false);
  };

  const resetSimulation = () => {
    setFiles(INITIAL_FILES);
    setLogs(['System restored from offline backup.']);
    setProgress(0);
    setIsSimulating(false);
    setShowRansomNote(false);
    setElapsedTime(0);
    setSyncError(null);
  };

  const handlePayRansom = async () => {
    if (selectedProfile.type === 'wipe') {
      addLog('ERROR: Cannot pay ransom for Wiper attack. No decryption key exists.');
      return;
    }
    addLog('Initiating Bitcoin transfer to attacker wallet...');
    await new Promise(r => setTimeout(r, 1500));
    addLog('Payment confirmed. Receiving decryption tool...');
    await new Promise(r => setTimeout(r, 1000));
    
    setFiles(prev => prev.map(f => ({ ...f, isEncrypted: false })));
    setProgress(0);
    setShowRansomNote(false);
    addLog('Files decrypted. CRITICAL WARNING: Paying ransom funds criminal groups and does not guarantee data integrity.');
    addLog('Recommendation: Reinstall OS and restore from clean backups to ensure no backdoors remain.');
  };

  return (
    <div className="space-y-8 relative">
      <AnimatePresence>
        {syncError && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-danger/10 border border-danger/30 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-danger">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm font-medium">{syncError}</p>
              </div>
              <button 
                onClick={() => setSyncError(null)}
                className="text-danger hover:bg-danger/10 p-1 rounded transition-colors"
              >
                <RotateCcw className="w-4 h-4 rotate-45" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRansomNote && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-danger/30 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ 
                scale: 1, 
                y: 0,
                x: [0, -2, 2, -1, 1, 0],
                transition: {
                  x: {
                    repeat: Infinity,
                    duration: 0.2,
                    repeatType: "mirror",
                    repeatDelay: 3
                  }
                }
              }}
              className="max-w-2xl w-full bg-ink text-bg p-12 border-4 border-danger shadow-[0_0_80px_rgba(239,68,68,0.6)] space-y-8 relative overflow-hidden"
            >
              {/* Glitch Overlay Effect */}
              <motion.div 
                animate={{ 
                  opacity: [0, 0.1, 0, 0.05, 0],
                  x: [-10, 10, -5, 5, 0],
                }}
                transition={{ 
                  repeat: Infinity, 
                  duration: 0.5,
                  repeatDelay: 2
                }}
                className="absolute inset-0 bg-danger pointer-events-none mix-blend-overlay"
              />

              <div className="flex items-center gap-4 text-danger relative z-10">
                <AlertTriangle className="w-12 h-12 animate-pulse" />
                <h3 className="text-4xl font-black tracking-tighter uppercase italic">Your files are encrypted!</h3>
              </div>
              
              <div className="space-y-4 font-mono text-sm leading-relaxed opacity-90 relative z-10">
                <p>Many of your documents, photos, videos, databases and other files are no longer accessible because they have been encrypted. Maybe you are busy looking for a way to recover your files, but do not waste your time.</p>
                <p>Nobody can recover your files without our decryption service.</p>
                
                <div className="p-6 bg-danger/10 border border-danger/30 space-y-4">
                  <div className="flex justify-between items-end">
                    <p className="text-danger font-bold text-xl">Price: {estimatedBtcAmount} BTC</p>
                    <p className="text-[10px] opacity-50">~ {formattedUsdAmount} USD</p>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold opacity-50">Bitcoin Wallet Address</label>
                    <div className="flex gap-2">
                      <div className="flex-1 bg-black/40 p-3 font-mono text-xs break-all border border-white/10 select-all">
                        {WALLET_ADDRESS}
                      </div>
                      <button 
                        onClick={copyToClipboard}
                        className={`px-4 flex items-center justify-center transition-all ${
                          copied ? 'bg-success text-bg' : 'bg-white/10 hover:bg-white/20 text-bg'
                        }`}
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <p className="text-xs italic opacity-60">Payment is accepted in Bitcoin only. For more information, please check the README_DECRYPT.txt file on your desktop.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 relative z-10">
                <button 
                  onClick={handlePayRansom}
                  className="py-4 border-2 border-danger text-danger font-bold uppercase tracking-widest hover:bg-danger hover:text-bg transition-all flex items-center justify-center gap-2 group"
                >
                  <Lock className="w-4 h-4 group-hover:animate-bounce" /> Pay Ransom (Simulated)
                </button>
                <button 
                  onClick={resetSimulation}
                  className="py-4 bg-success text-bg font-bold uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-5 h-5" /> Restore from Backup
                </button>
                <button 
                  onClick={downloadRansomNote}
                  className="sm:col-span-2 py-4 border border-line text-ink font-bold uppercase tracking-widest hover:bg-ink hover:text-bg transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" /> Download README_DECRYPT.txt
                </button>
              </div>
              
              <p className="text-[10px] text-center opacity-40 uppercase tracking-widest relative z-10">
                This is a controlled educational simulation. Do not send real funds.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="flex justify-between items-end">
        <div className="space-y-2">
          <h2 className="text-4xl font-bold tracking-tighter">Threat Simulation Lab</h2>
          <p className="text-ink/60 font-serif italic">
            Observe the speed and impact of automated file encryption.
          </p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={resetSimulation}
            className="px-6 py-3 border border-line font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-ink hover:text-bg transition-all"
          >
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
          <button 
            onClick={runSimulation}
            disabled={isSimulating || files.every(f => f.isEncrypted)}
            className="px-6 py-3 bg-danger text-bg font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all"
          >
            <Play className="w-4 h-4" /> Execute Attack
          </button>
        </div>
      </header>

      {/* Profile Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ATTACK_PROFILES.map((profile) => (
          <button
            key={profile.id}
            disabled={isSimulating}
            onClick={() => setSelectedProfile(profile)}
            className={`p-4 border text-left transition-all flex flex-col gap-2 ${
              selectedProfile.id === profile.id 
                ? 'border-ink bg-ink text-bg' 
                : 'border-line hover:border-ink/50'
            } ${isSimulating ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="flex items-center justify-between">
              <profile.icon className={`w-5 h-5 ${selectedProfile.id === profile.id ? 'text-accent' : 'text-ink/50'}`} />
              <div className={`text-[9px] uppercase tracking-widest font-bold ${selectedProfile.id === profile.id ? 'text-bg/50' : 'text-ink/30'}`}>
                {profile.id === 'fast' ? 'High Speed' : profile.id === 'exfil' ? 'Network Heavy' : 'Low Noise'}
              </div>
            </div>
            <div className="font-bold text-sm">{profile.name}</div>
            <div className={`text-[10px] leading-tight ${selectedProfile.id === profile.id ? 'text-bg/60' : 'text-ink/50'}`}>
              {profile.description}
            </div>
          </button>
        ))}
      </div>

      <div className="p-6 border border-line bg-white space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="col-header">Demand Settings</div>
            <h3 className="text-2xl font-bold tracking-tight">Customize ransom amount</h3>
          </div>
          <div className="text-[10px] uppercase tracking-widest font-bold opacity-35">
            Simulator Control
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px_220px] gap-4 items-end">
          <label className="space-y-2">
            <div className="text-[10px] uppercase tracking-widest font-bold opacity-45">Amount in USD</div>
            <input
              type="number"
              min={1000}
              step={500}
              value={ransomAmountUsd}
              onChange={(event) => setRansomAmountUsd(Math.max(1000, Number(event.target.value) || 1000))}
              className="w-full border border-line bg-bg px-4 py-3 font-mono text-sm outline-none focus:border-ink"
            />
          </label>
          <div className="border border-line bg-bg p-4">
            <div className="text-[10px] uppercase tracking-widest opacity-40 mb-2">Displayed USD</div>
            <div className="font-bold text-xl">{formattedUsdAmount}</div>
          </div>
          <div className="border border-line bg-bg p-4">
            <div className="text-[10px] uppercase tracking-widest opacity-40 mb-2">Estimated BTC</div>
            <div className="font-bold text-xl">{estimatedBtcAmount} BTC</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* File System View */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-6 border border-line bg-white min-h-[500px]">
            <div className="flex justify-between items-center mb-6">
              <span className="col-header">Mock Directory: /Users/Admin/Documents</span>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-ink/50">
                  <Clock className="w-3 h-3" />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest">
                    Time: {elapsedTime}s
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold opacity-50 uppercase">Progress</span>
                  <div className="w-32 h-1 bg-bg overflow-hidden">
                    <motion.div 
                      className="h-full bg-danger"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AnimatePresence>
                {files.map((file) => (
                  <motion.div
                    key={file.id}
                    layout
                    className={`p-4 border border-line flex items-start gap-4 transition-all ${
                      file.isDeleted ? 'bg-ink/10 border-ink/20 opacity-40' :
                      file.isEncrypted ? 'bg-danger/5 border-danger/30' : 'bg-bg/50'
                    }`}
                  >
                    <div className={`p-2 rounded ${
                      file.isDeleted ? 'bg-ink/20 text-ink/40' :
                      file.isEncrypted ? 'bg-danger/20 text-danger' : 'bg-ink/5 text-ink/50'
                    }`}>
                      {file.isDeleted ? <Trash2 className="w-5 h-5" /> : (
                        <>
                          {file.type === 'doc' && <FileText className="w-5 h-5" />}
                          {file.type === 'data' && <Database className="w-5 h-5" />}
                          {file.type === 'img' && <ImageIcon className="w-5 h-5" />}
                        </>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-mono text-xs font-bold truncate ${file.isDeleted ? 'line-through' : ''}`}>
                        {file.isDeleted ? '[DELETED]' : file.isEncrypted ? `${file.name}.encrypted` : file.name}
                      </div>
                      <div className="text-[10px] opacity-50 mt-1">
                        {file.isDeleted ? 'NULL_POINTER' : file.isEncrypted ? 'CIPHERTEXT' : 'PLAINTEXT'}
                      </div>
                      <div className="mt-2 font-mono text-[9px] opacity-40 break-all line-clamp-2">
                        {file.isDeleted ? 'Data blocks unlinked. Recovery impossible.' : 
                         file.isEncrypted ? '0x' + Array(20).fill(0).map(() => Math.floor(Math.random()*16).toString(16)).join('') : 
                         file.content}
                      </div>
                    </div>
                    {!file.isDeleted && (
                      <button
                        onClick={() => toggleEncryption(file.id)}
                        disabled={isSimulating}
                        className={`p-1 rounded-full transition-all hover:bg-ink/10 ${
                          isSimulating ? 'cursor-not-allowed' : 'cursor-pointer'
                        }`}
                        title={file.isEncrypted ? "Decrypt file" : "Encrypt file"}
                      >
                        {file.isEncrypted ? <Lock className="w-3 h-3 text-danger" /> : <Unlock className="w-3 h-3 text-success" />}
                      </button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Console / Logs */}
        <div className="space-y-6">
          <div className="p-6 bg-ink text-bg border border-line font-mono text-xs h-[300px] flex flex-col">
            <div className="flex items-center gap-2 mb-4 text-success opacity-70">
              <Terminal className="w-4 h-4" />
              <span className="uppercase tracking-widest text-[10px]">Security Console</span>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar">
              {logs.map((log, i) => (
                <div key={i} className={log.includes('CRITICAL') ? 'text-danger' : 'text-success/80'}>
                  {log}
                </div>
              ))}
              {isSimulating && <div className="animate-pulse">_</div>}
            </div>
          </div>

          <div className="p-6 border border-line bg-white space-y-4">
            <h4 className="font-bold text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-accent" />
              Simulation Insights
            </h4>
            <ul className="text-xs space-y-3 text-ink/70 leading-relaxed">
              <li>• <strong className="text-ink">Automation:</strong> Ransomware can encrypt thousands of files per minute.</li>
              <li>• <strong className="text-ink">Extension Change:</strong> Most variants append a specific extension (e.g., .locky, .encrypted).</li>
              <li>• <strong className="text-ink">Persistence:</strong> The process often disables security software before starting.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Simulation History */}
      <div className="p-8 border border-line bg-white space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-ink text-bg rounded">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg tracking-tight">Simulation History</h3>
              <p className="text-xs text-ink/50 font-serif italic">Recent activity logs from the secure vault.</p>
            </div>
          </div>
          <div className="text-[10px] uppercase tracking-widest font-bold opacity-30">
            Last 5 Sessions
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-line">
                <th className="py-3 px-4 col-header">Timestamp</th>
                <th className="py-3 px-4 col-header">Attack Type</th>
                <th className="py-3 px-4 col-header text-right">Impact</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-xs text-ink/40 italic">
                    No simulation records found.
                  </td>
                </tr>
              ) : (
                history.map((run) => (
                  <tr key={run.id} className="border-b border-line/50 hover:bg-bg/30 transition-colors">
                    <td className="py-3 px-4 text-xs font-mono">
                      {new Date(run.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                      {run.attackType === 'wipe' ? (
                        <><Skull className="w-3 h-3 text-danger" /> Wiper</>
                      ) : (
                        <><Lock className="w-3 h-3 text-accent" /> Ransomware</>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs font-bold text-right text-danger">
                      {run.attackType === 'wipe' ? `${run.filesDeleted} Deleted` : `${run.filesEncrypted} Encrypted`}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
