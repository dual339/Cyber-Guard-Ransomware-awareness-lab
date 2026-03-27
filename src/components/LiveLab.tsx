import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  Terminal, 
  Users, 
  Zap, 
  Lock, 
  Unlock, 
  AlertTriangle,
  Play,
  FileText,
  Database,
  Image as ImageIcon,
  Radio,
  Siren,
  ShieldCheck,
  ScanLine,
  ClipboardList,
} from 'lucide-react';
import { useFirebase } from './FirebaseProvider';

interface RoomState {
  attackerId: string | null;
  defenderId: string | null;
  status: 'waiting' | 'ready' | 'attacking' | 'finished';
}

interface DrillEvent {
  level: 'info' | 'warning' | 'critical' | 'success';
  message: string;
}

interface DrillReport {
  performance: 'excellent' | 'pass' | 'needs_improvement';
  outcome: 'contained' | 'degraded';
  encryptedCount: number;
  detectionScore: number;
  elapsedSeconds: number;
  summary: string;
  recommendations: string[];
}

interface DrillScenario {
  id: 'starter' | 'double-extortion' | 'identity-crisis';
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  description: string;
  introEvents: { level: DrillEvent['level']; message: string; delayMs: number }[];
  fileDelayMs: number;
  finalEvent: { level: DrillEvent['level']; message: string };
  excellentThresholdSeconds: number;
  passThresholdSeconds: number;
  passThresholdScore: number;
  excellentThresholdScore: number;
}

interface ScenarioArtifact {
  id: string;
  label: string;
  stage: 'Recon' | 'Encryption' | 'Assessment' | 'Contained';
  severity: 'warning' | 'critical' | 'success';
  title: string;
  detail: string;
}

interface ControllerAction {
  id: string;
  label: string;
  description: string;
  level: DrillEvent['level'];
  message: string;
  scoreBoost: number;
}

interface IncidentStageDetail {
  id: 'Recon' | 'Encryption' | 'Assessment' | 'Contained';
  title: string;
  attackerView: string;
  defenderView: string;
}

const MOCK_FILES = [
  { id: '1', name: 'secrets.txt', type: 'doc' },
  { id: '2', name: 'database.db', type: 'data' },
  { id: '3', name: 'backup.zip', type: 'data' },
  { id: '4', name: 'photo.jpg', type: 'img' },
];

const DRILL_SCENARIOS: DrillScenario[] = [
  {
    id: 'starter',
    title: 'Starter Phishing Drill',
    difficulty: 'easy',
    description: 'A basic phishing-led incident with clear warning signs and slower encryption pace.',
    introEvents: [
      { level: 'warning', message: 'Simulated phishing lure delivered to target user mailbox.', delayMs: 0 },
      { level: 'warning', message: 'Suspicious macro execution drill triggered on a user workstation.', delayMs: 1200 },
    ],
    fileDelayMs: 1700,
    finalEvent: {
      level: 'critical',
      message: 'Ransom note simulation dropped after staged workstation encryption.',
    },
    excellentThresholdSeconds: 14,
    passThresholdSeconds: 28,
    passThresholdScore: 50,
    excellentThresholdScore: 78,
  },
  {
    id: 'double-extortion',
    title: 'Double Extortion',
    difficulty: 'medium',
    description: 'Adds data theft pressure before the encryption phase and requires stronger visibility.',
    introEvents: [
      { level: 'warning', message: 'Simulated phishing lure delivered to target user mailbox.', delayMs: 0 },
      { level: 'warning', message: 'Credential abuse drill triggered. Lateral movement path opened in training scenario.', delayMs: 1100 },
      { level: 'critical', message: 'Archive staging detected. Sensitive data exfiltration drill now in progress.', delayMs: 1500 },
    ],
    fileDelayMs: 1450,
    finalEvent: {
      level: 'critical',
      message: 'Leak-site pressure simulated alongside ransomware note and degraded backup access.',
    },
    excellentThresholdSeconds: 12,
    passThresholdSeconds: 24,
    passThresholdScore: 55,
    excellentThresholdScore: 82,
  },
  {
    id: 'identity-crisis',
    title: 'Identity Crisis',
    difficulty: 'hard',
    description: 'A faster drill with credential abuse, backup pressure, and aggressive late-stage alerts.',
    introEvents: [
      { level: 'warning', message: 'Suspicious sign-in drill observed from an unmanaged device.', delayMs: 0 },
      { level: 'critical', message: 'Administrative credential abuse simulated across privileged accounts.', delayMs: 900 },
      { level: 'critical', message: 'Backup deletion warning raised in training telemetry.', delayMs: 1200 },
    ],
    fileDelayMs: 1050,
    finalEvent: {
      level: 'critical',
      message: 'Rapid encryption and extortion pressure simulated across critical business assets.',
    },
    excellentThresholdSeconds: 10,
    passThresholdSeconds: 18,
    passThresholdScore: 65,
    excellentThresholdScore: 88,
  },
];

const SCENARIO_ARTIFACTS: Record<DrillScenario['id'], ScenarioArtifact[]> = {
  starter: [
    {
      id: 'starter-mail',
      label: 'Mailbox Alert',
      stage: 'Recon',
      severity: 'warning',
      title: 'Suspicious invoice lure flagged',
      detail: 'A mock finance-themed email with a macro attachment appears in the user inbox as the initial access clue.',
    },
    {
      id: 'starter-macro',
      label: 'Execution Trace',
      stage: 'Encryption',
      severity: 'critical',
      title: 'Office child-process chain detected',
      detail: 'The drill shows a fake macro execution path spawning script activity before the workstation encryption phase.',
    },
    {
      id: 'starter-note',
      label: 'User Impact',
      stage: 'Assessment',
      severity: 'critical',
      title: 'Ransom note splash page rendered',
      detail: 'A visual-only ransom note and lock-screen prompt are displayed to simulate business disruption after encryption.',
    },
  ],
  'double-extortion': [
    {
      id: 'double-archive',
      label: 'Exfil Queue',
      stage: 'Recon',
      severity: 'warning',
      title: 'Archive staging job started',
      detail: 'Fake archive bundles and outbound transfer labels appear to simulate data theft before file locking begins.',
    },
    {
      id: 'double-leak',
      label: 'Leak Site Monitor',
      stage: 'Encryption',
      severity: 'critical',
      title: 'Leak warning banner escalated',
      detail: 'The drill surfaces a mock leak-site pressure card indicating that sensitive files may be exposed if response lags.',
    },
    {
      id: 'double-legal',
      label: 'Business Pressure',
      stage: 'Assessment',
      severity: 'critical',
      title: 'Customer notification draft generated',
      detail: 'A simulated legal and communications alert appears to reinforce the added pressure of double-extortion incidents.',
    },
  ],
  'identity-crisis': [
    {
      id: 'identity-login',
      label: 'Identity Alert',
      stage: 'Recon',
      severity: 'warning',
      title: 'Privileged sign-in from unmanaged host',
      detail: 'The scenario highlights a mock administrator login from an unusual device to emphasize identity-centric detection.',
    },
    {
      id: 'identity-admin',
      label: 'Privilege Abuse',
      stage: 'Encryption',
      severity: 'critical',
      title: 'Domain admin activity spike detected',
      detail: 'A fake admin-abuse panel appears as the drill simulates broad credential misuse and lateral control.',
    },
    {
      id: 'identity-backup',
      label: 'Recovery Risk',
      stage: 'Assessment',
      severity: 'critical',
      title: 'Backup deletion warning raised',
      detail: 'The drill displays a mock backup tampering alert to pressure the defender on containment and recovery timing.',
    },
  ],
};

