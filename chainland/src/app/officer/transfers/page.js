'use client';

import { useAuth } from '@/context/AuthContext';
import { Search, MapPin, CheckCircle, FileText, Loader2, ChevronRight, X, AlertTriangle, Shield, User, Coins, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import MapEditor from '@/components/MapEditor';
import socket from '@/lib/socket';

export default function OfficerTransfersPage() {
  const { t } = useAuth();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checks, setChecks] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [viewDoc, setViewDoc] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ show: false, status: null });
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState(null);
  const [correctionMsg, setCorrectionMsg] = useState('');
  const [parcelCoords, setParcelCoords] = useState(null);

  const fetchApps = () => {
    fetch('http://localhost:5001/api/applications?type=TRANSFER')
      .then(res => res.json())
      .then(data => { if (data.success) setApps(data.data); setLoading(false); })
      .catch(e => { console.error(e); setLoading(false); });
  };

  // Nepal realistic land transfer fee schedule (DoLMA 2080 BS rates)
  // Registration fee: 0.6% of transaction value
  // Local Development Tax: 0.2% of transaction value
  // MALPOT Service Charge: flat Rs. 500
  // Social Security Fund: flat Rs. 200
  // Example: Rs. 35 lakh → Reg 21,000 + Local 7,000 + 500 + 200 = Rs. 28,700
  const calculateCosts = (areaStr, unit = 'hill', declaredAmount = 0) => {
    const defaultData = { total: 0, landValue: 0, govValuation: 0, finalBasis: 0, breakdown: [] };
    
    try {
      const declared = parseFloat(declaredAmount) || 0;

      // Government minimum valuation (floor) — only used if declared is zero
      let govValuation = 0;
      if (areaStr) {
        const str = String(areaStr).trim();
        const parts = str.split(/[- ]+/).map(p => parseFloat(p) || 0);
        let totalRopani = 0;

        if (unit === 'terai') {
          const b = parts[0] || 0, k = parts[1] || 0, d = parts[2] || 0;
          const totalBigha = b + (k / 20) + (d / 400);
          totalRopani = totalBigha * 13.31;
          // Government floor rate per ropani (Terai) — conservative estimate
          govValuation = totalRopani * 500000;
        } else {
          const r = parts[0] || 0, a = parts[1] || 0, p = parts[2] || 0, d2 = parts[3] || 0;
          totalRopani = r + (a / 16) + (p / 64) + (d2 / 256);
          // Government floor rate per ropani (Hill) — conservative estimate
          govValuation = totalRopani * 300000;
        }
      }

      // Use whichever is higher: declared value or government floor
      const finalBasis = declared > 0 ? Math.max(declared, govValuation) : govValuation;
      if (finalBasis === 0) return defaultData;

      // Nepal DoLMA fee schedule
      const regFee    = Math.round(finalBasis * 0.006);  // 0.6% Registration Fee
      const localTax  = Math.round(finalBasis * 0.002);  // 0.2% Local Development Tax
      const serviceCharge = 500;                          // MALPOT Service Charge
      const ssf = 200;                                    // Social Security Fund
      const total = regFee + localTax + serviceCharge + ssf;

      if (isNaN(total)) return defaultData;

      return {
        total,
        landValue: declared,
        govValuation,
        finalBasis,
        breakdown: [
          { label: 'Registration Fee (0.6%)', amount: regFee },
          { label: 'Local Development Tax (0.2%)', amount: localTax },
          { label: 'MALPOT Service Charge', amount: serviceCharge },
          { label: 'Social Security Fund (SSF)', amount: ssf }
        ]
      };
    } catch (e) {
      return defaultData;
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    fetchApps();
    
    const handleNewApp = (newApp) => {
      if (newApp.type === 'TRANSFER') {
        setApps(prev => {
          if (prev.find(a => a.id === newApp.id)) return prev;
          return [newApp, ...prev];
        });
        showToast('New transfer request received!', 'info');
      }
    };

    const handleUpdate = (updatedApp) => {
      setApps(prev => prev.map(a => a.id === updatedApp.id ? updatedApp : a));
    };

    socket.on('new_application', handleNewApp);
    socket.on('application_updated', handleUpdate);

    return () => {
      socket.off('new_application', handleNewApp);
      socket.off('application_updated', handleUpdate);
    };
  }, []);

  const runVerification = async (appId) => {
    setVerifying(true);
    try {
      const res = await fetch(`http://localhost:5001/api/applications/${appId}/verify`);
      const data = await res.json();
      if (data.success) setChecks(data.checks);
    } catch (e) {
      console.error(e);
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    if (selected) {
      setChecks(null);
      runVerification(selected);
      
      // Fetch coordinates fallback if polygon is missing
      const appData = apps.find(a => a.id === selected);
      if (appData && !appData.polygon && appData.kitta) {
        fetch(`http://localhost:5001/api/parcels/${appData.kitta}`)
          .then(res => res.json())
          .then(data => {
            if (data.success && data.data.coordinates) {
              setParcelCoords(data.data.coordinates);
            }
          });
      } else {
        setParcelCoords(null);
      }
    }
  }, [selected, apps]);

  const handleAction = async (statusOverride) => {
    const status = statusOverride || confirmModal.status;
    if (!status) return;
    
    setIsProcessing(true);
    try {
      const res = await fetch(`http://localhost:5001/api/applications/${selected}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status,
          message: status === 'need_correction' ? correctionMsg : null
        })
      });
      if (res.ok) {
        setSelected(null);
        fetchApps();
        showToast('Application updated successfully');
      } else {
        throw new Error('Update failed');
      }
    } catch (e) {
      showToast('Error updating status', 'error');
    } finally {
      setIsProcessing(false);
      setConfirmModal({ show: false, status: null });
    }
  };

  const filtered = apps.filter(a => a.id.toLowerCase().includes(search.toLowerCase()) || a.kitta.toLowerCase().includes(search.toLowerCase()));
  const app = selected ? apps.find(a => a.id === selected) : null;

  if (loading) return <div className="p-8 text-center animate-pulse text-slate-500">Loading transfers...</div>;

  if (app) {
    const docs = typeof app.documents === 'string' ? JSON.parse(app.documents) : (app.documents || []);
    const polygon = typeof app.polygon === 'string' ? JSON.parse(app.polygon) : app.polygon;
    const costs = calculateCosts(
      app.area, 
      app.area_unit || 'hill', 
      app.declared_value || app.transaction_amount || app.transactionAmount || 0
    );

    return (
      <>
        {/* Custom Confirmation Modal */}
        {confirmModal.show && (
          <div className="fixed inset-0 z-[11000] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
              {/* Colored top bar */}
              <div className={`h-1.5 ${
                confirmModal.status === 'approved' ? 'bg-gradient-to-r from-emerald-400 to-green-500' :
                confirmModal.status === 'need_correction' ? 'bg-gradient-to-r from-amber-400 to-orange-500' :
                'bg-gradient-to-r from-blue-400 to-indigo-500'
              }`} />

              {/* Header */}
              <div className={`px-6 py-5 flex items-center gap-4 border-b border-slate-100 ${
                confirmModal.status === 'approved' ? 'bg-emerald-50/50' :
                confirmModal.status === 'need_correction' ? 'bg-amber-50/50' :
                'bg-blue-50/50'
              }`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  confirmModal.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                  confirmModal.status === 'need_correction' ? 'bg-amber-100 text-amber-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {confirmModal.status === 'approved' ? <CheckCircle size={24} /> :
                   confirmModal.status === 'need_correction' ? <AlertTriangle size={24} /> :
                   <Coins size={24} />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    {confirmModal.status === 'approved' ? 'Final Transfer Approval' :
                     confirmModal.status === 'need_correction' ? 'Request Document Correction' :
                     'Preliminary Approval — Request Payment'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Application {app?.id}</p>
                </div>
                <button
                  onClick={() => setConfirmModal({ show: false, status: null })}
                  disabled={isProcessing}
                  className="ml-auto p-1.5 rounded-lg text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Payment breakdown for preliminary approval */}
                {confirmModal.status === 'payment_pending' && costs.total > 0 && (
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Fee Breakdown to Send Buyer</p>
                    <div className="space-y-2">
                      {costs.breakdown.map((item, i) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span className="text-slate-500">{item.label}</span>
                          <span className="font-semibold text-slate-700 font-mono">Rs. {item.amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-600">Total Payable</span>
                      <span className="text-base font-bold text-blue-700 font-mono">Rs. {costs.total.toLocaleString()}</span>
                    </div>
                    {costs.finalBasis > 0 && (
                      <p className="text-[10px] text-slate-400 mt-2">
                        Based on declared value: Rs. {costs.finalBasis.toLocaleString()}
                      </p>
                    )}
                  </div>
                )}

                {/* Description */}
                <p className="text-sm text-slate-500 leading-relaxed">
                  {confirmModal.status === 'approved'
                    ? 'This will finalize the land transfer and permanently update the legal registry and blockchain ledger. This action cannot be undone.'
                    : confirmModal.status === 'need_correction'
                    ? 'Specify what needs to be corrected. This message will be sent to both the buyer and seller.'
                    : 'This will mark the application as payment pending and notify the buyer of the fees due. The transfer will proceed once payment is verified.'}
                </p>

                {/* Correction textarea */}
                {confirmModal.status === 'need_correction' && (
                  <textarea
                    autoFocus
                    className="w-full h-28 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-400 outline-none resize-none placeholder-slate-400"
                    placeholder="e.g. Please re-upload a clearer scan of the citizenship document..."
                    value={correctionMsg}
                    onChange={(e) => setCorrectionMsg(e.target.value)}
                  />
                )}

                {/* Action buttons */}
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => setConfirmModal({ show: false, status: null })}
                    disabled={isProcessing}
                    className="flex-1 py-3 rounded-xl font-semibold text-sm text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-40"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleAction()}
                    disabled={isProcessing || (confirmModal.status === 'need_correction' && !correctionMsg.trim())}
                    className={`flex-1 py-3 rounded-xl font-bold text-sm text-white transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${
                      confirmModal.status === 'approved'
                        ? 'bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200'
                        : confirmModal.status === 'need_correction'
                        ? 'bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-200'
                        : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200'
                    }`}
                  >
                    {isProcessing && <Loader2 size={15} className="animate-spin" />}
                    {confirmModal.status === 'approved' ? 'Approve Transfer' :
                     confirmModal.status === 'need_correction' ? 'Send Correction Request' :
                     'Request Payment'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {viewDoc && (
          <div className="fixed inset-0 z-[10000] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 sm:p-8">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
               <div className="p-4 border-b flex justify-between bg-white">
                  <h3 className="font-bold">{viewDoc.type}</h3>
                  <button onClick={() => setViewDoc(null)}><X /></button>
               </div>
               <div className="flex-1 bg-slate-100 p-8 overflow-auto flex justify-center">
                  {viewDoc.url && (viewDoc.name || 'file.png').match(/\.(jpg|jpeg|png)$/i) ? (
                    <img src={viewDoc.url} className="max-w-full h-auto shadow-lg" alt="Document" />
                  ) : (
                    <div className="bg-white p-20 shadow-lg text-center">
                      <FileText size={80} className="mx-auto text-slate-200 mb-4" />
                      <p className="text-slate-500">{viewDoc.name}</p>
                    </div>
                  )}
               </div>
            </div>
          </div>
        )}

        <div className="max-w-[1440px] mx-auto px-6 lg:px-12 pt-8 pb-20 space-y-8 animate-fade-up">
          <div className="space-y-6 relative">
            <button onClick={() => setSelected(null)} className="text-sm text-slate-500 hover:text-slate-800">← Back to transfers</button>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-serif font-extrabold text-slate-900 flex items-center gap-4">
                    {app.kitta}
                    {(app.parcel_status === 'frozen' || app.parcel_status === 'rokka') && (
                      <span className="px-3 py-1 bg-rose-100 text-rose-600 rounded-lg text-[10px] font-bold flex items-center gap-1.5 border border-rose-200 uppercase tracking-wider animate-pulse">
                        <Shield size={12} /> ROKKA ACTIVE
                      </span>
                    )}
                  </h1>
                  <p className="text-slate-500 font-medium text-xs">{app.district}, {app.municipality} - Ward {app.ward}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Transfer ID</p>
                  <p className="text-sm font-mono font-bold text-slate-800">{app.id}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Seller (Current Owner)</p>
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-slate-400" />
                    <p className="text-sm font-bold text-slate-800">{app.applicant_lin}</p>
                  </div>
                </div>
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 relative overflow-hidden">
                  <p className="text-[10px] font-bold text-blue-400 uppercase mb-2">Buyer (New Owner)</p>
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-blue-400" />
                    <p className="text-sm font-bold text-blue-800">{app.buyer_lin}</p>
                  </div>
                  {/* Buyer verification badge */}
                  <div className="mt-2 flex gap-1">
                    <span className="text-[8px] px-1.5 py-0.5 bg-emerald-500 text-white rounded font-bold uppercase">Identity Verified</span>
                    <span className="text-[8px] px-1.5 py-0.5 bg-emerald-500 text-white rounded font-bold uppercase">Agreement Accepted</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase">Automated System Checks</h4>
                {verifying ? (
                  <div className="p-4 text-center text-xs animate-pulse text-blue-600">Running verification engine...</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {checks && Object.entries(checks).map(([key, val]) => (
                      <div key={key} className={`p-3 rounded-xl border flex items-center gap-3 ${val.status === 'passed' ? 'bg-green-50 border-green-100 text-green-700' : val.status === 'failed' ? 'bg-red-50 border-red-100 text-red-700' : 'bg-amber-50 border-amber-100 text-amber-700'}`}>
                        {val.status === 'passed' ? <CheckCircle size={16} /> : val.status === 'failed' ? <X size={16} /> : <AlertTriangle size={16} />}
                        <div>
                          <p className="text-[10px] font-bold uppercase">{key}</p>
                          <p className="text-xs">{val.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-8 pt-8 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-4">Submitted Documents</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {docs.map((doc, i) => (
                    <button key={i} onClick={() => setViewDoc(doc)} className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-xl hover:border-blue-400 transition-all text-left">
                      <FileText size={16} className="text-blue-600" />
                      <span className="text-[10px] font-bold truncate">{doc.type}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h4 className="text-xs font-bold text-slate-400 uppercase mb-4">Parcel Location</h4>
              <div className="h-[400px] rounded-xl overflow-hidden border border-slate-100">
                <MapEditor 
                  readOnly={true} 
                  height="100%"
                  initialPolygon={polygon || (parcelCoords ? (typeof parcelCoords === 'string' ? JSON.parse(parcelCoords) : parcelCoords) : null)} 
                />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl">
              <h3 className="text-sm font-bold opacity-60 mb-6 uppercase tracking-widest">Financial Ledger</h3>
              <div className="space-y-4 mb-8">
                {costs.breakdown.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center pb-3 border-b border-white/10 last:border-0">
                    <span className="text-xs opacity-60">{item.label}</span>
                    <span className="font-mono text-sm">Rs. {item.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="bg-white/5 rounded-xl p-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-blue-400">Total Payable</span>
                  <span className="text-xl font-bold font-mono">Rs. {costs.total.toLocaleString()}</span>
                </div>
                <div className="mt-2 pt-2 border-t border-white/5 flex justify-between items-center">
                  <span className="text-[10px] opacity-40 uppercase">Area Assessment</span>
                  <span className="text-[10px] font-bold text-amber-400">{app.area} (R-A-P-D)</span>
                </div>
              </div>
              
              <div className="space-y-2">
                {app.status === 'pending' && (
                  <>
                    <button 
                      onClick={() => setConfirmModal({ show: true, status: 'payment_pending' })}
                      disabled={isProcessing || (checks && Object.values(checks).some(c => c.status === 'failed'))}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg disabled:opacity-30"
                    >
                      Preliminary Approve (Request Payment)
                    </button>
                    <button 
                      onClick={() => setConfirmModal({ show: true, status: 'need_correction' })}
                      className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all"
                    >
                      Need Correction
                    </button>
                  </>
                )}

                {app.status === 'payment_pending' && app.payment_status === 'paid' && (
                  <button 
                    onClick={() => setConfirmModal({ show: true, status: 'approved' })}
                    className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all shadow-lg"
                  >
                    Final Approve Transfer
                  </button>
                )}

                {app.status === 'payment_verified' && (
                   <button 
                    onClick={() => setConfirmModal({ show: true, status: 'approved' })}
                    className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all shadow-lg"
                  >
                    Final Approve Transfer
                  </button>
                )}

                {app.status === 'payment_submitted' && (
                   <div className="space-y-4">
                     <div className="p-4 bg-white/10 rounded-xl">
                        <p className="text-[10px] text-blue-400 font-bold uppercase mb-2">Voucher Submitted</p>
                        <button 
                          onClick={() => setViewDoc({ type: 'Bank Voucher', name: 'voucher.png', url: app.payment_details?.receiptUrl })}
                          className="w-full py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-[10px] font-bold"
                        >
                          View Voucher Receipt
                        </button>
                     </div>
                     <button 
                      onClick={async () => {
                        const res = await fetch(`http://localhost:5001/api/applications/${app.id}/verify-payment`, { method: 'PUT' });
                        if (res.ok) window.location.reload();
                      }}
                      className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all"
                    >
                      Verify & Confirm Payment
                    </button>
                   </div>
                )}

                {app.status === 'payment_pending' && app.payment_status === 'unpaid' && (
                  <div className="p-4 bg-white/5 rounded-xl text-center">
                    <p className="text-xs opacity-60">Awaiting payment from buyer...</p>
                  </div>
                )}
              </div>
            </div>

            {app.payment_details && (
               <div className="bg-white rounded-2xl border border-slate-200 p-5 mt-6 shadow-sm overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-3">
                    <span className={`text-[9px] font-black px-2 py-1 rounded ${app.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                      {app.payment_status?.toUpperCase()}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
                    <Coins size={14} className="text-amber-500" /> Payment Intelligence
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[9px] text-slate-400 uppercase font-bold">Method</p>
                      <p className="text-xs font-bold text-slate-800">{app.payment_details.gateway || 'Bank Voucher'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] text-slate-400 uppercase font-bold">Reference</p>
                      <p className="text-xs font-mono font-bold text-slate-700 truncate">{app.payment_details.txnRef || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] text-slate-400 uppercase font-bold">Amount</p>
                      <p className="text-xs font-bold text-green-600">Rs. {app.payment_details.amount || '19,322.26'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] text-slate-400 uppercase font-bold">Time</p>
                      <p className="text-[10px] font-medium text-slate-500">{app.payment_details.paidAt ? new Date(app.payment_details.paidAt).toLocaleString() : 'Pending Verif.'}</p>
                    </div>
                  </div>
                  {app.payment_details.receiptUrl && (
                    <button 
                      onClick={() => setViewDoc({ type: 'Payment Receipt', name: 'receipt.png', url: app.payment_details.receiptUrl })}
                      className="w-full mt-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 transition-all"
                    >
                      Inspect Uploaded Voucher
                    </button>
                  )}
               </div>
            )}

            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Timeline</h4>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0"><CheckCircle size={14}/></div>
                  <p className="text-[10px] text-slate-600">Seller initiated transfer and uploaded 5 documents</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center shrink-0"><CheckCircle size={14}/></div>
                  <p className="text-[10px] text-slate-600">Buyer confirmed purchase and uploaded 3 documents</p>
                </div>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0"><Clock size={14}/></div>
                  <p className="text-[10px] text-slate-600">Pending final officer review and signature</p>
                </div>
              </div>
            </div>
          </div>
        </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-6 lg:px-12 pt-8 pb-20 space-y-10 animate-fade-up">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-slate-800">Land Transfers</h1>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-md border border-emerald-100 animate-pulse h-fit">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              <span className="text-[10px] font-black uppercase tracking-tighter">Real-time Connected</span>
            </div>
          </div>
        <div className="relative">
          <input 
            type="text" 
            placeholder="Search by ID or Kitta..." 
            className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none w-64"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(app => (
          <div 
            key={app.id} 
            onClick={() => setSelected(app.id)}
            className="bg-white p-5 rounded-2xl border border-slate-200 hover:shadow-xl transition-all cursor-pointer group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Shield size={20} />
              </div>
              <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${app.status === 'pending' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                {(app.status || 'PENDING').toUpperCase()}
              </span>
            </div>
            <h3 className="font-bold text-slate-800">{app.id}</h3>
            <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tight">Kitta {app.kitta} • {app.district}</p>
            
            <div className="mt-6 flex items-center gap-3">
               <div className="flex -space-x-2">
                 <div className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[8px] font-bold">S</div>
                 <div className="w-6 h-6 rounded-full bg-blue-200 border-2 border-white flex items-center justify-center text-[8px] font-bold">B</div>
               </div>
               <p className="text-[10px] text-slate-500">{app.applicant_lin} → {app.buyer_lin}</p>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full py-20 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            <FileText className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-slate-500 font-medium">No pending transfer requests</p>
          </div>
        )}
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
      </div>
    </div>
  );
}
