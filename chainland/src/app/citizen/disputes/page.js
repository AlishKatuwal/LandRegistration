'use client';
import { useAuth } from '@/context/AuthContext';
import { Scale, Shield, Clock, AlertTriangle, X, MapPin, Search, CheckCircle, Lock, FileText } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';

const phaseSteps = ['filing', 'evidence', 'review', 'consent'];
const phaseLabel = { filing: ['Filing', 'दर्ता'], evidence: ['Evidence', 'प्रमाण'], review: ['Review', 'समीक्षा'], consent: ['Consent', 'सहमति'] };

export default function DisputesPage() {
  const { user, t } = useAuth();
  const [myDisputes, setMyDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Form state
  const [parcelId, setParcelId] = useState('');
  const [reason, setReason] = useState('');
  const [parcelInfo, setParcelInfo] = useState(null);
  const [parcelSearch, setParcelSearch] = useState(false);
  const [files, setFiles] = useState([]);

  const requiredDocs = ['Ownership Claim Proof', 'Legal Notice', 'Other Evidence'];

  const searchParams = useSearchParams();

  const fetchDisputes = () => {
    if (!user?.lin) return;
    fetch(`http://localhost:5001/api/disputes?userLin=${user.lin}`)
      .then(res => res.json())
      .then(data => { if (data.success) setMyDisputes(data.data); setLoading(false); })
      .catch(e => { console.error(e); setLoading(false); });
  };

  const lookupParcel = useCallback(async (idToLookup) => {
    const id = typeof idToLookup === 'string' ? idToLookup : parcelId;
    if (!id || typeof id !== 'string' || !id.trim()) return;
    setParcelSearch(true);
    setParcelInfo(null);
    setFormError('');
    try {
      const res = await fetch(`http://localhost:5001/api/parcels/${id.trim()}`);
      const data = await res.json();
      if (data.success) {
        if (data.data.owner_lin === user.lin) {
          setFormError(t('You cannot file a dispute against your own parcel.', 'तपाईं आफ्नो कित्तामा विवाद दायर गर्न सक्नुहुन्न।'));
        } else {
          setParcelInfo(data.data);
        }
      } else {
        setFormError(t('Parcel not found. Please check the Kitta number.', 'कित्ता भेटिएन। कृपया कित्ता नम्बर जाँच गर्नुहोस्।'));
      }
    } catch (err) {
      setFormError('Network error');
    } finally {
      setParcelSearch(false);
    }
  }, [parcelId, user.lin, t]);

  useEffect(() => { 
    fetchDisputes(); 
    
    // Handle query param
    const kitta = searchParams.get('kitta');
    if (kitta) {
      setParcelId(kitta);
      setShowForm(true);
      lookupParcel(kitta);
    }
  }, [user?.lin, searchParams, lookupParcel]);

  const handleFileUpload = (e, docType) => {
    if (e.target.files[0]) {
      setFiles([...files, { type: docType, file: e.target.files[0] }]);
    }
  };

  const removeFile = (docType) => {
    setFiles(files.filter(f => f.type !== docType));
  };

  const handleSubmit = async () => {
    if (!parcelInfo || !reason.trim()) return;
    setSubmitting(true);
    setFormError('');
    try {
      const formData = new FormData();
      formData.append('parcel_id', parcelInfo.id);
      formData.append('claimant_lin', user.lin);
      formData.append('owner_lin', parcelInfo.owner_lin);
      formData.append('reason', reason.trim());
      
      files.forEach(f => {
        formData.append(f.type, f.file);
      });

      const res = await fetch('http://localhost:5001/api/disputes', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setShowForm(false);
        setParcelId('');
        setReason('');
        setParcelInfo(null);
        setFiles([]);
        fetchDisputes();
      } else {
        setFormError(data.error || 'Failed to file dispute');
      }
    } catch (err) {
      setFormError('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="p-12 text-center animate-fade-up">
      <div className="animate-spin w-10 h-10 border-4 border-crimson-600 border-t-transparent rounded-full mx-auto mb-4" />
      <p className="text-sm font-medium text-slate-500 font-sans">{t('Loading secure dispute records...', 'सुरक्षित विवाद रेकर्डहरू लोड हुँदैछ...')}</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-up font-sans">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA] px-2 py-0.5 rounded-full text-[10px] font-semibold">विवाद समाधान</span>
            <span className="text-xs text-slate-400 font-medium">Dispute Resolution Center</span>
          </div>
          <h1 className="font-serif text-[26px] font-extrabold text-slate-900 tracking-tight">{t('My Disputes', 'मेरो विवाद')}</h1>
          <p className="text-slate-500 text-sm mt-1">{t('Track and manage land disputes in the secure ledger', 'सुरक्षित लेजरमा भूमि विवादहरू ट्र्याक र व्यवस्थापन गर्नुहोस्')}</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-[#2D6A4F] text-white px-6 py-3 rounded-full text-[13px] font-bold transition-all flex items-center gap-2 tracking-[0.02em] hover:bg-[#1B4332] hover:-translate-y-px hover:shadow-[0_8px_24px_rgba(45,106,79,0.3)] shadow-lg"
        >
          <Scale size={15} /> {t('File New Dispute', 'नयाँ विवाद दर्ता')}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: t('Total', 'कुल'), val: myDisputes.length, color: 'text-slate-800', bg: 'bg-white' },
          { label: t('Active', 'सक्रिय'), val: myDisputes.filter(d => !['resolved', 'referred'].includes(d.phase)).length, color: 'text-amber-600', bg: 'bg-white' },
          { label: t('Resolved', 'समाधान'), val: myDisputes.filter(d => d.phase === 'resolved').length, color: 'text-emerald-600', bg: 'bg-white' },
          { label: t('Court Ref.', 'अदालत'), val: myDisputes.filter(d => d.phase === 'referred').length, color: 'text-crimson-600', bg: 'bg-white' }
        ].map((stat, i) => (
          <div key={i} className={`${stat.bg} rounded-[20px] border border-black/5 p-5 shadow-sm`}>
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">{stat.label}</p>
            <p className={`text-3xl font-serif font-extrabold ${stat.color}`}>{stat.val}</p>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-fade-up" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-[32px] shadow-2xl max-w-lg w-full overflow-hidden border border-white/20" onClick={e => e.stopPropagation()}>
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-crimson-50 rounded-xl flex items-center justify-center">
                  <Scale size={20} className="text-crimson-600" />
                </div>
                <div>
                  <h3 className="font-serif font-extrabold text-slate-900 text-lg leading-tight">{t('File New Dispute', 'नयाँ विवाद दर्ता')}</h3>
                  <p className="text-xs text-slate-400 font-sans">Submit a legal claim against a parcel</p>
                </div>
              </div>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 transition-colors"><X size={18} /></button>
            </div>
            
            <div className="p-8 space-y-5">
              <div className="space-y-2">
                <label className="block text-[10px] font-bold tracking-[0.08em] uppercase text-[#7C7368]">{t('Parcel (Kitta) Number', 'कित्ता नम्बर')}</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      value={parcelId}
                      onChange={e => { setParcelId(e.target.value.toUpperCase()); setParcelInfo(null); setFormError(''); }}
                      placeholder="e.g. KTM-NPL-03-1042"
                      className="w-full border-[1.5px] border-[#E2DDD5] rounded-[14px] px-4 py-[13px] text-[13px] bg-[#FDFCFA] transition-all outline-none font-mono text-slate-800 focus:border-crimson-600 focus:ring-[3px] focus:ring-crimson-600/10 placeholder:text-[#A8A39A] placeholder:italic"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                      <Search size={16} className="text-slate-300" />
                    </div>
                  </div>
                  <button
                    onClick={() => lookupParcel()}
                    disabled={!parcelId.trim() || parcelSearch}
                    className="px-6 bg-slate-900 text-white rounded-[14px] text-xs font-bold hover:bg-slate-800 disabled:opacity-50 transition-all"
                  >
                    {parcelSearch ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : t('Lookup', 'खोज')}
                  </button>
                </div>
              </div>

              {parcelInfo && (
                <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100 animate-fade-up">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center">
                      <MapPin size={12} className="text-white" />
                    </div>
                    <p className="font-serif font-extrabold text-emerald-900">{parcelInfo.id}</p>
                    {parcelInfo.status === 'rokka' && (
                      <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><Lock size={8} /> ROKKA</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {[
                      { l: t('District', 'जिल्ला'), v: parcelInfo.district },
                      { l: t('Municipality', 'नगरपालिका'), v: parcelInfo.municipality },
                      { l: t('Ward', 'वडा'), v: parcelInfo.ward },
                      { l: t('Owner LIN', 'मालिक'), v: parcelInfo.owner_lin, mono: true }
                    ].map((item, i) => (
                      <div key={i}>
                        <p className="text-[9px] text-emerald-600/60 uppercase font-bold tracking-wider mb-0.5">{item.l}</p>
                        <p className={`font-semibold text-emerald-900 ${item.mono ? 'font-mono' : ''}`}>{item.v}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-[10px] font-bold tracking-[0.08em] uppercase text-[#7C7368]">{t('Reason for Dispute', 'विवादको कारण')}</label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder={t('Describe your claim on this parcel in detail...', 'यस कित्तामा तपाईंको दाबी विस्तृत रूपमा वर्णन गर्नुहोस्...')}
                  rows={3}
                  className="w-full border-[1.5px] border-[#E2DDD5] rounded-[14px] px-4 py-[13px] text-[13px] bg-[#FDFCFA] transition-all outline-none text-slate-800 focus:border-crimson-600 focus:ring-[3px] focus:ring-crimson-600/10 placeholder:text-[#A8A39A] placeholder:italic resize-none"
                />
              </div>

              <div className="space-y-3">
                <label className="block text-[10px] font-bold tracking-[0.08em] uppercase text-[#7C7368]">{t('Evidence Documents', 'प्रमाण कागजातहरू')}</label>
                <div className="grid grid-cols-1 gap-2">
                  {requiredDocs.map(doc => {
                    const uploaded = files.find(f => f.type === doc);
                    return (
                      <div key={doc} className={`flex items-center justify-between p-3 border-[1.5px] rounded-[14px] transition-all ${uploaded ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100'}`}>
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${uploaded ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                            <FileText size={14} />
                          </div>
                          <div className="truncate">
                            <p className="text-[11px] font-bold text-slate-700 truncate">{doc}</p>
                            {uploaded && <p className="text-[10px] text-emerald-600 font-medium truncate">✓ {uploaded.file.name}</p>}
                          </div>
                        </div>
                        {uploaded ? (
                          <button type="button" onClick={() => removeFile(doc)} className="w-6 h-6 flex items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-100"><X size={12} /></button>
                        ) : (
                          <label className="cursor-pointer px-4 py-1.5 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-600 hover:border-crimson-600 hover:text-crimson-600 transition-all">
                            <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, doc)} />
                            + {t('Upload', 'अपलोड')}
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {formError && (
                <div className="bg-red-50 text-red-700 text-xs p-4 rounded-2xl border border-red-100 flex items-center gap-2 animate-fade-up">
                  <AlertTriangle size={14} /> {formError}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={!parcelInfo || !reason.trim() || submitting}
                className="w-full py-4 bg-crimson-600 text-white rounded-[18px] text-sm font-bold hover:bg-crimson-700 transition-all disabled:bg-slate-200 disabled:text-slate-400 shadow-xl shadow-crimson-600/10 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> {t('Filing Legal Claim...', 'दर्ता गर्दै...')}</>
                ) : (
                  <><Scale size={16} /> {t('File Dispute & Lock Land', 'विवाद दर्ता र जग्गा रोक्का')}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {myDisputes.length === 0 ? (
        <div className="bg-white rounded-[32px] border border-black/5 p-20 text-center animate-fade-up shadow-sm">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Scale size={40} className="text-slate-200" />
          </div>
          <h3 className="font-serif font-extrabold text-slate-900 text-xl mb-2">{t('No active disputes', 'कुनै सक्रिय विवाद छैन')}</h3>
          <p className="text-slate-500 text-sm max-w-sm mx-auto">{t('Your secure ledger shows no pending claims. If you have a rightful claim on a parcel, you can file a new dispute.', 'तपाईंको सुरक्षित लेजरले कुनै बाँकी दाबीहरू देखाउँदैन। यदि तपाईंको कुनै कित्तामा अधिकार छ भने नयाँ विवाद दर्ता गर्न सक्नुहुन्छ।')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 animate-fade-up">
          {myDisputes.map(d => {
            const isClaimant = d.claimant_lin === user.lin;
            const currentIdx = phaseSteps.indexOf(d.phase);
            const isTerminal = d.phase === 'resolved' || d.phase === 'referred';

            return (
              <div key={d.id} className="bg-white rounded-[24px] border border-black/5 overflow-hidden shadow-sm hover:shadow-md transition-all group">
                <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${d.phase === 'resolved' ? 'bg-emerald-50 text-emerald-600' : d.phase === 'referred' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                      <Scale size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-extrabold text-slate-900 text-lg">{d.id}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest ${
                          d.phase === 'resolved' ? 'bg-emerald-100 text-emerald-700' :
                          d.phase === 'referred' ? 'bg-red-100 text-red-700' :
                          'bg-purple-100 text-purple-700'
                        }`}>{(d.phase || '').toUpperCase()}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isClaimant ? 'bg-blue-600 text-white' : 'bg-amber-500 text-white'}`}>
                          {isClaimant ? t('CLAIMANT', 'दाबीकर्ता') : t('OWNER', 'मालिक')}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1"><MapPin size={12} /> <strong className="font-mono text-slate-700">{d.parcel_id}</strong></span>
                        <span className="w-1 h-1 bg-slate-200 rounded-full" />
                        <span>{isClaimant ? `${t('vs', 'vs')} ${d.owner_name || d.owner_lin}` : `${t('by', 'द्वारा')} ${d.claimant_name || d.claimant_lin}`}</span>
                        <span className="w-1 h-1 bg-slate-200 rounded-full" />
                        <span className="flex items-center gap-1"><Clock size={12} /> {d.filed_date ? new Date(d.filed_date).toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-0.5">{t('Response Deadline', 'म्याद')}</p>
                    <p className="text-sm font-serif font-extrabold text-red-600">{d.deadline ? new Date(d.deadline).toLocaleDateString() : 'N/A'}</p>
                  </div>
                </div>

                <div className="p-6">
                  {!isTerminal ? (
                    <div className="mb-6">
                      <div className="flex items-center justify-between relative mb-2">
                        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-slate-100" />
                        <div 
                          className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-crimson-600 transition-all duration-700" 
                          style={{ width: `${(currentIdx / (phaseSteps.length - 1)) * 100}%` }} 
                        />
                        {phaseSteps.map((step, i) => (
                          <div key={step} className="relative z-10 flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${i <= currentIdx ? 'bg-crimson-600 text-white' : 'bg-white border-2 border-slate-100 text-slate-300'}`}>
                              {i <= currentIdx ? <CheckCircle size={14} /> : i + 1}
                            </div>
                            <span className={`absolute top-10 whitespace-nowrap text-[10px] font-bold tracking-widest transition-colors ${i <= currentIdx ? 'text-crimson-600' : 'text-slate-300'}`}>
                              {t(...phaseLabel[step]).toUpperCase()}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="h-10" />
                    </div>
                  ) : (
                    <div className={`rounded-2xl p-4 mb-4 flex items-start gap-3 ${d.phase === 'resolved' ? 'bg-emerald-50 border border-emerald-100' : 'bg-red-50 border border-red-100'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${d.phase === 'resolved' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
                        {d.phase === 'resolved' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                      </div>
                      <div>
                        <p className={`text-sm font-bold ${d.phase === 'resolved' ? 'text-emerald-900' : 'text-red-900'}`}>
                          {d.phase === 'resolved' 
                            ? t('Dispute Resolved — Registry Updated', 'विवाद समाधान भयो - दर्ता अपडेट गरियो')
                            : t('Referred to District Court', 'जिल्ला अदालतमा पठाइयो')}
                        </p>
                        <p className={`text-xs mt-0.5 ${d.phase === 'resolved' ? 'text-emerald-700/70' : 'text-red-700/70'}`}>
                          {d.phase === 'resolved' 
                            ? t('The land lock has been removed. Ownership status is now ACTIVE.', 'जग्गा रोक्का हटाइएको छ। स्वामित्व स्थिति अब सक्रिय छ।')
                            : t('Final mediation failed. Land remains in ROKKA status until court order.', 'मध्यस्थता असफल भयो। अदालती आदेश नआएसम्म जग्गा रोक्कामा रहनेछ।')}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    {d.reason && (
                      <div className="bg-[#FDFCFA] rounded-2xl p-4 border border-[#E2DDD5] text-sm">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#7C7368] mb-1.5">{t('Basis for Dispute:', 'विवादको आधार:')}</p>
                        <p className="text-slate-700 leading-relaxed font-serif italic text-base">"{d.reason}"</p>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-end flex-wrap gap-4 pt-2">
                      <button className="text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1.5">
                        <FileText size={14} /> {t('View All Evidence & Timeline', 'प्रमाण र समयरेखा हेर्नुहोस्')} →
                      </button>
                    </div>
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
