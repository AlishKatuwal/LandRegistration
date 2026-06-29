'use client';
import { useAuth } from '@/context/AuthContext';
import { Shield, Fingerprint, CheckCircle, XCircle, Search, Hash, Key, Lock } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function OfficerZKPPage() {
  const { t } = useAuth();
  const [proofId, setProofId] = useState('');
  const [ownerLin, setOwnerLin] = useState('');
  const [parcelId, setParcelId] = useState('');
  const [secret, setSecret] = useState('');
  const [result, setResult] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [allProofs, setAllProofs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:5001/api/zkp/proofs')
      .then(r => r.json())
      .then(data => { if (data.success) setAllProofs(data.data); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });
  }, []);

  const handleVerify = async () => {
    if (!proofId || !ownerLin || !parcelId || !secret) return;
    setVerifying(true);
    setResult(null);
    try {
      const res = await fetch('http://localhost:5001/api/zkp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proofId, ownerLin, parcelId, secret })
      });
      const data = await res.json();
      setResult(data);
      // Refresh list
      const proofRes = await fetch('http://localhost:5001/api/zkp/proofs').then(r => r.json());
      if (proofRes.success) setAllProofs(proofRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setVerifying(false);
    }
  };

  if (loading) return (
    <div className="p-12 text-center">
      <div className="animate-spin w-8 h-8 border-4 border-blue-govt border-t-transparent rounded-full mx-auto mb-3" />
      <p className="text-sm text-slate-500">Loading...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Shield size={20} className="text-blue-govt" />
          <h1 className="text-xl font-bold text-slate-800">{t('ZKP Verification Portal', 'ZKP प्रमाणीकरण पोर्टल')}</h1>
        </div>
        <p className="text-sm text-slate-500 mt-0.5">{t('Verify ownership proofs submitted by citizens', 'नागरिकहरूले पेश गरेका स्वामित्व प्रमाणहरू प्रमाणित गर्नुहोस्')}</p>
      </div>

      {/* How it works */}
      <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
        <p className="text-xs text-blue-700">
          <strong>{t('Protocol:', 'प्रोटोकल:')}</strong> {t('The citizen provides their Proof ID, LIN, Parcel ID, and secret. The system recomputes SHA-256(LIN + ParcelID + Secret) and compares against the stored commitment. If they match, ownership is confirmed — without directly querying the parcel registry.', 'नागरिकले प्रमाण ID, LIN, कित्ता ID, र गोप्य कुञ्जी प्रदान गर्छ। प्रणालीले SHA-256 पुनः गणना गर्छ र भण्डारित प्रतिबद्धतासँग तुलना गर्छ।')}
        </p>
      </div>

      {/* Verification Form */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Key size={14} className="text-blue-govt" />
          {t('Verify a Proof', 'प्रमाण प्रमाणित गर्नुहोस्')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-slate-400 uppercase font-semibold mb-1 block">{t('Proof ID', 'प्रमाण ID')}</label>
            <input value={proofId} onChange={e => setProofId(e.target.value)} placeholder="ZKP-..." className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-govt/20" />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 uppercase font-semibold mb-1 block">{t('Owner LIN', 'मालिक LIN')}</label>
            <input value={ownerLin} onChange={e => setOwnerLin(e.target.value)} placeholder="LIN-..." className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-govt/20" />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 uppercase font-semibold mb-1 block">{t('Parcel ID', 'कित्ता ID')}</label>
            <input value={parcelId} onChange={e => setParcelId(e.target.value)} placeholder="KTM-..." className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-govt/20" />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 uppercase font-semibold mb-1 block">{t('Secret Key', 'गोप्य कुञ्जी')}</label>
            <input value={secret} onChange={e => setSecret(e.target.value)} placeholder="Secret..." type="password" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-govt/20" />
          </div>
        </div>
        <button
          onClick={handleVerify}
          disabled={!proofId || !ownerLin || !parcelId || !secret || verifying}
          className="mt-4 px-5 py-2.5 bg-blue-govt text-white rounded-xl text-sm font-semibold hover:bg-blue-800 transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {verifying ? (
            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> {t('Verifying...', 'प्रमाणित गर्दै...')}</>
          ) : (
            <><Search size={14} /> {t('Verify Proof', 'प्रमाण प्रमाणित')}</>
          )}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className={`rounded-xl border p-5 ${result.valid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center gap-3 mb-3">
            {result.valid ? (
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center"><CheckCircle size={20} className="text-green-600" /></div>
            ) : (
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center"><XCircle size={20} className="text-red-600" /></div>
            )}
            <div>
              <h3 className={`text-sm font-bold ${result.valid ? 'text-green-800' : 'text-red-800'}`}>
                {result.valid ? t('Ownership Verified ✓', 'स्वामित्व प्रमाणित ✓') : t('Verification Failed ✗', 'प्रमाणीकरण असफल ✗')}
              </h3>
              <p className="text-[10px] text-slate-500">{result.message}</p>
            </div>
          </div>
          {result.computedHash && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-200/50">
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">{t('Computed Hash', 'गणना गरिएको ह्यास')}</p>
                <p className="font-mono text-[10px] text-slate-600 bg-white p-2 rounded-lg border break-all">{result.computedHash}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">{t('Stored Commitment', 'भण्डारित प्रतिबद्धता')}</p>
                <p className="font-mono text-[10px] text-slate-600 bg-white p-2 rounded-lg border break-all">{result.storedCommitment}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* All Proofs Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-sm font-bold text-slate-700">{t('All ZKP Proofs', 'सबै ZKP प्रमाणहरू')}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-slate-400 border-b border-slate-100">
              <th className="text-left px-5 py-2.5 font-medium">{t('Proof ID', 'प्रमाण ID')}</th>
              <th className="text-left px-3 py-2.5 font-medium">{t('Parcel', 'कित्ता')}</th>
              <th className="text-left px-3 py-2.5 font-medium">{t('Owner', 'मालिक')}</th>
              <th className="text-left px-3 py-2.5 font-medium">{t('Commitment', 'प्रतिबद्धता')}</th>
              <th className="text-left px-3 py-2.5 font-medium">{t('Status', 'स्थिति')}</th>
              <th className="text-left px-3 py-2.5 font-medium">{t('Created', 'सिर्जित')}</th>
            </tr></thead>
            <tbody>
              {allProofs.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-8 text-slate-400 text-sm">{t('No proofs found', 'कुनै प्रमाण भेटिएन')}</td></tr>
              ) : allProofs.map(p => (
                <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-5 py-2.5 font-mono text-xs font-bold text-slate-800">{p.id}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-slate-600">{p.parcel_id}</td>
                  <td className="px-3 py-2.5 text-xs text-slate-600">{p.owner_lin}</td>
                  <td className="px-3 py-2.5">
                    <span className="font-mono text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded flex items-center gap-1 w-fit">
                      <Hash size={8} /> {p.commitment?.substring(0, 16)}...
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${p.status === 'verified' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                      {p.status === 'verified' ? '✓ Verified' : '● Active'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-slate-400">{new Date(p.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
