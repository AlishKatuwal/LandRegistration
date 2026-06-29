'use client';
import { useAuth } from '@/context/AuthContext';
import { Shield, Link2, Hash, CheckCircle, AlertTriangle, Clock, Search, RefreshCw, Blocks, ArrowRight, Lock, Eye } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function BlockchainExplorerPage() {
  const { t } = useAuth();
  const [blocks, setBlocks] = useState([]);
  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBlock, setSelectedBlock] = useState(null);

  const fetchBlocks = async () => {
    try {
      const res = await fetch('http://localhost:5001/api/blockchain');
      const data = await res.json();
      if (data.success) setBlocks(data.data);
    } catch (err) {
      console.error('Blockchain fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const verifyChain = async () => {
    setVerifying(true);
    try {
      const res = await fetch('http://localhost:5001/api/blockchain/verify');
      const data = await res.json();
      if (data.success) setVerification(data);
    } catch (err) {
      console.error('Verification error:', err);
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    fetchBlocks();
  }, []);

  const filtered = blocks.filter(b =>
    (b.application_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.transaction_type || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.block_hash || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const typeColor = {
    LAND_REGISTRATION: 'bg-blue-50 text-blue-700 border-blue-200',
    LAND_TRANSFER: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    DISPUTE_FILED: 'bg-red-50 text-red-700 border-red-200',
    PAYMENT: 'bg-amber-50 text-amber-700 border-amber-200',
  };

  if (loading) return (
    <div className="p-12 text-center">
      <div className="animate-spin w-8 h-8 border-4 border-blue-govt border-t-transparent rounded-full mx-auto mb-3" />
      <p className="text-sm text-slate-500">{t('Loading blockchain ledger...', 'ब्लकचेन लेजर लोड हुँदैछ...')}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Blocks size={20} className="text-blue-govt" />
            <h1 className="text-xl font-bold text-slate-800">{t('Blockchain Explorer', 'ब्लकचेन एक्सप्लोरर')}</h1>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">{t('Immutable ledger of all land transactions', 'सबै भूमि कारोबारको अपरिवर्तनीय लेजर')}</p>
        </div>
        <button
          onClick={verifyChain}
          disabled={verifying}
          className="px-4 py-2.5 bg-blue-govt text-white rounded-xl text-sm font-semibold hover:bg-blue-800 transition-all shadow-sm flex items-center gap-2 disabled:opacity-60"
        >
          {verifying ? (
            <><RefreshCw size={14} className="animate-spin" /> {t('Verifying...', 'प्रमाणित गर्दै...')}</>
          ) : (
            <><Shield size={14} /> {t('Verify Chain Integrity', 'चेन अखण्डता प्रमाणित')}</>
          )}
        </button>
      </div>

      {/* Verification Result */}
      {verification && (
        <div className={`rounded-xl border p-5 ${verification.valid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center gap-3 mb-3">
            {verification.valid ? (
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle size={20} className="text-green-600" />
              </div>
            ) : (
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
            )}
            <div>
              <h3 className={`text-sm font-bold ${verification.valid ? 'text-green-800' : 'text-red-800'}`}>
                {verification.valid
                  ? t('Chain Integrity Verified ✓', 'चेन अखण्डता प्रमाणित ✓')
                  : t('Chain Integrity FAILED ✗', 'चेन अखण्डता असफल ✗')
                }
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {t(`${verification.totalBlocks} blocks verified at ${new Date(verification.verifiedAt).toLocaleString()}`,
                   `${verification.totalBlocks} ब्लकहरू ${new Date(verification.verifiedAt).toLocaleString()} मा प्रमाणित`)}
              </p>
            </div>
          </div>
          {verification.issues && verification.issues.length > 0 && (
            <div className="space-y-2 mt-3 pt-3 border-t border-red-200">
              {verification.issues.map((issue, i) => (
                <div key={i} className="text-xs text-red-700 flex items-start gap-2">
                  <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                  <span>{issue.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">{t('Total Blocks', 'कुल ब्लक')}</p>
          <p className="text-2xl font-bold text-slate-800">{blocks.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-[10px] text-blue-500 uppercase font-semibold mb-1">{t('Registrations', 'दर्ता')}</p>
          <p className="text-2xl font-bold text-blue-600">{blocks.filter(b => b.transaction_type === 'LAND_REGISTRATION').length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-[10px] text-emerald-500 uppercase font-semibold mb-1">{t('Transfers', 'हस्तान्तरण')}</p>
          <p className="text-2xl font-bold text-emerald-600">{blocks.filter(b => b.transaction_type === 'LAND_TRANSFER').length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-[10px] text-red-500 uppercase font-semibold mb-1">{t('Disputes', 'विवाद')}</p>
          <p className="text-2xl font-bold text-red-600">{blocks.filter(b => b.transaction_type === 'DISPUTE_FILED').length}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder={t('Search by application ID, type, or hash...', 'आवेदन ID, प्रकार, वा ह्यासले खोज्नुहोस्...')}
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-govt/20 transition-all"
        />
      </div>

      {/* Block detail modal */}
      {selectedBlock && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedBlock(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Blocks size={16} className="text-blue-govt" />
                <h3 className="font-bold text-slate-800 text-sm">Block #{selectedBlock.block_height}</h3>
              </div>
              <button onClick={() => setSelectedBlock(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Block Hash</p>
                <p className="font-mono text-xs text-slate-700 bg-slate-50 p-2 rounded-lg break-all border border-slate-100">{selectedBlock.block_hash}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Previous Hash</p>
                <p className="font-mono text-xs text-slate-500 bg-slate-50 p-2 rounded-lg break-all border border-slate-100">{selectedBlock.previous_hash}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Data Hash (SHA-256)</p>
                <p className="font-mono text-xs text-slate-700 bg-slate-50 p-2 rounded-lg break-all border border-slate-100">{selectedBlock.data_hash}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Application</p>
                  <p className="text-sm font-mono font-semibold text-blue-govt">{selectedBlock.application_id}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Type</p>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-md border ${typeColor[selectedBlock.transaction_type] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                    {selectedBlock.transaction_type}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Timestamp</p>
                  <p className="text-xs text-slate-600">{new Date(selectedBlock.timestamp).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Block Height</p>
                  <p className="text-sm font-bold text-slate-800">#{selectedBlock.block_height}</p>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center gap-2 text-[10px] text-green-600 font-bold">
                <Lock size={10} /> {t('Cryptographically sealed — SHA-256', 'क्रिप्टोग्राफिक सुरक्षित — SHA-256')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Block list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
          <Blocks size={40} className="mx-auto text-slate-200 mb-3" />
          <p className="text-sm text-slate-500 font-medium">{t('No blocks found', 'कुनै ब्लक भेटिएन')}</p>
          <p className="text-xs text-slate-400 mt-1">{t('Blocks are created when land transactions are processed.', 'भूमि कारोबार प्रशोधन हुँदा ब्लकहरू सिर्जना हुन्छन्।')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((block, i) => (
            <div
              key={block.id || i}
              onClick={() => setSelectedBlock(block)}
              className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                {/* Block number */}
                <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center font-mono text-sm font-bold shrink-0">
                  #{block.block_height}
                </div>

                {/* Block info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-mono text-sm font-bold text-slate-800">{block.application_id}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${typeColor[block.transaction_type] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                      {(block.transaction_type || '').replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Hash size={10} className="text-slate-400 shrink-0" />
                    <p className="font-mono text-[10px] text-slate-400 truncate">{block.block_hash}</p>
                  </div>
                </div>

                {/* Chain link indicator */}
                <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                    <Link2 size={10} /> {block.previous_hash?.substring(0, 8)}...
                  </div>
                  <ArrowRight size={10} className="text-slate-300" />
                  <div className="flex items-center gap-1 text-[10px] text-blue-govt font-mono bg-blue-50 px-2 py-1 rounded-md border border-blue-100">
                    <Lock size={10} /> {block.block_hash?.substring(0, 8)}...
                  </div>
                </div>

                {/* Timestamp + View */}
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-slate-400">{new Date(block.timestamp).toLocaleDateString()}</p>
                  <p className="text-[9px] text-slate-300">{new Date(block.timestamp).toLocaleTimeString()}</p>
                </div>

                <Eye size={14} className="text-slate-300 group-hover:text-blue-govt transition-colors shrink-0" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
