'use client';
import { useAuth } from '@/context/AuthContext';
import { Settings, User, Lock, Bell, Globe, Shield, Key, Monitor, Save } from 'lucide-react';
import { useState } from 'react';

export default function SettingsPage() {
  const { user, t, lang, toggleLang } = useAuth();
  const [notifPrefs, setNotifPrefs] = useState({ email: true, sms: false, push: true });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">{t('Settings', 'सेटिङ')}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{t('Account and system preferences', 'खाता र प्रणाली प्राथमिकता')}</p>
        </div>
        <button
          onClick={handleSave}
          className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all ${saved ? 'bg-green-600 text-white' : 'bg-blue-govt text-white hover:bg-blue-800'}`}
        >
          {saved ? '✓ Saved' : <><Save size={14} /> {t('Save Changes', 'परिवर्तन सुरक्षित')}</>}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
              <User size={16} className="text-slate-500" />
              <h3 className="font-semibold text-slate-800 text-sm">{t('Profile Information', 'प्रोफाइल जानकारी')}</h3>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-govt to-blue-700 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                  {user.name.charAt(0)}
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-800">{user.name}</p>
                  <p className="text-sm text-slate-500">{t('Malpot Officer', 'मालपोत अधिकृत')}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5 font-medium">{t('Full Name', 'पूरा नाम')}</label>
                  <input type="text" value={user.name} readOnly className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50/50 text-slate-700" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5 font-medium">{t('Employee ID', 'कर्मचारी ID')}</label>
                  <input type="text" value={user.id} readOnly className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50/50 font-mono text-slate-700" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5 font-medium">{t('Email', 'इमेल')}</label>
                  <input type="text" value={user.email || 'officer@malpot.gov.np'} readOnly className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50/50 text-slate-700" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1.5 font-medium">{t('Office', 'कार्यालय')}</label>
                  <input type="text" value={user.office || 'Malpot Karyalaya'} readOnly className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50/50 text-slate-700" />
                </div>
              </div>
            </div>
          </div>

          {/* Security */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
              <Shield size={16} className="text-slate-500" />
              <h3 className="font-semibold text-slate-800 text-sm">{t('Security', 'सुरक्षा')}</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Key size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">{t('Password', 'पासवर्ड')}</p>
                    <p className="text-[10px] text-slate-400">{t('Last changed 30 days ago', '३० दिन अघि परिवर्तन गरिएको')}</p>
                  </div>
                </div>
                <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all">{t('Change', 'परिवर्तन')}</button>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
                    <Monitor size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">{t('Active Sessions', 'सक्रिय सत्रहरू')}</p>
                    <p className="text-[10px] text-slate-400">{t('1 device currently logged in', '१ उपकरणमा लगइन')}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md border border-green-100">ACTIVE</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Language */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
              <Globe size={16} className="text-slate-500" />
              <h3 className="font-semibold text-slate-800 text-sm">{t('Language', 'भाषा')}</h3>
            </div>
            <div className="p-6 space-y-3">
              <button
                onClick={lang === 'np' ? toggleLang : undefined}
                className={`w-full p-3 rounded-xl text-sm font-medium text-left flex items-center gap-3 transition-all ${lang === 'en' ? 'bg-blue-govt/10 text-blue-govt border-2 border-blue-govt/20' : 'bg-slate-50 text-slate-600 border-2 border-transparent hover:border-slate-200'}`}
              >
                <span className="text-lg">🇬🇧</span> English
                {lang === 'en' && <span className="ml-auto text-[10px] font-bold text-blue-govt">ACTIVE</span>}
              </button>
              <button
                onClick={lang === 'en' ? toggleLang : undefined}
                className={`w-full p-3 rounded-xl text-sm font-medium text-left flex items-center gap-3 transition-all ${lang === 'np' ? 'bg-blue-govt/10 text-blue-govt border-2 border-blue-govt/20' : 'bg-slate-50 text-slate-600 border-2 border-transparent hover:border-slate-200'}`}
              >
                <span className="text-lg">🇳🇵</span> नेपाली
                {lang === 'np' && <span className="ml-auto text-[10px] font-bold text-blue-govt">ACTIVE</span>}
              </button>
            </div>
          </div>

          {/* Notification prefs */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
              <Bell size={16} className="text-slate-500" />
              <h3 className="font-semibold text-slate-800 text-sm">{t('Notifications', 'सूचनाहरू')}</h3>
            </div>
            <div className="p-6 space-y-4">
              {[
                ['email', 'Email Alerts', 'इमेल सूचना'],
                ['sms', 'SMS Alerts', 'SMS सूचना'],
                ['push', 'Push Notifications', 'पुश सूचना'],
              ].map(([key, en, np]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">{t(en, np)}</span>
                  <button
                    onClick={() => setNotifPrefs(prev => ({ ...prev, [key]: !prev[key] }))}
                    className={`w-10 h-5 rounded-full transition-all relative ${notifPrefs[key] ? 'bg-blue-govt' : 'bg-slate-200'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 shadow transition-transform ${notifPrefs[key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
