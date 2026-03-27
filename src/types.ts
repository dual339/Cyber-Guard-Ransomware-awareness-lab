export type View = 'dashboard' | 'about' | 'lab' | 'defense' | 'simulator' | 'livelab' | 'phishing';

export interface DemoUser {
  uid: string;
  displayName: string;
  email: string | null;
  isGuest: true;
}

export type AppUser = DemoUser | {
  uid: string;
  displayName: string | null;
  email: string | null;
  isGuest?: false;
};

export interface MockFile {
  id: string;
  name: string;
  content: string;
  isEncrypted: boolean;
  isDeleted?: boolean;
  type: 'doc' | 'img' | 'data';
}

export interface DefenseStep {
  id: string;
  title: string;
  description: string;
  category: 'prevention' | 'detection' | 'response';
  completed: boolean;
}
