'use client';
import { useAuth } from '@/context/AuthContext';
import { Shield, AlertTriangle, Search as SearchIcon, RefreshCw, Activity, GitBranch, Repeat, Users, TrendingUp } from 'lucide-react';
import { useState, useEffect } from 'react';

const severityConfig = {
  critical: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-700 border-red-200', icon: '🔴' },
  high: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-700 border-orange-200', icon: '🟠' },
  medium: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700 border-amber-200', icon: '🟡' },
  low: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-700 border-blue-200', icon: '🔵' },
};

const typeConfig = {
  CIRCULAR_OWNERSHIP: { icon: Repeat, label: 'Circular Ownership', desc: 'BFS detected a transfer cycle' },
  RAPID_TRANSFER: { icon: TrendingUp, label: 'Rapid Transfer', desc: 'Parcel changed hands too quickly' },
  MULTIPLE_CLAIMANTS: { icon: Users, label: 'Multiple Claimants', desc: 'Active dispute with competing claims' },
  CONCENTRATION: { icon: GitBranch, label: 'Land Concentration', desc: 'Unusually high number of parcels owned' },
};

export default function FraudDetectionPage() {
  const { t } = useAuth();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  const runAnalysis = async () => {
    setScanning(true);
    try {
      const res = await fetch('http://localhost:5001/api/analysis/fraud-detection');
      const data = await res.json();
      if (data.success) setAnalysis(data);
    } catch (err) {
      console.error('Fraud analysis error:', err);
    } finally {
      setScanning(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    runAnalysis();
  }, []);

  if (loading) return (
    <div className="p-12 text-center">
      <div className="animate-spin w-8 h-8 border-4 border-blue-govt border-t-transparent rounded-full mx-auto mb-3" />
      <p className="text-sm text-slate-500">{t('Running fraud detection algorithms...', 'धोखाधडी पत्ता लगाउने एल्गोरिदम चलिरहेको छ...')}</p>
    </div>
  );

  const alerts = analysis?.alerts || [];
  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const highCount = alerts.filter(a => a.severity === 'high').length;
  const mediumCount = alerts.filter(a => a.severity === 'medium').length;
  const lowCount = alerts.filter(a => a.severity === 'low').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity size={20} className="text-blue-govt" />
            <h1 className="text-xl font-bold text-slate-800">{t('Fraud Detection Engine', 'धोखाधडी पत्ता लगाउने इन्जिन')}</h1>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">{t('Graph-based ownership analysis using BFS/DFS algorithms', 'BFS/DFS एल्गोरिदम प्रयोग गरी ग्राफ-आधारित स्वामित्व विश्लेषण')}</p>
        </div>
        <button
          onClick={runAnalysis}
          disabled={scanning}
          className="px-4 py-2.5 bg-blue-govt text-white rounded-xl text-sm font-semibold hover:bg-blue-800 transition-all shadow-sm flex items-center gap-2 disabled:opacity-60"
        >
          {scanning ? (
            <><RefreshCw size={14} className="animate-spin" /> {t('Scanning...', 'स्क्यान गर्दै...')}</>
          ) : (
            <><SearchIcon size={14} /> {t('Run Analysis', 'विश्लेषण चलाउनुहोस्')}</>
          )}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">{t('Total Alerts', 'कुल सूचना')}</p>
          <p className="text-2xl font-bold text-slate-800">{alerts.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-red-100 p-4">
          <p className="text-[10px] text-red-500 uppercase font-semibold mb-1">🔴 {t('Critical', 'गम्भीर')}</p>
          <p className="text-2xl font-bold text-red-600">{criticalCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-orange-100 p-4">
          <p className="text-[10px] text-orange-500 uppercase font-semibold mb-1">🟠 {t('High', 'उच्च')}</p>
          <p className="text-2xl font-bold text-orange-600">{highCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-amber-100 p-4">
          <p className="text-[10px] text-amber-500 uppercase font-semibold mb-1">🟡 {t('Medium', 'मध्यम')}</p>
          <p className="text-2xl font-bold text-amber-600">{mediumCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-blue-100 p-4">
          <p className="text-[10px] text-blue-500 uppercase font-semibold mb-1">🔵 {t('Low', 'कम')}</p>
          <p className="text-2xl font-bold text-blue-600">{lowCount}</p>
        </div>
      </div>

      {/* Analysis metadata */}
      {analysis && (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-6 text-xs text-slate-500">
            <span><strong className="text-slate-700">{analysis.totalTransfers}</strong> {t('transfers analyzed', 'हस्तान्तरण विश्लेषण')}</span>
            <span><strong className="text-slate-700">{analysis.uniqueParcels}</strong> {t('parcels scanned', 'कित्ता स्क्यान')}</span>
            <span><strong className="text-slate-700">{analysis.graphNodes}</strong> {t('graph nodes', 'ग्राफ नोड')}</span>
          </div>
          <span className="text-[10px] text-slate-400">{t('Last analyzed', 'अन्तिम विश्लेषण')}: {new Date(analysis.analyzedAt).toLocaleString()}</span>
        </div>
      )}

      {/* Alert list */}
      {alerts.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
          <Shield size={48} className="mx-auto text-green-300 mb-3" />
          <p className="text-sm text-green-600 font-semibold">{t('No Suspicious Activity Detected', 'कुनै शंकास्पद गतिविधि भेटिएन')}</p>
          <p className="text-xs text-slate-400 mt-1">{t('All ownership patterns appear normal.', 'सबै स्वामित्व ढाँचा सामान्य देखिन्छ।')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert, i) => {
            const sev = severityConfig[alert.severity] || severityConfig.low;
            const typeConf = typeConfig[alert.type] || { icon: AlertTriangle, label: alert.type, desc: '' };
            const TypeIcon = typeConf.icon;
            return (
              <div key={i} className={`${sev.bg} rounded-xl border ${sev.border} p-5`}>
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl bg-white border ${sev.border} flex items-center justify-center shrink-0`}>
                    <TypeIcon size={18} className={sev.text} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-sm font-bold ${sev.text}`}>{typeConf.label}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${sev.badge}`}>{alert.severity.toUpperCase()}</span>
                    </div>
                    <p className="text-sm text-slate-700">{alert.message}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{typeConf.desc}</p>

                    {/* Extra data for rapid transfers */}
                    {alert.transfers && (
                      <div className="mt-2 space-y-1">
                        {alert.transfers.map((tx, j) => (
                          <div key={j} className="text-[10px] text-slate-500 flex items-center gap-1.5">
                            <span className="font-mono">{new Date(tx.date).toLocaleDateString()}</span>
                            <span>:</span>
                            <span>{tx.from || '?'} → {tx.to || '?'}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Extra data for circular ownership */}
                    {alert.path && (
                      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                        {alert.path.map((node, j) => (
                          <span key={j} className="flex items-center gap-1">
                            <span className="font-mono text-[10px] bg-white px-1.5 py-0.5 rounded border border-slate-200">{node}</span>
                            {j < alert.path.length - 1 && <span className="text-slate-300">→</span>}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
