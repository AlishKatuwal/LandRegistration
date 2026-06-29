'use client';
import { useAuth } from '@/context/AuthContext';
import { HelpCircle, ChevronDown, Phone, Mail, MapPin, MessageCircle, BookOpen, ExternalLink, Search } from 'lucide-react';
import { useState } from 'react';

const faqs = [
  { q: 'How do I transfer my land?', qNp: 'जग्गा कसरी हस्तान्तरण गर्ने?', a: 'Go to My Land → select your parcel → click "Initiate Transfer". Ensure Tiro is paid and no Rokka is active. Upload required documents, enter buyer details, and submit. Both parties must digitally sign.', aNp: 'मेरो जग्गामा जानुहोस् → कित्ता छान्नुहोस् → "हस्तान्तरण सुरु" थिच्नुहोस्। तिरो तिरिएको र रोक्का नभएको सुनिश्चित गर्नुहोस्। आवश्यक कागजात अपलोड गर्नुहोस्, क्रेताको विवरण राख्नुहोस् र पेश गर्नुहोस्।', category: 'Transfer' },
  { q: 'What is Tiro and when do I pay it?', qNp: 'तिरो के हो र कहिले तिर्ने?', a: 'Tiro is the annual land revenue tax. It must be paid to your local government annually before the fiscal year deadline. Overdue Tiro can lead to Jagga Rokka (land freeze).', aNp: 'तिरो वार्षिक भूमि राजस्व कर हो। यो प्रत्येक आर्थिक वर्षको म्यादभित्र स्थानीय सरकारलाई तिर्नुपर्छ। बाँकी तिरोले जग्गा रोक्का हुन सक्छ।', category: 'Tiro' },
  { q: 'My parcel shows Rokka — what does this mean?', qNp: 'मेरो कित्तामा रोक्का देखिन्छ — यसको अर्थ के हो?', a: 'Jagga Rokka means your land has a legal encumbrance. This could be due to an active dispute, court order, bank mortgage, or tax lien. All transfers are blocked until Rokka is lifted. Contact your local Malpot office.', aNp: 'जग्गा रोक्काको अर्थ तपाईंको जग्गामा कानूनी रोक लागिएको हो। यो विवाद, अदालतको आदेश, बैंक बन्धक, वा कर कारणले हुन सक्छ। रोक्का नहटेसम्म सबै हस्तान्तरण रोकिन्छ।', category: 'Legal' },
  { q: 'What is LIN number?', qNp: 'LIN नम्बर के हो?', a: 'LIN (Land Identification Number) is an 11-character unique code assigned to each landowner under the Land Act 7th Amendment 2018. It is used for identity verification in ChainLand.', aNp: 'LIN (भूमि पहिचान नम्बर) भूमि ऐन सातौं संशोधन २०७५ अन्तर्गत प्रत्येक जग्गाधनीलाई दिइने ११ अक्षरको अद्वितीय कोड हो।', category: 'Account' },
  { q: 'How do I file a dispute?', qNp: 'विवाद कसरी दर्ता गर्ने?', a: 'Go to Disputes → File New Dispute. You need to provide the parcel ID, your claim description, and supporting evidence (documents/photos).', aNp: 'विवादमा जानुहोस् → नयाँ विवाद दर्ता। कित्ता ID, दाबी विवरण, र प्रमाण (कागजात/फोटो) आवश्यक छ।', category: 'Dispute' },
  { q: 'How secure is my data?', qNp: 'मेरो डाटा कत्तिको सुरक्षित छ?', a: 'ChainLand uses bcrypt password hashing, JWT session tokens, and SHA-256 blockchain anchoring for all land transactions. Your personal data is encrypted and never stored in plain text.', aNp: 'ChainLand ले bcrypt पासवर्ड ह्यासिङ, JWT सत्र टोकन, र SHA-256 ब्लकचेन एंकरिङ प्रयोग गर्दछ। तपाईंको व्यक्तिगत डाटा एन्क्रिप्ट गरिएको छ।', category: 'Security' },
];

const quickLinks = [
  { label: 'Land Act 2021', labelNp: 'भूमि ऐन', url: '#', icon: BookOpen },
  { label: 'Transfer Guide', labelNp: 'हस्तान्तरण गाइड', url: '#', icon: ExternalLink },
  { label: 'Tax Calculator', labelNp: 'कर क्याल्कुलेटर', url: '#', icon: ExternalLink },
];

export default function HelpPage() {
  const { t } = useAuth();
  const [open, setOpen] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredFaqs = faqs.filter(faq =>
    faq.q.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.a.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">{t('Help & Support', 'सहायता')}</h1>
        <p className="text-sm text-slate-500 mt-0.5">{t('Frequently asked questions and contact information', 'बारम्बार सोधिने प्रश्न र सम्पर्क जानकारी')}</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder={t('Search help topics...', 'सहायता विषय खोज्नुहोस्...')}
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-crimson-500/20 focus:border-crimson-300 transition-all"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* FAQs */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                <HelpCircle size={16} className="text-crimson-500" />
                {t('Frequently Asked Questions', 'बारम्बार सोधिने प्रश्नहरू')}
              </h3>
            </div>
            <div className="divide-y divide-slate-100">
              {filteredFaqs.map((faq, i) => (
                <div key={i}>
                  <button onClick={() => setOpen(open === i ? null : i)} className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50/50 transition-colors gap-3">
                    <div className="flex items-center gap-3">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${faq.category === 'Transfer' ? 'bg-orange-50 text-orange-600' : faq.category === 'Tiro' ? 'bg-amber-50 text-amber-600' : faq.category === 'Legal' ? 'bg-red-50 text-red-600' : faq.category === 'Security' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>{faq.category}</span>
                      <span className="text-sm font-medium text-slate-700">{t(faq.q, faq.qNp)}</span>
                    </div>
                    <ChevronDown size={16} className={`text-slate-400 shrink-0 transition-transform duration-200 ${open === i ? 'rotate-180' : ''}`} />
                  </button>
                  {open === i && (
                    <div className="px-5 pb-4">
                      <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-4 leading-relaxed border border-slate-100">{t(faq.a, faq.aNp)}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Contact */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-semibold text-slate-800 text-sm">{t('Contact Malpot Office', 'मालपोत कार्यालय सम्पर्क')}</h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-9 h-9 bg-crimson-50 text-crimson-600 rounded-lg flex items-center justify-center shrink-0">
                  <Phone size={14} />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">{t('Helpline', 'हेल्पलाइन')}</p>
                  <p className="text-sm font-semibold text-slate-700">1800-123-4567</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
                  <Mail size={14} />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">{t('Email', 'इमेल')}</p>
                  <p className="text-sm font-semibold text-slate-700">help@chainland.gov.np</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shrink-0">
                  <MapPin size={14} />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">{t('Office', 'कार्यालय')}</p>
                  <p className="text-sm font-semibold text-slate-700">Babar Mahal, Kathmandu</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-semibold text-slate-800 text-sm">{t('Quick Links', 'द्रुत लिंकहरू')}</h3>
            </div>
            <div className="p-4 space-y-2">
              {quickLinks.map((link, i) => (
                <a key={i} href={link.url} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-crimson-200 hover:bg-crimson-50/30 transition-all group">
                  <link.icon size={14} className="text-slate-400 group-hover:text-crimson-500" />
                  <span className="text-sm text-slate-700 group-hover:text-crimson-600 font-medium">{t(link.label, link.labelNp)}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
