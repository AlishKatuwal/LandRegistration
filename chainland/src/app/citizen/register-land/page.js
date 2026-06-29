'use client';
import { useAuth } from '@/context/AuthContext';
import {
  Upload, MapPin, CheckCircle, FileText, X,
  AlertTriangle, ChevronRight, Layers, Shield, Clock
} from 'lucide-react';
import { useState, useEffect } from 'react';
import MapEditor from '@/components/MapEditor';

const steps = [
  { id: 1, label: 'Parcel Details', icon: Layers },
  { id: 2, label: 'Map Boundary',   icon: MapPin },
  { id: 3, label: 'Documents',      icon: FileText },
];

const requiredDocs = [
  { key: 'Previous Ownership Proof', icon: '📜', hint: 'Lalpurja or equivalent' },
  { key: 'Survey Map',               icon: '🗺️', hint: 'Naapi approved sketch' },
  { key: 'Tax Clearance',            icon: '🧾', hint: 'Revenue clearance certificate' },
  { key: 'Citizenship Copy',         icon: '🪪', hint: 'Both sides of citizenship' },
];

const inputCls =
  'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 ' +
  'placeholder:text-slate-300 bg-slate-50 focus:bg-white focus:border-emerald-500 ' +
  'focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all';

const labelCls =
  'block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5';

