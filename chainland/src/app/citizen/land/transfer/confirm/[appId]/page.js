'use client';

import { useAuth } from '@/context/AuthContext';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  FileText, CheckCircle, Upload, X, MapPin, Coins, User, Shield,
  AlertTriangle, Loader2, ArrowRight, Landmark, Maximize2, AlertCircle,
  ChevronLeft, Lock, Eye, Building2, Hash, Layers, ReceiptText, BadgeCheck
} from 'lucide-react';
import MapEditor from '@/components/MapEditor';

/* ─── Google Fonts injection ─────────────────────────────── */
const FontStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=IBM+Plex+Mono:wght@400;500;600&family=Outfit:wght@300;400;500;600;700&display=swap');

    * { font-family: 'Outfit', sans-serif; }
    .font-display { font-family: 'Playfair Display', Georgia, serif; }
    .font-mono-alt { font-family: 'IBM Plex Mono', monospace; }

    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(16px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes slideRight {
      from { opacity: 0; transform: translateX(-12px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.95); }
      to   { opacity: 1; transform: scale(1); }
    }
    @keyframes toastIn {
      from { opacity: 0; transform: translateX(-50%) translateY(24px); }
      to   { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    @keyframes pulse-ring {
      0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.4); }
      50%       { box-shadow: 0 0 0 8px rgba(16,185,129,0); }
    }
    @keyframes shimmer {
      0%   { background-position: -200% 0; }
      100% { background-position:  200% 0; }
    }

    .anim-fade-up  { animation: fadeUp    0.45s ease both; }
    .anim-scale-in { animation: scaleIn   0.35s ease both; }
    .anim-toast    { animation: toastIn   0.35s ease both; }

    .delay-1 { animation-delay: 0.05s; }
    .delay-2 { animation-delay: 0.10s; }
    .delay-3 { animation-delay: 0.15s; }
    .delay-4 { animation-delay: 0.20s; }
    .delay-5 { animation-delay: 0.25s; }

    .pulse-ring { animation: pulse-ring 2s ease-in-out infinite; }

    .shimmer-bg {
      background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
    }

    .cost-card-glow { box-shadow: 0 0 0 1px rgba(255,255,255,0.08), 0 24px 48px rgba(0,0,0,0.4); }

    input[type='checkbox'] {
      appearance: none; -webkit-appearance: none;
      width: 18px; height: 18px; border-radius: 5px;
      border: 2px solid #cbd5e1; cursor: pointer;
      position: relative; transition: all 0.2s; flex-shrink: 0;
    }
    input[type='checkbox']:checked {
      background: #10b981; border-color: #10b981;
    }
    input[type='checkbox']:checked::after {
      content: ''; position: absolute;
      left: 4px; top: 1px; width: 5px; height: 9px;
      border: 2px solid white; border-top: none; border-left: none;
      transform: rotate(42deg);
    }
  `}</style>
);

const requiredBuyerDocs = [
  { key: 'Buyer Citizenship Certificate', icon: BadgeCheck, color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200',   hint: 'Front & back scan' },
  { key: 'Buyer Passport Size Photo',     icon: User,        color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200', hint: 'Recent, white background' },
  { key: 'PAN Card or Tax Number',        icon: ReceiptText, color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-200',  hint: 'Issued by IRD Nepal' },
];

/* ─── Cost calculator ────────────────────────────────────── */
function calculateCosts(areaStr, unit = 'hill', declaredAmount = 0) {
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
        { label: 'Registration Fee (0.6%)', sub: '0.6% of Tax Basis', amount: regFee },
        { label: 'Local Development Tax (0.2%)', sub: '0.2% of Tax Basis', amount: localTax },
        { label: 'MALPOT Service Charge', sub: 'Fixed fee', amount: serviceCharge },
        { label: 'Social Security Fund (SSF)', sub: 'Fixed contribution', amount: ssf }
      ]
    };
  } catch (e) {
    return defaultData;
  }
}

/* ─── Helpers ────────────────────────────────────────────── */
const fmt = (n) => `Rs. ${(+n || 0).toLocaleString('en-NP')}`;

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
export default function BuyerConfirmTransferPage() {
  const { user }  = useAuth();
  const { appId } = useParams();
  const router    = useRouter();

  const [app, setApp]                     = useState(null);
  const [loading, setLoading]             = useState(true);
  const [submitting, setSubmitting]       = useState(false);
  const [files, setFiles]                 = useState([]);
  const [success, setSuccess]             = useState(false);
  const [agreement, setAgreement]         = useState(false);
  const [idVerified, setIdVerified]       = useState(false);
  const [showMap, setShowMap]             = useState(false);
  const [dragOver, setDragOver]           = useState(null);
  const [toast, setToast]                 = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason]   = useState('');
  const [rejecting, setRejecting]         = useState(false);

  useEffect(() => {
    fetch('http://localhost:5001/api/applications')
      .then(r => r.json())
      .then(d => { if (d.success) setApp(d.data.find(a => a.id === appId) || null); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [appId]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleFile = (e, key) => {
    if (e.target.files[0])
      setFiles(prev => [...prev.filter(f => f.type !== key), { type: key, file: e.target.files[0] }]);
  };
  const handleDrop = (e, key) => {
    e.preventDefault(); setDragOver(null);
    const file = e.dataTransfer.files[0];
    if (file) setFiles(prev => [...prev.filter(f => f.type !== key), { type: key, file }]);
  };
  const removeFile = (key) => setFiles(prev => prev.filter(f => f.type !== key));

  const handleSubmit = async () => {
    if (files.length < requiredBuyerDocs.length) { showToast('Upload all required documents first.', 'error'); return; }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('status', 'pending');
      files.forEach(f => fd.append(f.type, f.file));
      const res = await fetch(`http://localhost:5001/api/applications/${appId}/buyer-confirm`, { method: 'PUT', body: fd });
      if (res.ok) setSuccess(true);
      else showToast('Confirmation failed. Please try again.', 'error');
    } catch { showToast('Network error. Check your connection.', 'error'); }
    finally { setSubmitting(false); }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) { showToast('Please provide a reason for rejection.', 'error'); return; }
    setRejecting(true);
    try {
      const res = await fetch(`http://localhost:5001/api/applications/${appId}/buyer-reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      });
      console.log(res);
      if (res.ok) {
        showToast('Application rejected. Seller will be notified.', 'success');
        setTimeout(() => router.push('/citizen'), 2000);
      } else {
        showToast('Rejection failed. Please try again.', 'error');
      }
    } catch {
      showToast('Network error. Check your connection.', 'error');
    } finally {
      setRejecting(false);
      setShowRejectModal(false);
    }
  };

  const costs         = app ? calculateCosts(app.area, app.area_unit || 'hill', app.declared_value || app.transactionAmount || 0) : calculateCosts();
  const docsComplete  = files.length >= requiredBuyerDocs.length;
  const isSubmittable = agreement && idVerified && docsComplete && app?.status === 'buyer_action_pending';
  const progress      = [idVerified, agreement, docsComplete].filter(Boolean).length;

  /* ── Loading ── */
  if (loading) return (
    <>
      <FontStyle />
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center">
          <Loader2 className="text-white animate-spin" size={22} />
        </div>
        <p className="text-sm font-semibold text-slate-400 tracking-wide">Loading transfer details…</p>
      </div>
    </>
  );

  /* ── Not found ── */
  if (!app) return (
    <>
      <FontStyle />
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-5">
        <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center">
          <AlertTriangle className="text-red-500" size={26} />
        </div>
        <p className="font-display text-2xl font-bold text-slate-900">Application not found</p>
        <button onClick={() => router.back()} className="text-sm font-semibold text-slate-500 hover:text-slate-900 underline underline-offset-4 transition-colors">
          ← Go back
        </button>
      </div>
    </>
  );

  /* ── Success ── */
  if (success) return (
    <>
      <FontStyle />
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="anim-scale-in bg-white rounded-3xl border border-slate-200 shadow-2xl shadow-slate-200/60 p-12 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-8 pulse-ring">
            <CheckCircle size={40} className="text-white" strokeWidth={1.5} />
          </div>
          <p className="font-display text-3xl font-bold text-slate-900 mb-3 leading-tight">Purchase<br/>Confirmed!</p>
          <p className="text-sm text-slate-500 leading-relaxed mb-2">Your documents have been submitted to the Land Revenue Office (Malpot) for verification.</p>
          <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold px-4 py-2 rounded-full mb-8">
            <Loader2 size={11} className="animate-spin" /> Awaiting officer review · 3–5 working days
          </div>
          <button
            onClick={() => router.push('/citizen')}
            className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-2xl transition-all shadow-lg hover:-translate-y-0.5"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </>
  );

  /* ═══════════════════════════════════════════════
     MAIN RENDER
  ═══════════════════════════════════════════════ */
  return (
    <>
      <FontStyle />
      <div className="min-h-screen bg-white">

        {/* ── Top bar ──────────────────────────────── */}
        <div className="relative z-10 bg-white border-b border-slate-100 -mt-4 -mx-4 lg:-mt-8 lg:-mx-8 mb-10">
          <div className="max-w-screen-2xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
            >
              <ChevronLeft size={16} /> Back
            </button>

            <div className="flex items-center gap-3">
              {/* Step progress dots */}
              <div className="hidden sm:flex items-center gap-1.5">
                {['Review', 'Documents', 'Declarations', 'Submit'].map((s, i) => (
                  <div key={s} className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full transition-all ${i < progress + 1 ? 'bg-slate-900' : 'bg-slate-200'}`} />
                    {i < 3 && <div className={`w-8 h-px ${i < progress ? 'bg-slate-900' : 'bg-slate-200'}`} />}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                Blockchain Active
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-screen-2xl mx-auto px-6 lg:px-10 py-10">

          {/* ── Page title ───────────────────────────── */}
          <div className="anim-fade-up mb-10 max-w-2xl">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-bold font-mono-alt uppercase tracking-widest text-slate-400 bg-slate-100 px-2.5 py-1 rounded-md">
                APP-{appId?.slice(-6)?.toUpperCase()}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md">
                Buyer Action Required
              </span>
            </div>
            <h1 className="font-display text-4xl lg:text-5xl font-black text-slate-900 leading-tight mb-3">
              Confirm Land Purchase
            </h1>
            <p className="text-base text-slate-500 leading-relaxed">
              Review the transaction summary, verify your identity, and upload the required documentation to initiate legal transfer.
            </p>
          </div>

          {/* ── Two-column layout ─────────────────────── */}
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-8 items-start">

            {/* LEFT COLUMN */}
            <div className="space-y-6">

              {/* ── CARD 1: Transaction Summary ──────── */}
              <div className="anim-fade-up delay-1 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Card header */}
                <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center">
                      <Landmark size={16} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">Official Transaction Summary</h2>
                      <p className="text-[10px] text-slate-400 font-mono-alt uppercase tracking-wider">Malpot Verified Rates</p>
                    </div>
                  </div>
                  <span className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-full">
                    <Shield size={10} /> Verified
                  </span>
                </div>

                <div className="p-8">
                  {/* Ownership transfer row */}
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-center mb-8">
                    {/* Seller */}
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                      <p className="text-[9px] uppercase font-bold tracking-widest text-slate-400 mb-3">Current Owner · Seller</p>
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                          <User size={20} className="text-slate-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{app.applicant_name || 'Land Owner'}</p>
                          <p className="text-[10px] font-mono-alt text-slate-400">LIN: {app.applicant_lin}</p>
                        </div>
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="flex justify-center">
                      <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                        <ArrowRight size={16} className="text-slate-400" />
                      </div>
                    </div>

                    {/* Buyer */}
                    <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-200">
                      <p className="text-[9px] uppercase font-bold tracking-widest text-emerald-600 mb-3">New Owner · You</p>
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-white border border-emerald-200 flex items-center justify-center shadow-sm">
                          <User size={20} className="text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{user?.name || 'You'}</p>
                          <p className="text-[10px] font-mono-alt text-emerald-600">LIN: {user?.lin}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Property + Cost row */}
                  <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
                    {/* Property details */}
                    <div className="space-y-4">
                      <p className="text-[9px] uppercase font-bold tracking-widest text-slate-400">Property Details</p>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { icon: Hash,      label: 'Kitta Number',  val: `KIT-${app.kitta}` },
                          { icon: MapPin,    label: 'District',      val: app.district },
                          { icon: Building2, label: 'Municipality',  val: app.municipality ? `${app.municipality}${app.ward ? `-${app.ward}` : ''}` : '—' },
                          { icon: Layers,    label: 'Land Area',     val: `${app.area} (${app.area_unit || 'hill'})` },
                        ].map(({ icon: Icon, label, val }) => (
                          <div key={label} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                            <div className="flex items-center gap-2 mb-2">
                              <Icon size={12} className="text-slate-400" />
                              <p className="text-[9px] uppercase font-bold tracking-wider text-slate-400">{label}</p>
                            </div>
                            <p className="text-sm font-semibold font-mono-alt text-slate-800">{val || '—'}</p>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={() => setShowMap(true)}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all hover:-translate-y-0.5 shadow-md hover:shadow-lg"
                      >
                        <Maximize2 size={14} /> View Parcel on Map
                      </button>
                    </div>

                    {/* Cost breakdown card */}
                    <div className="bg-slate-900 rounded-2xl p-6 text-white cost-card-glow flex flex-col">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                          <Coins size={20} className="text-amber-400" />
                        </div>
                        <div>
                          <p className="text-[9px] text-amber-400 font-bold uppercase tracking-widest">Total Due</p>
                          <p className="text-2xl font-bold font-mono-alt">{fmt(costs.total)}</p>
                        </div>
                      </div>

                      <div className="space-y-3 flex-1">
                        {costs.breakdown.map((item, i) => (
                          <div key={i} className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-[11px] text-slate-300 font-medium">{item.label}</p>
                              <p className="text-[9px] text-slate-500">{item.sub}</p>
                            </div>
                            <p className="text-[11px] font-mono-alt font-bold text-white whitespace-nowrap">{fmt(item.amount)}</p>
                          </div>
                        ))}
                      </div>

                      <div className="mt-5 pt-5 border-t border-white/10 space-y-2">
                        {[
                          { label: 'Declared Price', val: fmt(costs.landValue), warn: costs.landValue < costs.govValuation },
                          { label: 'Govt. Min. Valuation', val: fmt(costs.govValuation), warn: false },
                          { label: 'Tax Basis', val: fmt(costs.finalBasis), bold: true },
                        ].map(({ label, val, warn, bold }) => (
                          <div key={label} className="flex justify-between items-center">
                            <span className={`text-[9px] uppercase font-bold tracking-wider ${bold ? 'text-blue-400' : 'text-slate-500'}`}>{label}</span>
                            <span className={`text-[10px] font-mono-alt font-bold ${warn ? 'text-rose-400' : bold ? 'text-blue-400' : 'text-slate-300'}`}>{val}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── CARD 2: Document Upload ───────────── */}
              <div className="anim-fade-up delay-2 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
                      <FileText size={16} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">Required Documents</h2>
                      <p className="text-[10px] text-slate-400">Upload verified digital copies to proceed</p>
                    </div>
                  </div>
                  {/* Progress pill */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-500"
                        style={{ width: `${(files.length / requiredBuyerDocs.length) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold font-mono-alt text-slate-500 tabular-nums">
                      {files.length}/{requiredBuyerDocs.length}
                    </span>
                  </div>
                </div>

                <div className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {requiredBuyerDocs.map((doc) => {
                      const uploaded   = files.find(f => f.type === doc.key);
                      const isDragOver = dragOver === doc.key;
                      const Icon       = doc.icon;
                      return (
                        <div
                          key={doc.key}
                          onDragOver={e => { e.preventDefault(); setDragOver(doc.key); }}
                          onDragLeave={() => setDragOver(null)}
                          onDrop={e => handleDrop(e, doc.key)}
                          className={[
                            'relative rounded-2xl border-2 border-dashed transition-all duration-200 p-6 flex flex-col items-center text-center min-h-[180px] justify-center',
                            uploaded   ? 'border-emerald-300 bg-emerald-50'   : '',
                            isDragOver ? 'border-blue-400 bg-blue-50 scale-[1.02]' : '',
                            !uploaded && !isDragOver ? 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white' : '',
                          ].join(' ')}
                        >
                          {uploaded ? (
                            <>
                              <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mb-3">
                                <CheckCircle size={24} className="text-emerald-600" />
                              </div>
                              <p className="text-xs font-bold text-slate-800 mb-1">{doc.key}</p>
                              <p className="text-[10px] text-emerald-600 font-mono-alt truncate max-w-[140px]">{uploaded.file.name}</p>
                              <button
                                onClick={() => removeFile(doc.key)}
                                className="absolute top-3 right-3 w-7 h-7 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-200 transition-colors shadow-sm"
                              >
                                <X size={13} />
                              </button>
                            </>
                          ) : (
                            <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center group">
                              <div className={`w-12 h-12 ${doc.bg} border ${doc.border} rounded-2xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110`}>
                                <Icon size={22} className={doc.color} />
                              </div>
                              <p className="text-xs font-bold text-slate-700 mb-1 group-hover:text-slate-900 transition-colors">{doc.key}</p>
                              <p className="text-[10px] text-slate-400 mb-3">{doc.hint}</p>
                              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
                                + Upload File
                              </span>
                              <input type="file" className="hidden" onChange={e => handleFile(e, doc.key)} />
                            </label>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-slate-400 text-center mt-4">
                    Drag & drop files onto each slot, or click to browse. Accepted: PDF, JPG, PNG
                  </p>
                </div>
              </div>

            </div>
            {/* END LEFT COLUMN */}

            {/* RIGHT COLUMN — sticky sidebar */}
            <div className="space-y-5 xl:sticky xl:top-24">

              {/* ── Checklist card ────────────────────── */}
              <div className="anim-fade-up delay-3 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-7 py-5 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900">Completion Checklist</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">All three steps required to submit</p>
                </div>
                <div className="p-7 space-y-5">
                  {[
                    { label: 'Identity Confirmed',     sub: 'Statutory declaration',                checked: idVerified },
                    { label: 'Terms Accepted',         sub: 'Land Revenue Act compliance',          checked: agreement },
                    { label: 'Documents Uploaded',     sub: `${files.length} of ${requiredBuyerDocs.length} files`, checked: docsComplete },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className={[
                        'w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 flex-shrink-0',
                        item.checked ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-slate-200',
                      ].join(' ')}>
                        <CheckCircle size={16} className={item.checked ? 'text-white' : 'text-slate-200'} strokeWidth={2.5} />
                      </div>
                      <div>
                        <p className={`text-sm font-semibold transition-colors ${item.checked ? 'text-slate-900' : 'text-slate-400'}`}>{item.label}</p>
                        <p className="text-[10px] text-slate-400">{item.sub}</p>
                      </div>
                    </div>
                  ))}

                  {/* Overall progress bar */}
                  <div className="pt-3 border-t border-slate-100">
                    <div className="flex justify-between text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                      <span>Progress</span>
                      <span>{progress}/3 Complete</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                        style={{ width: `${(progress / 3) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Declarations card ─────────────────── */}
              <div className="anim-fade-up delay-4 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-7 py-5 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900">Legal Declarations</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Required under Land Revenue Act, 2034</p>
                </div>
                <div className="p-7 space-y-5">
                  {[
                    {
                      state: idVerified, setter: setIdVerified,
                      label: 'Identity Confirmation',
                      body: 'I verify that I am the authorized buyer and all personal details provided are legally accurate and complete.',
                    },
                    {
                      state: agreement, setter: setAgreement,
                      label: 'Terms & Compliance',
                      body: 'I accept the terms of this land transfer as per Nepalese Land Revenue Office regulations and relevant Acts.',
                    },
                  ].map(({ state, setter, label, body }) => (
                    <label key={label} className="flex items-start gap-4 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={state}
                        onChange={e => setter(e.target.checked)}
                        className="mt-0.5"
                      />
                      <div>
                        <p className="text-sm font-semibold text-slate-800 group-hover:text-slate-900 transition-colors">{label}</p>
                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{body}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* ── Submit button card ────────────────── */}
              <div className="anim-fade-up delay-5 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-7">
                  <button
                    disabled={!isSubmittable || submitting}
                    onClick={handleSubmit}
                    className={[
                      'w-full py-4 rounded-2xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2.5',
                      isSubmittable && !submitting
                        ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-xl shadow-slate-900/20 hover:-translate-y-0.5'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed',
                    ].join(' ')}
                  >
                    {submitting ? (
                      <><Loader2 size={17} className="animate-spin" /> Processing…</>
                    ) : (
                      <><Lock size={15} /> Submit Purchase Request <ArrowRight size={15} /></>
                    )}
                  </button>

                  {!isSubmittable && !submitting && (
                    <p className="text-[10px] text-center text-rose-500 font-semibold mt-3 uppercase tracking-wide">
                      Complete all checklist items to enable submission
                    </p>
                  )}

                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <button
                      onClick={() => setShowRejectModal(true)}
                      className="w-full py-3.5 bg-white border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
                    >
                      <X size={14} /> Reject Transfer Request
                    </button>
                    <p className="text-[10px] text-center text-slate-400 mt-3">
                      Rejecting will cancel this transfer process and notify the seller.
                    </p>
                  </div>
                </div>
              </div>

              {/* ── Info notice ───────────────────────── */}
              <div className="anim-fade-up delay-5 bg-blue-50 border border-blue-100 rounded-2xl p-5 flex gap-3">
                <AlertCircle size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-blue-700 leading-relaxed font-medium">
                  After submission, an officer will perform a preliminary review. You will be notified to proceed with fee payment once approved.
                </p>
              </div>

            </div>
            {/* END RIGHT COLUMN */}

          </div>
        </div>

        {/* ── Map Modal ──────────────────────────────── */}
        {showMap && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 anim-scale-in">
            <div className="bg-white w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl flex flex-col" style={{ maxHeight: '85vh' }}>
              <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Parcel Visualization</h3>
                  <p className="text-[10px] text-slate-400 font-mono-alt uppercase tracking-widest mt-0.5">Kitta No. {app.kitta} · Cadastral Survey Data</p>
                </div>
                <button
                  onClick={() => setShowMap(false)}
                  className="w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-500 transition-all hover:rotate-90"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 bg-slate-50 overflow-hidden">
                <MapEditor 
                  readOnly 
                  initialPolygon={(() => {
                    if (!app?.polygon) return null;
                    if (typeof app.polygon === 'object') return app.polygon;
                    try { return JSON.parse(app.polygon); } catch(e) { return null; }
                  })()} 
                />
              </div>
              <div className="px-8 py-4 border-t border-slate-100 flex items-center justify-between bg-white">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <Shield size={12} className="text-emerald-500" />
                  Coordinates verified via Blockchain Node
                </div>
                <button
                  onClick={() => setShowMap(false)}
                  className="px-6 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Reject Modal ─────────────────────────── */}
        {showRejectModal && (
          <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 anim-scale-in">
            <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-slate-200">
              <div className="px-8 pt-8 pb-6 text-center">
                <div className="w-16 h-16 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-center mx-auto mb-5 text-red-500">
                  <AlertTriangle size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2 font-display">Reject Transfer Request?</h3>
                <p className="text-sm text-slate-500 mb-6">
                  This action will cancel the purchase process. Please specify why you are rejecting this transfer.
                </p>
                
                <div className="text-left mb-6">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Reason for Rejection</label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="e.g. Price mismatch, document issues, or changed mind..."
                    className="w-full h-28 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm focus:bg-white focus:ring-4 focus:ring-red-500/5 focus:border-red-500 transition-all outline-none resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setShowRejectModal(false)}
                    className="py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-bold rounded-2xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={rejecting || !rejectReason.trim()}
                    onClick={handleReject}
                    className="py-3.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-sm font-bold rounded-2xl transition-all shadow-lg shadow-red-600/20"
                  >
                    {rejecting ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Confirm Reject'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Toast ──────────────────────────────────── */}
        {toast && (
          <div
            onClick={() => setToast(null)}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[999] anim-toast cursor-pointer"
          >
            <div className={[
              'flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-sm font-semibold',
              toast.type === 'error'
                ? 'bg-white border-red-200 text-red-700'
                : 'bg-white border-emerald-200 text-emerald-700',
            ].join(' ')}>
              {toast.type === 'error'
                ? <AlertTriangle size={16} />
                : <CheckCircle size={16} />}
              {toast.message}
            </div>
          </div>
        )}

      </div>
    </>
  );
}