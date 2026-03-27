import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { AppUser, DemoUser } from './types';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();

const DEMO_USER_STORAGE_KEY = 'cyberguard-demo-user';
const DEMO_USER: DemoUser = {
  uid: 'demo-operator',
  displayName: 'Demo Operator',
  email: null,
  isGuest: true,
};

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);

export const startDemoSession = (): DemoUser => {
  localStorage.setItem(DEMO_USER_STORAGE_KEY, JSON.stringify(DEMO_USER));
  return DEMO_USER;
};

export const getDemoSession = (): DemoUser | null => {
  const raw = localStorage.getItem(DEMO_USER_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as DemoUser;
    return parsed?.isGuest ? parsed : null;
  } catch {
    localStorage.removeItem(DEMO_USER_STORAGE_KEY);
    return null;
  }
};

export const clearDemoSession = () => {
  localStorage.removeItem(DEMO_USER_STORAGE_KEY);
};

export const isGuestUser = (user: AppUser | null): user is DemoUser => Boolean(user?.isGuest);

export const logout = async () => {
  clearDemoSession();
  if (auth.currentUser) {
    await signOut(auth);
  }
};
