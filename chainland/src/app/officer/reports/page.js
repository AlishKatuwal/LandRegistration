'use client';
import { useAuth } from '@/context/AuthContext';
import { BarChart3, TrendingUp, MapPin, Scale, FileText, ArrowUpRight, ArrowDownRight, Calendar, Download } from 'lucide-react';

export default function ReportsPage() {
  const { t } = useAuth();
  const stats = [
    { label: t('Total Registrations', 'कुल दर्ता'), value: '1,247', change: '+12%', up: true, icon: MapPin, color: 'from-blue-500 to-indigo-500', desc: t('All time', 'सबै समय') },
    { label: t('Transfers This Month', 'यो महिना हस्तान्तरण'), value: '89', change: '+5%', up: true, icon: TrendingUp, color: 'from-green-500 to-emerald-500', desc: t('Baisakh 2081', 'बैशाख २०८१') },
    { label: t('Revenue Collected', 'राजस्व संकलन'), value: 'NPR 4.2M', change: '+18%', up: true, icon: BarChart3, color: 'from-amber-500 to-orange-500', desc: t('This fiscal year', 'यो आर्थिक वर्ष') },
    { label: t('Disputes Resolved', 'विवाद समाधान'), value: '23', change: '-8%', up: false, icon: Scale, color: 'from-purple-500 to-violet-500', desc: t('This quarter', 'यो त्रैमासिक') },
  ];

  const monthlyData = [
    { month: 'Shrawan', reg: 45, transfer: 12, revenue: '1.2M' },
    { month: 'Bhadra', reg: 52, transfer: 18, revenue: '1.5M' },
    { month: 'Ashwin', reg: 38, transfer: 15, revenue: '1.1M' },
    { month: 'Kartik', reg: 61, transfer: 22, revenue: '1.8M' },
    { month: 'Mangsir', reg: 47, transfer: 14, revenue: '1.3M' },
    { month: 'Poush', reg: 55, transfer: 20, revenue: '1.6M' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">{t('Reports & Analytics', 'प्रतिवेदन र विश्लेषण')}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{t('System performance and statistics', 'प्रणाली प्रदर्शन र तथ्याङ्क')}</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2">
            <Calendar size={14} /> {t('This Year', 'यो वर्ष')}
          </button>
          <button className="px-4 py-2 bg-blue-govt text-white rounded-xl text-sm font-semibold hover:bg-blue-800 transition-all flex items-center gap-2">
            <Download size={14} /> {t('Export', 'निर्यात')}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-500 mb-1 font-medium">{s.label}</p>
                <p className="text-2xl font-bold text-slate-800">{s.value}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  {s.up ? <ArrowUpRight size={12} className="text-green-500" /> : <ArrowDownRight size={12} className="text-red-500" />}
                  <span className={`text-xs font-semibold ${s.up ? 'text-green-600' : 'text-red-600'}`}>{s.change}</span>
                  <span className="text-[10px] text-slate-400">{t('vs last month', 'गत महिना')}</span>
                </div>
              </div>
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center shadow-lg`}>
                <s.icon size={18} className="text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Monthly data table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">{t('Monthly Overview', 'मासिक सारांश')}</h3>
          <span className="text-[10px] text-slate-400 uppercase font-semibold">{t('Fiscal Year 2081/82', 'आ.व. २०८१/८२')}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-400 border-b border-slate-100">
                <th className="text-left px-5 py-3 font-medium">{t('Month', 'महिना')}</th>
                <th className="text-right px-3 py-3 font-medium">{t('Registrations', 'दर्ता')}</th>
                <th className="text-right px-3 py-3 font-medium">{t('Transfers', 'हस्तान्तरण')}</th>
                <th className="text-right px-5 py-3 font-medium">{t('Revenue (NPR)', 'राजस्व')}</th>
              </tr>
            </thead>
            <tbody>
              {monthlyData.map((row, i) => (
                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-5 py-3 font-medium text-slate-700">{row.month}</td>
                  <td className="px-3 py-3 text-right text-slate-600">{row.reg}</td>
                  <td className="px-3 py-3 text-right text-slate-600">{row.transfer}</td>
                  <td className="px-5 py-3 text-right font-semibold text-slate-700">{row.revenue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Chart area */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">{t('Registration Trend', 'दर्ता ट्रेन्ड')}</h3>
        <div className="h-48 flex items-end gap-3 px-4">
          {monthlyData.map((row, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] text-slate-500 font-semibold">{row.reg}</span>
              <div
                className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-md transition-all hover:from-blue-700 hover:to-blue-500"
                style={{ height: `${(row.reg / 70) * 100}%` }}
              />
              <span className="text-[9px] text-slate-400 font-medium mt-1">{row.month.substring(0, 3)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
