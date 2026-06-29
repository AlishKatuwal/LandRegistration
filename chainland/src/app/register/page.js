'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, ArrowLeft, Mail, Eye, EyeOff, RefreshCw, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    citizenship_no: '',
    dob: '',
    phone: '',
    email: '',
    password: ''
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1 = Details, 2 = OTP
  const [otp, setOtp] = useState(['', '', '', '', '', '']); // 6-digit OTP
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [newLin, setNewLin] = useState('');
  const [mockMode, setMockMode] = useState(false);

  // Resend OTP timer
  const [resendCooldown, setResendCooldown] = useState(0);
  const timerRef = useRef(null);

  const otpRefs = useRef([]);
  const router = useRouter();

  // Cleanup timer on unmount
  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const startResendTimer = () => {
    setResendCooldown(60);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.name || !formData.citizenship_no || !formData.dob || !formData.email || !formData.password) {
      setError('Please fill all required fields, including your email address.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5001/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, name: formData.name })
      });
      const data = await res.json();
      if (data.success) {
        setMockMode(data.mock || false);
        setStep(2);
        startResendTimer();
        // Focus first OTP box
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      } else {
        setError(data.error || 'Failed to send OTP. Please try again.');
      }
    } catch {
      setError('Network error — cannot reach the backend server.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5001/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, name: formData.name })
      });
      const data = await res.json();
      if (data.success) {
        setMockMode(data.mock || false);
        setOtp(['', '', '', '', '', '']);
        startResendTimer();
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      } else {
        setError(data.error || 'Failed to resend OTP.');
      }
    } catch {
      setError('Network error — cannot reach the backend server.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    // Auto-advance to next box
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = [...otp];
    for (let i = 0; i < 6; i++) {
      newOtp[i] = pasted[i] || '';
    }
    setOtp(newOtp);
    // Focus last filled or next empty
    const lastIdx = Math.min(pasted.length, 5);
    otpRefs.current[lastIdx]?.focus();
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const otpValue = otp.join('');
    if (otpValue.length !== 6) {
      setError('Please enter the complete 6-digit OTP.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:5001/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, otp: otpValue })
      });
      const data = await res.json();

      if (data.success) {
        setNewLin(data.user.id);
        setSuccessMsg(
          `Registration successful! Your Land Identification Number (LIN) is: ${data.user.id}. ` +
          `A welcome email has been sent to ${formData.email}.`
        );
        setTimeout(() => router.push('/'), 8000);
      } else {
        setError(data.error || 'Registration failed. Please try again.');
      }
    } catch {
      setError('Network error connecting to backend.');
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = (pwd) => {
    if (!pwd) return { label: '', color: '', width: '0%' };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    const levels = [
      { label: 'Weak', color: '#ef4444', width: '25%' },
      { label: 'Fair', color: '#f97316', width: '50%' },
      { label: 'Good', color: '#eab308', width: '75%' },
      { label: 'Strong', color: '#22c55e', width: '100%' },
    ];
    return levels[score - 1] || levels[0];
  };

  const strength = passwordStrength(formData.password);

  return (
    <div className="min-h-screen bg-[#0a192f] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-red-700/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-blue-700/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-crimson-600/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-crimson-600 to-rose-700 rounded-2xl mx-auto flex items-center justify-center shadow-2xl shadow-crimson-600/40 mb-4">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 20h18L12 4z"/><path d="M12 11v5"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Citizen Registration</h1>
          <p className="text-slate-400 mt-1.5 text-sm">Get your Land Identification Number (LIN)</p>
        </div>

        {/* Progress Steps */}
        {!successMsg && (
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${step === 1 ? 'bg-crimson-600 text-white' : 'bg-green-500/20 text-green-400 border border-green-500/30'}`}>
              {step > 1 ? <CheckCircle size={12} /> : <span className="w-4 h-4 bg-white/20 rounded-full inline-flex items-center justify-center text-[10px]">1</span>}
              Your Details
            </div>
            <div className={`w-8 h-px ${step >= 2 ? 'bg-green-500' : 'bg-slate-700'} transition-colors`} />
            <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${step === 2 ? 'bg-crimson-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
              <span className="w-4 h-4 bg-white/20 rounded-full inline-flex items-center justify-center text-[10px]">2</span>
              Verify Email
            </div>
          </div>
        )}

        <div className="bg-[#1e293b]/80 backdrop-blur-xl p-8 rounded-3xl border border-slate-700/50 shadow-2xl">
          {/* Success State */}
          {successMsg ? (
            <div className="text-center space-y-5">
              <div className="w-20 h-20 bg-green-500/15 text-green-400 rounded-full flex items-center justify-center mx-auto border-2 border-green-500/30">
                <CheckCircle size={36} />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg mb-2">Registration Complete! 🎉</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  A welcome email with your LIN has been sent to <span className="text-white font-medium">{formData.email}</span>
                </p>
              </div>
              <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
                <p className="text-xs text-slate-400 mb-1 uppercase tracking-widest font-bold">Your LIN</p>
                <p className="text-crimson-400 font-mono text-2xl font-bold tracking-wider">{newLin}</p>
              </div>
              <p className="text-slate-500 text-xs">Redirecting to login in 8 seconds...</p>
              <Link href="/" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm transition-colors">
                <ArrowLeft size={14} /> Return to Login Now
              </Link>
            </div>
          ) : step === 1 ? (
            /* ── Step 1: Personal Details ── */
            <form onSubmit={handleRequestOtp} className="space-y-5">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Full Name (English) *</label>
                <input
                  required type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-800/50 border border-slate-600 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-crimson-500 focus:ring-1 focus:ring-crimson-500/50 transition-all placeholder-slate-500"
                  placeholder="Ram Bahadur Shrestha"
                />
              </div>

              {/* Citizenship No + DOB */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Citizenship No. *</label>
                  <input
                    required type="text"
                    value={formData.citizenship_no}
                    onChange={e => setFormData({ ...formData, citizenship_no: e.target.value })}
                    className="w-full bg-slate-800/50 border border-slate-600 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-crimson-500 focus:ring-1 focus:ring-crimson-500/50 transition-all placeholder-slate-500"
                    placeholder="27-01-78-1234"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Date of Birth *</label>
                  <input
                    required type="date"
                    value={formData.dob}
                    onChange={e => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full bg-slate-800/50 border border-slate-600 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-crimson-500 focus:ring-1 focus:ring-crimson-500/50 transition-all"
                  />
                </div>
              </div>

              {/* Email (Required) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Email Address * <span className="text-crimson-400 font-normal">(OTP will be sent here)</span>
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    required type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-800/50 border border-slate-600 text-white rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-crimson-500 focus:ring-1 focus:ring-crimson-500/50 transition-all placeholder-slate-500"
                    placeholder="ram@example.com"
                  />
                </div>
              </div>

              {/* Phone (Optional) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Phone Number <span className="text-slate-500 font-normal">(Optional)</span></label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-slate-800/50 border border-slate-600 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-crimson-500 focus:ring-1 focus:ring-crimson-500/50 transition-all placeholder-slate-500"
                  placeholder="98XXXXXXXX"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Create Password *</label>
                <div className="relative">
                  <input
                    required
                    type={showPass ? 'text' : 'password'}
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-slate-800/50 border border-slate-600 text-white rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:border-crimson-500 focus:ring-1 focus:ring-crimson-500/50 transition-all placeholder-slate-500"
                    placeholder="Min. 8 characters"
                    minLength={6}
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {/* Password strength bar */}
                {formData.password && (
                  <div className="mt-2">
                    <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: strength.width, backgroundColor: strength.color }}
                      />
                    </div>
                    <p className="text-[11px] mt-1" style={{ color: strength.color }}>{strength.label}</p>
                  </div>
                )}
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-2.5 rounded-xl">
                  {error}
                </div>
              )}

              <button
                disabled={loading} type="submit"
                className="w-full bg-gradient-to-r from-crimson-600 to-rose-700 hover:from-crimson-700 hover:to-rose-800 text-white py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-crimson-600/30 hover:shadow-crimson-600/50 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0 flex justify-center items-center gap-2"
              >
                {loading ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending OTP...</>
                ) : (
                  <><Mail size={16} /> Send OTP to Email</>
                )}
              </button>
            </form>
          ) : (
            /* ── Step 2: OTP Verification ── */
            <form onSubmit={handleRegister} className="space-y-6">
              <div className="text-center">
                <div className="w-14 h-14 bg-blue-500/15 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500/30">
                  <Mail size={24} />
                </div>
                <h3 className="text-white font-bold text-lg mb-1">Check Your Email</h3>
                <p className="text-slate-400 text-sm">
                  We sent a 6-digit code to
                </p>
                <p className="text-white font-semibold text-sm mt-0.5">{formData.email}</p>

                {mockMode && (
                  <div className="mt-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs px-3 py-2 rounded-lg">
                    ⚙️ Dev Mode: Email not configured. Check the server console for the OTP code.
                  </div>
                )}
              </div>

              {/* 6-digit OTP input */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-3 text-center">Enter 6-Digit OTP</label>
                <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => otpRefs.current[i] = el}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      className={`w-11 h-14 text-center text-xl font-bold font-mono bg-slate-800/50 border rounded-xl text-white focus:outline-none transition-all ${
                        digit
                          ? 'border-crimson-500 ring-1 ring-crimson-500/30 bg-crimson-500/5'
                          : 'border-slate-600 focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30'
                      }`}
                      placeholder="·"
                    />
                  ))}
                </div>
                <p className="text-center text-[11px] text-slate-500 mt-2">You can paste the code directly</p>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-2.5 rounded-xl">
                  {error}
                </div>
              )}

              <button
                disabled={loading || otp.join('').length !== 6} type="submit"
                className="w-full bg-gradient-to-r from-crimson-600 to-rose-700 hover:from-crimson-700 hover:to-rose-800 text-white py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-crimson-600/30 hover:shadow-crimson-600/50 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0 flex justify-center items-center gap-2"
              >
                {loading ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verifying...</>
                ) : (
                  <><Shield size={16} /> Verify &amp; Register</>
                )}
              </button>

              {/* Resend OTP */}
              <div className="text-center">
                <p className="text-slate-500 text-xs mb-2">Didn&apos;t receive the code?</p>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || loading}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  style={{ color: resendCooldown > 0 ? '#64748b' : '#60a5fa' }}
                >
                  <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                </button>
              </div>

              {/* Back to step 1 */}
              <button
                type="button"
                onClick={() => { setStep(1); setOtp(['', '', '', '', '', '']); setError(''); }}
                className="w-full text-slate-500 hover:text-white text-xs py-2 transition-colors flex items-center justify-center gap-1"
              >
                <ArrowLeft size={12} /> Change email address
              </button>
            </form>
          )}

          <div className="mt-6 text-center border-t border-slate-700/50 pt-5">
            <Link href="/" className="text-slate-400 hover:text-white text-sm flex items-center justify-center gap-2 transition-colors">
              <ArrowLeft size={14} /> Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