export default function RegisterLandPage() {
  const { user } = useAuth();
  const [currentStep, setCurrentStep]         = useState(1);
  const [formData, setFormData]               = useState({ kitta: '', district: '', municipality: '', ward: '', area: '0-0-0-0', area_unit: 'hill', previousOwner: '' });
  const [polygon, setPolygon]                 = useState(null);
  const [files, setFiles]                     = useState([]);
  const [loading, setLoading]                 = useState(false);
  const [success, setSuccess]                 = useState(false);
  const [conflicts, setConflicts]             = useState([]);
  const [checkingOverlap, setCheckingOverlap] = useState(false);
  const [dragOver, setDragOver]               = useState(null);
  const [toast, setToast]                     = useState(null);

  const field = (key, val) => setFormData(prev => ({ ...prev, [key]: val }));

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleFileUpload = (e, docType) => {
    if (e.target.files[0])
      setFiles(prev => [...prev.filter(f => f.type !== docType), { type: docType, file: e.target.files[0] }]);
  };

  const handleDrop = (e, docType) => {
    e.preventDefault();
    setDragOver(null);
    const file = e.dataTransfer.files[0];
    if (file) setFiles(prev => [...prev.filter(f => f.type !== docType), { type: docType, file }]);
  };

  const removeFile = (docType) => setFiles(files.filter(f => f.type !== docType));

  useEffect(() => {
    const check = async () => {
      if (!polygon || polygon.length < 3) { setConflicts([]); return; }
      setCheckingOverlap(true);
      try {
        const res  = await fetch('http://localhost:5001/api/parcels/check-overlap', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ polygon }),
        });
        const data = await res.json();
        if (data.success) setConflicts(data.conflicts || []);
      } catch { /* silent */ }
      finally { setCheckingOverlap(false); }
    };
    check();
  }, [polygon]);

  const handleSubmit = async () => {
    if (files.length < requiredDocs.length) { showToast('Please upload all required documents.', 'error'); return; }
    if (conflicts.length > 0)               { showToast('Cannot submit: Boundary overlaps detected.', 'error'); return; }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('type', 'NEW_REGISTRATION');
      fd.append('typeNp', 'नयाँ दर्ता');
      fd.append('applicantLin', user.lin);
      Object.entries(formData).forEach(([k, v]) => fd.append(k, v));
      fd.append('polygon', JSON.stringify(polygon));
      files.forEach(f => fd.append(f.type, f.file));
      const res = await fetch('http://localhost:5001/api/applications', { method: 'POST', body: fd });
      if (res.ok) setSuccess(true); else showToast('Submission failed', 'error');
    } catch { showToast('Network error', 'error'); }
    finally { setLoading(false); }
  };

  const canProceed = () => {
    if (currentStep === 1) return formData.kitta && formData.district && formData.municipality && formData.ward && formData.area;
    if (currentStep === 2) return polygon && polygon.length >= 3 && conflicts.length === 0;
    if (currentStep === 3) return files.length >= requiredDocs.length;
    return false;
  };

  /* ─── Success screen ──────────────────────────────────────────── */
  if (success) return (
    <div className="min-h-full bg-white flex items-center justify-center p-8">
      <div className="text-center max-w-sm">
        <div className="relative inline-flex mb-6">
          <div className="absolute inset-0 bg-emerald-100 rounded-full blur-2xl scale-150 opacity-70" />
          <div className="relative w-20 h-20 rounded-full bg-emerald-600 flex items-center justify-center shadow-xl">
            <CheckCircle size={38} className="text-white" strokeWidth={1.5} />
          </div>
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
          Application Submitted!
        </h2>
        <p className="text-sm text-slate-500 leading-relaxed mb-4">
          Your land registration has been forwarded to the Malpot Officer for review.
        </p>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full mb-6">
          <Clock size={11} /> Typical review: 3–5 working days
        </span>
        <div>
          <button
            onClick={() => window.location.href = '/citizen'}
            className="px-7 py-2.5 bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold rounded-full transition-all shadow-md hover:-translate-y-0.5"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );

  /* ─── Main page ───────────────────────────────────────────────── */
  return (
    <div className="min-h-full bg-white pb-16">
      <div className="w-full px-6 pt-6 space-y-5">

        {/* Page header */}
        <div>
          <div className="flex items-start justify-between mb-5">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-bold tracking-wider uppercase text-orange-600 bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded-full">
                  भूमि दर्ता
                </span>
                <span className="text-xs text-slate-400 font-medium">Land Registration Portal</span>
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                New Land Registration
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Register a new parcel to your Land Identity Number (LIN)
              </p>
            </div>
            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full flex-shrink-0">
              <Shield size={11} className="text-emerald-600" /> Secure Submission
            </span>
          </div>

          {/* Step tracker */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {steps.map((step, i) => {
              const Icon  = step.icon;
              const state = currentStep === step.id ? 'active' : currentStep > step.id ? 'done' : 'pending';
              return (
                <div key={step.id} className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => state === 'done' && setCurrentStep(step.id)}
                    className={[
                      'flex items-center gap-2 pl-1.5 pr-4 py-1.5 rounded-full text-xs font-bold tracking-wide transition-all duration-200 border',
                      state === 'active'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : state === 'done'
                        ? 'bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50 cursor-pointer'
                        : 'bg-white text-slate-400 border-slate-200 cursor-default',
                    ].join(' ')}
                  >
                    <span className={[
                      'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors',
                      state === 'active'  ? 'bg-white/20'    : '',
                      state === 'done'    ? 'bg-emerald-100' : '',
                      state === 'pending' ? 'bg-slate-100'   : '',
                    ].join(' ')}>
                      {state === 'done'
                        ? <CheckCircle size={12} className="text-emerald-600" />
                        : <Icon size={12} />}
                    </span>
                    {step.label}
                  </button>

                  {i < steps.length - 1 && (
                    <div className={[
                      'w-8 h-px flex-shrink-0 transition-colors',
                      currentStep > step.id ? 'bg-emerald-300' : 'bg-slate-200',
                    ].join(' ')} />
                  )}
                </div>
              );
            })}
            <span className="ml-auto text-xs font-semibold text-slate-400 flex-shrink-0">{currentStep} / 3</span>
          </div>
        </div>

        {/* ─── Step 1: Parcel Details ─────────────────────────────── */}
        {currentStep === 1 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0">
                <Layers size={16} className="text-emerald-700" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">Parcel Information</h2>
                <p className="text-xs text-slate-400">Enter the official land record details</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-5">
              <div>
                <label className={labelCls}>Kitta / Parcel Number</label>
                <input className={inputCls} value={formData.kitta} onChange={e => field('kitta', e.target.value)} placeholder="e.g. KTM-01-105" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={labelCls}>Land Area</label>
                  <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    <button 
                      type="button"
                      onClick={() => {
                        field('area_unit', 'hill');
                        field('area', '0-0-0-0');
                      }}
                      className={`px-3 py-1 rounded-md text-[9px] font-bold transition-all ${formData.area_unit === 'hill' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      HILL (R-A-P-D)
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        field('area_unit', 'terai');
                        field('area', '0-0-0');
                      }}
                      className={`px-3 py-1 rounded-md text-[9px] font-bold transition-all ${formData.area_unit === 'terai' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      TERAI (B-K-D)
                    </button>
                  </div>
                </div>

                {formData.area_unit === 'hill' ? (
                  <div className="grid grid-cols-4 gap-2">
                    <div className="relative">
                      <input 
                        type="number" 
                        placeholder="R" 
                        className={`${inputCls} pr-7`} 
                        value={formData.area.split('-')[0] || ''} 
                        onChange={e => {
                          const parts = formData.area.split('-');
                          parts[0] = e.target.value || '0';
                          field('area', parts.join('-'));
                        }}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">R</span>
                    </div>
                    <div className="relative">
                      <input 
                        type="number" 
                        placeholder="A" 
                        className={`${inputCls} pr-7`} 
                        value={formData.area.split('-')[1] || ''} 
                        onChange={e => {
                          let val = parseInt(e.target.value) || 0;
                          const parts = formData.area.split('-').map(p => parseInt(p) || 0);
                          if (val >= 16) {
                            parts[0] += Math.floor(val / 16);
                            val = val % 16;
                          }
                          parts[1] = val;
                          field('area', parts.join('-'));
                        }}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">A</span>
                    </div>
                    <div className="relative">
                      <input 
                        type="number" 
                        placeholder="P" 
                        className={`${inputCls} pr-7`} 
                        value={formData.area.split('-')[2] || ''} 
                        onChange={e => {
                          let val = parseInt(e.target.value) || 0;
                          const parts = formData.area.split('-').map(p => parseInt(p) || 0);
                          if (val >= 4) {
                            let extraA = Math.floor(val / 4);
                            val = val % 4;
                            parts[1] += extraA;
                            if (parts[1] >= 16) {
                              parts[0] += Math.floor(parts[1] / 16);
                              parts[1] = parts[1] % 16;
                            }
                          }
                          parts[2] = val;
                          field('area', parts.join('-'));
                        }}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">P</span>
                    </div>
                    <div className="relative">
                      <input 
                        type="number" 
                        placeholder="D" 
                        className={`${inputCls} pr-7`} 
                        value={formData.area.split('-')[3] || ''} 
                        onChange={e => {
                          let val = parseInt(e.target.value) || 0;
                          const parts = formData.area.split('-').map(p => parseInt(p) || 0);
                          if (val >= 4) {
                            let extraP = Math.floor(val / 4);
                            val = val % 4;
                            parts[2] += extraP;
                            // Cascade up
                            if (parts[2] >= 4) {
                              parts[1] += Math.floor(parts[2] / 4);
                              parts[2] = parts[2] % 4;
                            }
                            if (parts[1] >= 16) {
                              parts[0] += Math.floor(parts[1] / 16);
                              parts[1] = parts[1] % 16;
                            }
                          }
                          parts[3] = val;
                          field('area', parts.join('-'));
                        }}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">D</span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="relative">
                      <input 
                        type="number" 
                        step="any"
                        placeholder="B" 
                        className={`${inputCls} pr-7`} 
                        value={formData.area.split('-')[0] === '0' ? '' : formData.area.split('-')[0]} 
                        onChange={e => {
                          const raw = e.target.value;
                          const val = parseFloat(raw) || 0;
                          const k = val * 20;
                          const d = val * 400;
                          field('area', `${raw || '0'}-${k.toFixed(4)}-${d.toFixed(2)}`);
                        }}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">B</span>
                    </div>
                    <div className="relative">
                      <input 
                        type="number" 
                        step="any"
                        placeholder="K" 
                        className={`${inputCls} pr-7`} 
                        value={formData.area.split('-')[1] === '0' ? '' : formData.area.split('-')[1]} 
                        onChange={e => {
                          const raw = e.target.value;
                          const val = parseFloat(raw) || 0;
                          const b = val / 20;
                          const d = val * 20;
                          field('area', `${b.toFixed(4)}-${raw || '0'}-${d.toFixed(2)}`);
                        }}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">K</span>
                    </div>
                    <div className="relative">
                      <input 
                        type="number" 
                        step="any"
                        placeholder="Dh" 
                        className={`${inputCls} pr-7`} 
                        value={formData.area.split('-')[2] === '0' ? '' : formData.area.split('-')[2]} 
                        onChange={e => {
                          const raw = e.target.value;
                          const val = parseFloat(raw) || 0;
                          const k = val / 20;
                          const b = val / 400;
                          field('area', `${b.toFixed(6)}-${k.toFixed(4)}-${raw || '0'}`);
                        }}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">Dh</span>
                    </div>
                  </div>
                )}
                {/* <div className="mt-3 p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-tight mb-0.5">Normalized Breakdown</p>
                    <p className="text-sm font-bold text-emerald-700 font-mono">
                      {(() => {
                        const totalDhur = parseFloat(formData.area.split('-')[2]) || 0;
                        const b = Math.floor(totalDhur / 400);
                        const k = Math.floor((totalDhur % 400) / 20);
                        const d = (totalDhur % 20).toFixed(2);
                        return `${b}B - ${k}K - ${d}Dh`;
                      })()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-tight mb-0.5">Standard Conversion</p>
                    <div className="flex items-baseline justify-end gap-2">
                      <span className="text-[11px] font-bold text-emerald-600">
                        {(() => {
                          const p = formData.area.split('-').map(x => parseInt(x) || 0);
                          let sqmtr = 0;
                          if (formData.area_unit === 'hill') {
                            sqmtr = (p[0] * 508.74) + (p[1] * 31.80) + (p[2] * 7.95) + (p[3] * 1.99);
                          } else {
                            sqmtr = (p[0] * 6772.63) + (p[1] * 338.63) + (p[2] * 16.93);
                          }
                          return sqmtr.toLocaleString(undefined, { maximumFractionDigits: 2 });
                        })()} m²
                      </span>
                      <span className="text-[10px] text-emerald-400 font-medium whitespace-nowrap">
                        ≈ {(() => {
                          const p = formData.area.split('-').map(x => parseInt(x) || 0);
                          let sqft = 0;
                          if (formData.area_unit === 'hill') {
                            sqft = (p[0] * 5476) + (p[1] * 342.25) + (p[2] * 85.56) + (p[3] * 21.39);
                          } else {
                            sqft = (p[0] * 72900) + (p[1] * 3645) + (p[2] * 182.25);
                          }
                          return sqft.toLocaleString(undefined, { maximumFractionDigits: 0 });
                        })()} sq. ft
                      </span>
                    </div>
                  </div>
                </div> */}
              </div>
              <div>
                <label className={labelCls}>District</label>
                <input className={inputCls} value={formData.district} onChange={e => field('district', e.target.value)} placeholder="e.g. Kathmandu" />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Municipality / VDC</label>
                <input className={inputCls} value={formData.municipality} onChange={e => field('municipality', e.target.value)} placeholder="e.g. Kathmandu Metropolitan City" />
              </div>
              <div>
                <label className={labelCls}>Ward No.</label>
                <input type="number" min="1" max="35" className={inputCls} value={formData.ward} onChange={e => field('ward', e.target.value)} placeholder="e.g. 12" />
              </div>
              <div className="col-span-3">
                <label className={labelCls}>
                  Previous Owner Name{' '}
                  <span className="normal-case text-slate-300 font-normal">(if applicable)</span>
                </label>
                <input className={inputCls} value={formData.previousOwner} onChange={e => field('previousOwner', e.target.value)} placeholder="Full name as on previous deed" />
              </div>
            </div>
          </div>
        )}

        {/* ─── Step 2: Map Boundary ───────────────────────────────── */}
        {currentStep === 2 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                <MapPin size={16} className="text-blue-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">Draw Parcel Boundary</h2>
                <p className="text-xs text-slate-400">Mark the exact polygon of your land on the map</p>
              </div>
            </div>

            <div className="rounded-xl overflow-hidden border border-slate-200 mb-4">
              <MapEditor onPolygonCreated={setPolygon} />
            </div>

            {/* Status badges */}
            <div className="flex flex-wrap gap-2 mb-2">
              {!polygon && (
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 inline-block" />
                  No polygon drawn yet
                </span>
              )}
              {polygon && polygon.length >= 3 && !checkingOverlap && conflicts.length === 0 && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
                  <CheckCircle size={11} /> Boundary verified — no conflicts
                </span>
              )}
              {checkingOverlap && (
                <span className="inline-flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-full animate-pulse">
                  <span className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin inline-block" />
                  Checking for boundary overlaps…
                </span>
              )}
            </div>

            {/* Conflict cards */}
            {conflicts.length > 0 && (
              <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-4 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle size={15} className="text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-red-700">Overlap Detected</p>
                    <p className="text-xs text-red-500">
                      Your boundary conflicts with {conflicts.length} registered parcel{conflicts.length > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {conflicts.map(c => (
                    <div key={c.parcelId} className="bg-white rounded-xl border border-red-100 p-3.5 shadow-sm">
                      <div className="flex justify-between items-center mb-3">
                        <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">{c.parcelId}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wide text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">{c.status}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        {[
                          ['Owner',       c.ownerName],
                          ['Citizenship', c.ownerCitizenship],
                          ['Location',    `${c.district}, ${c.municipality}-${c.ward}`],
                          ['Area',        `${c.area} (${c.landClass})`],
                        ].map(([label, val]) => (
                          <div key={label}>
                            <p className="text-[9px] uppercase font-bold tracking-wider text-slate-400 mb-0.5">{label}</p>
                            <p className="text-[11px] text-slate-700 font-medium">{val}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex justify-between items-center">
                        <p className="text-[9px] text-slate-400">
                          Registered {new Date(c.registeredDate).toLocaleDateString('en-NP')}
                        </p>
                        <button
                          type="button"
                          onClick={() => window.location.href = `/citizen/disputes?kitta=${c.parcelId}`}
                          className="text-[10px] font-bold text-blue-600 hover:underline"
                        >
                          File Dispute →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Step 3: Documents ──────────────────────────────────── */}
        {currentStep === 3 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0">
                <FileText size={16} className="text-amber-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">Required Documents</h2>
                <p className="text-xs text-slate-400">{files.length} of {requiredDocs.length} uploaded</p>
              </div>
              <div className="ml-auto flex items-center gap-2.5">
                <div className="w-28 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${(files.length / requiredDocs.length) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-slate-500 tabular-nums">
                  {Math.round((files.length / requiredDocs.length) * 100)}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {requiredDocs.map(doc => {
                const uploaded   = files.find(f => f.type === doc.key);
                const isDragOver = dragOver === doc.key;
                return (
                  <div
                    key={doc.key}
                    onDragOver={e => { e.preventDefault(); setDragOver(doc.key); }}
                    onDragLeave={() => setDragOver(null)}
                    onDrop={e => handleDrop(e, doc.key)}
                    className={[
                      'flex items-center gap-3 p-4 rounded-xl border-2 border-dashed transition-all duration-200',
                      uploaded     ? 'border-emerald-400 bg-emerald-50'   : '',
                      isDragOver   ? 'border-emerald-400 bg-emerald-50 scale-[1.01]' : '',
                      !uploaded && !isDragOver ? 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white' : '',
                    ].join(' ')}
                  >
                    <span className="text-2xl flex-shrink-0">{doc.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{doc.key}</p>
                      {uploaded
                        ? <p className="text-xs text-emerald-600 font-medium truncate">✓ {uploaded.file.name}</p>
                        : <p className="text-xs text-slate-400">{doc.hint}</p>
                      }
                    </div>
                    {uploaded ? (
                      <button
                        type="button"
                        onClick={() => removeFile(doc.key)}
                        className="flex-shrink-0 w-7 h-7 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-500 hover:bg-red-100 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    ) : (
                      <label className="flex-shrink-0 cursor-pointer px-3.5 py-1.5 bg-white border border-slate-200 hover:border-emerald-400 hover:text-emerald-600 rounded-lg text-xs font-semibold text-slate-500 transition-all">
                        <input type="file" className="hidden" onChange={e => handleFileUpload(e, doc.key)} />
                        + Upload
                      </label>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-slate-400 text-center mt-4">
              Drag & drop files onto each slot, or click{' '}
              <span className="font-semibold text-slate-500">+ Upload</span> to browse
            </p>
          </div>
        )}

        {/* ─── Navigation ─────────────────────────────────────────── */}
        <div className="flex justify-between items-center pt-1">
          <button
            type="button"
            onClick={() => setCurrentStep(s => Math.max(1, s - 1))}
            className={[
              'px-5 py-2.5 rounded-full text-sm font-semibold border border-slate-200 bg-white text-slate-700',
              'hover:bg-slate-50 hover:border-slate-300 transition-all',
              currentStep === 1 ? 'invisible pointer-events-none' : '',
            ].join(' ')}
          >
            ← Back
          </button>

          {currentStep < 3 ? (
            <button
              type="button"
              disabled={!canProceed()}
              onClick={() => setCurrentStep(s => s + 1)}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold bg-emerald-600 text-white
                hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed
                transition-all hover:shadow-lg hover:shadow-emerald-100 hover:-translate-y-0.5"
            >
              Continue <ChevronRight size={15} />
            </button>
          ) : (
            <button
              type="button"
              disabled={loading || !canProceed()}
              onClick={handleSubmit}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold bg-emerald-600 text-white
                hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed
                transition-all hover:shadow-lg hover:shadow-emerald-100 hover:-translate-y-0.5"
            >
              <Upload size={15} />
              {loading ? 'Submitting…' : 'Submit Application'}
            </button>
          )}
        </div>

        {/* ─── Summary bar (steps 2 & 3) ──────────────────────────── */}
        {currentStep > 1 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
              Application Summary
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
              {[
                ['Parcel / Kitta', formData.kitta        || '—'],
                ['District',       formData.district     || '—'],
                ['Area',           formData.area         || '—'],
                ['Municipality',   formData.municipality || '—'],
                ['Ward',           formData.ward         || '—'],
                ['Map',            polygon && polygon.length >= 3 ? `${polygon.length} pts` : '—'],
              ].map(([label, val]) => (
                <div key={label}>
                  <span className="block text-[9px] uppercase font-bold tracking-wider text-slate-400 mb-0.5">{label}</span>
                  <span className="text-xs font-semibold font-mono text-slate-700">{val}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}