'use client';
import { useAuth } from '@/context/AuthContext';
import { Shield, Lock, Key, CheckCircle, AlertTriangle, Copy, Eye, EyeOff, Fingerprint, Hash } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function CitizenZKPPage() {
  const { user, t } = useAuth();
  const [parcels, setParcels] = useState([]);
  const [proofs, setProofs] = useState([]);
  const [selectedParcel, setSelectedParcel] = useState('');
  const [generatedProof, setGeneratedProof] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!user?.lin) return;
    Promise.all([
      fetch(`http://localhost:5001/api/parcels?ownerLin=${user.lin}`).then(r => r.json()),
      fetch(`http://localhost:5001/api/zkp/proofs?ownerLin=${user.lin}`).then(r => r.json())
    ]).then(([parcelData, proofData]) => {
      if (parcelData.success) setParcels(parcelData.data);
      if (proofData.success) setProofs(proofData.data);
      setLoading(false);
    }).catch(err => { console.error(err); setLoading(false); });
  }, [user?.lin]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const generateProof = async () => {
    if (!selectedParcel) return;
    setGenerating(true);
    try {
      const res = await fetch('http://localhost:5001/api/zkp/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerLin: user.lin, parcelId: selectedParcel })
      });
      const data = await res.json();
      if (data.success) {
        setGeneratedProof(data);
        // Refresh proof list
        const proofRes = await fetch(`http://localhost:5001/api/zkp/proofs?ownerLin=${user.lin}`).then(r => r.json());
        if (proofRes.success) setProofs(proofRes.data);
        showToast('ZKP generated successfully');
      } else {
        showToast(data.error || 'Failed to generate proof', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error generating cryptographic proof', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  };

  if (loading) return (
    <div className="p-12 text-center">
      <div className="animate-spin w-8 h-8 border-4 border-crimson-600 border-t-transparent rounded-full mx-auto mb-3" />
      <p className="text-sm text-slate-500">{t('Loading...', 'लोड हुँदैछ...')}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Fingerprint size={20} className="text-crimson-600" />
          <h1 className="text-xl font-bold text-slate-800">{t('Zero-Knowledge Proof', 'शून्य-ज्ञान प्रमाण')}</h1>
        </div>
        <p className="text-sm text-slate-500 mt-0.5">{t('Prove ownership without revealing your identity', 'आफ्नो पहिचान नखोली स्वामित्व प्रमाणित गर्नुहोस्')}</p>
      </div>

      {/* Explainer */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-5 text-white">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
            <Shield size={20} />
          </div>
          <div>
            <h3 className="font-bold text-sm mb-1">{t('How ZKP Works', 'ZKP कसरी काम गर्छ')}</h3>
            <div className="text-xs text-white/70 leading-relaxed space-y-1">
              <p><strong className="text-white/90">1. Generate:</strong> {t('Create a cryptographic commitment (hash) that binds your identity to your parcel.', 'तपाईंको पहिचानलाई कित्तासँग बाँध्ने क्रिप्टोग्राफिक प्रतिबद्धता (ह्यास) सिर्जना गर्नुहोस्।')}</p>
              <p><strong className="text-white/90">2. Share:</strong> {t('Give the Proof ID and commitment to a verifier (bank, government office).', 'प्रमाण ID र प्रतिबद्धता प्रमाणकर्तालाई दिनुहोस्।')}</p>
              <p><strong className="text-white/90">3. Verify:</strong> {t('When challenged, reveal your secret — the verifier confirms ownership without seeing your LIN.', 'चुनौती दिइएमा, आफ्नो गोप्य कुञ्जी देखाउनुहोस् — प्रमाणकर्ताले LIN नदेखी स्वामित्व पुष्टि गर्छ।')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Generate Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Key size={14} className="text-crimson-600" />
          {t('Generate New Proof', 'नयाँ प्रमाण सिर्जना')}
        </h3>
        <div className="flex gap-3 flex-wrap">
          <select
            value={selectedParcel}
            onChange={e => setSelectedParcel(e.target.value)}
            className="flex-1 min-w-[200px] px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-crimson-500/20"
          >
            <option value="">{t('Select a parcel...', 'कित्ता छान्नुहोस्...')}</option>
            {parcels.map(p => (
              <option key={p.id} value={p.id}>{p.id} — {p.district}, {p.municipality}</option>
            ))}
          </select>
          <button
            onClick={generateProof}
            disabled={!selectedParcel || generating}
            className="px-5 py-2.5 bg-crimson-600 text-white rounded-xl text-sm font-semibold hover:bg-crimson-700 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {generating ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> {t('Generating...', 'सिर्जना गर्दै...')}</>
            ) : (
              <><Lock size={14} /> {t('Generate ZKP', 'ZKP सिर्जना')}</>
            )}
          </button>
        </div>
      </div>

      {/* Generated Proof Result */}
      {generatedProof && (
        <div className="bg-green-50 rounded-xl border border-green-200 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle size={16} className="text-green-600" />
            <h3 className="text-sm font-bold text-green-800">{t('Proof Generated Successfully', 'प्रमाण सफलतापूर्वक सिर्जना भयो')}</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">{t('Proof ID (Share this)', 'प्रमाण ID')}</p>
              <div className="flex items-center gap-2">
                <p className="font-mono text-sm font-bold text-green-700 bg-white px-3 py-1.5 rounded-lg border border-green-100 flex-1">{generatedProof.proofId}</p>
                <button onClick={() => copyToClipboard(generatedProof.proofId, 'proofId')} className="text-green-600 hover:text-green-800">
                  {copied === 'proofId' ? <CheckCircle size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">{t('Parcel', 'कित्ता')}</p>
              <p className="font-mono text-sm text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-green-100">{generatedProof.parcelId}</p>
            </div>
          </div>

          <div>
            <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">{t('Commitment Hash (Public)', 'प्रतिबद्धता ह्यास')}</p>
            <div className="flex items-center gap-2">
              <p className="font-mono text-xs text-slate-600 bg-white px-3 py-2 rounded-lg border border-green-100 break-all flex-1">{generatedProof.commitment}</p>
              <button onClick={() => copyToClipboard(generatedProof.commitment, 'commitment')} className="text-green-600 hover:text-green-800 shrink-0">
                {copied === 'commitment' ? <CheckCircle size={14} /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          <div>
            <p className="text-[10px] text-red-500 uppercase font-semibold mb-1 flex items-center gap-1">
              <AlertTriangle size={10} /> {t('Secret Key (KEEP PRIVATE)', 'गोप्य कुञ्जी (निजी राख्नुहोस्)')}
            </p>
            <div className="flex items-center gap-2">
              <p className="font-mono text-xs text-slate-600 bg-white px-3 py-2 rounded-lg border border-red-100 break-all flex-1">
                {showSecret ? generatedProof.secret : '•'.repeat(48)}
              </p>
              <button onClick={() => setShowSecret(!showSecret)} className="text-slate-400 hover:text-slate-600 shrink-0">
                {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <button onClick={() => copyToClipboard(generatedProof.secret, 'secret')} className="text-slate-400 hover:text-slate-600 shrink-0">
                {copied === 'secret' ? <CheckCircle size={14} /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Proof History */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-sm font-bold text-slate-700">{t('My Proof History', 'मेरो प्रमाण इतिहास')}</h3>
        </div>
        {proofs.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">{t('No proofs generated yet', 'अहिलेसम्म कुनै प्रमाण सिर्जना भएको छैन')}</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {proofs.map(proof => (
              <div key={proof.id} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${proof.status === 'verified' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                    <Fingerprint size={14} />
                  </div>
                  <div>
                    <p className="font-mono text-xs font-bold text-slate-700">{proof.id}</p>
                    <p className="text-[10px] text-slate-400">{t('Parcel', 'कित्ता')}: {proof.parcel_id} • {new Date(proof.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center gap-1 font-mono text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded">
                    <Hash size={8} /> {proof.commitment?.substring(0, 12)}...
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${proof.status === 'verified' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                    {proof.status === 'verified' ? t('Verified', 'प्रमाणित') : t('Active', 'सक्रिय')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Premium Toast Notifications */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[12000] animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className={`px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border backdrop-blur-md ${
            toast.type === 'error' ? 'bg-red-50/90 border-red-100 text-red-800' : 'bg-emerald-50/90 border-emerald-100 text-emerald-800'
          }`}>
            {toast.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
            <p className="text-sm font-bold tracking-tight">{toast.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}
