import React, { useEffect, useState } from 'react';
import {
  Shield,
  Terminal,
  Activity,
  AlertTriangle,
  BookOpen,
  ShieldCheck,
  Menu,
  X,
  ChevronRight,
  Key,
  LogOut,
  LogIn,
  Zap,
  Search,
  Sun,
  Moon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { View } from './types';
import { FirebaseProvider, useFirebase } from './components/FirebaseProvider';
import { signInWithGoogle, logout, startDemoSession, isGuestUser } from './firebase';

import Dashboard from './components/Dashboard';
import AboutRansomware from './components/AboutRansomware';
import EncryptionLab from './components/EncryptionLab';
import DefenseCenter from './components/DefenseCenter';
import Simulator from './components/Simulator';
import LiveLab from './components/LiveLab';
import PhishingAnalyzer from './components/PhishingAnalyzer';

function AppContent() {
  const { user, loading } = useFirebase();
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') {
      return 'light';
    }

    const storedTheme = window.localStorage.getItem('cyberguard-theme');
    return storedTheme === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('cyberguard-theme', theme);
  }, [theme]);

  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: Activity },
    { id: 'about', label: 'About Ransomware', icon: BookOpen },
    { id: 'lab', label: 'Encryption Lab', icon: Key },
    { id: 'simulator', label: 'Threat Simulator', icon: AlertTriangle },
    { id: 'livelab', label: 'Live Lab', icon: Zap },
    { id: 'phishing', label: 'Malware Analyzer', icon: Search },
    { id: 'defense', label: 'Defense Center', icon: ShieldCheck },
  ];

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-bg">
        <div className="flex flex-col items-center gap-4">
          <Shield className="w-12 h-12 text-accent animate-pulse" />
          <span className="col-header">Initializing Secure Environment...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-bg p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full p-12 border border-line bg-white space-y-8 text-center shadow-2xl"
        >
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-ink text-bg flex items-center justify-center rounded-full">
              <Shield className="w-10 h-10" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tighter">Cyber Guard</h1>
            <p className="text-sm text-ink/60 font-serif italic">Ransomware awareness lab</p>
          </div>
          <p className="text-xs leading-relaxed opacity-70">
            Access to this environment requires authentication. Please sign in with your Google account to proceed.
          </p>
          {authError && (
            <div className="border border-danger/20 bg-danger/5 p-3 text-left text-xs text-danger">
              {authError}
            </div>
          )}
          <button
            onClick={async () => {
              setAuthError(null);
              try {
                await signInWithGoogle();
              } catch (error) {
                const message = error instanceof Error ? error.message : 'Google sign-in failed.';
                setAuthError(`Google sign-in failed. ${message}`);
              }
            }}
            className="w-full py-4 bg-ink text-bg font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:opacity-90 transition-all"
          >
            <LogIn className="w-4 h-4" /> Sign In with Google
          </button>
          <button
            onClick={() => {
              setAuthError(null);
              startDemoSession();
              window.location.reload();
            }}
            className="w-full py-4 border border-line font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-ink hover:text-bg transition-all"
          >
            <Terminal className="w-4 h-4" /> Continue in Demo Mode
          </button>
          <p className="text-[10px] leading-relaxed opacity-50">
            Demo mode skips Firebase sign-in and cloud sync so you can preview the app locally.
          </p>
          <button
            onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
            className="w-full py-3 border border-line font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-ink hover:text-bg transition-all"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            {theme === 'light' ? 'Switch To Dark' : 'Switch To Light'}
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 260 : 80 }}
        className="border-r border-line flex flex-col bg-bg z-20"
      >
        <div className="p-6 flex items-center gap-3 border-b border-line">
          <Shield className="w-8 h-8 text-accent shrink-0" />
          {isSidebarOpen && (
            <span className="font-bold tracking-tight text-xl truncate">Cyber Guard</span>
          )}
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id as View)}
              className={`w-full flex items-center gap-3 p-3 rounded transition-all ${
                currentView === item.id
                  ? 'bg-ink text-bg shadow-lg'
                  : 'hover:bg-ink/5 text-ink/70 hover:text-ink'
              }`}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {isSidebarOpen && <span className="font-medium text-sm">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-line space-y-2">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 p-3 text-danger hover:bg-danger/5 rounded transition-all"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {isSidebarOpen && <span className="font-medium text-sm">Logout</span>}
          </button>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-full flex items-center justify-center p-2 hover:bg-ink/5 rounded"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </motion.aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-line flex items-center justify-between px-8 bg-bg/80 backdrop-blur-sm z-10">
          <div className="flex items-center gap-2">
            <span className="col-header">Current Module</span>
            <ChevronRight className="w-3 h-3 opacity-30" />
            <span className="font-mono text-xs font-bold uppercase tracking-widest">
              {navItems.find((i) => i.id === currentView)?.label}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
              className="flex items-center gap-2 px-3 py-2 border border-line rounded text-xs font-bold uppercase tracking-widest hover:bg-ink hover:text-bg transition-all"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              {theme === 'light' ? 'Dark' : 'Light'}
            </button>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold uppercase tracking-tighter opacity-50">Operator</span>
              <span className="text-xs font-mono font-bold">{user.displayName}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-success/10 text-success rounded-full border border-success/20">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-tighter">
                {isGuestUser(user) ? 'Demo Session' : 'Secure Session'}
              </span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-6xl mx-auto"
            >
              {currentView === 'dashboard' && <Dashboard setView={setCurrentView} />}
              {currentView === 'about' && <AboutRansomware setView={setCurrentView} />}
              {currentView === 'lab' && <EncryptionLab />}
              {currentView === 'simulator' && <Simulator />}
              {currentView === 'livelab' && <LiveLab />}
              {currentView === 'phishing' && <PhishingAnalyzer />}
              {currentView === 'defense' && <DefenseCenter />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <FirebaseProvider>
      <AppContent />
    </FirebaseProvider>
  );
}
