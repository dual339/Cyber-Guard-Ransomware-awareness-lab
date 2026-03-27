import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Key, Lock, Unlock, RefreshCw, Info } from 'lucide-react';

export default function EncryptionLab() {
  const [inputText, setInputText] = useState('Confidential Project Data');
  const [key, setKey] = useState('SECRET_KEY_2024');
  const [isEncrypted, setIsEncrypted] = useState(false);

  // Simple XOR "encryption" for demonstration purposes
  const xorCipher = (text: string, key: string) => {
    return text.split('').map((char, i) => {
      return String.fromCharCode(char.charCodeAt(0) ^ key.charCodeAt(i % key.length));
    }).join('');
  };

  const handleProcess = () => {
    setIsEncrypted(!isEncrypted);
  };

  const processedText = isEncrypted ? xorCipher(inputText, key) : inputText;

  return (
    <div className="space-y-12">
      <header className="space-y-4">
        <h2 className="text-4xl font-bold tracking-tighter">Cryptographic Foundations</h2>
        <p className="text-ink/60 max-w-2xl font-serif italic">
          Ransomware leverages robust encryption algorithms to lock data. 
          Understanding the difference between Symmetric and Asymmetric encryption is crucial.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-8">
          <div className="p-8 border border-line bg-white space-y-6">
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-accent" />
              <span className="col-header">Symmetric Encryption Demo</span>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-widest opacity-50">Input Data</label>
                <textarea 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={isEncrypted}
                  className="w-full p-4 bg-bg border border-line font-mono text-sm h-32 resize-none focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-widest opacity-50">Encryption Key</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    disabled={isEncrypted}
                    className="flex-1 p-3 bg-bg border border-line font-mono text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                  <button 
                    onClick={handleProcess}
                    className={`px-6 py-3 font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-colors ${
                      isEncrypted ? 'bg-success text-bg' : 'bg-ink text-bg'
                    }`}
                  >
                    {isEncrypted ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    {isEncrypted ? 'Decrypt' : 'Encrypt'}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold tracking-widest opacity-50">Output (Ciphertext)</label>
              <div className="p-4 bg-ink text-success font-mono text-sm h-32 overflow-auto break-all border border-line">
                {isEncrypted ? processedText : 'Waiting for encryption...'}
              </div>
            </div>
          </div>

          <div className="p-6 bg-accent/5 border border-accent/20 rounded flex gap-4">
            <Info className="w-6 h-6 text-accent shrink-0" />
            <div className="space-y-2">
              <h4 className="font-bold text-sm">Why Symmetric?</h4>
              <p className="text-xs text-ink/70 leading-relaxed">
                Ransomware often uses symmetric encryption (like AES-256) for the actual file data 
                because it is extremely fast. The symmetric key is then encrypted using an 
                asymmetric public key (RSA), which only the attacker can decrypt with their private key.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="col-header">Technical Concepts</div>
          
          <div className="space-y-6">
            <div className="p-6 border-l-4 border-line bg-white">
              <h3 className="font-bold mb-2">AES (Advanced Encryption Standard)</h3>
              <p className="text-sm text-ink/60 leading-relaxed">
                The industry standard for bulk data encryption. 256-bit AES is considered 
                computationally unbreakable by current technology.
              </p>
            </div>

            <div className="p-6 border-l-4 border-line bg-white">
              <h3 className="font-bold mb-2">RSA (Rivest-Shamir-Adleman)</h3>
              <p className="text-sm text-ink/60 leading-relaxed">
                Asymmetric encryption used to securely exchange symmetric keys. The "Ransom" 
                usually pays for the RSA Private Key needed to unlock the AES keys.
              </p>
            </div>

            <div className="p-6 border-l-4 border-line bg-white">
              <h3 className="font-bold mb-2">Key Management</h3>
              <p className="text-sm text-ink/60 leading-relaxed">
                Modern ransomware generates unique keys for every victim, and sometimes 
                even unique keys for every file, making recovery without the attacker's 
                infrastructure nearly impossible.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