const CONTROLLER_ACTIONS: Record<DrillScenario['id'], ControllerAction[]> = {
  starter: [
    {
      id: 'starter-lure',
      label: 'Push Phishing Lure',
      description: 'Send a fake initial-access signal into the telemetry feed.',
      level: 'warning',
      message: 'Controller injected a phishing-lure alert into the training telemetry.',
      scoreBoost: 8,
    },
    {
      id: 'starter-macro',
      label: 'Trigger Macro Alert',
      description: 'Escalate the scenario with a mock execution chain warning.',
      level: 'critical',
      message: 'Controller escalated the drill with a macro execution chain warning.',
      scoreBoost: 10,
    },
  ],
  'double-extortion': [
    {
      id: 'double-exfil',
      label: 'Simulate Exfil Queue',
      description: 'Create leak-pressure telemetry for the defender to triage.',
      level: 'critical',
      message: 'Controller staged a mock exfiltration queue and leak-pressure alert.',
      scoreBoost: 10,
    },
    {
      id: 'double-pressure',
      label: 'Leak Site Pressure',
      description: 'Raise business pressure with a fake exposure warning.',
      level: 'critical',
      message: 'Controller raised a leak-site pressure warning in the scenario feed.',
      scoreBoost: 12,
    },
  ],
  'identity-crisis': [
    {
      id: 'identity-login',
      label: 'Raise Admin Login Alert',
      description: 'Inject a mock privileged sign-in anomaly into the room.',
      level: 'warning',
      message: 'Controller flagged a simulated privileged login from an unmanaged host.',
      scoreBoost: 9,
    },
    {
      id: 'identity-backup',
      label: 'Raise Backup Tamper Alert',
      description: 'Force the defender to respond to a recovery-risk signal.',
      level: 'critical',
      message: 'Controller raised a backup tampering warning in the training telemetry.',
      scoreBoost: 12,
    },
  ],
};

const INCIDENT_STAGES: IncidentStageDetail[] = [
  {
    id: 'Recon',
    title: 'Initial Access',
    attackerView: 'The controller seeds phishing, identity, or staging signals to establish the opening foothold.',
    defenderView: 'The analyst should detect unusual sign-ins, suspicious email behavior, or early workstation warnings.',
  },
  {
    id: 'Encryption',
    title: 'Privilege Abuse + Spread',
    attackerView: 'Scenario pressure escalates through admin misuse, exfiltration cues, and staged file impact.',
    defenderView: 'The analyst should isolate endpoints, reset credentials, and contain the growing blast radius quickly.',
  },
  {
    id: 'Assessment',
    title: 'Business Disruption',
    attackerView: 'The room shifts to ransom pressure, data leak risk, and operational disruption signals.',
    defenderView: 'The analyst should validate containment, preserve evidence, and rehearse recovery against clean backups.',
  },
  {
    id: 'Contained',
    title: 'Containment',
    attackerView: 'The drill controller stops escalation and reviews how quickly the scenario was shut down.',
    defenderView: 'The analyst reviews response quality, remediation timing, and readiness for the next exercise.',
  },
];

const RANSOM_DEMANDS: Record<DrillScenario['id'], { amount: string; message: string }> = {
  starter: {
    amount: '$15,000',
    message: 'Pay 15,000 dollars or the files in this simulation will be misused.',
  },
  'double-extortion': {
    amount: '$75,000',
    message: 'Pay 75,000 dollars or the files in this simulation will be leaked and misused.',
  },
  'identity-crisis': {
    amount: '$120,000',
    message: 'Pay 120,000 dollars or the files in this simulation will be misused and identity abuse will continue.',
  },
};

const SPOKEN_RANSOM_AMOUNTS: Record<DrillScenario['id'], string> = {
  starter: 'fifteen thousand dollars',
  'double-extortion': 'seventy five thousand dollars',
  'identity-crisis': 'one hundred twenty thousand dollars',
};

