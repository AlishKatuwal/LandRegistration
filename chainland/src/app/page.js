'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Shield, Mountain, Eye, EyeOff, Globe } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [tab, setTab] = useState('citizen');
  const [id, setId] = useState('');
  const [pass, setPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginOfficer, loginCitizen, t, toggleLang, lang } = useAuth();
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    let success = false;
    
    if (tab === 'citizen') {
      success = await loginCitizen(id, pass);
    } else {
      success = await loginOfficer(id, pass);
    }

    if (success) {
      router.push(`/${tab}`);
    } else {
      setError(t('Invalid credentials. Please try again.', 'अमान्य प्रमाण। कृपया फेरि प्रयास गर्नुहोस्।'));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-navy-900 via-navy-800 to-navy-700 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-crimson-600/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-govt/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gold-500/5 rounded-full blur-3xl"></div>
      </div>

      {/* Language toggle */}
      <button onClick={toggleLang} className="absolute top-6 right-6 z-10 flex items-center gap-2 text-white/70 hover:text-white text-sm transition-colors bg-white/10 backdrop-blur px-3 py-1.5 rounded-full">
        <Globe size={14} />
        {lang === 'en' ? 'नेपाली' : 'English'}
      </button>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4 relative z-10">
        <div className="w-full max-w-md">
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-crimson-600 to-crimson-700 rounded-2xl shadow-2xl shadow-crimson-600/30 mb-5">
              <Mountain className="text-white" size={36} />
            </div>
            <h1 className="text-3xl font-bold text-white mb-1">ChainLand</h1>
            <p className="text-blue-200/70 text-sm">{t('Nepal Digital Land Registry', 'नेपाल डिजिटल भूमि अभिलेख')}</p>
            <p className="text-blue-200/40 text-xs mt-1">{t('Department of Land Management & Archive', 'भूमि व्यवस्थापन तथा अभिलेख विभाग')}</p>
          </div>

          {/* Login Card */}
          <div className="bg-white/[0.07] backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
            {/* Tab Selector */}
            <div className="flex bg-white/5 rounded-xl p-1 mb-6">
              <button onClick={() => { setTab('citizen'); setId(''); setPass(''); setError(''); }} className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${tab === 'citizen' ? 'bg-crimson-600 text-white shadow-lg' : 'text-white/60 hover:text-white'}`}>
                {t('👤 Citizen', '👤 नागरिक')}
              </button>
              <button onClick={() => { setTab('officer'); setId(''); setPass(''); setError(''); }} className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${tab === 'officer' ? 'bg-blue-govt text-white shadow-lg' : 'text-white/60 hover:text-white'}`}>
                {t('🏛️ Malpot Officer', '🏛️ मालपोत अधिकृत')}
              </button>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-white/60 text-xs font-medium mb-1.5">
                  {tab === 'officer' ? t('Employee ID (कर्मचारी ID)', 'कर्मचारी ID') : t('LIN Number / Citizenship (LIN नम्बर)', 'LIN नम्बर / नागरिकता')}
                </label>
                <input type="text" value={id} onChange={e => setId(e.target.value)} placeholder={tab === 'officer' ? 'GOV-2081-001' : 'LIN-07801234'} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-crimson-600/50 focus:border-crimson-600/50 transition-all" required />
              </div>
              <div>
                <label className="block text-white/60 text-xs font-medium mb-1.5">{t('Password (पासवर्ड)', 'पासवर्ड')}</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-crimson-600/50 focus:border-crimson-600/50 transition-all pr-10" required />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && <div className="bg-danger/10 border border-danger/20 rounded-lg px-3 py-2 text-danger text-xs">{error}</div>}

              <button disabled={loading} type="submit" className="w-full mt-6 bg-crimson-600 hover:bg-crimson-700 text-white py-3 rounded-xl font-bold transition-all shadow-[0_4px_14px_0_rgba(220,20,60,0.39)] hover:shadow-[0_6px_20px_rgba(220,20,60,0.23)] hover:-translate-y-0.5 flex items-center justify-center gap-2">
                <Shield size={18} /> {loading ? t('Logging in...', 'लगइन हुँदैछ...') : t('Secure Login', 'सुरक्षित लगइन')}
              </button>
            </form>

            {tab === 'citizen' && (
              <p className="text-center text-white/40 text-xs mt-4">
                {t('New User?', 'नयाँ प्रयोगकर्ता?')} <Link href="/register" className="text-crimson-600 cursor-pointer hover:underline">{t('Register with Citizenship', 'नागरिकताबाट दर्ता गर्नुहोस्')}</Link>
              </p>
            )}

            {/* Demo credentials */}
            <div className="mt-5 pt-4 border-t border-white/5">
              <p className="text-white/30 text-[10px] text-center mb-2">DEMO CREDENTIALS</p>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="bg-white/5 rounded-lg p-2 text-white/50">
                  <div className="font-medium text-white/70 mb-1">Officer</div>
                  <div>ID: GOV-2081-001</div>
                  <div>Pass: admin123</div>
                </div>
                <div className="bg-white/5 rounded-lg p-2 text-white/50">
                  <div className="font-medium text-white/70 mb-1">Citizen</div>
                  <div>LIN: LIN-07801234</div>
                  <div>Pass: citizen123</div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-white/20 text-[10px] mt-6">
            © {t('Government of Nepal', 'नेपाल सरकार')} • {t('Ministry of Land Management', 'भूमि व्यवस्थापन मन्त्रालय')} • {t('All Rights Reserved', 'सर्वाधिकार सुरक्षित')}
          </p>
        </div>
      </div>
    </div>
  );
}
