'use client';

import { useAuth } from '@/context/AuthContext';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftRight, Clock, CheckCircle, XCircle, ChevronRight, MapPin, User, FileText, AlertCircle, Coins, Shield, Mountain, Upload, Map as MapIcon, ExternalLink, Download, ArrowRight, Eye } from 'lucide-react';
import MapEditor from '@/components/MapEditor';
import socket from '@/lib/socket';

export default function CitizenTransfersPage() {
  const { user, t } = useAuth();
  const router = useRouter();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState(null);
  const [payingApp, setPayingApp] = useState(null);
  const [paying, setPaying] = useState(false);
  const [payMethod, setPayMethod] = useState('connectips');
  const [payMode, setPayMode] = useState('online'); // 'online' or 'voucher'
  const [voucherFile, setVoucherFile] = useState(null);
  const [showInvoice, setShowInvoice] = useState(null);
  const [showQR, setShowQR] = useState(false); // New state for QR screen
  const [toast, setToast] = useState(null);
  const [viewDoc, setViewDoc] = useState(null);
  const [showDetailMap, setShowDetailMap] = useState(false);
  const [parcelCoords, setParcelCoords] = useState(null);

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
        regFee, localTax, svc: serviceCharge, sst: ssf,
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

  const fmt = (n) => `Rs. ${(+n || 0).toLocaleString('en-NP', { minimumFractionDigits: 2 })}`;

  useEffect(() => {
    if (!user?.lin) return;

    const fetchTransfers = async () => {
      try {
        const [sellingRes, buyingRes] = await Promise.all([
          fetch(`http://localhost:5001/api/applications?applicantLin=${user.lin}&type=TRANSFER`),
          fetch(`http://localhost:5001/api/applications?buyerLin=${user.lin}`)
        ]);

        const [sellingData, buyingData] = await Promise.all([
          sellingRes.json(),
          buyingRes.json()
        ]);

        const combined = [
          ...(sellingData.success ? sellingData.data : []),
          ...(buyingData.success ? buyingData.data : [])
        ];

        // Unique apps
        const unique = Array.from(new Set(combined.map(a => a.id)))
          .map(id => combined.find(a => a.id === id));

        setApps(unique.sort((a, b) => new Date(b.submitted_date) - new Date(a.submitted_date)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTransfers();

    if (user?.lin) {
      socket.emit('join', `user_${user.lin}`);
      
      const handleUpdate = (updatedApp) => {
        setApps(prev => prev.map(a => a.id === updatedApp.id ? updatedApp : a));
        showToast(`Application ${updatedApp.id} status updated!`, 'info');
      };

      const handleNotification = (data) => {
        showToast(data.message, 'info');
      };

      socket.on('application_updated', handleUpdate);
      socket.on('notification', handleNotification);

      return () => {
        socket.off('application_updated', handleUpdate);
        socket.off('notification', handleNotification);
      };
    }
  }, [user?.lin]);

  useEffect(() => {
    if (selectedApp && !selectedApp.polygon && selectedApp.kitta) {
      fetch(`http://localhost:5001/api/parcels/${selectedApp.kitta}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data.coordinates) {
            setParcelCoords(data.data.coordinates);
          }
        });
    } else {
      setParcelCoords(null);
    }
  }, [selectedApp]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handlePay = async (appId) => {
    setPaying(true);
    try {
      // Simulate payment gateway delay
      await new Promise(r => setTimeout(r, 2000));

      const res = await fetch(`http://localhost:5001/api/applications/${appId}/pay-online`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          gateway: payMethod,
          txnRef: `TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
        })
      });

      if (res.ok) {
        setPayingApp(null);
        // Refresh apps
        const [sellingRes, buyingRes] = await Promise.all([
          fetch(`http://localhost:5001/api/applications?applicantLin=${user.lin}&type=TRANSFER`),
          fetch(`http://localhost:5001/api/applications?buyerLin=${user.lin}`)
        ]);
        const [sellingData, buyingData] = await Promise.all([sellingRes.json(), buyingRes.json()]);
        const combined = [...(sellingData.success ? sellingData.data : []), ...(buyingData.success ? buyingData.data : [])];
        const unique = Array.from(new Set(combined.map(a => a.id))).map(id => combined.find(a => a.id === id));
        setApps(unique.sort((a, b) => new Date(b.submitted_date) - new Date(a.submitted_date)));
        showToast('Payment successful!');
      }
    } catch (e) {
      showToast('Payment failed', 'error');
    } finally {
      setPaying(false);
    }
  };

  const handleVoucherUpload = async (e) => {
    e.preventDefault();
    if (!voucherFile) return showToast('Please select a voucher image', 'error');
    
    setPaying(true);
    try {
      const formData = new FormData();
      formData.append('receipt', voucherFile);

      const res = await fetch(`http://localhost:5001/api/applications/${payingApp.id}/upload-voucher`, {
        method: 'PUT',
        body: formData
      });

      if (res.ok) {
        showToast('Voucher submitted successfully! Awaiting officer verification.');
        setPayingApp(null);
        setVoucherFile(null);
        // Refresh
        const [sR, bR] = await Promise.all([
          fetch(`http://localhost:5001/api/applications?applicantLin=${user.lin}&type=TRANSFER`),
          fetch(`http://localhost:5001/api/applications?buyerLin=${user.lin}`)
        ]);
        const [sD, bD] = await Promise.all([sR.json(), bR.json()]);
        const combined = [...(sD.success ? sD.data : []), ...(bD.success ? bD.data : [])];
        const unique = Array.from(new Set(combined.map(a => a.id))).map(id => combined.find(a => a.id === id));
        setApps(unique.sort((a, b) => new Date(b.submitted_date) - new Date(a.submitted_date)));
      }
    } catch (e) {
      showToast('Upload failed', 'error');
    } finally {
      setPaying(false);
    }
  };

  if (loading) return <div className="p-8 text-center animate-pulse text-slate-500">Loading transfers...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Land Transfers</h1>
        <p className="text-sm text-slate-500">Track your selling and buying applications</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {apps.map(app => {
          const isSeller = app.applicant_lin === user.lin;
          const statusColors = {
            buyer_action_pending: 'bg-amber-100 text-amber-700 border-amber-200',
            pending: 'bg-blue-100 text-blue-700 border-blue-200',
            approved: 'bg-green-100 text-green-700 border-green-200',
            rejected: 'bg-red-100 text-red-700 border-red-200'
          };

          return (
            <div key={app.id} className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isSeller ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                  <ArrowLeftRight size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-800">{app.id}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusColors[app.status] || 'bg-slate-100'}`}>
                      {(app.status || 'pending').replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Kitta {app.kitta} • {app.district}</p>
                </div>
              </div>

              <div className="flex items-center gap-8 px-6 border-x border-slate-50 hidden md:flex">
                <div className="text-center">
                   <p className="text-[10px] font-bold text-slate-400 uppercase">Role</p>
                   <p className={`text-xs font-bold ${isSeller ? 'text-orange-600' : 'text-blue-600'}`}>{isSeller ? 'SELLER' : 'BUYER'}</p>
                </div>
                <div className="text-center">
                   <p className="text-[10px] font-bold text-slate-400 uppercase">Counterparty</p>
                   <p className="text-xs font-bold text-slate-700">{isSeller ? app.buyer_lin : app.applicant_lin}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {!isSeller && app.status === 'buyer_action_pending' ? (
                  <button 
                    onClick={() => router.push(`/citizen/land/transfer/confirm/${app.id}`)}
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                  >
                    Complete Action
                  </button>
                ) : (!isSeller && app.status === 'payment_pending' && app.payment_status === 'unpaid') ? (
                   <div className="flex gap-2">
                     <button 
                      onClick={() => setShowInvoice(app)}
                      className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-200 transition-all flex items-center gap-2"
                    >
                      <FileText size={14} /> Invoice
                    </button>
                     <button 
                      onClick={() => setPayingApp(app)}
                      className="px-6 py-2.5 bg-green-600 text-white rounded-xl font-bold text-xs hover:bg-green-700 transition-all shadow-lg shadow-green-100"
                    >
                      Pay Fees
                    </button>
                   </div>
                ) : (
                  <button 
                    onClick={() => setSelectedApp(app)}
                    className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-50 transition-all"
                  >
                    View Details
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Payment Modal */}
        {payingApp && (
          <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
              <div className="bg-slate-900 p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10"><Coins size={120} /></div>
                <h3 className="text-xl font-bold mb-1">Fee Settlement</h3>
                <p className="text-[10px] uppercase tracking-widest opacity-60 font-bold">App ID: {payingApp.id}</p>
                
                <div className="mt-8 flex bg-white/10 rounded-xl p-1 relative z-10">
                  <button 
                    type="button"
                    onClick={(e) => { e.preventDefault(); setPayMode('online'); }} 
                    className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${payMode === 'online' ? 'bg-white text-slate-900 shadow-md' : 'text-white/60 hover:text-white'}`}
                  >
                    ONLINE GATEWAY
                  </button>
                  <button 
                    type="button"
                    onClick={(e) => { e.preventDefault(); setPayMode('voucher'); }} 
                    className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${payMode === 'voucher' ? 'bg-white text-slate-900 shadow-md' : 'text-white/60 hover:text-white'}`}
                  >
                    BANK VOUCHER
                  </button>
                </div>
              </div>

              <div className="p-8 space-y-6">
                {showQR ? (
                  <div className="text-center space-y-6 animate-in zoom-in duration-500">
                    <div className="p-4 bg-white rounded-2xl shadow-inner border border-slate-100 inline-block mx-auto">
                       {/* Placeholder for QR Code */}
                       <div className="w-48 h-48 bg-slate-50 flex items-center justify-center border-2 border-slate-100 rounded-xl relative overflow-hidden group">
                         <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=CHAINLAND-PAY-${payingApp.id}-${payMethod}`} 
                          alt="Payment QR" 
                          className="w-40 h-40 group-hover:scale-110 transition-transform"
                         />
                         <div className="absolute inset-0 bg-slate-900/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <p className="text-[10px] font-bold text-slate-700 bg-white/80 px-2 py-1 rounded">Scan to Pay</p>
                         </div>
                       </div>
                    </div>
                    
                    <div className="space-y-2">
                       <p className="text-sm font-bold text-slate-800 uppercase tracking-tight">Scan with your {payMethod.toUpperCase()} App</p>
                       <p className="text-[10px] text-slate-400 font-medium">Payment session will expire in 05:00</p>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-left flex items-start gap-3">
                       <Shield size={20} className="text-blue-600 shrink-0 mt-0.5" />
                       <div>
                         <p className="text-xs font-bold text-blue-800">Secure Merchant: ChainLand Registry</p>
                         <p className="text-[10px] text-blue-600 opacity-80">Your payment is encrypted and verified by Nepal Clearing House (NCHL).</p>
                       </div>
                    </div>

                    <button 
                      onClick={() => handlePay(payingApp.id)}
                      disabled={paying}
                      className="w-full py-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-bold text-sm transition-all shadow-xl disabled:opacity-50"
                    >
                      {paying ? 'Verifying Transaction...' : 'I Have Scanned & Paid'}
                    </button>
                    
                    <button 
                      onClick={() => setShowQR(false)}
                      className="text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest"
                    >
                      Back to Methods
                    </button>
                  </div>
                ) : payMode === 'online' ? (
                  <>
                    <div className="space-y-3">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Payment Method</p>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { id: 'connectips', label: 'ConnectIPS', color: 'bg-blue-50 text-blue-600 border-blue-200' },
                          { id: 'esewa', label: 'eSewa', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
                          { id: 'khalti', label: 'Khalti', color: 'bg-purple-50 text-purple-600 border-purple-200' }
                        ].map(m => (
                          <button 
                            key={m.id}
                            onClick={() => setPayMethod(m.id)}
                            className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${payMethod === m.id ? m.color : 'bg-white border-slate-100 text-slate-400'}`}
                          >
                            <div className="w-6 h-6 rounded-full flex items-center justify-center bg-white/50"><Shield size={12}/></div>
                            <span className="text-[8px] font-bold uppercase whitespace-nowrap">{m.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 space-y-3">
                      <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <span className="text-xs text-slate-500 font-medium">Total Payable</span>
                        <span className="text-lg font-bold text-slate-800 font-mono">
                          {fmt(calculateCosts(payingApp.area, payingApp.area_unit, payingApp.declared_value || payingApp.transactionAmount).total)}
                        </span>
                      </div>
                      <button 
                        onClick={() => setShowQR(true)}
                        className="w-full py-4 bg-crimson-600 hover:bg-crimson-700 text-white rounded-2xl font-bold text-sm transition-all shadow-xl shadow-crimson-200 flex items-center justify-center gap-3"
                      >
                        Confirm & Pay via {payMethod.toUpperCase()}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-6 text-center">
                    <div className="p-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                      <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mx-auto mb-4 text-slate-400">
                        <Upload size={20} />
                      </div>
                      <p className="text-xs font-bold text-slate-700 mb-1">Upload Payment Voucher</p>
                      <p className="text-[10px] text-slate-400 mb-4 uppercase">Format: JPG, PNG, PDF (Max 5MB)</p>
                      <label className="inline-block px-6 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg font-bold text-[10px] cursor-pointer hover:bg-slate-100 transition-colors">
                        Browse Files
                        <input type="file" className="hidden" onChange={(e) => setVoucherFile(e.target.files[0])} />
                      </label>
                      {voucherFile && <p className="mt-3 text-[10px] text-green-600 font-bold flex items-center justify-center gap-1"><CheckCircle size={10}/> {voucherFile.name}</p>}
                    </div>

                    <button 
                      onClick={handleVoucherUpload}
                      disabled={paying || !voucherFile}
                      className="w-full py-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-bold text-sm transition-all shadow-xl disabled:opacity-30"
                    >
                      {paying ? 'Uploading...' : 'Submit Voucher for Verification'}
                    </button>
                  </div>
                )}
                
                <button 
                  onClick={() => { setPayingApp(null); setVoucherFile(null); setShowQR(false); }}
                  className="w-full py-1 text-slate-400 font-bold text-[10px] hover:text-slate-600 transition-colors uppercase tracking-widest"
                >
                  Cancel Transaction
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Invoice Modal */}
        {showInvoice && (
          <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 animate-in slide-in-from-bottom-4 duration-300">
              <div className="p-8 space-y-8 bg-white max-h-[85vh] overflow-y-auto" id="invoice-content">
                <div className="flex justify-between items-start pb-8 border-b-2 border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-crimson-600 rounded-2xl flex items-center justify-center text-white"><Mountain size={24}/></div>
                    <div>
                      <h2 className="text-xl font-black text-slate-800 tracking-tighter uppercase">ChainLand</h2>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Digital Land Registry</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <h3 className="text-lg font-bold text-slate-800">INVOICE</h3>
                    <p className="text-xs text-slate-400 font-mono">#{showInvoice.id}-INV</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-12">
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-3">Billed To (Buyer)</h4>
                    <p className="text-sm font-bold text-slate-800">LIN: {showInvoice.buyer_lin}</p>
                    <p className="text-xs text-slate-500 mt-1">Status: Pending Verification</p>
                  </div>
                  <div className="text-right">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-3">Date Issued</h4>
                    <p className="text-sm font-bold text-slate-800">{new Date().toLocaleDateString('en-NP', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">Property Description</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                       <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Kitta No.</p>
                       <p className="text-xs font-bold text-slate-800">{showInvoice.kitta}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                       <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Location</p>
                       <p className="text-xs font-bold text-slate-800">{showInvoice.district}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                       <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Area</p>
                       <p className="text-xs font-bold text-slate-800">{showInvoice.area || '2-0-0-0'}</p>
                    </div>
                  </div>
                </div>

                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-slate-100">
                      <th className="py-4 text-left text-[10px] font-bold text-slate-400 uppercase">Service Description</th>
                      <th className="py-4 text-right text-[10px] font-bold text-slate-400 uppercase">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {(() => {
                      const c = calculateCosts(showInvoice.area, showInvoice.area_unit, showInvoice.declared_value || showInvoice.transactionAmount);
                      return (
                        <>
                          <tr>
                            <td className="py-4 text-xs font-bold text-slate-700">Land Registration Fee (1%)</td>
                            <td className="py-4 text-right text-xs font-mono text-slate-800">{fmt(c.regFee)}</td>
                          </tr>
                          <tr>
                            <td className="py-4 text-xs font-bold text-slate-700">Local Government Tax (0.25%)</td>
                            <td className="py-4 text-right text-xs font-mono text-slate-800">{fmt(c.localTax)}</td>
                          </tr>
                          <tr>
                            <td className="py-4 text-xs font-bold text-slate-700">Service Charges & Social Security</td>
                            <td className="py-4 text-right text-xs font-mono text-slate-800">{fmt(c.svc + c.sst)}</td>
                          </tr>
                          <tr className="bg-slate-50">
                            <td className="py-4 px-4 text-sm font-black text-slate-800 uppercase">Grand Total</td>
                            <td className="py-4 px-4 text-right text-lg font-black text-crimson-600 font-mono">{fmt(c.total)}</td>
                          </tr>
                        </>
                      );
                    })()}
                  </tbody>
                </table>

                <div className="pt-8 flex gap-4 border-t border-slate-100">
                   <div className="w-20 h-20 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-center shrink-0">
                      <p className="text-[8px] text-center font-bold text-slate-400 uppercase leading-tight">Digital Seal<br/>ChainLand</p>
                   </div>
                   <div className="text-[10px] text-slate-500 italic leading-relaxed">
                     Note: This is a computer-generated invoice for land transfer services. Final ownership will only be granted upon successful verification of this payment by the Land Revenue Office (Malpot).
                   </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between gap-4">
                <button onClick={() => window.print()} className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-100 transition-all flex items-center gap-2">
                  <Upload size={14} /> Download PDF
                </button>
                <button onClick={() => setShowInvoice(null)} className="px-8 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-black transition-all">
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- DOCUMENT VIEWER MODAL --- */}
        {viewDoc && (
          <div className="fixed inset-0 z-[20000] bg-slate-900/70 backdrop-blur-lg flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-white/20">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-200"><FileText size={20} /></div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">{viewDoc.type || 'Land Document'}</h3>
                    <p className="text-[10px] text-slate-500 font-mono tracking-tight">{viewDoc.name}</p>
                  </div>
                </div>
                <button onClick={() => setViewDoc(null)} className="w-10 h-10 flex items-center justify-center hover:bg-slate-200 rounded-full transition-colors"><XCircle size={24} className="text-slate-400" /></button>
              </div>
              <div className="flex-1 overflow-auto p-6 bg-slate-100 flex justify-center items-start">
                {viewDoc.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                  <img src={viewDoc.url} alt="Document" className="max-w-full rounded-xl shadow-2xl border border-white" />
                ) : (
                  <div className="w-full h-full bg-white rounded-2xl flex flex-col items-center justify-center p-12 text-center border border-slate-200">
                    <FileText size={48} className="text-slate-200 mb-4" />
                    <h4 className="text-lg font-bold text-slate-800">Secure PDF Preview</h4>
                    <p className="text-sm text-slate-500 mb-6 max-w-xs">For security reasons, PDF documents are encrypted. You can download the file to view its full contents.</p>
                    <a href={viewDoc.url} target="_blank" className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-black transition-all flex items-center gap-2">
                      <Download size={16} /> Download to View
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- PREMIUM DETAILS MODAL --- */}
        {selectedApp && (
          <div className="fixed inset-0 z-[10000] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
            <div 
              className="bg-white rounded-[40px] shadow-2xl w-full max-w-4xl overflow-hidden border border-white/20 animate-in zoom-in duration-500 flex flex-col md:flex-row"
              style={{ maxHeight: '90vh' }}
            >
              {/* Sidebar: Map & Progress */}
              <div className="w-full md:w-80 bg-slate-900 text-white flex flex-col border-r border-white/5">
                <div className="p-8 pb-4">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/10">
                      <ArrowLeftRight size={22} className="text-blue-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest leading-none mb-1">Application ID</p>
                      <h3 className="text-lg font-bold font-mono">{selectedApp.id}</h3>
                    </div>
                  </div>

                  <div className="space-y-6 mb-8">
                    <div className="relative pl-6 border-l border-white/10 space-y-8">
                       {['buyer_action_pending', 'pending', 'payment_pending', 'approved'].map((s, i) => {
                          const steps = ['Buyer Action', 'Officer Review', 'Payment', 'Completed'];
                          const currentIdx = ['buyer_action_pending', 'pending', 'payment_pending', 'approved'].indexOf(selectedApp.status);
                          const isActive = i <= currentIdx;
                          return (
                            <div key={s} className="relative">
                              <div className={`absolute -left-[31px] w-3 h-3 rounded-full border-2 border-slate-900 transition-colors duration-500 ${isActive ? 'bg-blue-400 border-blue-400 scale-125 shadow-[0_0_10px_rgba(96,165,250,0.5)]' : 'bg-slate-700 border-slate-600'}`} />
                              <p className={`text-[10px] font-bold uppercase tracking-widest ${isActive ? 'text-white' : 'text-slate-500'}`}>{steps[i]}</p>
                              {isActive && i === currentIdx && <p className="text-[9px] text-blue-300 animate-pulse font-medium">Currently Active</p>}
                            </div>
                          );
                       })}
                    </div>
                  </div>
                </div>

                <div className="flex-1 px-8">
                  <div className="p-5 bg-white/5 rounded-3xl border border-white/10 space-y-4">
                    <div className="flex items-center justify-between">
                       <span className="text-[10px] font-bold text-slate-400 uppercase">Interactive Map</span>
                       <button 
                        onClick={() => setShowDetailMap(!showDetailMap)}
                        className={`w-10 h-6 rounded-full relative transition-all ${showDetailMap ? 'bg-blue-600' : 'bg-slate-700'}`}
                       >
                         <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${showDetailMap ? 'left-5' : 'left-1'}`} />
                       </button>
                    </div>
                    <div className="h-32 bg-slate-800 rounded-2xl overflow-hidden relative group cursor-pointer" onClick={() => setShowDetailMap(true)}>
                       {(selectedApp.polygon || parcelCoords) ? (
                         <div className="w-full h-full opacity-60 group-hover:opacity-100 transition-opacity">
                           <MapEditor 
                            key={selectedApp.id} 
                            initialPolygon={
                              selectedApp.polygon 
                                ? (typeof selectedApp.polygon === 'string' ? JSON.parse(selectedApp.polygon) : selectedApp.polygon)
                                : (typeof parcelCoords === 'string' ? JSON.parse(parcelCoords) : parcelCoords)
                            } 
                            readOnly={true} 
                           />
                         </div>
                       ) : (
                         <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 gap-2">
                           <MapIcon size={24} />
                           <p className="text-[9px] font-bold">MAP UNAVAILABLE</p>
                         </div>
                       )}
                       <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 pointer-events-none">
                         <div className="bg-white/90 backdrop-blur text-slate-900 px-3 py-1.5 rounded-full text-[9px] font-bold shadow-xl">VIEW FULLSCREEN</div>
                       </div>
                    </div>
                  </div>
                </div>

                <div className="p-8">
                  <button 
                    onClick={() => setSelectedApp(null)}
                    className="w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold text-xs border border-white/10 transition-all flex items-center justify-center gap-2"
                  >
                    Close Review
                  </button>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 bg-slate-50 flex flex-col overflow-hidden">
                <div className="p-8 overflow-y-auto space-y-8">
                  {/* Stats Cards */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                         <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><User size={16}/></div>
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Counterparty</p>
                      </div>
                      <p className="text-sm font-bold text-slate-800">{selectedApp.applicant_lin === user.lin ? 'Buyer' : 'Seller'}: {selectedApp.applicant_lin === user.lin ? selectedApp.buyer_lin : selectedApp.applicant_lin}</p>
                      <p className="text-[10px] text-slate-500 mt-1 font-medium">Digital Identity Verified</p>
                    </div>
                    <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                         <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center"><MapPin size={16}/></div>
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Parcel Info</p>
                      </div>
                      <p className="text-sm font-bold text-slate-800">Kitta {selectedApp.kitta}</p>
                      <p className="text-[10px] text-slate-500 mt-1 font-medium">{selectedApp.district}, Ward {selectedApp.ward}</p>
                    </div>
                  </div>

                  {/* Documents Section */}
                  <div>
                    <div className="flex items-center justify-between mb-4 px-2">
                       <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                         <FileText size={14} className="text-blue-500" /> Transfer Dossier
                       </h4>
                       <span className="text-[9px] font-bold text-slate-400 uppercase bg-slate-100 px-2 py-1 rounded-md">
                         {(typeof selectedApp.documents === 'string' ? JSON.parse(selectedApp.documents) : (selectedApp.documents || [])).length} Files
                       </span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(typeof selectedApp.documents === 'string' ? JSON.parse(selectedApp.documents) : (selectedApp.documents || [])).map((doc, i) => (
                        <div key={i} className="group bg-white p-4 rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 bg-slate-50 group-hover:bg-blue-50 text-slate-400 group-hover:text-blue-600 rounded-xl flex items-center justify-center transition-colors shrink-0">
                              <FileText size={18} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate">{doc.type}</p>
                              <p className="text-[9px] text-slate-400 truncate uppercase tracking-tighter">{doc.name?.split('.').pop()} Document</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => setViewDoc(doc)}
                            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          >
                            <Eye size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Payment Summary if applicable */}
                  {selectedApp.payment_status === 'paid' && (
                    <div className="bg-emerald-50 p-6 rounded-[32px] border border-emerald-100 flex items-start gap-4">
                       <div className="w-10 h-10 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200 shrink-0"><CheckCircle size={20}/></div>
                       <div>
                          <p className="text-xs font-bold text-emerald-800 mb-1 uppercase tracking-tight">Financial Settlement Complete</p>
                          <p className="text-[11px] text-emerald-600 leading-relaxed">All registration and transfer taxes have been settled via {selectedApp.payment_method?.toUpperCase() || 'Digital Gateway'}. Transaction Ref: {selectedApp.payment_ref || 'TRX-N/A'}</p>
                       </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- FULLSCREEN MAP MODAL --- */}
        {showDetailMap && selectedApp && (
          <div className="fixed inset-0 z-[20000] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4 lg:p-12 animate-in fade-in zoom-in duration-300">
            <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden relative border border-white/20">
               <div className="absolute top-8 right-8 z-[1000]">
                  <button 
                    onClick={() => setShowDetailMap(false)}
                    className="w-12 h-12 bg-white text-slate-900 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform border border-slate-100"
                  >
                    <XCircle size={24} />
                  </button>
               </div>
               
               <div className="flex-1 relative">
                 <MapEditor 
                  key={selectedApp.id + '-fs'} 
                  height="100%"
                  initialPolygon={
                    selectedApp.polygon 
                      ? (typeof selectedApp.polygon === 'string' ? JSON.parse(selectedApp.polygon) : selectedApp.polygon)
                      : (typeof parcelCoords === 'string' ? JSON.parse(parcelCoords) : parcelCoords)
                  } 
                  readOnly={true} 
                 />
                 
                 <div className="absolute bottom-10 left-10 z-[1000] max-w-md">
                   <div className="bg-white/90 backdrop-blur-xl p-6 rounded-[32px] shadow-2xl border border-white flex items-center gap-5">
                      <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-mono font-bold text-xl shadow-2xl shadow-slate-900/40">{selectedApp.kitta}</div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Parcel Verified</p>
                        <h3 className="text-xl font-bold text-slate-900 leading-none mb-1">{selectedApp.district}</h3>
                        <p className="text-sm font-medium text-slate-500 leading-none">Municipality: {selectedApp.municipality}, Ward {selectedApp.ward}</p>
                      </div>
                   </div>
                 </div>
               </div>
            </div>
          </div>
        )}

        {apps.length === 0 && (
          <div className="py-20 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            <ArrowLeftRight className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-slate-500 font-medium">No land transfers in progress</p>
            <button onClick={() => router.push('/citizen/land')} className="mt-4 text-blue-600 font-bold text-sm">Initiate a transfer from My Land</button>
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