export default function LiveLab() {
  const { user } = useFirebase();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomId, setRoomId] = useState('training-room-1');
  const [roomIdDraft, setRoomIdDraft] = useState('training-room-1');
  const [role, setRole] = useState<'attacker' | 'defender' | null>(null);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [encryptedFiles, setEncryptedFiles] = useState<string[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [telemetryPulse, setTelemetryPulse] = useState(false);
  const [containmentStatus, setContainmentStatus] = useState<'idle' | 'in_progress' | 'contained'>('idle');
  const [detectionScore, setDetectionScore] = useState(18);
  const [drillStage, setDrillStage] = useState('Recon');
  const [report, setReport] = useState<DrillReport | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [selectedScenario, setSelectedScenario] = useState<DrillScenario>(DRILL_SCENARIOS[0]);
  const [compromiseVisual, setCompromiseVisual] = useState(false);
  const [glitchTick, setGlitchTick] = useState(0);
  const [hackAnnouncementSent, setHackAnnouncementSent] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [audioStatus, setAudioStatus] = useState<'idle' | 'ready' | 'playing' | 'blocked'>('idle');
  const controllerActions = CONTROLLER_ACTIONS[selectedScenario.id];
  const ransomDemand = RANSOM_DEMANDS[selectedScenario.id];
  const spokenRansomAmount = SPOKEN_RANSOM_AMOUNTS[selectedScenario.id];
  const currentStage = INCIDENT_STAGES.find((stage) => stage.id === drillStage) ?? INCIDENT_STAGES[0];
  const blastRadius = Math.min(100, 12 + encryptedFiles.length * 18 + (compromiseVisual ? 18 : 0) + (containmentStatus === 'contained' ? -20 : 0));
  const victimSignals = [
    {
      label: 'Email Gateway',
      value: drillStage === 'Recon' ? 'Suspicious lure detected' : drillStage === 'Contained' ? 'No new malicious mail' : 'Delivery succeeded in drill',
      tone: drillStage === 'Contained' ? 'text-success' : 'text-warning',
    },
    {
      label: 'Identity Plane',
      value: selectedScenario.id === 'identity-crisis' || drillStage !== 'Recon' ? 'Privileged anomaly observed' : 'No admin abuse yet',
      tone: selectedScenario.id === 'identity-crisis' || drillStage !== 'Recon' ? 'text-danger' : 'text-ink/55',
    },
    {
      label: 'Backup Health',
      value: containmentStatus === 'contained' ? 'Recovery path preserved' : selectedScenario.id === 'double-extortion' || selectedScenario.id === 'identity-crisis' ? 'Deletion/tamper pressure simulated' : 'Under observation',
      tone: containmentStatus === 'contained' ? 'text-success' : selectedScenario.id === 'double-extortion' || selectedScenario.id === 'identity-crisis' ? 'text-danger' : 'text-warning',
    },
    {
      label: 'User Impact',
      value: encryptedFiles.length > 0 ? `${encryptedFiles.length} mock assets disrupted` : 'No asset impact yet',
      tone: encryptedFiles.length > 0 ? 'text-danger' : 'text-ink/55',
    },
  ];
  const activeArtifacts = SCENARIO_ARTIFACTS[selectedScenario.id].filter((artifact) => {
    if (containmentStatus === 'contained') {
      return artifact.stage === 'Contained' || artifact.stage === 'Assessment';
    }

    if (drillStage === 'Assessment') {
      return artifact.stage === 'Assessment' || artifact.stage === 'Encryption';
    }

    if (drillStage === 'Encryption') {
      return artifact.stage === 'Encryption' || artifact.stage === 'Recon';
    }

    return artifact.stage === 'Recon';
  });

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('room-update', (state: RoomState) => {
      setRoomState(state);
    });

    newSocket.on('attack-started', () => {
      setContainmentStatus('in_progress');
      setDrillStage('Encryption');
      setReport(null);
      setElapsedSeconds(0);
      setCompromiseVisual(false);
      setHackAnnouncementSent(false);
      setLogs(prev => [...prev, '[SYSTEM] Controlled ransomware drill initiated.']);
      setEncryptedFiles([]);
    });

    newSocket.on('file-status-update', ({ fileId }: { fileId: string }) => {
      setEncryptedFiles(prev => [...prev, fileId]);
      setTelemetryPulse(true);
      setTimeout(() => setTelemetryPulse(false), 900);
      setDetectionScore(prev => Math.min(prev + 12, 100));
      setLogs(prev => [...prev, `[ALERT] File encrypted: ${MOCK_FILES.find(f => f.id === fileId)?.name}`]);
    });

    newSocket.on('drill-event', ({ level, message }: DrillEvent) => {
      setTelemetryPulse(true);
      setTimeout(() => setTelemetryPulse(false), 900);
      if (level === 'critical') {
        setDetectionScore(prev => Math.min(prev + 16, 100));
        setCompromiseVisual(true);
      }
      setLogs(prev => [...prev, `[${level.toUpperCase()}] ${message}`]);
    });

    newSocket.on('attack-contained', () => {
      setContainmentStatus('contained');
      setDrillStage('Contained');
      setCompromiseVisual(false);
      setLogs(prev => [...prev, '[SUCCESS] Defensive controls isolated the simulated incident.']);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const joinRoom = () => {
    const normalizedRoomId = roomIdDraft.trim();

    if (socket && role && normalizedRoomId) {
      setRoomId(normalizedRoomId);
      socket.emit('join-room', normalizedRoomId, role);
      setContainmentStatus('idle');
      setDetectionScore(18);
      setDrillStage('Recon');
      setElapsedSeconds(0);
      setCompromiseVisual(false);
      setHackAnnouncementSent(false);
      setReport(null);
      setLogs(prev => [...prev, `[INFO] Joined room ${normalizedRoomId} as ${role.toUpperCase()}`]);
    }
  };

  const startAttack = async () => {
    if (socket && role === 'attacker') {
      socket.emit('start-attack', roomId);

      for (const event of selectedScenario.introEvents) {
        if (event.delayMs > 0) {
          await new Promise(r => setTimeout(r, event.delayMs));
        }
        socket.emit('broadcast-drill-event', roomId, {
          level: event.level,
          message: event.message,
        });
      }

      for (const file of MOCK_FILES) {
        await new Promise(r => setTimeout(r, selectedScenario.fileDelayMs));
        socket.emit('file-encrypted', roomId, file.id);
      }

      socket.emit('broadcast-drill-event', roomId, selectedScenario.finalEvent);

      setTimeout(() => {
        setDrillStage('Assessment');
      }, 600);
    }
  };

  const emitDefenderEvent = (level: DrillEvent['level'], message: string, scoreBoost = 8) => {
    if (socket) {
      socket.emit('broadcast-drill-event', roomId, { level, message });
      setDetectionScore(prev => Math.min(prev + scoreBoost, 100));
    }
  };

  const emitControllerEvent = (action: ControllerAction) => {
    if (socket && role === 'attacker') {
      socket.emit('broadcast-drill-event', roomId, {
        level: action.level,
        message: action.message,
      });
      setDetectionScore(prev => Math.min(prev + action.scoreBoost, 100));
      if (action.level === 'critical') {
        setCompromiseVisual(true);
      }
      setLogs(prev => [...prev, `[CONTROLLER] ${action.label} executed.`]);
    }
  };

  const containAttack = () => {
    if (socket && role === 'defender') {
      socket.emit('contain-attack', roomId);
      setContainmentStatus('contained');
    }
  };

  useEffect(() => {
    if (roomState?.status !== 'attacking') {
      return;
    }

    const interval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [roomState?.status]);

  useEffect(() => {
    if (encryptedFiles.length > 0 && containmentStatus !== 'contained') {
      setCompromiseVisual(true);
    }
  }, [encryptedFiles.length, containmentStatus]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const unlockAudio = () => {
      setAudioReady(true);
      setAudioStatus((prev) => (prev === 'idle' ? 'ready' : prev));
    };

    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });

    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  const playHackAnnouncement = async () => {
    if (typeof window === 'undefined') {
      return false;
    }

    let beepPlayed = false;
    let speechPlayed = false;

    try {
      const AudioContextCtor =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

      if (AudioContextCtor) {
        const audioContext = new AudioContextCtor();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(660, audioContext.currentTime + 0.18);
        gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.08, audioContext.currentTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.42);

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.45);
        beepPlayed = true;
      }
    } catch {
      // Fallback to speech-only path below.
    }

    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();

        const getVoices = async () => {
          const existingVoices = window.speechSynthesis.getVoices();
          if (existingVoices.length > 0) {
            return existingVoices;
          }

          return await new Promise<SpeechSynthesisVoice[]>((resolve) => {
            const timeoutId = window.setTimeout(() => resolve(window.speechSynthesis.getVoices()), 1200);
            window.speechSynthesis.onvoiceschanged = () => {
              window.clearTimeout(timeoutId);
              resolve(window.speechSynthesis.getVoices());
            };
          });
        };

        const voices = await getVoices();
        const preferredVoice =
          voices.find((voice) => /en-in|en-us|english/i.test(`${voice.lang} ${voice.name}`)) ||
          voices.find((voice) => /^en/i.test(voice.lang)) ||
          voices[0];

        const announcement = new SpeechSynthesisUtterance(
          `System is hacked. System is hacked. System is hacked. System is hacked. Ransom demanded. ${spokenRansomAmount}. This is a training simulation.`
        );
        announcement.rate = 0.76;
        announcement.pitch = 0.8;
        announcement.volume = 1;
        if (preferredVoice) {
          announcement.voice = preferredVoice;
        }

        speechPlayed = await new Promise<boolean>((resolve) => {
          const timeoutId = window.setTimeout(() => resolve(false), 5000);
          announcement.onend = () => {
            window.clearTimeout(timeoutId);
            resolve(true);
          };
          announcement.onerror = () => {
            window.clearTimeout(timeoutId);
            resolve(false);
          };

          window.setTimeout(() => {
            window.speechSynthesis.resume();
            window.speechSynthesis.speak(announcement);
          }, beepPlayed ? 500 : 0);
        });
      } catch {
        // Ignore and return beep result if available.
      }
    }

    const played = beepPlayed || speechPlayed;
    setAudioStatus(speechPlayed ? 'playing' : played ? 'ready' : 'blocked');
    return played;
  };

  useEffect(() => {
    if (
      role !== 'defender' ||
      encryptedFiles.length === 0 ||
      containmentStatus === 'contained' ||
      hackAnnouncementSent ||
      !audioReady
    ) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const played = await playHackAnnouncement();
      if (!cancelled && played) {
        setHackAnnouncementSent(true);
      }
    })();

    return () => {
      cancelled = true;
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [role, encryptedFiles.length, containmentStatus, hackAnnouncementSent, audioReady, ransomDemand.message]);

  useEffect(() => {
    if (!compromiseVisual || containmentStatus === 'contained') {
      return;
    }

    const interval = setInterval(() => {
      setGlitchTick(prev => prev + 1);
    }, 850);

    return () => clearInterval(interval);
  }, [compromiseVisual, containmentStatus]);

  useEffect(() => {
    if (roomState?.status !== 'finished') {
      return;
    }

    const encryptedCount = encryptedFiles.length;
    const outcome = containmentStatus === 'contained' ? 'contained' : 'degraded';
    const performance =
      outcome === 'contained' &&
      detectionScore >= selectedScenario.excellentThresholdScore &&
      elapsedSeconds <= selectedScenario.excellentThresholdSeconds
        ? 'excellent'
        : outcome === 'contained' &&
            detectionScore >= selectedScenario.passThresholdScore &&
            elapsedSeconds <= selectedScenario.passThresholdSeconds
          ? 'pass'
          : 'needs_improvement';
    const recommendations =
      performance === 'excellent'
        ? [
            'Capture the exact sequence of detections and response actions as a gold-standard playbook.',
            'Promote the strongest telemetry indicators into permanent SOC detections.',
            'Increase drill complexity with the harder incident scenarios available in the controller panel.',
          ]
        : outcome === 'contained'
        ? [
            'Document the containment steps that improved visibility fastest.',
            'Validate that backup restoration and credential reset actions are in the incident playbook.',
            'Turn the highest-value telemetry events into permanent detections.',
          ]
        : [
            'Reduce time-to-detect by prioritizing phishing, identity, and backup deletion alerts.',
            'Practice faster endpoint isolation and credential reset coordination.',
            'Review backup protection controls and recovery validation procedures.',
          ];

    setReport({
      performance,
      outcome,
      encryptedCount,
      detectionScore,
      elapsedSeconds,
      summary:
        performance === 'excellent'
          ? 'The defender achieved a fast, high-confidence containment with strong visibility throughout the drill.'
          : outcome === 'contained'
            ? 'The defender contained the simulated ransomware event, but response speed or visibility can still improve.'
            : 'The drill ended with meaningful impact, indicating slower detection or containment during the scenario.',
      recommendations,
    });
  }, [roomState?.status, encryptedFiles.length, containmentStatus, detectionScore, elapsedSeconds, selectedScenario]);

  if (!role) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-8 p-12 bg-bg border border-line">
        <div className="text-center space-y-4">
          <h2 className="text-5xl font-bold tracking-tighter">LIVE TRAINING ROOM</h2>
          <p className="text-ink/60 font-serif italic max-w-md">
            Select your role to begin a real-time collaborative simulation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl">
          <button 
            onClick={() => setRole('attacker')}
            className="p-12 border border-line bg-white hover:bg-danger hover:text-bg transition-all group text-center space-y-4"
          >
            <Terminal className="w-12 h-12 mx-auto text-danger group-hover:text-bg" />
            <h3 className="text-2xl font-bold">Drill Controller</h3>
            <p className="text-xs opacity-60">Run a scripted incident scenario and generate safe training telemetry.</p>
          </button>

          <button 
            onClick={() => setRole('defender')}
            className="p-12 border border-line bg-white hover:bg-success hover:text-bg transition-all group text-center space-y-4"
          >
            <Shield className="w-12 h-12 mx-auto text-success group-hover:text-bg" />
            <h3 className="text-2xl font-bold">Security Analyst</h3>
            <p className="text-xs opacity-60">Detect, triage, and contain a realistic but non-destructive incident drill.</p>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-8 relative transition-all duration-200 ${telemetryPulse ? 'scale-[1.005]' : ''} ${compromiseVisual ? 'saturate-125 contrast-105' : ''}`}>
      <AnimatePresence>
        {compromiseVisual && containmentStatus !== 'contained' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 pointer-events-none z-40"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.16),transparent_55%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(10,10,10,0.82),rgba(25,8,8,0.88),rgba(8,8,8,0.92))]" />
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(220,38,38,0.08),transparent)] animate-pulse" />
            <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.8)_1px,transparent_1px)] [background-size:32px_32px]" />
            <motion.div
              animate={{
                x: [0, -4, 5, -2, 0],
                opacity: [0.95, 0.8, 1, 0.86, 0.95],
              }}
              transition={{ duration: 0.28, repeat: Infinity, repeatDelay: 1.8 }}
              className="absolute top-10 left-1/2 -translate-x-1/2 border border-danger/30 bg-danger/10 px-6 py-3 text-danger font-mono text-xs uppercase tracking-[0.35em] shadow-2xl"
            >
              System Compromised
            </motion.div>
            <motion.div
              animate={{
                x: [0, 8, -6, 4, 0],
                opacity: [0.18, 0.3, 0.12, 0.26, 0.18],
              }}
              transition={{ duration: 0.22, repeat: Infinity, repeatDelay: 1.8 }}
              className="absolute top-10 left-1/2 -translate-x-1/2 px-6 py-3 text-cyan-300 font-mono text-xs uppercase tracking-[0.35em]"
            >
              System Compromised
            </motion.div>
            <div className="absolute inset-x-10 bottom-10 hidden lg:grid grid-cols-4 gap-4 opacity-35">
              {['HR Portal', 'Finance Share', 'Backups', 'Email Queue'].map((tile) => (
                <div key={tile} className="border border-white/10 bg-white/5 p-4 text-white/70 font-mono text-xs">
                  {tile}
                </div>
              ))}
            </div>
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <motion.div
                initial={{ scale: 0.96, opacity: 0.7 }}
                animate={{ scale: [1, 1.01, 1], opacity: [0.88, 1, 0.88] }}
                transition={{ duration: 1.6, repeat: Infinity }}
                className="w-full max-w-3xl border border-danger/30 bg-black/75 shadow-[0_0_80px_rgba(220,38,38,0.18)] backdrop-blur-md"
              >
                <div className="border-b border-danger/20 px-6 py-4 flex items-center justify-between">
                  <div className="text-danger font-mono text-xs uppercase tracking-[0.35em]">Training Lock Screen</div>
                  <div className="text-white/45 font-mono text-xs">Recovery disabled</div>
                </div>
                <div className="grid gap-6 p-6 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="space-y-4">
                    <div className="text-4xl font-bold tracking-tight text-white">Your environment appears seized.</div>
                    <div className="text-sm leading-relaxed text-white/70">
                      This is a visual-only lock-screen simulation for training. Use the analyst controls to isolate the host,
                      reset credentials, and rehearse restoration from backup.
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="border border-white/10 bg-white/5 p-4">
                        <div className="text-[10px] uppercase tracking-widest text-white/40 mb-2">Files Locked</div>
                        <div className="text-2xl font-mono font-bold text-danger">{encryptedFiles.length}</div>
                      </div>
                      <div className="border border-white/10 bg-white/5 p-4">
                        <div className="text-[10px] uppercase tracking-widest text-white/40 mb-2">Drill Stage</div>
                        <div className="text-2xl font-mono font-bold text-warning">{drillStage}</div>
                      </div>
                    </div>
                  </div>
                  <div className="border border-white/10 bg-danger/10 p-5 space-y-3">
                    <div className="text-[10px] uppercase tracking-[0.35em] text-danger/80">Wallpaper Override</div>
                    <div className="text-xl font-bold text-white">FILES UNAVAILABLE IN THIS DRILL</div>
                    <div className="text-xs text-white/65 leading-relaxed">
                      This mock desktop lock screen exists only to simulate operator pressure and user disruption during a ransomware event.
                    </div>
                    <div className="border border-danger/20 bg-black/30 p-3 font-mono text-[11px] text-danger/90">
                      restore_key: unavailable
                      <br />
                      backup_state: degraded
                      <br />
                      session_access: denied
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
            <div className="absolute inset-x-0 top-[18%] h-[2px] bg-danger/25" style={{ transform: `translateY(${(glitchTick % 7) * 28}px)` }} />
          </motion.div>
        )}
      </AnimatePresence>

      <header className="flex justify-between items-center">
          <div className="space-y-1">
            <h2 className="text-3xl font-bold tracking-tighter flex items-center gap-3">
              <Zap className="w-6 h-6 text-accent" />
              LIVE INCIDENT DRILL: {roomId}
            </h2>
          <div className="flex items-center gap-4 text-[10px] uppercase tracking-widest font-bold">
            <span className={role === 'attacker' ? 'text-danger' : 'text-success'}>
              Role: {role}
            </span>
            <span className="opacity-30">|</span>
            <span className="opacity-50">
              Status: {roomState?.status || 'disconnected'}
            </span>
            <span className="opacity-30">|</span>
            <span className="text-warning">Difficulty: {selectedScenario.difficulty}</span>
            <span className="opacity-30">|</span>
            <span className="text-accent">Stage: {drillStage}</span>
          </div>
        </div>

        <div className="flex gap-4 items-end">
          {roomState?.attackerId && roomState?.defenderId && (
            <>
              {role === 'attacker' && (
                <button 
                  onClick={() => emitDefenderEvent('critical', 'Simulated backup deletion warning raised in training telemetry.', 10)}
                  className="px-6 py-3 border border-danger text-danger font-bold text-xs uppercase tracking-widest hover:bg-danger hover:text-bg transition-all flex items-center gap-2"
                >
                  <Siren className="w-4 h-4" /> Raise Critical Alert
                </button>
              )}

              {role === 'defender' && roomState.status === 'attacking' && (
                <button 
                  onClick={containAttack}
                  className="px-6 py-3 border border-success text-success font-bold text-xs uppercase tracking-widest hover:bg-success hover:text-bg transition-all flex items-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" /> Contain Incident
                </button>
              )}
            </>
          )}

          {!roomState?.attackerId || !roomState?.defenderId ? (
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
              <label className="flex flex-col gap-2 min-w-[220px]">
                <span className="text-[10px] uppercase tracking-[0.35em] font-bold text-ink/45">
                  Room ID
                </span>
                <input
                  type="text"
                  value={roomIdDraft}
                  onChange={(event) => setRoomIdDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      joinRoom();
                    }
                  }}
                  placeholder="training-room-1"
                  className="px-4 py-3 border border-line bg-white text-sm font-medium tracking-wide outline-none focus:border-accent"
                />
              </label>
              <button 
                onClick={joinRoom}
                disabled={!roomIdDraft.trim()}
                className="px-8 py-3 bg-ink text-bg font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Join Room
              </button>
            </div>
          ) : role === 'attacker' && roomState.status === 'ready' && (
            <button 
              onClick={startAttack}
              className="px-8 py-3 bg-danger text-bg font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-all flex items-center gap-2"
            >
              <Play className="w-4 h-4" /> Start Drill
            </button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {!roomState?.attackerId || !roomState?.defenderId ? (
            <div className="border border-line bg-white p-5 space-y-2">
              <div className="col-header">Room Access</div>
              <p className="text-sm leading-relaxed text-ink/70">
                Enter a shared room ID and use the same value on both devices or browser windows. Once both participants join that room, the live drill becomes ready.
              </p>
            </div>
          ) : null}

          {compromiseVisual && containmentStatus !== 'contained' && (
            <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-4">
              <div className="border border-danger/30 bg-danger/5 p-5 space-y-3">
                <div className="col-header text-danger/70">Compromise Banner</div>
                <h3 className="text-2xl font-bold tracking-tight text-danger">Critical training state active</h3>
                <p className="text-sm text-ink/70 leading-relaxed">
                  The simulated environment now presents as compromised. Use the analyst actions to contain the incident,
                  preserve visibility, and stop additional file impact.
                </p>
              </div>
              <div className="border border-line bg-ink text-danger p-5 space-y-3">
                <div className="text-[10px] uppercase tracking-[0.35em] opacity-60">Simulated Ransom Note</div>
                <div className="text-xl font-bold tracking-tight">Your files are locked in this drill.</div>
                <div className="text-xs leading-relaxed text-white/70">
                  This is a visual-only training artifact. No real files, credentials, or systems are being changed.
                </div>
              </div>
            </div>
          )}

          {role === 'defender' && compromiseVisual && containmentStatus !== 'contained' && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="border border-danger/30 bg-danger text-bg p-6 shadow-[0_18px_60px_rgba(220,38,38,0.28)]"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.35em] text-bg/70 mb-2">Defender Critical Alert</div>
                  <h3 className="text-3xl font-bold tracking-tight">Your system is hacked</h3>
                </div>
                <Siren className="w-8 h-8 text-bg/80" />
              </div>
              <p className="mt-3 text-sm leading-relaxed text-bg/85">
                Mock files have entered the encrypted state. The browser also announces this alert using speech synthesis so the
                defender gets both a visual and audible compromise warning during the drill.
              </p>
              <div className="mt-4 border border-white/20 bg-black/20 p-4 space-y-2">
                <div className="text-[10px] uppercase tracking-[0.35em] text-bg/65">Simulated Ransom Demand</div>
                <div className="text-2xl font-bold">{ransomDemand.amount}</div>
                <div className="text-sm leading-relaxed text-bg/80">
                  Pay the ransom amount otherwise the files will be misused. This wording is part of the training scenario only.
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => {
                    setAudioReady(true);
                    playHackAnnouncement();
                  }}
                  className="px-4 py-2 border border-white/25 bg-white/10 hover:bg-white/20 transition-all text-xs font-bold uppercase tracking-widest"
                >
                  Replay Alert Audio
                </button>
                <div className="text-[11px] text-bg/70">
                  {audioStatus === 'blocked'
                    ? 'Audio was blocked by the browser. Click the button after interacting with the page.'
                    : audioStatus === 'playing'
                      ? 'Audio alert triggered.'
                      : audioStatus === 'ready'
                        ? 'Audio is armed and will play on the next compromise event.'
                        : 'Click anywhere on the page once to arm browser audio if needed.'}
                </div>
              </div>
            </motion.div>
          )}

          {(roomState?.status === 'attacking' || compromiseVisual || report) && (
            <div className="border border-line bg-white p-6 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="col-header">Scenario Artifacts</div>
                  <h3 className="text-2xl font-bold tracking-tight">Fake evidence feed</h3>
                </div>
                <div className="text-[10px] uppercase tracking-widest font-bold text-ink/35">
                  Visual Training Only
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {activeArtifacts.map((artifact) => (
                  <div
                    key={artifact.id}
                    className={`border p-4 space-y-3 ${
                      artifact.severity === 'critical'
                        ? 'border-danger/30 bg-danger/5'
                        : artifact.severity === 'success'
                          ? 'border-success/30 bg-success/5'
                          : 'border-warning/30 bg-warning/5'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className={`w-4 h-4 ${
                          artifact.severity === 'critical'
                            ? 'text-danger'
                            : artifact.severity === 'success'
                              ? 'text-success'
                              : 'text-warning'
                        }`} />
                        <div className="font-bold text-sm">{artifact.label}</div>
                      </div>
                      <div className="text-[10px] uppercase tracking-widest font-bold opacity-45">
                        {artifact.stage}
                      </div>
                    </div>
                    <div className="text-sm font-semibold leading-snug">{artifact.title}</div>
                    <div className="text-xs leading-relaxed text-ink/68">{artifact.detail}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border border-line bg-white p-6 space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="col-header">Incident Timeline</div>
                <h3 className="text-2xl font-bold tracking-tight">Staged compromise progression</h3>
              </div>
              <div className="text-[10px] uppercase tracking-widest font-bold text-ink/35">
                {currentStage.title}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {INCIDENT_STAGES.map((stage, index) => {
                const currentIndex = INCIDENT_STAGES.findIndex((item) => item.id === currentStage.id);
                const stageIndex = INCIDENT_STAGES.findIndex((item) => item.id === stage.id);
                const isActive = stage.id === currentStage.id;
                const isReached = stageIndex <= currentIndex;

                return (
                  <div
                    key={stage.id}
                    className={`border p-4 space-y-2 transition-all ${
                      isActive
                        ? 'border-danger/30 bg-danger/5'
                        : isReached
                          ? 'border-accent/30 bg-accent/5'
                          : 'border-line bg-bg'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[10px] uppercase tracking-widest font-bold opacity-45">Stage {index + 1}</div>
                      <div className="font-mono text-xs">{stage.id}</div>
                    </div>
                    <div className="font-bold text-sm">{stage.title}</div>
                    <div className="text-[11px] leading-relaxed text-ink/65">
                      {role === 'attacker' ? stage.attackerView : stage.defenderView}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {role === 'attacker' && (!roomState || roomState.status === 'ready' || roomState.status === 'waiting') && (
            <div className="p-6 border border-line bg-white space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="col-header">Scenario Selection</div>
                  <h3 className="text-2xl font-bold tracking-tight">Choose a training scenario</h3>
                </div>
                <div className="text-[10px] uppercase tracking-widest font-bold text-ink/35">
                  Controller Only
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {DRILL_SCENARIOS.map((scenario) => (
                  <button
                    key={scenario.id}
                    onClick={() => setSelectedScenario(scenario)}
                    className={`p-4 border text-left transition-all space-y-3 ${
                      selectedScenario.id === scenario.id
                        ? 'border-ink bg-ink text-bg'
                        : 'border-line bg-bg hover:border-ink/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-bold text-sm">{scenario.title}</div>
                      <div className={`text-[10px] uppercase tracking-widest font-bold ${
                        selectedScenario.id === scenario.id ? 'text-bg/60' : 'text-accent'
                      }`}>
                        {scenario.difficulty}
                      </div>
                    </div>
                    <p className={`text-[11px] leading-relaxed ${
                      selectedScenario.id === scenario.id ? 'text-bg/70' : 'text-ink/60'
                    }`}>
                      {scenario.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {role === 'attacker' && roomState?.status === 'attacking' && (
            <div className="border border-line bg-ink text-bg p-6 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="col-header text-danger/70">Attacker Console</div>
                  <h3 className="text-2xl font-bold tracking-tight">Scenario control panel</h3>
                </div>
                <div className="text-[10px] uppercase tracking-widest font-bold text-danger/70">
                  Safe Simulation
                </div>
              </div>
              <p className="text-sm text-white/70 leading-relaxed">
                This console is a drill-controller surface. It injects scripted training signals and incident pressure into
                the room without targeting real users, devices, or networks.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {controllerActions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => emitControllerEvent(action)}
                    className="border border-white/10 bg-white/5 hover:bg-danger hover:text-bg hover:border-danger/30 transition-all p-4 text-left space-y-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-bold text-sm">{action.label}</div>
                      <Siren className="w-4 h-4 text-danger" />
                    </div>
                    <div className="text-[11px] text-white/60 leading-relaxed">{action.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="p-8 border border-line bg-white min-h-[400px] space-y-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="col-header mb-2">Victim Environment</div>
                <h3 className="text-2xl font-bold tracking-tight">
                  {roomState?.defenderId ? 'Compromised workstation simulation' : 'Environment offline'}
                </h3>
              </div>
              <div className="text-[10px] uppercase tracking-widest font-bold text-ink/35">
                Blast Radius {blastRadius}%
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {victimSignals.map((signal) => (
                <div key={signal.label} className="border border-line bg-bg p-4 space-y-2">
                  <div className="text-[10px] uppercase tracking-widest opacity-40">{signal.label}</div>
                  <div className={`text-sm font-semibold leading-snug ${signal.tone}`}>{signal.value}</div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs uppercase tracking-widest font-bold opacity-45">
                <span>Impact Spread</span>
                <span>{blastRadius}%</span>
              </div>
              <div className="h-3 border border-line/10 bg-bg overflow-hidden">
                <motion.div
                  initial={false}
                  animate={{ width: `${blastRadius}%` }}
                  className={`h-full ${blastRadius > 75 ? 'bg-danger' : blastRadius > 40 ? 'bg-warning' : 'bg-accent'}`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {MOCK_FILES.map((file) => (
                <div 
                  key={file.id}
                  className={`p-6 border border-line flex items-center gap-4 transition-all ${
                    encryptedFiles.includes(file.id) ? 'bg-danger/5 border-danger/30' : 'bg-bg/50'
                  }`}
                >
                  <div className={`p-3 rounded ${encryptedFiles.includes(file.id) ? 'bg-danger/20 text-danger' : 'bg-ink/5 text-ink/30'}`}>
                    {file.type === 'doc' && <FileText className="w-6 h-6" />}
                    {file.type === 'data' && <Database className="w-6 h-6" />}
                    {file.type === 'img' && <ImageIcon className="w-6 h-6" />}
                  </div>
                  <div className="flex-1">
                    <div className="font-mono text-sm font-bold truncate">
                      {file.name}{encryptedFiles.includes(file.id) ? '.locked' : ''}
                    </div>
                    <div className="text-[10px] uppercase tracking-tighter opacity-50 mt-1">
                      {encryptedFiles.includes(file.id) ? 'Simulated Encryption' : 'Available'}
                    </div>
                  </div>
                  {encryptedFiles.includes(file.id) ? (
                    <Lock className="w-4 h-4 text-danger" />
                  ) : (
                    <Unlock className="w-4 h-4 text-success opacity-30" />
                  )}
                </div>
              ))}
            </div>

            {roomState?.status === 'waiting' && (
              <div className="mt-12 p-8 border border-dashed border-line text-center space-y-4">
                <Users className="w-8 h-8 mx-auto opacity-20" />
                <p className="text-sm opacity-50 font-serif italic">Waiting for peer to join the incident drill...</p>
              </div>
            )}
          </div>

          {role === 'defender' && roomState?.status === 'attacking' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => emitDefenderEvent('warning', 'Endpoint isolation drill initiated for affected workstation.', 14)}
                className="p-4 border border-line bg-white hover:bg-ink hover:text-bg transition-all text-left space-y-2"
              >
                <ScanLine className="w-5 h-5 text-accent" />
                <div className="font-bold text-sm">Isolate Endpoint</div>
                <div className="text-[11px] opacity-60">Simulate network quarantine for the compromised host.</div>
              </button>
              <button
                onClick={() => emitDefenderEvent('warning', 'Credential reset drill queued for impacted administrative accounts.', 12)}
                className="p-4 border border-line bg-white hover:bg-ink hover:text-bg transition-all text-left space-y-2"
              >
                <Users className="w-5 h-5 text-accent" />
                <div className="font-bold text-sm">Reset Credentials</div>
                <div className="text-[11px] opacity-60">Simulate identity containment and credential hygiene.</div>
              </button>
              <button
                onClick={() => emitDefenderEvent('success', 'Recovery workflow rehearsed against clean backup set.', 16)}
                className="p-4 border border-line bg-white hover:bg-ink hover:text-bg transition-all text-left space-y-2"
              >
                <Database className="w-5 h-5 text-accent" />
                <div className="font-bold text-sm">Restore From Backup</div>
                <div className="text-[11px] opacity-60">Simulate validated restoration from an immutable backup.</div>
              </button>
            </div>
          )}

          {report && (
            <div className="p-8 border border-line bg-white space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="col-header">After-Action Report</div>
                  <h3 className="text-3xl font-bold tracking-tight">Incident Drill Summary</h3>
                </div>
                <div className={`px-3 py-2 border text-[10px] font-bold uppercase tracking-widest ${
                  report.performance === 'excellent'
                    ? 'border-success/30 bg-success/5 text-success'
                    : report.performance === 'pass'
                      ? 'border-accent/30 bg-accent/5 text-accent'
                      : 'border-warning/30 bg-warning/5 text-warning'
                }`}>
                  {report.performance.replace('_', ' ')}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 border border-line bg-bg">
                  <div className="text-[10px] uppercase tracking-widest opacity-40 mb-2">Detection Score</div>
                  <div className="text-3xl font-mono font-bold">{report.detectionScore}</div>
                </div>
                <div className="p-4 border border-line bg-bg">
                  <div className="text-[10px] uppercase tracking-widest opacity-40 mb-2">Files Impacted</div>
                  <div className="text-3xl font-mono font-bold">{report.encryptedCount}</div>
                </div>
                <div className="p-4 border border-line bg-bg">
                  <div className="text-[10px] uppercase tracking-widest opacity-40 mb-2">Response Time</div>
                  <div className="text-3xl font-mono font-bold">{report.elapsedSeconds}s</div>
                </div>
                <div className="p-4 border border-line bg-bg">
                  <div className="text-[10px] uppercase tracking-widest opacity-40 mb-2">Final Stage</div>
                  <div className="text-3xl font-mono font-bold">{drillStage}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="border border-line p-4">
                  <div className="text-[10px] uppercase tracking-widest opacity-40 mb-2">Win Condition</div>
                  <div className="font-medium text-ink/70">Contain the drill quickly with strong telemetry coverage.</div>
                </div>
                <div className="border border-line p-4">
                  <div className="text-[10px] uppercase tracking-widest opacity-40 mb-2">Pass Threshold</div>
                  <div className="font-mono">
                    Contained, score {selectedScenario.passThresholdScore}+, under {selectedScenario.passThresholdSeconds}s
                  </div>
                </div>
                <div className="border border-line p-4">
                  <div className="text-[10px] uppercase tracking-widest opacity-40 mb-2">Excellent Threshold</div>
                  <div className="font-mono">
                    Contained, score {selectedScenario.excellentThresholdScore}+, under {selectedScenario.excellentThresholdSeconds}s
                  </div>
                </div>
              </div>

              <p className="text-sm leading-relaxed text-ink/68">{report.summary}</p>

              <div className="space-y-3">
                <div className="font-bold text-sm flex items-center gap-2 uppercase tracking-tight">
                  <ClipboardList className="w-4 h-4 text-accent" />
                  Next Training Actions
                </div>
                <div className="space-y-3">
                  {report.recommendations.map((item) => (
                    <div key={item} className="flex items-start gap-3 text-sm text-ink/68">
                      <ShieldCheck className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="p-6 border border-line bg-white space-y-4">
            <h4 className="font-bold text-sm flex items-center gap-2 uppercase tracking-tight">
              <AlertTriangle className="w-4 h-4 text-danger" />
              Role Brief
            </h4>
            <div className="space-y-3 text-xs leading-relaxed text-ink/68">
              <div>
                <span className="font-bold text-ink">Attacker View:</span> stage believable training pressure, escalate the selected
                scenario, and force the defender to prioritize the right alerts.
              </div>
              <div>
                <span className="font-bold text-ink">Defender View:</span> contain the simulated spread, preserve recovery, and keep the
                blast radius low before the room reaches full disruption.
              </div>
            </div>
          </div>

          <div className="p-6 bg-ink text-bg border border-line font-mono text-[11px] h-[400px] flex flex-col">
            <div className="flex items-center gap-2 mb-4 text-accent">
              <Terminal className="w-4 h-4" />
              <span className="uppercase tracking-widest text-[10px]">Training Telemetry</span>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar">
              {compromiseVisual && containmentStatus !== 'contained' && (
                <motion.div
                  animate={{ opacity: [0.35, 0.8, 0.35] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  className="border border-danger/20 bg-danger/10 px-3 py-2 text-danger uppercase tracking-[0.3em] text-[10px]"
                >
                  Ransomware activity detected
                </motion.div>
              )}
              {logs.map((log, i) => (
                <div key={i} className={log.includes('CRITICAL') || log.includes('ALERT') ? 'text-danger' : log.includes('SYSTEM') ? 'text-accent' : log.includes('SUCCESS') ? 'text-success' : 'text-success/70'}>
                  {log}
                </div>
              ))}
              {compromiseVisual && containmentStatus !== 'contained' && (
                <>
                  <motion.div
                    animate={{ x: [0, -3, 4, -2, 0], opacity: [0.5, 0.9, 0.4, 0.8, 0.5] }}
                    transition={{ duration: 0.24, repeat: Infinity, repeatDelay: 1.2 }}
                    className="text-danger/80"
                  >
                    [CORRUPTION] 0xA7F3::shadow-copy-map unavailable
                  </motion.div>
                  <motion.div
                    animate={{ x: [0, 5, -4, 3, 0], opacity: [0.3, 0.75, 0.28, 0.7, 0.3] }}
                    transition={{ duration: 0.19, repeat: Infinity, repeatDelay: 1.4 }}
                    className="text-cyan-300/70"
                  >
                    [MEMORY] backup_catalog -- -- -- signal_lost
                  </motion.div>
                </>
              )}
              <div className="animate-pulse">_</div>
            </div>
          </div>

          <div className={`p-6 border border-line bg-white space-y-4 transition-all ${telemetryPulse ? 'shadow-[0_0_0_1px_rgba(217,119,6,0.25)]' : ''}`}>
            <h4 className="font-bold text-sm flex items-center gap-2 uppercase tracking-tight">
              <Radio className="w-4 h-4 text-accent" />
              Detection Readiness
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span>Detection Score</span>
                <span className="font-mono font-bold">{detectionScore}/100</span>
              </div>
              <div className="h-3 bg-bg overflow-hidden border border-line/10">
                <motion.div
                  initial={false}
                  animate={{ width: `${detectionScore}%` }}
                  className={`h-full ${detectionScore > 75 ? 'bg-success' : detectionScore > 40 ? 'bg-warning' : 'bg-danger'}`}
                />
              </div>
              <div className="text-[11px] text-ink/60 leading-relaxed">
                {containmentStatus === 'contained'
                  ? 'Containment drill completed. Review telemetry and recovery actions.'
                  : 'Use analyst actions to improve visibility and drive the incident toward containment.'}
              </div>
            </div>
          </div>

          <div className="p-6 border border-line bg-white space-y-4">
            <h4 className="font-bold text-sm flex items-center gap-2 uppercase tracking-tight">
              <Siren className="w-4 h-4 text-danger" />
              Pressure Gauge
            </h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="border border-line bg-bg p-4">
                <div className="text-[10px] uppercase tracking-widest opacity-40 mb-2">Current Stage</div>
                <div className="font-bold">{currentStage.title}</div>
              </div>
              <div className="border border-line bg-bg p-4">
                <div className="text-[10px] uppercase tracking-widest opacity-40 mb-2">Scenario Risk</div>
                <div className="font-bold capitalize">{selectedScenario.difficulty}</div>
              </div>
              <div className="border border-line bg-bg p-4">
                <div className="text-[10px] uppercase tracking-widest opacity-40 mb-2">Mock Assets Hit</div>
                <div className="font-bold">{encryptedFiles.length}</div>
              </div>
              <div className="border border-line bg-bg p-4">
                <div className="text-[10px] uppercase tracking-widest opacity-40 mb-2">Room Pressure</div>
                <div className={`font-bold ${blastRadius > 75 ? 'text-danger' : blastRadius > 40 ? 'text-warning' : 'text-accent'}`}>
                  {blastRadius > 75 ? 'High' : blastRadius > 40 ? 'Elevated' : 'Controlled'}
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 border border-line bg-white space-y-4">
            <h4 className="font-bold text-sm flex items-center gap-2 uppercase tracking-tight">
              <Zap className="w-4 h-4 text-accent" />
              Drill Status
            </h4>
              <div className="space-y-3 text-xs opacity-70">
                <div className="flex justify-between">
                  <span>Containment</span>
                  <span className={`font-mono ${containmentStatus === 'contained' ? 'text-success' : containmentStatus === 'in_progress' ? 'text-warning' : 'text-ink/50'}`}>
                    {containmentStatus.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Elapsed</span>
                  <span className="font-mono">{elapsedSeconds}s</span>
                </div>
                <div className="flex justify-between">
                  <span>Scenario</span>
                  <span className="font-mono">{selectedScenario.title}</span>
                </div>
                <div className="flex justify-between">
                  <span>Exercise Mode</span>
                  <span className="font-mono">Safe Simulation</span>
                </div>
              <div className="flex justify-between">
                <span>Transport</span>
                <span className="font-mono">Socket.io</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
