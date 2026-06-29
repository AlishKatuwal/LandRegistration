'use client';
import { useAuth } from '@/context/AuthContext';
import { Search, MapPin, CheckCircle, FileText, AlertTriangle, ChevronRight, X, Shield, Download, Landmark, User, Clock, Loader2, Filter } from 'lucide-react';
import { useState, useEffect } from 'react';
import MapEditor from '@/components/MapEditor';
import socket from '@/lib/socket';

// Reusable Status Badge Component
const StatusBadge = ({ status }) => {
  const styles = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
  };
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${styles[status] || 'bg-slate-50 text-slate-700 border-slate-200'}`}>
      {status === 'pending' && <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />}
      {status === 'approved' && <CheckCircle size={10} />}
      {status}
    </span>
  );
};

export default function RegistrationPage() {
  const { t } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewDoc, setViewDoc] = useState(null);
  const [showSuccess, setShowSuccess] = useState(null);
  const [isApproving, setIsApproving] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ show: false, type: null }); // 'approve' | 'reject'
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', message: string }

  const fetchApps = () => {
    fetch('http://localhost:5001/api/applications?type=NEW_REGISTRATION')
      .then(res => res.json())
      .then(data => { if (data.success) setApps(data.data); setLoading(false); })
      .catch(e => { console.error(e); setLoading(false); });
  };

  useEffect(() => {
    fetchApps();
    
    const handleNewApp = (newApp) => {
      if (newApp.type === 'NEW_REGISTRATION') {
        setApps(prev => {
          if (prev.find(a => a.id === newApp.id)) return prev;
          return [{ ...newApp, isNew: true }, ...prev];
        });
        showToast('New registration application received!', 'info');
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

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const filtered = apps
    .filter(a => {
      const matchesSearch = a.id.toLowerCase().includes(search.toLowerCase()) || a.kitta.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      // Prioritize "new" (from socket) first
      if (a.isNew && !b.isNew) return -1;
      if (!a.isNew && b.isNew) return 1;
      // Then prioritize pending
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      // Then by date
      return new Date(b.submitted_date) - new Date(a.submitted_date);
    });

  const app = selected ? apps.find(a => a.id === selected) : null;

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      const res = await fetch(`http://localhost:5001/api/applications/${app.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' })
      });
      if (res.ok) {
        setShowSuccess(app.id);
        setSelected(null);
        fetchApps();
        showToast('Application approved and Purja generated successfully!');
      } else {
        throw new Error('Approval failed');
      }
    } catch (e) {
      showToast('Error approving application: ' + e.message, 'error');
    } finally {
      setIsApproving(false);
      setConfirmModal({ show: false, type: null });
    }
  };

  const handleReject = async () => {
    setIsApproving(true);
    try {
      const res = await fetch(`http://localhost:5001/api/applications/${app.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' })
      });
      if (res.ok) {
        setSelected(null);
        fetchApps();
        showToast('Application rejected successfully', 'error');
      } else {
        throw new Error('Rejection failed');
      }
    } catch (e) {
      showToast('Error rejecting application', 'error');
    } finally {
      setIsApproving(false);
      setConfirmModal({ show: false, type: null });
    }
  };

  if (loading) return (
    <div className="p-8 flex flex-col items-center justify-center h-64 gap-4 animate-pulse text-slate-500">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      <p className="font-medium">Loading new registrations...</p>
    </div>
  );

  // --- DOCUMENT VIEWER MODAL ---
  if (viewDoc) {
    const docs = typeof app?.documents === 'string' ? JSON.parse(app.documents) : (app?.documents || []);
    const isImage = viewDoc.name?.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i);
    const isPdf = viewDoc.name?.match(/\.(pdf)$/i);

    return (
      <div className="fixed inset-0 z-[10000] bg-slate-900/70 backdrop-blur-lg flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl"><FileText size={18} /></div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">{viewDoc.type || 'Land Document'}</h3>
                <p className="text-[10px] text-slate-500 font-mono">{viewDoc.name}</p>
              </div>
            </div>
            <button onClick={() => setViewDoc(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={18} className="text-slate-500" /></button>
          </div>
          <div className="flex-1 overflow-auto p-6 bg-slate-100 flex justify-center items-start">
            {isImage ? (
              <img src={viewDoc.url} alt={viewDoc.type} className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg border border-slate-200" />
            ) : isPdf ? (
              <iframe src={viewDoc.url} className="w-full h-full min-h-[70vh] rounded-lg border border-slate-200 shadow-sm" title={viewDoc.type}></iframe>
            ) : (
              <div className="bg-white w-full max-w-[595px] shadow-lg p-12 relative border border-slate-200 rounded-lg">
                {/* Placeholder Document UI (kept from your original code but tightened) */}
                <div className="absolute top-6 right-6 w-16 h-16 opacity-10"><Shield size={64} /></div>
                <div className="text-center mb-10 border-b-2 border-double border-slate-200 pb-6">
                  <h2 className="text-xl font-serif font-bold text-slate-800 uppercase tracking-widest">Government of Nepal</h2>
                  <p className="text-xs font-medium text-slate-500 mt-1">Ministry of Land Management</p>
                </div>
                <div className="space-y-6">
                  <div className="flex justify-between items-end">
                    <div><p className="text-[9px] uppercase text-slate-400 font-bold">Type</p><p className="text-sm font-bold text-blue-600">{viewDoc.type}</p></div>
                    <div className="text-right"><p className="text-[9px] uppercase text-slate-400 font-bold">Reg ID</p><p className="text-xs font-mono text-slate-800">{app?.id}</p></div>
                  </div>
                  <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-100 text-[11px]">
                    <div className="space-y-2">
                      <p className="font-bold text-slate-500 uppercase text-[9px] mb-2">Property</p>
                      <div className="flex justify-between"><span className="text-slate-500">Kitta:</span><span className="font-bold">{app?.kitta}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Area:</span><span className="font-bold">{app?.area}</span></div>
                    </div>
                    <div className="space-y-2">
                      <p className="font-bold text-slate-500 uppercase text-[9px] mb-2">Applicant</p>
                      <div className="flex justify-between"><span className="text-slate-500">LIN:</span><span className="font-bold">{app?.applicant_lin}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Status:</span><span className="font-bold text-orange-600">{app?.status}</span></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="p-4 border-t border-slate-100 bg-white flex justify-center gap-3">
            <button className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm">
              <Download size={15} /> Download
            </button>
            <button onClick={() => setViewDoc(null)} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-md">
              Close Preview
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- APPLICATION DETAIL VIEW ---
  if (app) {
    const docs = typeof app.documents === 'string' ? JSON.parse(app.documents) : (app.documents || []);
    const polygon = typeof app.polygon === 'string' ? JSON.parse(app.polygon) : app.polygon;
    const displayDistrict = app.district || 'N/A';
    const displayMuni = app.municipality || 'N/A';
    const displayWard = app.ward || '-';
    const displayArea = app.area || 'N/A';

    return (
      <div className="space-y-6 relative animate-in fade-in slide-in-from-bottom-4 duration-300">
        <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors group">
          <ChevronRight size={16} className="transform rotate-180 group-hover:-translate-x-1 transition-transform" /> 
          {t('Back to list', 'सूचीमा फिर्ता')}
        </button>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="p-6 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl font-bold text-slate-800">{t('Review Application', 'आवेदन समीक्षा')}</h1>
                <StatusBadge status={app.status} />
              </div>
              <p className="text-sm text-slate-500 font-mono">ID: {app.id}</p>
            </div>
            <div className="text-sm text-slate-500 flex items-center gap-2">
              <Clock size={14} /> Submitted: {app.submitted_date ? new Date(app.submitted_date).toLocaleDateString() : 'N/A'}
            </div>
          </div>

          <div className="p-6 space-y-8">
            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-5 hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 bg-blue-100 rounded-md text-blue-600"><User size={14} /></div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('Applicant Details', 'आवेदक विवरण')}</h4>
                </div>
                <p className="text-base font-semibold text-slate-800">{app.applicant_lin}</p>
                <p className="text-sm text-slate-500 mt-1">LIN: {app.applicant_lin}</p>
              </div>
              <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-5 hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 bg-emerald-100 rounded-md text-emerald-600"><Landmark size={14} /></div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('Land Details', 'जग्गा विवरण')}</h4>
                </div>
                <p className="text-base font-semibold text-slate-800">Kitta: {app.kitta || 'N/A'}</p>
                <p className="text-sm text-slate-500 mt-1">{displayDistrict} &gt; {displayMuni} &gt; Ward {displayWard} • {displayArea}</p>
              </div>
            </div>

            {/* Documents */}
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <FileText size={14} /> {t('Uploaded Documents', 'अपलोड गरिएका कागजातहरू')}
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {docs.length > 0 ? docs.map((doc, i) => (
                  <button key={i} onClick={() => setViewDoc(doc)} className="group flex flex-col items-center gap-3 p-5 bg-white hover:bg-blue-50 rounded-xl border border-slate-200 hover:border-blue-300 transition-all shadow-sm hover:shadow-md hover:-translate-y-1 text-center">
                    <div className="w-12 h-12 bg-blue-50 group-hover:bg-blue-600 group-hover:text-white rounded-xl flex items-center justify-center text-blue-600 transition-colors duration-200">
                      <FileText size={22} />
                    </div>
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">{doc.type || 'Document'}</span>
                    <span className="text-[9px] text-slate-400 truncate w-full px-2">{doc.name || 'file.pdf'}</span>
                  </button>
                )) : (
                  <div className="col-span-full p-8 border-2 border-dashed border-slate-200 rounded-xl text-center bg-slate-50/50">
                    <FileText className="mx-auto text-slate-300 mb-2" size={24} />
                    <p className="text-sm text-slate-500">No documents uploaded</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Map */}
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <MapPin size={14} /> Parcel Location
              </h4>
              <div className="w-full h-[400px] border-2 border-slate-200 rounded-xl overflow-hidden relative shadow-inner">
                <MapEditor key={app.id} readOnly={true} initialPolygon={polygon} />
              </div>
            </div>
          </div>

          {/* Sticky Actions Footer */}
          {app.status === 'pending' && (
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row gap-3 justify-end">
              <button 
                onClick={() => setConfirmModal({ show: true, type: 'reject' })}
                disabled={isApproving}
                className="px-6 py-3 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                <X size={16} /> {t('Reject', 'अस्वीकृत')}
              </button>
              <button 
                onClick={() => setConfirmModal({ show: true, type: 'approve' })} 
                disabled={isApproving} 
                className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl font-semibold text-sm transition-all shadow-lg flex items-center justify-center gap-2"
              >
                {isApproving ? (
                  <><Loader2 size={16} className="animate-spin" /> Processing...</>
                ) : (
                  <><CheckCircle size={16} /> {t('Approve & Generate Purja', 'स्वीकृत र पुर्जा उत्पन्न')}</>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Custom Confirmation Modal */}
        {confirmModal.show && (
          <div className="fixed inset-0 z-[11000] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-100 animate-in zoom-in duration-300">
              <div className={`h-2 ${confirmModal.type === 'approve' ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <div className="p-8 text-center">
                <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-6 ${confirmModal.type === 'approve' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                  {confirmModal.type === 'approve' ? <CheckCircle size={32} /> : <AlertTriangle size={32} />}
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">
                  {confirmModal.type === 'approve' ? 'Confirm Approval?' : 'Confirm Rejection?'}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {confirmModal.type === 'approve' 
                    ? 'You are about to issue a formal land ownership document (Purja) for this kitta.' 
                    : 'Are you sure you want to decline this registration? This action will be logged.'}
                </p>
                <div className="mt-8 flex flex-col gap-3">
                  <button 
                    onClick={confirmModal.type === 'approve' ? handleApprove : handleReject}
                    disabled={isApproving}
                    className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2 ${
                      confirmModal.type === 'approve' 
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-100' 
                        : 'bg-red-600 hover:bg-red-700 text-white shadow-red-100'
                    }`}
                  >
                    {isApproving ? <Loader2 size={16} className="animate-spin" /> : null}
                    {confirmModal.type === 'approve' ? 'Yes, Approve Now' : 'Yes, Reject Application'}
                  </button>
                  <button 
                    onClick={() => setConfirmModal({ show: false, type: null })}
                    disabled={isApproving}
                    className="w-full py-3.5 text-slate-400 font-bold text-sm hover:text-slate-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Floating Success Notification */}
        {showSuccess && (
          <div className="fixed bottom-6 right-6 z-[1000] animate-in slide-in-from-bottom-8 fade-in duration-400">
            <div className="bg-emerald-700 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-emerald-600">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <CheckCircle size={20} />
              </div>
              <div>
                <p className="font-bold text-sm">Approval Successful!</p>
                <p className="text-[11px] opacity-90 font-medium">Application {showSuccess} processed</p>
              </div>
              <button onClick={() => setShowSuccess(null)} className="ml-2 opacity-60 hover:opacity-100 transition-opacity"><X size={18} /></button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- LIST VIEW ---
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-800">{t('New Registrations', 'नयाँ दर्ताहरू')}</h1>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-md border border-emerald-100 h-fit mt-1">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-tighter">Real-time Connected</span>
            </div>
          </div>
          <p className="text-sm text-slate-500 mt-1">{t('Manage incoming land registration requests', 'आगामी जग्गा दर्ता अनुरोधहरू व्यवस्थापन गर्नुहोस्')}</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder={t('Search ID or Kitta...', 'ID वा Kitta खोज्नुहोस्...')} 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all bg-white shadow-sm" 
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-px">
        {['all', 'pending', 'approved'].map((filter) => (
          <button
            key={filter}
            onClick={() => setStatusFilter(filter)}
            className={`px-4 py-2 text-sm font-semibold transition-colors relative rounded-t-lg ${
              statusFilter === filter ? 'text-blue-700 bg-blue-50/50' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            {filter.charAt(0).toUpperCase() + filter.slice(1)}
            {statusFilter === filter && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* Application Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.length > 0 ? filtered.map((app, idx) => (
          <div 
            key={app.id} 
            onClick={() => setSelected(app.id)} 
            className="group bg-white rounded-3xl border border-slate-200 p-6 hover:shadow-xl hover:border-blue-300 transition-all cursor-pointer relative overflow-hidden flex flex-col"
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            {/* Status & ID */}
            <div className="flex justify-between items-start mb-6">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-slate-400">#{app.id}</span>
                  {app.isNew && (
                    <span className="px-2 py-0.5 bg-crimson-600 text-white text-[9px] font-black rounded-lg animate-bounce">NEW</span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-slate-900 mt-1">Kitta {app.kitta}</h3>
              </div>
              <StatusBadge status={app.status} />
            </div>

            {/* Content */}
            <div className="space-y-4 flex-1">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-slate-400 border border-slate-100">
                  <User size={14} />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Applicant</p>
                  <p className="text-xs font-bold text-slate-700 truncate">{app.applicant_lin}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-blue-50/50 rounded-2xl border border-blue-100">
                   <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">Location</p>
                   <p className="text-xs font-bold text-blue-900 truncate">{app.district}</p>
                </div>
                <div className="p-3 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                   <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">Area</p>
                   <p className="text-xs font-bold text-emerald-900 truncate">{app.area}</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-400">
                <Clock size={12} />
                <span className="text-[10px] font-medium">{app.submitted_date ? new Date(app.submitted_date).toLocaleDateString() : 'N/A'}</span>
              </div>
              <button className="text-[10px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-1 group-hover:gap-2 transition-all">
                Review <ChevronRight size={12} />
              </button>
            </div>
          </div>
        )) : (
          <div className="col-span-full py-24 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-200">
            <Filter className="mx-auto text-slate-200 mb-4" size={48} />
            <h3 className="text-xl font-bold text-slate-800">No applications match your criteria</h3>
            <p className="text-sm text-slate-500 mt-2">Try clearing filters or search term</p>
          </div>
        )}
      </div>

      {/* Success/Toast Notifications */}
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