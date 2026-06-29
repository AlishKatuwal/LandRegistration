'use client';

import { useAuth } from '@/context/AuthContext';
import { Search, MapPin, CheckCircle, FileText, Loader2, X, AlertTriangle, Shield, User, Hash, RefreshCw, Download, ZoomIn, Lock } from 'lucide-react';
import { useState, useEffect } from 'react';
import socket from '@/lib/socket';

const typeColor = { 
  Lalpurja: 'bg-blue-50 text-blue-700 border-blue-200', 
  Citizenship: 'bg-emerald-50 text-emerald-700 border-emerald-200', 
  Sifaris: 'bg-purple-50 text-purple-700 border-purple-200', 
  Survey: 'bg-amber-50 text-amber-700 border-amber-200' 
};

export default function DocumentsPage() {
  const { t } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [verifyingId, setVerifyingId] = useState(null);
  const [verifyResults, setVerifyResults] = useState({});
  const [viewDoc, setViewDoc] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchApps = () => {
    fetch('http://localhost:5001/api/applications')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const apps = data.data.map(app => {
            const docs = typeof app.documents === 'string' ? JSON.parse(app.documents) : (app.documents || []);
            return { ...app, parsedDocs: docs };
          }).filter(app => app.parsedDocs.length > 0);
          setApplications(apps);
        }
        setLoading(false);
      })
      .catch(err => { console.error(err); setLoading(false); });
  };

  useEffect(() => {
    fetchApps();
    
    const handleNewApp = (newApp) => {
      const docs = typeof newApp.documents === 'string' ? JSON.parse(newApp.documents) : (newApp.documents || []);
      if (docs.length > 0) {
        setApplications(prev => {
          if (prev.find(a => a.id === newApp.id)) return prev;
          return [{ ...newApp, parsedDocs: docs }, ...prev];
        });
        showToast('New documents received for verification!', 'info');
      }
    };

    const handleUpdate = (updatedApp) => {
      const docs = typeof updatedApp.documents === 'string' ? JSON.parse(updatedApp.documents) : (updatedApp.documents || []);
      setApplications(prev => prev.map(a => a.id === updatedApp.id ? { ...updatedApp, parsedDocs: docs } : a));
      showToast(`Application ${updatedApp.id} updated.`, 'info');
    };

    socket.on('new_application', handleNewApp);
    socket.on('application_updated', handleUpdate);

    return () => {
      socket.off('new_application', handleNewApp);
      socket.off('application_updated', handleUpdate);
    };
  }, []);

  const verifyAppDocs = async (appId) => {
    setVerifyingId(appId);
    try {
      const res = await fetch(`http://localhost:5001/api/applications/${appId}/verify-documents`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setVerifyResults(prev => ({ ...prev, [appId]: data.documents }));
      }
    } catch (err) { console.error(err); }
    finally { setVerifyingId(null); }
  };

  const getDocVerifyStatus = (appId, docName) => {
    const results = verifyResults[appId];
    if (!results) return null;
    const doc = results.find(d => d.name === docName);
    return doc ? doc.verified : null;
  };

  const filtered = applications.filter(app => {
    const term = searchTerm.toLowerCase();
    return (
      (app.id || '').toLowerCase().includes(term) ||
      (app.kitta || '').toLowerCase().includes(term) ||
      (app.district || '').toLowerCase().includes(term)
    );
  });

  const selectedApp = applications.find(a => a.id === selectedId);

  if (loading) return (
    <div className="p-12 flex flex-col items-center justify-center gap-4 animate-pulse text-slate-500">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      <p className="font-medium">Loading documents...</p>
    </div>
  );

  // --- PREMIUM DOCUMENT VIEWER MODAL ---
  if (viewDoc) {
    const isImage = (viewDoc.name || 'file.png').match(/\.(jpg|jpeg|png|gif|webp)$/i);
    const isPdf = (viewDoc.name || 'file.pdf').match(/\.(pdf)$/i);
    
    return (
      <div className="fixed inset-0 z-[10000] bg-slate-900/70 backdrop-blur-lg flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
          
          {/* Modal Header */}
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4 min-w-0">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${typeColor[viewDoc.type] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                <FileText size={20} />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-slate-900 truncate">{viewDoc.name || 'Document'}</h3>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${typeColor[viewDoc.type] || 'bg-slate-50 text-slate-600'}`}>
                    {viewDoc.type || 'File'}
                  </span>
                  {viewDoc.size && <span className="text-[11px] text-slate-500">{(viewDoc.size / 1024 / 1024).toFixed(2)} MB</span>}
                </div>
              </div>
            </div>
            <button onClick={() => setViewDoc(null)} className="ml-4 p-2 hover:bg-slate-200 rounded-xl transition-colors text-slate-500">
              <X size={20} />
            </button>
          </div>

          {/* Modal Body - Viewer */}
          <div className="flex-1 bg-slate-100 p-6 overflow-auto flex items-center justify-center">
            {isImage ? (
              <img src={viewDoc.url} className="max-w-full max-h-full object-contain rounded-lg shadow-lg border border-slate-200" alt="Document" />
            ) : isPdf ? (
              <iframe src={viewDoc.url} className="w-full h-full rounded-lg border border-slate-200 shadow-sm bg-white" title={viewDoc.name}></iframe>
            ) : (
              <div className="bg-white w-full max-w-2xl shadow-xl rounded-2xl border border-slate-200 overflow-hidden">
                <div className="p-8 text-center bg-gradient-to-br from-slate-50 to-white border-b border-slate-100">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                    <Lock size={32} />
                  </div>
                  <h4 className="text-lg font-bold text-slate-800 mb-1">Secure Document Preview</h4>
                  <p className="text-sm text-slate-500">This file format cannot be rendered directly in the browser.</p>
                </div>
                <div className="p-6 bg-slate-50 flex justify-center">
                  <button className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm">
                    <Download size={16} /> Download to View
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer - Hash Info */}
          <div className="px-6 py-4 border-t border-slate-100 bg-white shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              {viewDoc.sha256 ? (
                <>
                  <Hash size={14} className="text-slate-400 shrink-0" />
                  <p className="text-xs font-mono text-slate-500 truncate">
                    SHA-256: <span className="text-slate-800 font-bold">{viewDoc.sha256}</span>
                  </p>
                </>
              ) : (
                <p className="text-xs text-slate-400 italic">No cryptographic hash available</p>
              )}
            </div>
            <button onClick={() => setViewDoc(null)} className="px-5 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors">
              Close Viewer
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- APPLICATION DETAIL VIEW ---
  if (selectedApp) {
    const appVerified = verifyResults[selectedApp.id];

    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 pt-8 pb-20 space-y-8 animate-in fade-in duration-300">
        <button onClick={() => setSelectedId(null)} className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-blue-600 transition-colors group">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:-translate-x-1"><path d="m15 18-6-6 6-6"/></svg>
          Back to documents
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Kitta {selectedApp.kitta}</h1>
                    {appVerified && (
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold flex items-center gap-1.5 border border-emerald-200 uppercase tracking-wider shadow-sm">
                        <CheckCircle size={12} /> VERIFIED
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500 text-sm">{selectedApp.district}, {selectedApp.municipality} - Ward {selectedApp.ward}</p>
                </div>
                <div className="sm:text-right bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Application ID</p>
                  <p className="text-sm font-mono font-bold text-slate-800 mt-0.5">{selectedApp.id}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                  <div className="w-8 h-8 bg-white rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 shadow-sm"><User size={16} /></div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Applicant (LIN)</p>
                    <p className="text-sm font-bold text-slate-800">{selectedApp.applicant_lin}</p>
                  </div>
                </div>
                <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex items-center gap-3">
                  <div className="w-8 h-8 bg-white rounded-lg border border-blue-200 flex items-center justify-center text-blue-600 shadow-sm"><FileText size={16} /></div>
                  <div>
                    <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Type</p>
                    <p className="text-sm font-bold text-blue-900">{selectedApp.type}</p>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-5 gap-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Submitted Documents</h4>
                  <button
                    onClick={() => verifyAppDocs(selectedApp.id)}
                    disabled={verifyingId === selectedApp.id}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all disabled:opacity-50 shadow-sm"
                  >
                    {verifyingId === selectedApp.id ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    VERIFY BLOCKCHAIN HASHES
                  </button>
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                  {selectedApp.parsedDocs.map((doc, idx) => {
                    const verifyStatus = getDocVerifyStatus(selectedApp.id, doc.name);
                    return (
                      <div 
                        key={idx} 
                        onClick={() => setViewDoc(doc)}
                        className={`flex items-center justify-between p-4 bg-white border-2 rounded-2xl transition-all duration-200 cursor-pointer group ${
                          verifyStatus === true ? 'border-emerald-200 hover:border-emerald-400 hover:shadow-md' :
                          verifyStatus === false ? 'border-rose-200 hover:border-rose-400 hover:shadow-md' :
                          'border-slate-100 hover:border-blue-400 hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                            verifyStatus === true ? 'bg-emerald-50 text-emerald-600' :
                            verifyStatus === false ? 'bg-rose-50 text-rose-600' :
                            'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'
                          }`}>
                            <FileText size={20} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-800 truncate group-hover:text-blue-600 transition-colors">{doc.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${typeColor[doc.type] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                {doc.type || 'Document'}
                              </span>
                              {doc.size && <span className="text-[10px] text-slate-400">{(doc.size / 1024 / 1024).toFixed(2)} MB</span>}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          {doc.sha256 && (
                            <div className="hidden md:flex items-center gap-1 font-mono text-[9px] text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100" title={doc.sha256}>
                              <Hash size={10} /> {doc.sha256.substring(0, 10)}...
                            </div>
                          )}
                          
                          {verifyStatus === true && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1 shrink-0">
                              <CheckCircle size={12} /> VALID
                            </span>
                          )}
                          {verifyStatus === false && (
                            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 flex items-center gap-1 shrink-0">
                              <AlertTriangle size={12} /> TAMPERED
                            </span>
                          )}
                          
                          <span className="text-[10px] font-bold text-slate-400 group-hover:text-blue-600 transition-colors flex items-center gap-1 uppercase tracking-wider shrink-0">
                            <ZoomIn size={12} /> View
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Security Audit Sidebar */}
          <div className="space-y-6">
            <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-blue-600/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
              
              <h3 className="text-xs font-bold opacity-60 mb-8 uppercase tracking-widest text-blue-400 flex items-center gap-2">
                <Shield size={14} /> Security Audit
              </h3>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20"><Shield size={18}/></div>
                  <div>
                    <p className="text-sm font-bold text-white">Immutable Ledger</p>
                    <p className="text-xs opacity-50 mt-1 leading-relaxed">Cross-referencing file hashes with Hyperledger Fabric nodes.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20"><AlertTriangle size={18}/></div>
                  <div>
                    <p className="text-sm font-bold text-white">Tamper Detection</p>
                    <p className="text-xs opacity-50 mt-1 leading-relaxed">Real-time monitoring for unauthorized document modifications.</p>
                  </div>
                </div>
              </div>
              <div className="mt-10 pt-6 border-t border-white/10">
                <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-center backdrop-blur-md">
                  <p className="text-[10px] opacity-60 uppercase tracking-wider mb-1 font-bold">Last System Audit</p>
                  <p className="text-xs font-mono font-bold text-blue-400">2026-05-14 15:42:01 UTC</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- MAIN DOCUMENT REGISTRY LIST ---
  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 pt-8 pb-20 space-y-10 animate-in fade-in duration-300">
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Document Registry</h1>
              <p className="text-slate-500 mt-2 text-sm leading-relaxed">Verify document integrity via SHA-256 blockchain hashing</p>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-md border border-emerald-100 animate-pulse h-fit mt-1">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              <span className="text-[10px] font-black uppercase tracking-tighter">Live Updates</span>
            </div>
          </div>
          <div className="relative w-full md:w-80">
            <input 
              type="text" 
              placeholder="Search by ID or Kitta..." 
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm shadow-sm transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(app => (
            <div 
              key={app.id} 
              onClick={() => setSelectedId(app.id)}
              className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-blue-500 hover:shadow-xl transition-all cursor-pointer group relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-600 scale-y-0 group-hover:scale-y-100 transition-transform origin-top duration-300"></div>
              
              <div className="flex justify-between items-start mb-5">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-sm group-hover:shadow-md group-hover:shadow-blue-100">
                  <FileText size={22} />
                </div>
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                  app.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                  app.status === 'rejected' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                  'bg-amber-50 text-amber-700 border border-amber-100'
                }`}>
                  {app.status || 'PENDING'}
                </span>
              </div>
              
              <h3 className="font-bold text-slate-900 text-lg mb-1">{app.id}</h3>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Kitta {app.kitta} • {app.district}</p>
              
              <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200">
                    <User size={14} />
                  </div>
                  <p className="text-xs text-slate-600 font-mono font-medium truncate max-w-[100px]">{app.applicant_lin}</p>
                </div>
                <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                  {app.parsedDocs.length} Docs
                </span>
              </div>
            </div>
          ))}
          
          {filtered.length === 0 && (
            <div className="col-span-full py-24 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
              <FileText className="mx-auto text-slate-200 mb-4" size={56} />
              <h3 className="text-xl font-bold text-slate-800 mb-2">No documents found</h3>
              <p className="text-slate-500 text-sm">Try adjusting your search or filter criteria</p>
            </div>
          )}
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