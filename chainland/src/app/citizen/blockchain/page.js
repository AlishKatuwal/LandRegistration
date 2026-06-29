'use client';
import { useAuth } from '@/context/AuthContext';
import { Shield, Link2, Hash, CheckCircle, AlertTriangle, Clock, Blocks, Lock, Eye, ExternalLink } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function CitizenBlockchainPage() {
  const { user, t } = useAuth();
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [apps, setApps] = useState([]);

  useEffect(() => {
    if (!user?.lin) return;
    
    // Fetch user's applications to find their blockchain records
    Promise.all([
      fetch(`http://localhost:5001/api/applications?applicantLin=${user.lin}`).then(r => r.json()),
      fetch(`http://localhost:5001/api/applications?buyerLin=${user.lin}`).then(r => r.json()),
      fetch('http://localhost:5001/api/blockchain').then(r => r.json())
    ]).then(([sellerData, buyerData, blockData]) => {
      const sellerApps = sellerData.success ? sellerData.data : [];
      const buyerApps = buyerData.success ? buyerData.data : [];
      const allApps = [...sellerApps, ...buyerApps.filter(b => !sellerApps.find(s => s.id === b.id))];
      setApps(allApps);

      // Filter blocks related to user's applications
      const appIds = new Set(allApps.map(a => a.id));
      const userBlocks = blockData.success
        ? blockData.data.filter(b => appIds.has(b.application_id))
        : [];
      setBlocks(userBlocks);
      setLoading(false);
    }).catch(err => {
      console.error('Error:', err);
      setLoading(false);
    });
  }, [user?.lin]);

  const typeColor = {
    LAND_REGISTRATION: 'bg-blue-50 text-blue-700 border-blue-200',
    LAND_TRANSFER: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    DISPUTE_FILED: 'bg-red-50 text-red-700 border-red-200',
  };

  const typeLabel = {
    LAND_REGISTRATION: t('Land Registration', 'भूमि दर्ता'),
    LAND_TRANSFER: t('Land Transfer', 'भूमि हस्तान्तरण'),
    DISPUTE_FILED: t('Dispute Filed', 'विवाद दर्ता'),
  };

  if (loading) return (
    <div className="p-12 text-center">
      <div className="animate-spin w-8 h-8 border-4 border-crimson-600 border-t-transparent rounded-full mx-auto mb-3" />
      <p className="text-sm text-slate-500">{t('Loading blockchain proof...', 'ब्लकचेन प्रमाण लोड हुँदैछ...')}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Blocks size={20} className="text-crimson-600" />
          <h1 className="text-xl font-bold text-slate-800">{t('Blockchain Proof', 'ब्लकचेन प्रमाण')}</h1>
        </div>
        <p className="text-sm text-slate-500 mt-0.5">{t('Cryptographic proof of your land transactions on the immutable ledger', 'अपरिवर्तनीय लेजरमा तपाईंको भूमि कारोबारको क्रिप्टोग्राफिक प्रमाण')}</p>
      </div>

      {/* Explainer */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-5 text-white">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
            <Shield size={20} />
          </div>
          <div>
            <h3 className="font-bold text-sm mb-1">{t('What is Blockchain Proof?', 'ब्लकचेन प्रमाण के हो?')}</h3>
            <p className="text-xs text-white/70 leading-relaxed">
              {t(
                'Every land transaction (registration, transfer, dispute) is cryptographically hashed using SHA-256 and permanently recorded on ChainLand\'s blockchain ledger. Each block is linked to the previous block, making it impossible to alter any record without breaking the entire chain. This provides tamper-proof evidence of your land ownership.',
                'प्रत्येक भूमि कारोबार (दर्ता, हस्तान्तरण, विवाद) SHA-256 प्रयोग गरी क्रिप्टोग्राफिक ह्यास गरिन्छ र ChainLand को ब्लकचेन लेजरमा स्थायी रूपमा रेकर्ड गरिन्छ। प्रत्येक ब्लक अघिल्लो ब्लकसँग जोडिएको हुन्छ, जसले गर्दा पूरै चेन नतोडी कुनै रेकर्ड परिवर्तन गर्न असम्भव हुन्छ।'
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">{t('Your Transactions', 'तपाईंका कारोबार')}</p>
          <p className="text-2xl font-bold text-slate-800">{blocks.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-[10px] text-green-500 uppercase font-semibold mb-1">{t('On Chain', 'चेनमा')}</p>
          <p className="text-2xl font-bold text-green-600">{blocks.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-[10px] text-blue-500 uppercase font-semibold mb-1">{t('Applications', 'आवेदन')}</p>
          <p className="text-2xl font-bold text-blue-600">{apps.length}</p>
        </div>
      </div>

      {/* Block detail modal */}
      {selectedBlock && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedBlock(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Blocks size={16} className="text-crimson-600" />
                <h3 className="font-bold text-slate-800 text-sm">{t('Block', 'ब्लक')} #{selectedBlock.block_height}</h3>
              </div>
              <button onClick={() => setSelectedBlock(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">{t('Block Hash (SHA-256)', 'ब्लक ह्यास')}</p>
                <p className="font-mono text-xs text-slate-700 bg-slate-50 p-3 rounded-lg break-all border border-slate-100">{selectedBlock.block_hash}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">{t('Previous Block Hash', 'अघिल्लो ब्लक ह्यास')}</p>
                <p className="font-mono text-xs text-slate-500 bg-slate-50 p-3 rounded-lg break-all border border-slate-100">{selectedBlock.previous_hash}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">{t('Data Hash', 'डाटा ह्यास')}</p>
                <p className="font-mono text-xs text-slate-700 bg-slate-50 p-3 rounded-lg break-all border border-slate-100">{selectedBlock.data_hash}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">{t('Application', 'आवेदन')}</p>
                  <p className="text-sm font-mono font-semibold text-crimson-600">{selectedBlock.application_id}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">{t('Type', 'प्रकार')}</p>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-md border ${typeColor[selectedBlock.transaction_type] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                    {typeLabel[selectedBlock.transaction_type] || selectedBlock.transaction_type}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">{t('Timestamp', 'समय')}</p>
                  <p className="text-xs text-slate-600">{new Date(selectedBlock.timestamp).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">{t('Block Height', 'ब्लक उचाइ')}</p>
                  <p className="text-sm font-bold text-slate-800">#{selectedBlock.block_height}</p>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center gap-2 text-[10px] text-green-600 font-bold">
                <Lock size={10} /> {t('Cryptographically sealed and immutable', 'क्रिप्टोग्राफिक सुरक्षित र अपरिवर्तनीय')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Block list */}
      {blocks.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
          <Blocks size={40} className="mx-auto text-slate-200 mb-3" />
          <p className="text-sm text-slate-500 font-medium">{t('No blockchain records yet', 'अहिलेसम्म कुनै ब्लकचेन रेकर्ड छैन')}</p>
          <p className="text-xs text-slate-400 mt-1">{t('Blocks will appear here when your land applications are processed.', 'तपाईंको भूमि आवेदन प्रशोधन भएपछि यहाँ ब्लकहरू देखिनेछ।')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {blocks.map((block, i) => (
            <div
              key={block.id || i}
              onClick={() => setSelectedBlock(block)}
              className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md hover:border-crimson-200 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                {/* Block number */}
                <div className="w-12 h-12 bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-xl flex items-center justify-center font-mono text-sm font-bold shrink-0">
                  #{block.block_height}
                </div>

                {/* Block info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-mono text-sm font-bold text-slate-800">{block.application_id}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${typeColor[block.transaction_type] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                      {typeLabel[block.transaction_type] || (block.transaction_type || '').replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Hash size={10} className="text-slate-400 shrink-0" />
                    <p className="font-mono text-[10px] text-slate-400 truncate">{block.block_hash}</p>
                  </div>
                </div>

                {/* Chain link */}
                <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                  <div className="flex items-center gap-1 text-[10px] font-mono bg-slate-50 px-2 py-1 rounded-md border border-slate-100 text-slate-400">
                    <Link2 size={10} /> {block.previous_hash?.substring(0, 8)}...
                  </div>
                  <span className="text-slate-300">→</span>
                  <div className="flex items-center gap-1 text-[10px] font-mono bg-crimson-50 px-2 py-1 rounded-md border border-crimson-100 text-crimson-600">
                    <Lock size={10} /> {block.block_hash?.substring(0, 8)}...
                  </div>
                </div>

                {/* Timestamp */}
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-slate-400">{new Date(block.timestamp).toLocaleDateString()}</p>
                  <p className="text-[9px] text-slate-300">{new Date(block.timestamp).toLocaleTimeString()}</p>
                </div>

                <Eye size={14} className="text-slate-300 group-hover:text-crimson-500 transition-colors shrink-0" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
