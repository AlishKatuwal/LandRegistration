'use client';
import { useAuth } from '@/context/AuthContext';
import { Scale, Download, FileText, X, AlertTriangle, CheckCircle, Lock, ArrowRight, Gavel, ChevronRight, Eye, FolderOpen, Hash, Shield } from 'lucide-react';
import { useState, useEffect } from 'react';

const phaseColor = { filing: 'bg-yellow-100 text-yellow-700', evidence: 'bg-blue-100 text-blue-700', review: 'bg-purple-100 text-purple-700', consent: 'bg-indigo-100 text-indigo-700', resolved: 'bg-green-100 text-green-700', referred: 'bg-red-100 text-red-700' };
const phaseOrder = ['filing', 'evidence', 'review', 'consent'];

export default function OfficerDisputesPage() {
  const { t } = useAuth();
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(null);
  const [actionModal, setActionModal] = useState(null); // { type: 'resolve'|'refer', dispute }
  const [actionLoading, setActionLoading] = useState(false);
  const [resolution, setResolution] = useState('');
  const [winner, setWinner] = useState('owner');
  const [courtName, setCourtName] = useState('');
  const [referralReason, setReferralReason] = useState('');
  const [docsModal, setDocsModal] = useState(null); // { disputeId, parcelId, docs: [] }
  const [docsLoading, setDocsLoading] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchDisputes = () => {
    fetch('http://localhost:5001/api/disputes')
      .then(res => res.json())
      .then(data => { if (data.success) setDisputes(data.data); setLoading(false); })
      .catch(e => { console.error(e); setLoading(false); });
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => { fetchDisputes(); }, []);

  const advancePhase = async (disputeId) => {
    try {
      const res = await fetch(`http://localhost:5001/api/disputes/${disputeId}/phase`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (data.success) {
        fetchDisputes();
        showToast(`Dispute advanced to ${data.nextPhase || 'next stage'}`);
      } else showToast(data.error || 'Failed to advance phase', 'error');
    } catch (err) { 
      console.error(err);
      showToast('Network error while advancing phase', 'error');
    }
  };

  const handleResolve = async () => {
    if (!actionModal) return;
    setActionLoading(true);
    try {
      const res = await fetch(`http://localhost:5001/api/disputes/${actionModal.dispute.id}/resolve`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution, winner })
      });
      const data = await res.json();
      if (data.success) { 
        setActionModal(null); 
        fetchDisputes(); 
        showToast('Dispute resolved and ownership updated');
      } else showToast(data.error || 'Resolution failed', 'error');
    } catch (err) { 
      console.error(err);
      showToast('Error processing resolution', 'error');
    }
    finally { setActionLoading(false); }
  };

  const handleRefer = async () => {
    if (!actionModal) return;
    setActionLoading(true);
    try {
      const res = await fetch(`http://localhost:5001/api/disputes/${actionModal.dispute.id}/refer`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courtName: courtName || 'District Court', referralReason })
      });
      const data = await res.json();
      if (data.success) { 
        setActionModal(null); 
        fetchDisputes(); 
        showToast('Dispute referred to district court');
      } else showToast(data.error || 'Referral failed', 'error');
    } catch (err) { 
      console.error(err);
      showToast('Error processing referral', 'error');
    }
    finally { setActionLoading(false); }
  };

  const fetchParcelDocs = async (dispute) => {
    setDocsLoading(dispute.id);
    try {
      const res = await fetch('http://localhost:5001/api/applications');
      const data = await res.json();
      if (data.success) {
        const relatedApps = data.data.filter(app => app.kitta === dispute.parcel_id);
        const allDocs = [];

        // 1. Add Claimant Evidence from Dispute
        const claimantDocs = typeof dispute.documents === 'string' ? JSON.parse(dispute.documents) : (dispute.documents || []);
        claimantDocs.forEach((doc, idx) => {
          allDocs.push({
            id: `claimant-${dispute.id}-${idx}`,
            appId: dispute.id,
            appType: 'CLAIMANT_EVIDENCE',
            name: doc.name,
            type: doc.type || 'Evidence',
            sha256: doc.sha256 || null,
            size: doc.size,
            url: doc.url,
            uploadedBy: dispute.claimant_lin,
            date: dispute.filed_date,
            isEvidence: true
          });
        });

        // 2. Add Parcel Documents from Applications
        relatedApps.forEach(app => {
          const docs = typeof app.documents === 'string' ? JSON.parse(app.documents) : (app.documents || []);
          docs.forEach((doc, idx) => {
            allDocs.push({
              id: `${app.id}-${idx}`,
              appId: app.id,
              appType: app.type,
              name: doc.name,
              type: doc.type || 'Document',
              sha256: doc.sha256 || null,
              size: doc.size,
              url: doc.url,
              uploadedBy: app.applicant_lin || app.buyer_lin,
              date: app.submitted_date
            });
          });
        });
        setDocsModal({ disputeId: dispute.id, parcelId: dispute.parcel_id, docs: allDocs, apps: relatedApps.length });
      }
    } catch (err) { console.error(err); }
    finally { setDocsLoading(null); }
  };

  const generateReport = async (disputeId) => {
    setReportLoading(disputeId);
    try {
      const res = await fetch(`http://localhost:5001/api/disputes/${disputeId}/report`);
      const data = await res.json();
      if (data.success) setReport(data.report);
    } catch (err) { console.error(err); }
    finally { setReportLoading(null); }
  };

  const downloadReportAsText = () => {
    if (!report) return;
    const lines = [
      `═══════════════════════════════════════════════`,
      `  ${report.title}`,
      `  Generated: ${new Date(report.generatedAt).toLocaleString()}`,
      `═══════════════════════════════════════════════`,
      '', `DISPUTE: ${report.dispute.id}  |  Phase: ${report.dispute.phase}  |  Risk: ${report.riskAnalysis.riskLevel}`,
      `Parcel: ${report.dispute.parcelId}  |  Reason: ${report.dispute.reason}`,
      '', `CLAIMANT: ${report.parties.claimant.name} (${report.parties.claimant.lin})`,
      `OWNER:    ${report.parties.owner.name} (${report.parties.owner.lin})`,
      '', `OWNERSHIP HISTORY:`,
      ...(report.ownershipHistory.length > 0
        ? report.ownershipHistory.map((h, i) => `  ${i+1}. ${h.from} → ${h.to} (${new Date(h.date).toLocaleDateString()})`)
        : ['  No transfers recorded']),
      '', `BLOCKCHAIN EVIDENCE:`,
      ...(report.blockchainEvidence.length > 0
        ? report.blockchainEvidence.map(b => `  Block #${b.blockHeight} | ${b.type} | ${b.blockHash.substring(0, 32)}...`)
        : ['  None']),
      '', `RISK: ${report.riskAnalysis.riskLevel} | Rapid Transfers: ${report.riskAnalysis.rapidTransfers.length} | Owner Changes: ${report.riskAnalysis.totalOwnerChanges}`,
      `═══════════════════════════════════════════════`,
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `${report.dispute.id}-report.txt`; a.click();
  };

  const riskColor = { HIGH: 'text-red-600 bg-red-50 border-red-200', MEDIUM: 'text-amber-600 bg-amber-50 border-amber-200', LOW: 'text-green-600 bg-green-50 border-green-200' };

  if (loading) return <div className="p-8 text-center animate-pulse text-slate-500">Loading disputes...</div>;

  const activeCount = disputes.filter(d => !['resolved', 'referred'].includes(d.phase)).length;
  const resolvedCount = disputes.filter(d => d.phase === 'resolved').length;
  const referredCount = disputes.filter(d => d.phase === 'referred').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">{t('Dispute Management', 'विवाद व्यवस्थापन')}</h1>
        <p className="text-sm text-slate-500">{t('Manage, advance, resolve, or refer disputes', 'विवाद व्यवस्थापन, अगाडि बढाउनु, समाधान, वा सन्दर्भित')}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">{t('Total', 'कुल')}</p>
          <p className="text-2xl font-bold text-slate-800">{disputes.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-[10px] text-yellow-500 uppercase font-semibold mb-1">{t('Active', 'सक्रिय')}</p>
          <p className="text-2xl font-bold text-yellow-600">{activeCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-[10px] text-green-500 uppercase font-semibold mb-1">{t('Resolved', 'समाधान')}</p>
          <p className="text-2xl font-bold text-green-600">{resolvedCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-[10px] text-red-500 uppercase font-semibold mb-1">{t('Court Ref.', 'अदालत')}</p>
          <p className="text-2xl font-bold text-red-600">{referredCount}</p>
        </div>
      </div>

      {/* Action Modal (Resolve / Refer) */}
      {actionModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setActionModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                {actionModal.type === 'resolve' ? <><CheckCircle size={16} className="text-green-600" /> Resolve {actionModal.dispute.id}</> : <><Gavel size={16} className="text-red-600" /> Refer {actionModal.dispute.id} to Court</>}
              </h3>
              <button onClick={() => setActionModal(null)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-4">
              {actionModal.type === 'resolve' ? (
                <>
                  <div>
                    <label className="text-xs text-slate-500 font-semibold mb-1.5 block">{t('Winner', 'विजेता')}</label>
                    <div className="flex gap-2">
                      <button onClick={() => setWinner('owner')} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${winner === 'owner' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500'}`}>
                        {t('Current Owner', 'हालको मालिक')}
                      </button>
                      <button onClick={() => setWinner('claimant')} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${winner === 'claimant' ? 'border-crimson-500 bg-crimson-50 text-crimson-700' : 'border-slate-200 text-slate-500'}`}>
                        {t('Claimant', 'दाबीकर्ता')}
                      </button>
                    </div>
                    {winner === 'claimant' && (
                      <p className="text-[10px] text-amber-600 mt-1.5 flex items-center gap-1"><AlertTriangle size={10} /> {t('This will transfer ownership of the parcel to the claimant.', 'यसले कित्ताको स्वामित्व दाबीकर्तालाई हस्तान्तरण गर्नेछ।')}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 font-semibold mb-1 block">{t('Resolution Notes', 'समाधान टिप्पणी')}</label>
                    <textarea value={resolution} onChange={e => setResolution(e.target.value)} rows={2} placeholder="Officer remarks..." className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-govt/20 resize-none" />
                  </div>
                  <button onClick={handleResolve} disabled={actionLoading} className="w-full py-3 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {actionLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle size={14} />}
                    {t('Resolve Dispute & Unlock Land', 'विवाद समाधान गर्नुहोस्')}
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-xs text-slate-500 font-semibold mb-1 block">{t('Court Name', 'अदालत नाम')}</label>
                    <input value={courtName} onChange={e => setCourtName(e.target.value)} placeholder="e.g. Kathmandu District Court" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-govt/20" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 font-semibold mb-1 block">{t('Referral Reason', 'सन्दर्भ कारण')}</label>
                    <textarea value={referralReason} onChange={e => setReferralReason(e.target.value)} rows={2} placeholder="Why this dispute needs court intervention..." className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-govt/20 resize-none" />
                  </div>
                  <div className="bg-red-50 rounded-xl p-3 border border-red-100 text-xs text-red-700 flex items-start gap-2">
                    <Lock size={12} className="mt-0.5 shrink-0" />
                    <span>{t('Land will remain locked (Jagga Rokka) until the court issues a verdict.', 'अदालतले फैसला नगरेसम्म जग्गा रोक्कामा रहनेछ।')}</span>
                  </div>
                  <button onClick={handleRefer} disabled={actionLoading} className="w-full py-3 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {actionLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Gavel size={14} />}
                    {t('Refer to Court', 'अदालतमा पठाउनुहोस्')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {report && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setReport(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">{report.title}</h3>
                <p className="text-[10px] text-slate-400">{new Date(report.generatedAt).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={downloadReportAsText} className="px-3 py-1.5 bg-blue-govt text-white rounded-lg text-xs font-semibold hover:bg-blue-800 flex items-center gap-1.5"><Download size={12} /> Download</button>
                <button onClick={() => setReport(null)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
              </div>
            </div>
            <div className="overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Claimant</p>
                  <p className="text-sm font-bold text-slate-800">{report.parties.claimant.name}</p>
                  <p className="text-xs text-slate-500 font-mono">{report.parties.claimant.lin}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Current Owner</p>
                  <p className="text-sm font-bold text-slate-800">{report.parties.owner.name}</p>
                  <p className="text-xs text-slate-500 font-mono">{report.parties.owner.lin}</p>
                </div>
              </div>
              <div className={`rounded-xl p-3 border ${riskColor[report.riskAnalysis.riskLevel] || riskColor.LOW}`}>
                <p className="text-sm font-bold flex items-center gap-1.5"><AlertTriangle size={14} /> Risk: {report.riskAnalysis.riskLevel}</p>
                <p className="text-xs mt-1">Owner changes: {report.riskAnalysis.totalOwnerChanges} | Rapid transfers: {report.riskAnalysis.rapidTransfers.length} | Land locked: {report.riskAnalysis.landCurrentlyLocked ? 'Yes' : 'No'}</p>
              </div>
              {report.ownershipHistory.length > 0 && (
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold mb-2">Chain of Title</p>
                  {report.ownershipHistory.map((h, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs bg-slate-50 rounded-lg p-2 border border-slate-100 mb-1">
                      <span className="w-5 h-5 bg-slate-200 text-slate-600 rounded-full flex items-center justify-center text-[10px] font-bold">{i+1}</span>
                      <span>{h.from}</span><span className="text-slate-300">→</span><span className="font-semibold">{h.to}</span>
                      <span className="text-slate-400 ml-auto">{new Date(h.date).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {docsModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDocsModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2"><FolderOpen size={16} className="text-blue-govt" /> {t('Land Documents', 'जग्गा कागजातहरू')}</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">{t('Parcel', 'कित्ता')}: <strong className="font-mono">{docsModal.parcelId}</strong> • {docsModal.apps} {t('application(s)', 'आवेदन')} • {docsModal.docs.length} {t('document(s)', 'कागजात')}</p>
              </div>
              <button onClick={() => setDocsModal(null)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
            </div>
            <div className="overflow-y-auto">
              {docsModal.docs.length === 0 ? (
                <div className="p-8 text-center">
                  <FolderOpen size={32} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500">{t('No documents found for this parcel', 'यस कित्ताका लागि कुनै कागजात भेटिएन')}</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {docsModal.docs.map(doc => (
                    <div key={doc.id} className="px-6 py-3 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${doc.isEvidence ? 'bg-crimson-50 text-crimson-600' : 'bg-blue-50 text-blue-600'}`}>
                          <FileText size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate max-w-[280px]">{doc.name}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${doc.isEvidence ? 'bg-crimson-100 text-crimson-700' : 'bg-slate-100 text-slate-500'}`}>{doc.appType}</span>
                            <span className="text-[10px] text-slate-400">{doc.appId}</span>
                            {doc.type && <span className="text-[10px] text-slate-400">• {doc.type}</span>}
                            {doc.uploadedBy && <span className="text-[10px] text-slate-400">• by {doc.uploadedBy}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {doc.sha256 && (
                          <div className="hidden sm:flex items-center gap-1 font-mono text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded" title={doc.sha256}>
                            <Hash size={8} /> {doc.sha256.substring(0, 12)}...
                          </div>
                        )}
                        {doc.sha256 && (
                          <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-100 flex items-center gap-0.5">
                            <Shield size={8} /> Hashed
                          </span>
                        )}
                        {doc.url && (
                          <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blue-600 transition-colors" title="View document">
                            <Eye size={14} />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dispute Table */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-slate-400 border-b border-slate-100">
              <th className="text-left px-5 py-3 font-medium">ID</th>
              <th className="text-left px-3 py-3 font-medium">{t('Parcel', 'कित्ता')}</th>
              <th className="text-left px-3 py-3 font-medium">{t('Claimant', 'दाबीकर्ता')}</th>
              <th className="text-left px-3 py-3 font-medium">{t('Owner', 'मालिक')}</th>
              <th className="text-left px-3 py-3 font-medium">{t('Phase', 'चरण')}</th>
              <th className="text-left px-3 py-3 font-medium">{t('Filed', 'दर्ता')}</th>
              <th className="px-3 py-3 text-right font-medium">{t('Actions', 'कार्य')}</th>
            </tr></thead>
            <tbody>
              {disputes.length === 0 ? (
                <tr><td colSpan="7" className="text-center py-8 text-slate-400 text-sm">No disputes found</td></tr>
              ) : disputes.map(d => {
                const canAdvance = phaseOrder.includes(d.phase) && phaseOrder.indexOf(d.phase) < phaseOrder.length - 1;
                const canResolve = !['resolved', 'referred'].includes(d.phase);
                const nextPhase = canAdvance ? phaseOrder[phaseOrder.indexOf(d.phase) + 1] : null;

                return (
                  <tr key={d.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-5 py-3 font-mono text-xs font-bold text-slate-800">{d.id}</td>
                    <td className="px-3 py-3 font-mono text-xs text-slate-600">{d.parcel_id}</td>
                    <td className="px-3 py-3 text-xs text-slate-700">{d.claimant_name || d.claimant_lin}</td>
                    <td className="px-3 py-3 text-xs text-slate-700">{d.owner_name || d.owner_lin}</td>
                    <td className="px-3 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${phaseColor[d.phase] || 'bg-slate-100 text-slate-600'}`}>{(d.phase || '').toUpperCase()}</span></td>
                    <td className="px-3 py-3 text-xs text-slate-500">{d.filed_date ? new Date(d.filed_date).toLocaleDateString() : 'N/A'}</td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1.5 justify-end flex-wrap">
                        {/* Advance Phase */}
                        {canAdvance && (
                          <button onClick={() => advancePhase(d.id)} className="px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-bold hover:bg-blue-100 transition-colors flex items-center gap-1" title={`Advance to ${nextPhase}`}>
                            <ChevronRight size={10} /> {nextPhase}
                          </button>
                        )}
                        {/* Resolve */}
                        {canResolve && (
                          <button onClick={() => { setActionModal({ type: 'resolve', dispute: d }); setWinner('owner'); setResolution(''); }} className="px-2 py-1 bg-green-50 text-green-700 rounded-lg text-[10px] font-bold hover:bg-green-100 transition-colors flex items-center gap-1">
                            <CheckCircle size={10} /> Resolve
                          </button>
                        )}
                        {/* Refer to Court */}
                        {canResolve && (
                          <button onClick={() => { setActionModal({ type: 'refer', dispute: d }); setCourtName(''); setReferralReason(''); }} className="px-2 py-1 bg-red-50 text-red-700 rounded-lg text-[10px] font-bold hover:bg-red-100 transition-colors flex items-center gap-1">
                            <Gavel size={10} /> Court
                          </button>
                        )}
                        {/* View Documents */}
                        <button onClick={() => fetchParcelDocs(d)} disabled={docsLoading === d.id} className="px-2 py-1 bg-amber-50 text-amber-700 rounded-lg text-[10px] font-bold hover:bg-amber-100 transition-colors flex items-center gap-1" title="View land documents">
                          {docsLoading === d.id ? <div className="w-2.5 h-2.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" /> : <FolderOpen size={10} />} Docs
                        </button>
                        {/* Report */}
                        <button onClick={() => generateReport(d.id)} disabled={reportLoading === d.id} className="px-2 py-1 bg-slate-50 text-slate-600 rounded-lg text-[10px] font-bold hover:bg-slate-100 transition-colors flex items-center gap-1">
                          {reportLoading === d.id ? <div className="w-2.5 h-2.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> : <FileText size={10} />} Report
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
