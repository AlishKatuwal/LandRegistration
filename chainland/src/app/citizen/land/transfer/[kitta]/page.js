'use client';

import { useAuth } from '@/context/AuthContext';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FileText, Send, User, MapPin,Shield, Landmark, AlertCircle, AlertTriangle, CheckCircle, Upload, X } from 'lucide-react';

export default function TransferLandPage() {
  const { user, t } = useAuth();
  const { kitta } = useParams();
  const router = useRouter();
  const [parcel, setParcel] = useState(null);
  const [buyerLin, setBuyerLin] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState([]);
  const [success, setSuccess] = useState(false);
  const [transactionAmount, setTransactionAmount] = useState('');
  const [buyerInfo, setBuyerInfo] = useState(null);
  const [searchingBuyer, setSearchingBuyer] = useState(false);
  const [toast, setToast] = useState(null);

  const requiredSellerDocs = [
    'Original Lalpurja',
    'Seller Citizenship Certificate',
    'Recent Passport Size Photo',
    'Current Land Tax Receipt',
    'Cadastral Map (Naksha)'
  ];

  useEffect(() => {
    fetch(`http://localhost:5001/api/parcels/${kitta}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setParcel(data.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [kitta]);
  
  useEffect(() => {
    if (buyerLin.length >= 11) {
      setSearchingBuyer(true);
      fetch(`http://localhost:5001/api/auth/lookup/${buyerLin}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setBuyerInfo(data.data);
          } else {
            setBuyerInfo(null);
          }
          setSearchingBuyer(false);
        })
        .catch(() => {
          setSearchingBuyer(false);
          setBuyerInfo(null);
        });
    } else {
      setBuyerInfo(null);
    }
  }, [buyerLin]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleFileUpload = (e, docType) => {
    if (e.target.files[0]) {
      // Remove existing file of same type if any
      const filtered = files.filter(f => f.type !== docType);
      setFiles([...filtered, { type: docType, file: e.target.files[0] }]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length < requiredSellerDocs.length) {
      showToast('Please upload all required seller documents.', 'error');
      return;
    }
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('type', 'TRANSFER');
      formData.append('typeNp', 'जग्गा नामसारी');
      formData.append('applicantLin', user.lin); // Seller is the applicant initially
      formData.append('buyerLin', buyerLin);
      formData.append('kitta', kitta);
      formData.append('district', parcel.district);
      formData.append('municipality', parcel.municipality);
      formData.append('ward', parcel.ward);
      formData.append('area', parcel.area);
      formData.append('area_unit', parcel.area_unit || 'hill');
      formData.append('declaredValue', transactionAmount);
      formData.append('transaction_amount', transactionAmount);
      formData.append('transactionAmount', transactionAmount);
      formData.append('polygon', typeof parcel.coordinates === 'string' ? parcel.coordinates : JSON.stringify(parcel.coordinates));
      formData.append('status', 'buyer_action_pending');
      
      files.forEach(f => {
        formData.append(f.type, f.file);
      });

      const res = await fetch('http://localhost:5001/api/applications', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        setSuccess(true);
      } else {
        const err = await res.json();
        showToast('Transfer failed: ' + err.error, 'error');
      }
    } catch (error) {
      showToast('System error', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="p-12 text-center animate-fade-up">
      <div className="animate-spin w-10 h-10 border-4 border-crimson-600 border-t-transparent rounded-full mx-auto mb-4" />
      <p className="text-sm font-medium text-slate-500 font-sans">{t('Verifying parcel eligibility...', 'कित्ता योग्यता जाँच गर्दै...')}</p>
    </div>
  );

  if (!parcel) return (
    <div className="p-12 text-center animate-fade-up">
      <AlertCircle size={40} className="mx-auto text-red-500 mb-4" />
      <p className="text-lg font-bold text-slate-800">{t('Parcel not found or access denied.', 'कित्ता भेटिएन वा पहुँच अस्वीकार गरियो।')}</p>
      <button onClick={() => router.back()} className="mt-4 text-crimson-600 font-bold">← {t('Go Back', 'फिर्ता जानुहोस्')}</button>
    </div>
  );

  // Rokka (Legal Restriction) check
  if (parcel.status === 'frozen' || parcel.status === 'rokka' || parcel.is_frozen) {
    return (
      <div className="max-w-2xl mx-auto mt-12 p-12 bg-white rounded-[40px] shadow-2xl text-center border border-rose-100 animate-fade-up">
        <div className="w-24 h-24 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
          <Shield size={48} />
        </div>
        <h2 className="text-3xl font-serif font-extrabold text-slate-900 mb-4 uppercase tracking-tight">{t('Parcel Under Rokka', 'कित्ता रोक्का छ')}</h2>
        <div className="p-6 bg-rose-50/50 rounded-2xl border border-rose-100 mb-8">
           <p className="text-rose-900 font-medium leading-relaxed">
             {t('Legal restrictions have been placed on this property. You cannot initiate a new transfer until the existing restriction is lifted by the Land Revenue Office.', 'यस कित्तामा कानुनी रोक्का लगाइएको छ। मालपोत कार्यालयबाट रोक्का नहटेसम्म नयाँ हस्तान्तरण प्रक्रिया सुरु गर्न सकिँदैन।')}
           </p>
        </div>
        <div className="flex flex-col gap-4">
           <button 
             onClick={() => router.push('/citizen/land')} 
             className="px-10 py-4 bg-slate-900 text-white rounded-full font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20"
           >
             {t('Return to Dashboard', 'ड्यासबोर्डमा फर्कनुहोस्')}
           </button>
           <p className="text-xs text-slate-400">Reference Kitta: <span className="font-mono font-bold">{kitta}</span></p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-2xl mx-auto mt-12 p-10 bg-white rounded-[32px] shadow-2xl text-center border border-emerald-100 animate-fade-up">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} />
        </div>
        <h2 className="text-3xl font-serif font-extrabold text-slate-900 mb-3">{t('Transfer Initiated!', 'हस्तान्तरण सुरु भयो!')}</h2>
        <p className="text-slate-500 mb-8 leading-relaxed">
          {t(`Your part of the transfer process for Kitta`, `कित्ता`)} <b className="font-mono text-slate-900">{kitta}</b> {t(`is complete. The buyer`, `को लागि तपाईंको प्रक्रिया पूरा भयो। खरीदकर्ता`)} (<b className="font-mono text-slate-900">{buyerLin}</b>) {t(`must now log in to upload their documents and confirm the transaction.`, `ले अब कागजातहरू अपलोड गर्न र लेनदेन पुष्टि गर्न लगइन गर्नुपर्छ।`)}
        </p>
        <button 
          onClick={() => router.push('/citizen/land')} 
          className="px-10 py-4 bg-slate-900 text-white rounded-full font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20"
        >
          {t('Return to My Land', 'मेरो जग्गामा फर्कनुहोस्')}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-6 lg:px-12 pb-20 animate-fade-up font-sans">
      <div className="flex items-center gap-6 mb-12 pt-8">
        <button onClick={() => router.back()} className="w-14 h-14 flex items-center justify-center bg-white hover:bg-slate-50 rounded-2xl border border-slate-200 transition-all shadow-sm text-slate-400 hover:text-slate-900 group">
          <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
        </button>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA] px-3 py-1 rounded-lg text-[10px] font-black tracking-[0.2em] uppercase">दा-खा प्रक्रिया</span>
            <div className="h-px w-8 bg-slate-200" />
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Ownership Transfer Flow</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-serif font-extrabold text-slate-900 tracking-tight leading-tight">{t('Initiate Land Transfer', 'जग्गा हस्तान्तरण सुरु गर्नुहोस्')}</h1>
          <p className="text-slate-500 text-base mt-2 flex items-center gap-3">
            <MapPin size={18} className="text-crimson-600" />
            <span className="font-medium text-slate-400">{t('Kitta No', 'कित्ता नं')}:</span>
            <strong className="font-mono text-slate-900 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{kitta}</strong> 
            <span className="text-slate-300 mx-1">/</span>
            <span className="font-semibold text-slate-700">{parcel.district}, {parcel.municipality}</span>
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left Column: Form Sections */}
        <div className="lg:col-span-8 space-y-10">
        {/* Step 1: Buyer Info */}
        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-black/5 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-2 h-full bg-crimson-600 opacity-0 group-hover:opacity-100 transition-all" />
          <h3 className="text-xl font-serif font-extrabold text-slate-900 mb-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-crimson-50 rounded-xl flex items-center justify-center">
              <User size={20} className="text-crimson-600" />
            </div>
            {t('Buyer Information', 'खरीदकर्ताको विवरण')}
          </h3>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-bold tracking-[0.08em] uppercase text-[#7C7368]">{t('Buyer LIN Number', 'खरीदकर्ताको LIN नम्बर')}</label>
              <div className="relative">
                <input 
                  required
                  type="text" 
                  value={buyerLin}
                  onChange={(e) => setBuyerLin(e.target.value.toUpperCase())}
                  placeholder="e.g. LIN-2081XXXX"
                  className="w-full border-[1.5px] border-[#E2DDD5] rounded-[18px] px-14 py-4 text-base bg-[#FDFCFA] transition-all outline-none font-mono text-slate-800 focus:border-crimson-600 focus:ring-[4px] focus:ring-crimson-600/10 placeholder:text-[#A8A39A] placeholder:italic"
                />
                <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={22} />
                {searchingBuyer && (
                  <div className="absolute right-5 top-1/2 -translate-y-1/2">
                    <div className="w-5 h-5 border-2 border-crimson-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {buyerInfo && !searchingBuyer && (
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 text-emerald-600 animate-in zoom-in duration-300">
                    <CheckCircle size={22} />
                  </div>
                )}
              </div>

              {buyerInfo && (
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 mt-4 animate-in slide-in-from-top-4 duration-500">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('Verified Buyer Found', 'प्रमाणित खरीदकर्ता भेटियो')}</p>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md text-[10px] font-bold">IDENTITY VERIFIED</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">{t('Full Name', 'पूरा नाम')}</p>
                      <p className="text-sm font-bold text-slate-900">{buyerInfo.name}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">{t('Citizenship No.', 'नागरिकता नं.')}</p>
                      <p className="text-sm font-mono font-bold text-slate-700">{buyerInfo.citizenship_no}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">{t('Contact Phone', 'सम्पर्क फोन')}</p>
                      <p className="text-sm font-bold text-slate-900">{buyerInfo.phone}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">{t('ChainLand ID', 'ChainLand ID')}</p>
                      <p className="text-sm font-mono font-bold text-slate-900">{buyerInfo.id}</p>
                    </div>
                  </div>
                </div>
              )}
              <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 flex items-start gap-3 mt-4">
                <AlertCircle size={16} className="text-amber-600 mt-0.5 shrink-0" />
                <p className="text-[11px] text-amber-900 leading-relaxed font-medium">
                  {t('Verification Alert:', 'प्रमाणीकरण सतर्कता:')} {t('Double-check the Buyer LIN. An incorrect LIN will send this legal request to the wrong citizen. Ownership rights are transferred based on this identity.', 'खरीदकर्ता LIN पुन: जाँच गर्नुहोस्। गलत LIN ले यो कानुनी अनुरोध गलत नागरिकलाई पठाउनेछ।')}
                </p>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100">
               <label className="block text-[10px] font-bold tracking-[0.08em] uppercase text-[#7C7368]">
                 {t('Agreed Sale Price (Declared Amount)', 'सहमति भएको बिक्री मूल्य (घोषित रकम)')}
               </label>
               <div className="relative">
                 <input 
                   required
                   type="number" 
                   value={transactionAmount}
                   onChange={(e) => setTransactionAmount(e.target.value)}
                   placeholder="e.g. 5000000"
                   className="w-full border-[1.5px] border-[#E2DDD5] rounded-[18px] px-14 py-4 text-base bg-[#FDFCFA] transition-all outline-none font-mono text-slate-800 focus:border-crimson-600 focus:ring-[4px] focus:ring-crimson-600/10 placeholder:text-[#A8A39A]"
                 />
                 <Landmark className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={22} />
                 <div className="absolute right-5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">NPR</div>
               </div>
               <p className="text-[10px] text-slate-400 italic">
                 Note: Taxes will be calculated based on this declared amount or the government minimum valuation (whichever is higher).
               </p>
            </div>
          </div>
        </div>

        {/* Step 2: Seller Documents */}
        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-black/5 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-2 h-full bg-emerald-600 opacity-0 group-hover:opacity-100 transition-all" />
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-serif font-extrabold text-slate-900 flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <FileText size={20} className="text-emerald-600" />
              </div>
              {t('Seller Evidence Documents', 'विक्रेताको प्रमाण कागजातहरू')}
            </h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{files.length} / {requiredSellerDocs.length} {t('Uploaded', 'अपलोड भयो')}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {requiredSellerDocs.map((doc, i) => {
              const uploaded = files.find(f => f.type === doc);
              return (
                <div key={i} className={`p-4 border-[1.5px] rounded-[20px] transition-all flex items-center justify-between ${uploaded ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100 hover:border-slate-300'}`}>
                  <div className="flex items-center gap-4 overflow-hidden">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${uploaded ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-300'}`}>
                      <FileText size={18} />
                      <div className="flex-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Agreed Sale Price (Rs.)</label>
                <div className="relative">
                  <input 
                    type="number" 
                    placeholder="e.g. 5000000" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-mono focus:ring-2 focus:ring-crimson-500 outline-none transition-all"
                    value={transactionAmount}
                    onChange={(e) => setTransactionAmount(e.target.value)}
                    required
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">NPR</div>
                </div>
                <p className="text-[9px] text-slate-400 mt-1 italic">Taxes will be calculated based on this amount or government valuation (whichever is higher).</p>
              </div>
            </div>
                    <div className="truncate">
                      <p className="text-[12px] font-bold text-slate-800 truncate">{t(doc, doc)}</p>
                      {uploaded ? (
                        <p className="text-[10px] text-emerald-600 font-bold truncate">✓ {uploaded.file.name}</p>
                      ) : (
                        <p className="text-[10px] text-slate-400 font-medium">{t('Legal Proof Required', 'कानुनी प्रमाण आवश्यक')}</p>
                      )}
                    </div>
                  </div>
                  <label className={`w-10 h-10 flex items-center justify-center rounded-xl cursor-pointer transition-all shadow-sm ${uploaded ? 'bg-white text-emerald-600 border border-emerald-100' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
                    {uploaded ? <CheckCircle size={18} /> : <Upload size={18} />}
                    <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, doc)} />
                  </label>
                </div>
              );
            })}
          </div>
        </div>
        </div>

        {/* Right Column: Guidance Sidebar */}
        <div className="lg:col-span-4 space-y-8 sticky top-8">
          <div className="bg-slate-900 rounded-[40px] p-8 text-white shadow-2xl relative overflow-hidden group/sidebar">
             <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover/sidebar:scale-110 transition-transform duration-700" />
             <h3 className="text-xs font-black text-amber-400 uppercase tracking-[0.2em] mb-8">Transfer Guide</h3>
             
             <div className="space-y-6">
                {[
                  { title: 'Identity Search', desc: 'Find the buyer using their unique LIN (Land Identity Number).' },
                  { title: 'Price Declaration', desc: 'Declare the agreed sale price. Taxes are calculated on the higher of min valuation vs declared price.' },
                  { title: 'Document Upload', desc: 'Seller must upload Proof of Ownership (Lalpurja) and Tax Clearance.' }
                ].map((step, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-black border border-white/20 flex-shrink-0">{idx + 1}</div>
                    <div>
                      <p className="text-sm font-bold text-slate-100">{step.title}</p>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                ))}
             </div>

             <div className="mt-10 p-6 bg-white/5 rounded-3xl border border-white/10">
                <div className="flex items-center gap-3 mb-4">
                   <Shield size={20} className="text-emerald-400" />
                   <p className="text-xs font-black uppercase tracking-widest text-emerald-400">Legal Protection</p>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed italic">
                  This transaction is protected by cryptographically signed deeds. Once initiated, the kitta is marked as 'Pending Transfer' on the blockchain.
                </p>
             </div>
          </div>

          <div className="bg-white rounded-[40px] p-8 shadow-xl border border-slate-100">
             <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Execution</h3>
             <button 
               type="submit" 
               disabled={submitting}
               className="w-full py-5 bg-crimson-600 hover:bg-crimson-700 text-white rounded-[24px] font-bold text-base uppercase tracking-widest shadow-2xl shadow-crimson-600/20 transition-all flex items-center justify-center gap-3 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none"
             >
               {submitting ? (
                 <><div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" /> Processing...</>
               ) : (
                 <>
                   <Send size={18} /> {t('Initiate Transfer', 'हस्तान्तरण सुरु गर्नुहोस्')}
                 </>
               )}
             </button>
             <p className="text-[10px] text-center text-slate-400 font-bold mt-4 uppercase tracking-tighter leading-tight">
               Final step: Cryptographic deed generation
             </p>
          </div>
        </div>
      </form>

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
