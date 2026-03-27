import React, { useMemo, useState } from 'react';
import {
  Search,
  Globe,
  ShieldAlert,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  Zap,
  Hash,
  Upload,
  FileText,
  Network,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from '@google/genai';

type IndicatorType = 'url' | 'domain' | 'ip' | 'hash' | 'file';

interface AnalysisResult {
  isPhishing: boolean;
  riskScore: number;
  threats: string[];
  recommendations: string[];
  details: string;
}

interface SuspiciousComponent {
  label: string;
  value: string;
  reason: string;
}

interface VisualInspection {
  displayValue: string;
  components: SuspiciousComponent[];
}

interface MalwareDbMatch {
  sha256: string | null;
  sha1: string | null;
  md5: string | null;
  fileName: string | null;
  fileType: string | null;
  fileSize: number | null;
  signature: string | null;
  firstSeen: string | null;
  lastSeen: string | null;
  tags: string[];
}

interface MalwareDbLookup {
  found: boolean;
  source: string;
  match?: MalwareDbMatch;
  unavailableReason?: string;
}

interface UploadedFileInfo {
  name: string;
  size: number;
  type: string;
  sha256: string;
}

const INDICATOR_TYPES: { id: IndicatorType; label: string; icon: React.ElementType }[] = [
  { id: 'url', label: 'URL', icon: Globe },
  { id: 'domain', label: 'Domain', icon: Globe },
  { id: 'ip', label: 'IP Address', icon: Network },
  { id: 'hash', label: 'File Hash', icon: Hash },
  { id: 'file', label: 'Upload File', icon: Upload },
];

function isValidIpAddress(value: string) {
  const ipv4 =
    /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
  const ipv6 = /^([0-9a-fA-F]{1,4}:){1,7}[0-9a-fA-F]{1,4}$/;
  return ipv4.test(value) || ipv6.test(value);
}

function isLikelyDomain(value: string) {
  return /^(?!-)(?:[a-zA-Z0-9-]{1,63}\.)+[A-Za-z]{2,63}$/.test(value);
}

function isLikelyHash(value: string) {
  return /^[A-Fa-f0-9]{32}$|^[A-Fa-f0-9]{40}$|^[A-Fa-f0-9]{64}$/.test(value.trim());
}

function containsNonAscii(value: string) {
  return /[^\x00-\x7F]/.test(value);
}

function inspectUrlLikeIndicator(rawValue: string, type: 'url' | 'domain' | 'ip'): VisualInspection | null {
  if (type === 'ip') {
    return {
      displayValue: rawValue,
      components: [
        {
          label: 'Host',
          value: rawValue,
          reason: 'Direct IP destinations are unusual for legitimate user-facing portals and often bypass recognizable brand domains.',
        },
      ],
    };
  }

  const url = type === 'url' ? new URL(rawValue) : new URL(`https://${rawValue}`);
  const host = url.hostname;
  const path = url.pathname + url.search;
  const components: SuspiciousComponent[] = [];

  if (containsNonAscii(host)) {
    components.push({
      label: 'Hostname',
      value: host,
      reason: 'Contains non-ASCII characters that can visually imitate trusted brands.',
    });
  }

  const hostLabels = host.split('.');
  if (hostLabels.length >= 4) {
    components.push({
      label: 'Subdomain chain',
      value: host,
      reason: 'Uses multiple nested subdomains, a common pattern for misleading login pages.',
    });
  }

  const suspiciousKeywords = ['login', 'verify', 'secure', 'account', 'update', 'signin', 'wallet', 'auth', 'reset'];
  const matchedLabels = hostLabels.filter((label) =>
    suspiciousKeywords.some((keyword) => label.toLowerCase().includes(keyword))
  );
  if (matchedLabels.length > 0) {
    components.push({
      label: 'Subdomain keywords',
      value: matchedLabels.join('.'),
      reason: 'Contains urgency or credential-themed keywords often used in phishing infrastructure.',
    });
  }

  if (/-/.test(hostLabels[0] ?? '')) {
    components.push({
      label: 'Leading host label',
      value: hostLabels[0],
      reason: 'Hyphenated leading labels are frequently used to mimic brands or departments.',
    });
  }

  if (path && path !== '/') {
    const suspiciousPathSegments = path
      .split(/[/?#&=]+/)
      .filter(Boolean)
      .filter((segment) => suspiciousKeywords.some((keyword) => segment.toLowerCase().includes(keyword)));

    if (suspiciousPathSegments.length > 0) {
      components.push({
        label: 'Path segments',
        value: suspiciousPathSegments.join(' / '),
        reason: 'The path contains credential or verification language associated with lure pages.',
      });
    }
  }

  return {
    displayValue: type === 'url' ? rawValue : host,
    components,
  };
}

function buildRegexInspection(
  rawValue: string,
  type: 'url' | 'domain' | 'ip',
  regexPattern: string
): SuspiciousComponent[] {
  if (!regexPattern.trim()) {
    return [];
  }

  const expression = new RegExp(regexPattern, 'ig');
  const targets =
    type === 'url'
      ? (() => {
          const parsed = new URL(rawValue);
          return [
            { label: 'Hostname', value: parsed.hostname },
            { label: 'Path', value: parsed.pathname + parsed.search },
            { label: 'Full URL', value: rawValue },
          ];
        })()
      : [
          { label: type === 'ip' ? 'IP Address' : 'Hostname', value: rawValue },
        ];

  const matches: SuspiciousComponent[] = [];

  for (const target of targets) {
    expression.lastIndex = 0;
    const found = Array.from(target.value.matchAll(expression)).map((match) => match[0]);
    if (found.length > 0) {
      matches.push({
        label: `Regex match in ${target.label}`,
        value: [...new Set(found)].join(', '),
        reason: `Matched advanced regex pattern /${regexPattern}/ against ${target.label.toLowerCase()}.`,
      });
    }
  }

  return matches;
}

function buildFallbackResult(params: {
  targetType: IndicatorType;
  safeBrowsingThreats: string[];
  visualInspection: VisualInspection | null;
  malwareLookup: MalwareDbLookup | null;
}): AnalysisResult {
  const threats = [
    ...params.safeBrowsingThreats,
    ...(params.visualInspection?.components.map((component) => `${component.label}: ${component.reason}`) || []),
  ];

  if (params.malwareLookup?.found && params.malwareLookup.match) {
    threats.unshift(
      `${params.malwareLookup.source} match: ${params.malwareLookup.match.signature || 'Known malware sample'}`
    );
  }

  const recommendations = [
    'Do not open, visit, or distribute the indicator until it is verified safe.',
    'Cross-check the indicator with internal security tooling and reputation feeds.',
    'Block or quarantine the indicator if it is unexpected in your environment.',
  ];

  let riskScore = 10;
  riskScore += params.safeBrowsingThreats.length * 35;
  riskScore += (params.visualInspection?.components.length || 0) * 12;

  if (params.malwareLookup?.found) {
    riskScore = Math.max(riskScore, 95);
  }

  riskScore = Math.min(riskScore, 100);

  return {
    isPhishing: params.targetType === 'url' || params.targetType === 'domain' ? riskScore >= 60 : riskScore >= 70,
    riskScore,
    threats,
    recommendations,
    details:
      riskScore >= 70
        ? 'High-risk traits were detected from local URL inspection, Safe Browsing, or malware database signals.'
        : riskScore >= 35
          ? 'Some suspicious traits were detected. Review the matched components before trusting this indicator.'
          : 'No strong malicious signals were detected locally, but absence of evidence is not proof of safety.',
  };
}

async function sha256File(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', arrayBuffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export default function PhishingAnalyzer() {
  const [indicatorType, setIndicatorType] = useState<IndicatorType>('url');
  const [indicatorValue, setIndicatorValue] = useState('');
  const [uploadedFile, setUploadedFile] = useState<UploadedFileInfo | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [visualInspection, setVisualInspection] = useState<VisualInspection | null>(null);
  const [malwareLookup, setMalwareLookup] = useState<MalwareDbLookup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [regexPattern, setRegexPattern] = useState('');

  const currentLabel = useMemo(
    () => INDICATOR_TYPES.find((type) => type.id === indicatorType)?.label ?? 'Indicator',
    [indicatorType]
  );

  const clearOutput = () => {
    setError(null);
    setResult(null);
    setVisualInspection(null);
    setMalwareLookup(null);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    clearOutput();
    const file = event.target.files?.[0];
    if (!file) {
      setUploadedFile(null);
      return;
    }

    try {
      const sha256 = await sha256File(file);
      setUploadedFile({
        name: file.name,
        size: file.size,
        type: file.type || 'unknown',
        sha256,
      });
      setIndicatorType('file');
    } catch (fileError) {
      console.error('File hashing error:', fileError);
      setUploadedFile(null);
      setError('Failed to process the file. Try a smaller file or a different browser.');
    }
  };

  const buildTarget = () => {
    const raw = indicatorValue.trim();

    switch (indicatorType) {
      case 'url': {
        if (!raw) throw new Error('Enter a URL to analyze.');
        const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
        new URL(normalized);
        return { type: 'url' as const, value: normalized, safeBrowsingUrl: normalized };
      }
      case 'domain': {
        if (!isLikelyDomain(raw)) {
          throw new Error('Enter a valid domain such as example.com.');
        }
        return { type: 'domain' as const, value: raw.toLowerCase(), safeBrowsingUrl: `https://${raw.toLowerCase()}` };
      }
      case 'ip': {
        if (!isValidIpAddress(raw)) {
          throw new Error('Enter a valid IPv4 or IPv6 address.');
        }
        return { type: 'ip' as const, value: raw, safeBrowsingUrl: `http://${raw}` };
      }
      case 'hash': {
        if (!isLikelyHash(raw)) {
          throw new Error('Enter a valid MD5, SHA-1, or SHA-256 hash.');
        }
        return { type: 'hash' as const, value: raw.toLowerCase(), safeBrowsingUrl: null };
      }
      case 'file': {
        if (!uploadedFile) {
          throw new Error('Upload a file to analyze.');
        }
        return {
          type: 'file' as const,
          value: `${uploadedFile.name} (SHA-256: ${uploadedFile.sha256})`,
          safeBrowsingUrl: null,
        };
      }
    }
  };

  const analyzeIndicator = async () => {
    clearOutput();
    let target: ReturnType<typeof buildTarget>;

    try {
      target = buildTarget();
    } catch (validationError) {
      setError(validationError instanceof Error ? validationError.message : 'Invalid input.');
      return;
    }

    if (regexPattern.trim()) {
      try {
        new RegExp(regexPattern, 'ig');
      } catch {
        setError('Invalid regular expression. Fix the advanced pattern before running analysis.');
        return;
      }
    }

    setIsAnalyzing(true);
    let currentInspection: VisualInspection | null = null;
    if (target.type === 'url' || target.type === 'domain' || target.type === 'ip') {
      const inspection = inspectUrlLikeIndicator(target.value, target.type);
      const regexMatches = buildRegexInspection(target.value, target.type, regexPattern);
      currentInspection = {
        displayValue: inspection?.displayValue || target.value,
        components: [...(inspection?.components || []), ...regexMatches],
      };
      setVisualInspection(currentInspection);
    } else {
      setVisualInspection(null);
    }

    try {
      const safeBrowsingKey = 'AIzaSyAFA1TKGgENS8osGq-NInUdGt9j0VaC_KU';
      let safeBrowsingThreats: string[] = [];
      let malwareDatabaseResult: MalwareDbLookup | null = null;

      if (target.safeBrowsingUrl) {
        try {
          const sbResponse = await fetch(
            `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${safeBrowsingKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                client: { clientId: 'ioc-analyzer', clientVersion: '2.0.0' },
                threatInfo: {
                  threatTypes: [
                    'MALWARE',
                    'SOCIAL_ENGINEERING',
                    'UNWANTED_SOFTWARE',
                    'POTENTIALLY_HARMFUL_APPLICATION',
                  ],
                  platformTypes: ['ANY_PLATFORM'],
                  threatEntryTypes: ['URL'],
                  threatEntries: [{ url: target.safeBrowsingUrl }],
                },
              }),
            }
          );
          const sbData = await sbResponse.json();
          if (sbData.matches?.length > 0) {
            safeBrowsingThreats = sbData.matches.map(
              (match: { threatType: string }) =>
                `Google Safe Browsing Flag: ${match.threatType.replace(/_/g, ' ')}`
            );
          }
        } catch (sbError) {
          console.error('Safe Browsing API error:', sbError);
        }
      }

      if (target.type === 'hash' || target.type === 'file') {
        const hash =
          target.type === 'hash'
            ? target.value
            : uploadedFile?.sha256 || '';

        try {
          const lookupResponse = await fetch('/api/hash-lookup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hash }),
          });

          const lookupData = await lookupResponse.json();
          if (lookupResponse.ok) {
            malwareDatabaseResult = lookupData as MalwareDbLookup;
          } else {
            malwareDatabaseResult = {
              found: false,
              source: 'MalwareBazaar',
              unavailableReason:
                lookupData.code === 'missing_auth_key'
                  ? 'Hash database lookup is not configured on this server.'
                  : lookupData.error || 'Hash database lookup failed.',
            };
          }
        } catch (lookupError) {
          console.error('Malware database lookup error:', lookupError);
          malwareDatabaseResult = {
            found: false,
            source: 'MalwareBazaar',
            unavailableReason: 'Hash database lookup failed.',
          };
        }
      }

      const evidence =
        indicatorType === 'file' && uploadedFile
          ? `Uploaded file metadata:
- name: ${uploadedFile.name}
- size: ${uploadedFile.size} bytes
- mimeType: ${uploadedFile.type}
- sha256: ${uploadedFile.sha256}`
          : `Submitted value: ${target.value}`;

      const malwareLookupContext = malwareDatabaseResult
        ? malwareDatabaseResult.found && malwareDatabaseResult.match
          ? `Malware database result:
- source: ${malwareDatabaseResult.source}
- status: known malicious sample match
- signature: ${malwareDatabaseResult.match.signature || 'unknown'}
- tags: ${malwareDatabaseResult.match.tags.join(', ') || 'none'}
- firstSeen: ${malwareDatabaseResult.match.firstSeen || 'unknown'}`
          : `Malware database result:
- source: ${malwareDatabaseResult.source}
- status: no known match or lookup unavailable
- note: ${malwareDatabaseResult.unavailableReason || 'no match found'}`
        : 'Malware database result: not applicable';
      const geminiApiKey =
        typeof process.env.GEMINI_API_KEY === 'string' ? process.env.GEMINI_API_KEY.trim() : '';
      const fallbackResult = buildFallbackResult({
        targetType: target.type,
        safeBrowsingThreats,
        visualInspection: currentInspection,
        malwareLookup: malwareDatabaseResult,
      });

      let data = fallbackResult;

      if (geminiApiKey) {
        try {
          const ai = new GoogleGenAI({ apiKey: geminiApiKey });
          const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `You are a malware and phishing triage assistant.

Analyze this indicator of compromise and determine whether it is likely malicious, suspicious, or benign.

Indicator type: ${target.type}
${evidence}
${malwareLookupContext}

Use Google Search to cross-reference threat intelligence, malware reports, phishing reports, security advisories, abuse databases, and reputation sources that are relevant to the indicator type.

If the indicator is a domain or URL, look for phishing kits, typosquatting, impersonation, hosting abuse, and recent reports.
If it is an IP address, look for abuse reports, botnet/C2 activity, spam activity, or hosting reputation.
If it is a file hash, look for malware family associations, sandbox reports, or IOC feeds.
If it is an uploaded file, use the SHA-256 and file metadata to assess likely maliciousness and explain the confidence limits without binary execution.

Google Safe Browsing result: ${
          safeBrowsingThreats.length > 0 ? safeBrowsingThreats.join(', ') : 'No match or not applicable'
        }.

Return strict JSON in this structure:
{
  "isPhishing": boolean,
  "riskScore": number,
  "threats": string[],
  "recommendations": string[],
  "details": string
}`,
            config: {
              responseMimeType: 'application/json',
              tools: [{ googleSearch: {} }],
            },
          });

          const parsed = JSON.parse(response.text || '{}') as AnalysisResult;
          data = {
            isPhishing: parsed.isPhishing ?? fallbackResult.isPhishing,
            riskScore: Number.isFinite(parsed.riskScore) ? parsed.riskScore : fallbackResult.riskScore,
            threats: parsed.threats || fallbackResult.threats,
            recommendations: parsed.recommendations || fallbackResult.recommendations,
            details: parsed.details || fallbackResult.details,
          };
        } catch (aiError) {
          console.error('AI analysis fallback triggered:', aiError);
          data = {
            ...fallbackResult,
            details: `${fallbackResult.details} AI enrichment was unavailable, so this result is based on local inspection and connected lookups only.`,
          };
        }
      } else {
        data = {
          ...fallbackResult,
          details: `${fallbackResult.details} AI enrichment is not configured on this server.`,
        };
      }

      if (safeBrowsingThreats.length > 0) {
        data.threats = [...new Set([...safeBrowsingThreats, ...data.threats])];
        data.riskScore = Math.max(80, data.riskScore);
        data.isPhishing = true;
      }

      if (malwareDatabaseResult?.found && malwareDatabaseResult.match) {
        const match = malwareDatabaseResult.match;
        data.threats = [
          ...new Set([
            `${malwareDatabaseResult.source} match: ${match.signature || 'Known malware sample'}`,
            ...match.tags.map((tag) => `${malwareDatabaseResult.source} tag: ${tag}`),
            ...data.threats,
          ]),
        ];
        data.riskScore = Math.max(90, data.riskScore);
      }

      setMalwareLookup(malwareDatabaseResult);
      setResult(data);
    } catch (analysisError) {
      console.error('Analysis error:', analysisError);
      setError(`Failed to analyze the ${currentLabel.toLowerCase()}. Please try again.`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tighter">THREAT INDICATOR ANALYZER</h2>
        <p className="text-sm text-ink/60 font-serif italic">
          Check URLs, domains, IPs, file hashes, or uploaded files for malicious activity.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="p-8 border border-line bg-white shadow-sm space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {INDICATOR_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => {
                    setIndicatorType(type.id);
                    clearOutput();
                  }}
                  className={`p-3 border text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                    indicatorType === type.id
                      ? 'bg-ink text-bg border-ink'
                      : 'border-line hover:bg-ink hover:text-bg'
                  }`}
                >
                  <type.icon className="w-4 h-4" />
                  {type.label}
                </button>
              ))}
            </div>

            {indicatorType !== 'file' ? (
              <div className="space-y-4">
                <label className="col-header">Target {currentLabel}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-ink/30">
                    {indicatorType === 'hash' ? (
                      <Hash className="w-5 h-5" />
                    ) : indicatorType === 'ip' ? (
                      <Network className="w-5 h-5" />
                    ) : (
                      <Globe className="w-5 h-5" />
                    )}
                  </div>
                  <input
                    type="text"
                    value={indicatorValue}
                    onChange={(e) => setIndicatorValue(e.target.value)}
                    placeholder={
                      indicatorType === 'url'
                        ? 'https://example-secure-login.com/auth'
                        : indicatorType === 'domain'
                          ? 'example.com'
                          : indicatorType === 'ip'
                            ? '185.220.101.1'
                            : '44d88612fea8a8f36de82e1278abb02f'
                    }
                    className="w-full pl-12 pr-4 py-4 bg-bg border border-line font-mono text-sm focus:outline-none focus:border-accent transition-all"
                    onKeyDown={(e) => e.key === 'Enter' && analyzeIndicator()}
                  />
                </div>

                {(indicatorType === 'url' || indicatorType === 'domain' || indicatorType === 'ip') && (
                  <div className="border border-line bg-bg/40">
                    <button
                      type="button"
                      onClick={() => setShowAdvancedOptions((value) => !value)}
                      className="w-full px-4 py-3 flex items-center justify-between text-left text-xs font-bold uppercase tracking-widest hover:bg-white transition-all"
                    >
                      <span>Advanced Pattern Matching</span>
                      <span className="text-accent">{showAdvancedOptions ? 'Hide' : 'Show'}</span>
                    </button>
                    {showAdvancedOptions && (
                      <div className="p-4 border-t border-line space-y-3 bg-white">
                        <label className="col-header">Regex Pattern</label>
                        <input
                          type="text"
                          value={regexPattern}
                          onChange={(e) => setRegexPattern(e.target.value)}
                          placeholder="(login|verify|secure|auth)"
                          className="w-full px-4 py-3 bg-bg border border-line font-mono text-sm focus:outline-none focus:border-accent transition-all"
                        />
                        <p className="text-[10px] text-ink/50 italic">
                          Matches against hostname, path, and full URL where applicable. Invalid patterns will fail analysis.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <label className="col-header">Upload File</label>
                <label className="block border border-dashed border-line p-8 bg-bg/50 cursor-pointer hover:border-accent transition-all">
                  <input type="file" className="hidden" onChange={handleFileChange} />
                  <div className="flex flex-col items-center text-center gap-3">
                    <Upload className="w-8 h-8 text-accent" />
                    <span className="font-bold text-sm">Choose a file for local hashing</span>
                    <span className="text-xs text-ink/50">
                      The file is hashed in the browser. Analysis uses metadata and SHA-256.
                    </span>
                  </div>
                </label>

                {uploadedFile && (
                  <div className="border border-line bg-white p-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-bold">
                      <FileText className="w-4 h-4 text-accent" />
                      {uploadedFile.name}
                    </div>
                    <div className="text-xs text-ink/60">Size: {uploadedFile.size.toLocaleString()} bytes</div>
                    <div className="text-xs text-ink/60">Type: {uploadedFile.type}</div>
                    <div className="text-[11px] font-mono break-all text-ink/70">
                      SHA-256: {uploadedFile.sha256}
                    </div>
                  </div>
                )}
              </div>
            )}

            <p className="text-[10px] text-ink/40 italic">
              The analyzer combines Google Safe Browsing where applicable with AI-assisted threat intelligence searches.
            </p>

            <button
              onClick={analyzeIndicator}
              disabled={isAnalyzing || (indicatorType === 'file' ? !uploadedFile : !indicatorValue.trim())}
              className={`w-full py-4 font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${
                isAnalyzing || (indicatorType === 'file' ? !uploadedFile : !indicatorValue.trim())
                  ? 'bg-ink/10 text-ink/30 cursor-not-allowed'
                  : 'bg-ink text-bg hover:bg-accent'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Consulting Live Threat Feeds...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" /> Analyze Indicator
                </>
              )}
            </button>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-4 bg-danger/10 border border-danger/30 text-danger text-sm flex items-center gap-3"
              >
                <AlertCircle className="w-5 h-5" />
                {error}
              </motion.div>
            )}

            {result && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div
                  className={`p-8 border-2 ${
                    result.riskScore > 70
                      ? 'border-danger bg-danger/5'
                      : result.riskScore > 30
                        ? 'border-warning bg-warning/5'
                        : 'border-success bg-success/5'
                  } space-y-6`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={`p-3 rounded-full ${
                          result.riskScore > 70
                            ? 'bg-danger text-bg'
                            : result.riskScore > 30
                              ? 'bg-warning text-bg'
                              : 'bg-success text-bg'
                        }`}
                      >
                        {result.riskScore > 70 ? (
                          <ShieldAlert className="w-8 h-8" />
                        ) : (
                          <ShieldCheck className="w-8 h-8" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold tracking-tight uppercase">
                          {result.riskScore > 70
                            ? 'High Risk Detected'
                            : result.riskScore > 30
                              ? 'Medium Risk Warning'
                              : 'Low Risk / Likely Safe'}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">
                            Risk Level:
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                              result.riskScore > 70
                                ? 'border-danger/30 text-danger'
                                : result.riskScore > 30
                                  ? 'border-warning/30 text-warning'
                                  : 'border-success/30 text-success'
                            }`}
                          >
                            {result.riskScore > 70
                              ? 'CRITICAL'
                              : result.riskScore > 30
                                ? 'MODERATE'
                                : 'MINIMAL'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1">
                        Risk Score
                      </div>
                      <div className="text-2xl font-mono font-bold">
                        {result.riskScore}
                        <span className="text-xs opacity-30">/100</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="h-3 bg-ink/5 rounded-full overflow-hidden border border-line/5">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${result.riskScore}%` }}
                        className={`h-full transition-colors duration-500 ${
                          result.riskScore > 70
                            ? 'bg-danger'
                            : result.riskScore > 30
                              ? 'bg-warning'
                              : 'bg-success'
                        }`}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] font-bold uppercase tracking-tighter opacity-40">
                      <span>Safe</span>
                      <span>Suspicious</span>
                      <span>Malicious</span>
                    </div>
                  </div>

                  <p className="text-sm leading-relaxed text-ink/80 italic font-serif">
                    "{result.details}"
                  </p>
                </div>

                {visualInspection && visualInspection.components.length > 0 && (
                  <div className="p-6 border border-warning/30 bg-warning/5 space-y-4">
                    <h4 className="col-header flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-warning" /> Suspicious Components
                    </h4>
                    <div className="p-4 bg-white border border-line font-mono text-sm break-all leading-relaxed">
                      {visualInspection.displayValue}
                    </div>
                    <div className="space-y-3">
                      {visualInspection.components.map((component, index) => (
                        <div key={`${component.label}-${index}`} className="border border-line bg-white p-4 space-y-1">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-warning">
                              {component.label}
                            </span>
                            <span className="font-mono text-xs text-danger break-all">{component.value}</span>
                          </div>
                          <p className="text-xs text-ink/70">{component.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {malwareLookup && (
                  <div className="p-6 border border-line bg-white space-y-4">
                    <h4 className="col-header flex items-center gap-2">
                      <Hash className="w-4 h-4 text-accent" /> Malware Database Check
                    </h4>
                    {malwareLookup.found && malwareLookup.match ? (
                      <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 px-3 py-1 border border-danger/30 bg-danger/5 text-danger text-[10px] font-bold uppercase tracking-widest">
                          Known malicious sample match
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          <div className="border border-line p-3">
                            <div className="text-[10px] uppercase tracking-widest opacity-40 mb-1">Source</div>
                            <div className="font-bold">{malwareLookup.source}</div>
                          </div>
                          <div className="border border-line p-3">
                            <div className="text-[10px] uppercase tracking-widest opacity-40 mb-1">Signature</div>
                            <div className="font-bold">{malwareLookup.match.signature || 'Unknown'}</div>
                          </div>
                          <div className="border border-line p-3">
                            <div className="text-[10px] uppercase tracking-widest opacity-40 mb-1">File Name</div>
                            <div className="font-mono break-all">{malwareLookup.match.fileName || 'Unknown'}</div>
                          </div>
                          <div className="border border-line p-3">
                            <div className="text-[10px] uppercase tracking-widest opacity-40 mb-1">File Type</div>
                            <div className="font-mono">{malwareLookup.match.fileType || 'Unknown'}</div>
                          </div>
                        </div>
                        {malwareLookup.match.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {malwareLookup.match.tags.map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-1 border border-danger/20 bg-danger/5 text-danger text-[10px] font-bold uppercase tracking-widest"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          <div className="border border-line p-3">
                            <div className="text-[10px] uppercase tracking-widest opacity-40 mb-1">First Seen</div>
                            <div className="font-mono">{malwareLookup.match.firstSeen || 'Unknown'}</div>
                          </div>
                          <div className="border border-line p-3">
                            <div className="text-[10px] uppercase tracking-widest opacity-40 mb-1">Last Seen</div>
                            <div className="font-mono">{malwareLookup.match.lastSeen || 'Unknown'}</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 text-xs text-ink/70">
                        <div className="inline-flex items-center gap-2 px-3 py-1 border border-success/30 bg-success/5 text-success text-[10px] font-bold uppercase tracking-widest">
                          No known match found
                        </div>
                        <p>
                          {malwareLookup.unavailableReason ||
                            `${malwareLookup.source} did not return a known malware sample for this hash.`}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 border border-line bg-white space-y-4">
                    <h4 className="col-header flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-danger" /> Detected Indicators
                    </h4>
                    <ul className="space-y-3">
                      {result.threats.map((threat, i) => (
                        <li key={i} className="text-xs flex items-start gap-2 text-ink/70">
                          <XCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                          {threat}
                        </li>
                      ))}
                      {result.threats.length === 0 && (
                        <li className="text-xs italic text-ink/40">No major threats detected.</li>
                      )}
                    </ul>
                  </div>

                  <div className="p-6 border border-line bg-white space-y-4">
                    <h4 className="col-header flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-success" /> Safety Measures
                    </h4>
                    <ul className="space-y-3">
                      {result.recommendations.map((rec, i) => (
                        <li key={i} className="text-xs flex items-start gap-2 text-ink/70">
                          <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-6">
          <div className="p-6 border border-line bg-ink text-bg space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <Zap className="w-4 h-4 text-accent" /> Live Intelligence
            </h4>
            <div className="space-y-4 text-xs leading-relaxed opacity-80">
              <p>
                This analyzer cross-references submitted indicators against:
              </p>
              <ul className="space-y-2 list-disc pl-4">
                <li>Google Safe Browsing matches</li>
                <li>Phishing and malware reports</li>
                <li>Abuse and reputation signals</li>
                <li>Live web search for recent campaigns</li>
              </ul>
            </div>
          </div>

          <div className="p-6 border border-line bg-white space-y-4">
            <h4 className="col-header">Supported Inputs</h4>
            <div className="space-y-4">
              {[
                { title: 'URLs & Domains', desc: 'Checks phishing, typosquatting, and reputation signals.' },
                { title: 'IP Addresses', desc: 'Looks for abuse, botnet, spam, or C2 indicators.' },
                { title: 'Hashes & Files', desc: 'Uses hash lookups and file metadata to assess malware risk.' },
              ].map((t, i) => (
                <div key={i} className="space-y-1">
                  <div className="text-[10px] font-bold uppercase text-accent">{t.title}</div>
                  <p className="text-[11px] text-ink/60">{t.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
