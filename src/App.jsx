import React, { useState, useEffect, lazy, Suspense } from 'react';
import {
  Share2, Briefcase, GraduationCap, Calendar, BarChart3, MessageSquare,
  Sparkles, Hash, Plus, CheckCircle2, Clock, Send, ThumbsUp, Eye, Search,
  Filter, Award, Bookmark, ArrowUpRight, Sun, Moon, LayoutDashboard,
  Layers, CheckSquare, Settings, Bell, RefreshCw, X, Instagram, Linkedin, Twitter,
  Facebook, ChevronRight, TrendingUp, Users, DollarSign, UserCheck, AlertCircle, FileText,
  Globe, Terminal, Download, ExternalLink, Check, Trash2, SlidersHorizontal, Cpu, Zap, Radio,
  FileCode, User, Wrench, FolderGit2, Edit3, HelpCircle, Target, Sparkle
} from 'lucide-react';
import ClassroomView from './components/Tutoring/ClassroomView';
import AuthGate from './components/Auth/AuthGate';
import Avatar from './components/common/Avatar';
import AdminPortal from './components/Institution/AdminPortal';
// Inventor's Lab pulls in KaTeX + recharts, so it loads only when its tab is opened
const InventorsLab = lazy(() => import('./components/Lab/InventorsLab'));
import { useClassroomStore } from './state/classroomContext';
import { consumeCheckoutReturn } from './lib/payments';
import { useServerEntitlements } from './lib/useServerEntitlements';

// Read ?checkout=success|cancelled once at startup (module scope, so StrictMode's
// double render can't consume it twice) and strip it from the URL.
const CHECKOUT_RETURN = typeof window !== 'undefined' ? consumeCheckoutReturn() : null;
import PricingModal from './components/Pricing/PricingModal';
import TierBadge from './components/Pricing/TierBadge';

// --- MOCK INITIAL RESUME DATA ---
const INITIAL_RESUME = {
  personalInfo: {
    fullName: 'Alex Morgan',
    jobTitle: 'Senior Full Stack & AI Solutions Engineer',
    email: 'alex.morgan@example.com',
    phone: '+1 (555) 234-5678',
    location: 'San Francisco, CA (Remote)',
    linkedin: 'linkedin.com/in/alexmorgan-dev',
    portfolio: 'alexmorgan.dev',
    summary: 'Results-driven Full Stack Engineer with 6+ years of experience engineering scalable React microservices, distributed Node.js architectures, and integrating frontier LLM APIs. Proven track record of improving system performance by 40%.'
  },
  experience: [
    {
      id: 'exp-1',
      company: 'TechCorp AI Labs',
      role: 'Lead Frontend & AI Engineer',
      location: 'San Francisco, CA',
      period: '2023 - Present',
      bullets: [
        'Engineered high-throughput React & TypeScript dashboard serving 120k active monthly users with sub-100ms render speeds.',
        'Integrated OpenAI & Gemini API pipelines into core SaaS product, boosting daily user engagement by 35%.',
        'Architected CI/CD automation pipelines reducing deployment lead time from 45 mins to under 8 mins.'
      ]
    },
    {
      id: 'exp-2',
      company: 'CloudNexus Solutions',
      role: 'Software Engineer',
      location: 'Austin, TX',
      period: '2020 - 2023',
      bullets: [
        'Developed microservices using Node.js and PostgreSQL handling 5M daily queries with 99.99% uptime.',
        'Spearheaded frontend migration from legacy jQuery to React/Tailwind CSS, improving mobile performance score to 98/100.'
      ]
    }
  ],
  education: [
    {
      id: 'edu-1',
      institution: 'University of California, Berkeley',
      degree: 'B.S. in Computer Science & Artificial Intelligence',
      location: 'Berkeley, CA',
      period: '2016 - 2020',
      honors: 'Magna Cum Laude (GPA: 3.9/4.0)'
    }
  ],
  skills: {
    technical: ['React.js', 'Node.js', 'TypeScript', 'Python', 'AWS', 'Docker', 'GraphQL', 'Tailwind CSS', 'PostgreSQL'],
    soft: ['Technical Leadership', 'Agile/Scrum', 'Product Architecture', 'Mentorship']
  },
  projects: [
    {
      id: 'proj-1',
      name: 'PulseSync Platform',
      tech: 'React, Node.js, Tailwind, Gemini API',
      link: 'github.com/alex/pulsesync',
      description: 'Built an open-source social media management and web scraping automation tool with 1.2k GitHub stars.'
    }
  ],
  certifications: ['AWS Certified Solutions Architect - Associate (2024)', 'Certified Scrum Master (CSM)']
};

// --- INITIAL OPPORTUNITIES ---
const INITIAL_OPPORTUNITIES = [
  {
    id: 'opp-1',
    title: 'Senior Full Stack AI Engineer',
    organization: 'OpenAI Labs',
    source: 'LinkedIn Jobs',
    type: 'Full-Time',
    category: 'Job',
    location: 'Remote (US/EU)',
    funding: '$140,000 - $185,000 / yr',
    skills: ['React', 'Node.js', 'Python', 'LLMs'],
    matchScore: 96,
    deadline: 'Closing in 6 days',
    url: 'https://linkedin.com/jobs',
    description: 'Lead next-gen AI interface development. Work directly with frontier models and scalable web microservices.'
  },
  {
    id: 'opp-2',
    title: 'Chevening UK Government Masters Scholarship 2026/2027',
    organization: 'UK Foreign, Commonwealth & Development Office',
    source: 'Chevening Official',
    type: 'Fully Funded',
    category: 'Scholarship',
    location: 'United Kingdom (Multi-University)',
    funding: '100% Tuition + £1,400/mo Stipend + Flights',
    skills: ['Leadership', 'Research', 'Python', 'Public Policy'],
    matchScore: 91,
    deadline: 'Closing in 14 days',
    url: 'https://chevening.org',
    description: 'Fully funded master’s degree at any top UK university for outstanding emerging global leaders.'
  },
  {
    id: 'opp-3',
    title: 'Erasmus Mundus Joint Master in Cloud Computing & AI',
    organization: 'European Commission Consortium',
    source: 'Erasmus Portal',
    type: 'Fully Funded',
    category: 'Scholarship',
    location: 'France, Finland, & Spain',
    funding: '€1,400/mo + Full Tuition Waiver',
    skills: ['Cloud Architectures', 'Node.js', 'Linux', 'Python'],
    matchScore: 88,
    deadline: 'Closing in 20 days',
    url: 'https://erasmus-plus.ec.europa.eu',
    description: 'Study across 3 European universities with full mobility grant and industrial mentorship.'
  }
];

export default function App() {
  const [activeMainTab, setActiveMainTab] = useState('resume'); // 'resume' | 'career_tools' | 'opportunities' | 'social' | 'classroom' | 'lab'
  const [darkMode, setDarkMode] = useState(true);

  // Global auth state lives in ClassroomStore:
  // currentUser = { name, email, role: 'student' | 'instructor' | 'institution_admin', institutionId, institution, institutionStatus, verified, avatarUrl } | null
  const { currentUser, pricing } = useClassroomStore();
  useServerEntitlements(); // apply webhook-confirmed plans from the payments server
  const [checkoutBanner, setCheckoutBanner] = useState(CHECKOUT_RETURN);

  // Shared Global Data State
  const [resumeData, setResumeData] = useState(INITIAL_RESUME);
  const [opportunities, setOpportunities] = useState(INITIAL_OPPORTUNITIES);
  const [applications, setApplications] = useState([
    { id: 'app-1', title: 'Senior Full Stack AI Engineer', org: 'OpenAI Labs', status: 'Applied', date: 'Applied 2d ago', matchScore: 96 },
    { id: 'app-2', title: 'Chevening Masters Scholarship', org: 'UK Government', status: 'Interviewing', date: 'Submitted 1w ago', matchScore: 91 }
  ]);

  const [scheduledPosts, setScheduledPosts] = useState([
    { id: 'post-1', text: "🚀 Excited to announce I updated my portfolio & CV with new AI projects! Check out my work at alexmorgan.dev #BuildInPublic #SoftwareEngineer", platforms: ['linkedin', 'twitter'], date: "Today at 5:00 PM", status: "Scheduled" }
  ]);

  // Modals State
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedShareItem, setSelectedShareItem] = useState(null);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleShareToSocial = (text) => {
    setSelectedShareItem(text);
    setShareModalOpen(true);
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} font-sans transition-colors duration-200`}>
      {/* HEADER NAVBAR */}
      <header className="sticky top-0 z-40 w-full border-b backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800">
        <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 p-2 rounded-xl shadow-lg shadow-indigo-500/20">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="whitespace-nowrap font-extrabold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
                PulseSync <span className="text-slate-400 font-light">&</span> CareerHub
              </span>
              <span className="hidden min-[1700px]:inline-block ml-2 text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                AI Suite v4.0
              </span>
            </div>
          </div>

          {/* MAIN TAB SWITCHER */}
          <div className="flex items-center min-w-0 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto [scrollbar-width:none]">
            <button
              onClick={() => setActiveMainTab('resume')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                activeMainTab === 'resume'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <TabLabel full="Resume / CV Builder" short="Resume" />
            </button>
            <button
              onClick={() => setActiveMainTab('career_tools')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                activeMainTab === 'career_tools'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <TabLabel full="Career Tools Suite" short="Career Tools" />
            </button>
            <button
              onClick={() => setActiveMainTab('opportunities')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                activeMainTab === 'opportunities'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <TabLabel full="Job & Grant Radar" short="Job Radar" />
            </button>
            <button
              onClick={() => setActiveMainTab('social')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                activeMainTab === 'social'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Social Studio</span>
            </button>
            <button
              onClick={() => setActiveMainTab('classroom')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                activeMainTab === 'classroom'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <TabLabel full="Virtual Classroom" short="Classroom" />
            </button>
            <button
              onClick={() => setActiveMainTab('lab')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                activeMainTab === 'lab'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Inventor's Lab</span>
            </button>
          </div>

          {/* RIGHT UTILITIES */}
          <div className="flex items-center gap-3 shrink-0">
            <TierBadge />
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {currentUser ? (
              <span title={`${currentUser.name} — ${currentUser.institution}`}>
                <Avatar name={currentUser.name} src={currentUser.avatarUrl} size="md" className="ring-2 ring-indigo-500/40" />
              </span>
            ) : (
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120"
                alt="Profile"
                className="w-8 h-8 rounded-full ring-2 ring-indigo-500/40 object-cover"
              />
            )}
          </div>
        </div>
      </header>

      {checkoutBanner && (
        <div
          role="status"
          className={`max-w-7xl mx-auto mt-4 mx-4 sm:mx-auto px-4 py-3 rounded-xl border text-xs flex items-start justify-between gap-3 ${
            checkoutBanner === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-slate-500/10 border-slate-500/30 text-slate-300'
          }`}
        >
          <span>
            {checkoutBanner === 'success'
              ? 'Payment received, thank you! Your plan activates as soon as the payment provider confirms it. Sign in to see it applied.'
              : 'Checkout cancelled. You haven’t been charged.'}
          </span>
          <button onClick={() => setCheckoutBanner(null)} aria-label="Dismiss" className="shrink-0 opacity-70 hover:opacity-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeMainTab === 'resume' && (
          <ResumeBuilderModule
            resumeData={resumeData}
            setResumeData={setResumeData}
            onShare={handleShareToSocial}
          />
        )}

        {activeMainTab === 'career_tools' && (
          <CareerToolsModule
            resumeData={resumeData}
            applications={applications}
            onShare={handleShareToSocial}
          />
        )}

        {activeMainTab === 'opportunities' && (
          <OpportunityRadarModule
            opportunities={opportunities}
            setOpportunities={setOpportunities}
            resumeSkills={resumeData.skills.technical}
            applications={applications}
            setApplications={setApplications}
            onShare={handleShareToSocial}
            onImportToResume={(opp) => {
              const newSkills = [...new Set([...resumeData.skills.technical, ...opp.skills])];
              setResumeData({
                ...resumeData,
                skills: { ...resumeData.skills, technical: newSkills }
              });
              alert(`Added keywords from "${opp.title}" to your active CV profile skills!`);
            }}
          />
        )}

        {activeMainTab === 'social' && (
          <SocialStudioModule
            scheduledPosts={scheduledPosts}
            setScheduledPosts={setScheduledPosts}
          />
        )}

        {activeMainTab === 'classroom' &&
          (!currentUser ? <AuthGate /> : currentUser.role === 'institution_admin' ? <AdminPortal /> : <ClassroomView />)}

        {activeMainTab === 'lab' && (
          <Suspense fallback={<p className="text-xs text-slate-400 text-center py-16">Loading Inventor’s Lab…</p>}>
            <InventorsLab />
          </Suspense>
        )}
      </main>

      {/* SHARE MODAL */}
      {shareModalOpen && selectedShareItem && (
        <ShareToSocialModal
          initialText={selectedShareItem}
          onClose={() => setShareModalOpen(false)}
          onAddPost={(newPost) => {
            setScheduledPosts([newPost, ...scheduledPosts]);
            setShareModalOpen(false);
          }}
        />
      )}

      {/* PRICING MODAL (opened from the tier badge or when a Free limit is hit) */}
      {pricing.open && <PricingModal onNavigate={setActiveMainTab} />}
    </div>
  );
}

// Short tab labels below 1700px so all six tabs plus the plan badge fit; full names on wide screens
function TabLabel({ full, short }) {
  return (
    <span title={full}>
      <span className="min-[1700px]:hidden">{short}</span>
      <span className="hidden min-[1700px]:inline">{full}</span>
    </span>
  );
}

// ============================================================================
// MODULE 1: DYNAMIC RESUME & CV BUILDER (DUAL-PANE + ATS + AI ENHANCER)
// ============================================================================
function ResumeBuilderModule({ resumeData, setResumeData, onShare }) {
  const [activeSection, setActiveSection] = useState('personal'); // 'personal' | 'experience' | 'education' | 'skills' | 'projects'
  const [templateStyle, setTemplateStyle] = useState('modern'); // 'modern' | 'executive' | 'minimal'
  const [accentColor, setAccentColor] = useState('#4f46e5'); // Indigo
  const [atsMetrics, setAtsMetrics] = useState({ score: 88, keywordMatch: 92, formatting: 95, metricsCount: 3 });
  const { consumeAiGeneration, openPricing } = useClassroomStore();

  // Calculate ATS Score live
  useEffect(() => {
    let score = 50;
    if (resumeData.personalInfo.fullName && resumeData.personalInfo.email) score += 10;
    if (resumeData.personalInfo.summary.length > 50) score += 10;
    if (resumeData.experience.length >= 2) score += 15;
    if (resumeData.skills.technical.length >= 5) score += 10;
    if (resumeData.education.length >= 1) score += 5;
    setAtsMetrics(prev => ({ ...prev, score: Math.min(score, 100) }));
  }, [resumeData]);

  // AI Bullet Enhancer Simulator
  const enhanceBulletWithAI = (expId, bulletIndex) => {
    // Free plan: each AI rewrite spends one generation; out of credits → pricing
    if (!consumeAiGeneration()) {
      openPricing('ai');
      return;
    }
    const original = resumeData.experience.find(e => e.id === expId).bullets[bulletIndex];
    const enhanced = `Engineered robust automated framework for "${original.split(' ')[0] || 'task'}", increasing execution velocity by 42% and optimizing resource consumption.`;

    const updatedExp = resumeData.experience.map(e => {
      if (e.id === expId) {
        const newBullets = [...e.bullets];
        newBullets[bulletIndex] = enhanced;
        return { ...e, bullets: newBullets };
      }
      return e;
    });

    setResumeData({ ...resumeData, experience: updatedExp });
  };

  const handlePrintExport = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* ATS BAR & CONTROLS HEADER */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        {/* ATS Score Indicator */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="text-center">
              <span className="text-xl font-black text-emerald-400 leading-none">{atsMetrics.score}%</span>
              <span className="text-[9px] font-bold text-slate-400 block uppercase">ATS Score</span>
            </div>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-800"></div>
            <div className="text-xs space-y-0.5">
              <p className="text-slate-600 dark:text-slate-300 font-semibold">ATS Optimization Status</p>
              <p className="text-[10px] text-slate-400">High Keyword Density • Measurable Metrics Detected</p>
            </div>
          </div>
        </div>

        {/* Template & Color Selector */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {['modern', 'executive', 'minimal'].map((tpl) => (
              <button
                key={tpl}
                onClick={() => setTemplateStyle(tpl)}
                className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition ${
                  templateStyle === tpl ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400'
                }`}
              >
                {tpl}
              </button>
            ))}
          </div>

          {/* Accent Pickers */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-slate-800">
            {['#4f46e5', '#059669', '#d97706', '#dc2626'].map((c) => (
              <button
                key={c}
                onClick={() => setAccentColor(c)}
                style={{ backgroundColor: c }}
                className={`w-5 h-5 rounded-full transition-transform ${accentColor === c ? 'scale-125 ring-2 ring-white' : ''}`}
              />
            ))}
          </div>

          <button
            onClick={handlePrintExport}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-indigo-500/20"
          >
            <Download className="w-3.5 h-3.5" /> Export PDF / Print
          </button>
        </div>
      </div>

      {/* DUAL PANE RESUME EDITOR & PREVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT PANE: FORM EDITORS */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            {/* Editor Section Switcher */}
            <div className="flex gap-2 overflow-x-auto pb-2 border-b border-slate-100 dark:border-slate-800">
              {['personal', 'experience', 'education', 'skills', 'projects'].map((sec) => (
                <button
                  key={sec}
                  onClick={() => setActiveSection(sec)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition whitespace-nowrap ${
                    activeSection === sec
                      ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {sec}
                </button>
              ))}
            </div>

            {/* SECTION 1: PERSONAL INFO */}
            {activeSection === 'personal' && (
              <div className="space-y-3">
                <h4 className="font-bold text-xs text-slate-400 uppercase">Personal Contact Info</h4>
                <div>
                  <label className="text-[11px] text-slate-400">Full Name</label>
                  <input
                    type="text"
                    value={resumeData.personalInfo.fullName}
                    onChange={(e) => setResumeData({
                      ...resumeData,
                      personalInfo: { ...resumeData.personalInfo, fullName: e.target.value }
                    })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">Professional Title</label>
                  <input
                    type="text"
                    value={resumeData.personalInfo.jobTitle}
                    onChange={(e) => setResumeData({
                      ...resumeData,
                      personalInfo: { ...resumeData.personalInfo, jobTitle: e.target.value }
                    })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-400">Email</label>
                    <input
                      type="text"
                      value={resumeData.personalInfo.email}
                      onChange={(e) => setResumeData({
                        ...resumeData,
                        personalInfo: { ...resumeData.personalInfo, email: e.target.value }
                      })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400">Phone</label>
                    <input
                      type="text"
                      value={resumeData.personalInfo.phone}
                      onChange={(e) => setResumeData({
                        ...resumeData,
                        personalInfo: { ...resumeData.personalInfo, phone: e.target.value }
                      })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">Professional Executive Summary</label>
                  <textarea
                    rows={4}
                    value={resumeData.personalInfo.summary}
                    onChange={(e) => setResumeData({
                      ...resumeData,
                      personalInfo: { ...resumeData.personalInfo, summary: e.target.value }
                    })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none resize-none"
                  />
                </div>
              </div>
            )}

            {/* SECTION 2: WORK EXPERIENCE */}
            {activeSection === 'experience' && (
              <div className="space-y-4">
                <h4 className="font-bold text-xs text-slate-400 uppercase">Work Experience Entries</h4>
                {resumeData.experience.map((exp) => (
                  <div key={exp.id} className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-xs text-slate-200">{exp.role} @ {exp.company}</span>
                      <span className="text-[10px] text-slate-400">{exp.period}</span>
                    </div>

                    <div className="space-y-2 pt-1">
                      {exp.bullets.map((bullet, idx) => (
                        <div key={idx} className="flex gap-2 items-start">
                          <textarea
                            rows={2}
                            value={bullet}
                            onChange={(e) => {
                              const newBullets = [...exp.bullets];
                              newBullets[idx] = e.target.value;
                              const updatedExp = resumeData.experience.map(item => item.id === exp.id ? { ...item, bullets: newBullets } : item);
                              setResumeData({ ...resumeData, experience: updatedExp });
                            }}
                            className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-[11px] text-slate-300 focus:outline-none"
                          />
                          <button
                            onClick={() => enhanceBulletWithAI(exp.id, idx)}
                            title="Rewrite with AI Action Verbs & Metrics"
                            className="px-2 py-1.5 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/40 rounded-lg text-[10px] font-bold flex items-center gap-1"
                          >
                            <Sparkles className="w-3 h-3" /> AI
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* SECTION 3: SKILLS */}
            {activeSection === 'skills' && (
              <div className="space-y-3">
                <h4 className="font-bold text-xs text-slate-400 uppercase">Skills & Competencies</h4>
                <div>
                  <label className="text-[11px] text-slate-400">Technical Skills (Comma Separated)</label>
                  <input
                    type="text"
                    value={resumeData.skills.technical.join(', ')}
                    onChange={(e) => setResumeData({
                      ...resumeData,
                      skills: {
                        ...resumeData.skills,
                        technical: e.target.value.split(',').map(s => s.trim())
                      }
                    })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANE: REAL-TIME PIXEL-PERFECT PREVIEW DOCUMENT */}
        <div className="lg:col-span-7">
          <div className="bg-white text-slate-900 rounded-2xl p-8 shadow-2xl min-h-[700px] space-y-6 font-sans">
            {/* DOCUMENT HEADER */}
            <div className="border-b-2 pb-4 space-y-1" style={{ borderColor: accentColor }}>
              <h1 className="text-2xl font-black tracking-tight" style={{ color: accentColor }}>
                {resumeData.personalInfo.fullName || 'YOUR NAME'}
              </h1>
              <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">
                {resumeData.personalInfo.jobTitle}
              </p>
              <div className="flex flex-wrap gap-3 text-[10px] text-slate-500 pt-1">
                <span>{resumeData.personalInfo.email}</span>
                <span>•</span>
                <span>{resumeData.personalInfo.phone}</span>
                <span>•</span>
                <span>{resumeData.personalInfo.location}</span>
                <span>•</span>
                <span>{resumeData.personalInfo.linkedin}</span>
              </div>
            </div>

            {/* SUMMARY */}
            <div className="space-y-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Executive Summary</h3>
              <p className="text-xs leading-relaxed text-slate-600">{resumeData.personalInfo.summary}</p>
            </div>

            {/* EXPERIENCE */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1">
                Professional Experience
              </h3>
              {resumeData.experience.map((exp) => (
                <div key={exp.id} className="space-y-1">
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold text-xs text-slate-900">{exp.role} — <span style={{ color: accentColor }}>{exp.company}</span></span>
                    <span className="text-[10px] text-slate-500 font-semibold">{exp.period}</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600 leading-relaxed">
                    {exp.bullets.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* EDUCATION */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1">
                Education
              </h3>
              {resumeData.education.map((edu) => (
                <div key={edu.id} className="flex justify-between items-baseline text-xs">
                  <div>
                    <span className="font-bold text-slate-900">{edu.degree}</span>
                    <span className="text-slate-500 text-[11px] block">{edu.institution}</span>
                  </div>
                  <span className="text-[10px] text-slate-500">{edu.period}</span>
                </div>
              ))}
            </div>

            {/* SKILLS */}
            <div className="space-y-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1">
                Technical Expertise
              </h3>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {resumeData.skills.technical.map((sk, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-semibold">
                    {sk}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MODULE 2: RELATED CAREER DEVELOPMENT TOOLS (COVER LETTER, LINKEDIN & STAR PREP)
// ============================================================================
function CareerToolsModule({ resumeData, applications, onShare }) {
  const [activeTool, setActiveTool] = useState('cover_letter'); // 'cover_letter' | 'linkedin' | 'star_prep'
  const [jobTitle, setJobTitle] = useState('Senior Full Stack Engineer');
  const [companyName, setCompanyName] = useState('OpenAI Labs');
  const [generatedLetter, setGeneratedLetter] = useState('');
  const [isDrafting, setIsDrafting] = useState(false);
  const { consumeAiGeneration, openPricing } = useClassroomStore();

  // STAR Method Interview State
  const [starQuestions, setStarQuestions] = useState([
    {
      question: "Tell me about a time you had to optimize a slow-performing system under deadline.",
      situation: "At TechCorp, our core React analytics dashboard took over 4 seconds to render during peak loads.",
      task: "I was tasked with reducing latency to under 500ms before a major enterprise client onboarding.",
      action: "Implemented React.memo, virtualized long lists, and offloaded heavy computations to Web Workers.",
      result: "Reduced render time to 85ms (a 97% improvement) and successfully onboarded the enterprise client."
    }
  ]);

  const handleGenerateCoverLetter = () => {
    if (!consumeAiGeneration()) {
      openPricing('ai');
      return;
    }
    setIsDrafting(true);
    setTimeout(() => {
      setGeneratedLetter(
        `Dear Hiring Team at ${companyName},\n\nI am writing to express my enthusiastic interest in the ${jobTitle} position. With over 6+ years of engineering scalable microservices and leveraging modern frameworks like ${resumeData.skills.technical.slice(0, 3).join(', ')}, I am confident in my capability to deliver immediate value to ${companyName}.\n\nIn my previous role at ${resumeData.experience[0]?.company || 'TechCorp'}, I led high-impact technical initiatives that improved system response speeds by 35%. I am eager to bring this same engineering rigor and focus to ${companyName}.\n\nThank you for your time and consideration.\n\nSincerely,\n${resumeData.personalInfo.fullName}`
      );
      setIsDrafting(false);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* TOOL SWITCHER TABS */}
      <div className="flex gap-2 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTool('cover_letter')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTool === 'cover_letter'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4" /> AI Cover Letter Writer
        </button>
        <button
          onClick={() => setActiveTool('linkedin')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTool === 'linkedin'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Linkedin className="w-4 h-4" /> LinkedIn Profile Optimizer
        </button>
        <button
          onClick={() => setActiveTool('star_prep')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTool === 'star_prep'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Target className="w-4 h-4" /> STAR Method Interview Prep
        </button>
      </div>

      {/* TOOL 1: COVER LETTER WRITER */}
      {activeTool === 'cover_letter' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-500" /> Target Role Parameters
            </h3>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Target Job Title</label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Company Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none"
              />
            </div>

            <button
              onClick={handleGenerateCoverLetter}
              disabled={isDrafting}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {isDrafting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Generate Tailored Cover Letter
            </button>
          </div>

          <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <h4 className="font-bold text-xs text-slate-400 uppercase">Generated Cover Letter</h4>
            <textarea
              rows={12}
              value={generatedLetter || "Click generate to draft a cover letter matching your CV..."}
              onChange={(e) => setGeneratedLetter(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-300 focus:outline-none leading-relaxed resize-none"
            />
          </div>
        </div>
      )}

      {/* TOOL 2: LINKEDIN OPTIMIZER */}
      {activeTool === 'linkedin' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Linkedin className="w-4 h-4 text-blue-500" /> LinkedIn Headline & "About" Optimizer
          </h3>

          <div className="space-y-4">
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <span className="text-[10px] uppercase font-bold text-indigo-400">Recommended Headline</span>
              <p className="text-xs font-semibold text-slate-200">
                {resumeData.personalInfo.jobTitle} | Ex-TechCorp | Building Scalable React & AI Microservices | 120k+ Active Users Reached
              </p>
              <button
                onClick={() => onShare(`🚀 Excited to share my updated LinkedIn headline: "${resumeData.personalInfo.jobTitle} | Building Scalable React & AI Microservices!"`)}
                className="text-[10px] text-indigo-400 font-bold hover:underline"
              >
                + Share to Social Studio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOOL 3: STAR INTERVIEW PREP */}
      {activeTool === 'star_prep' && (
        <div className="space-y-4">
          {starQuestions.map((q, idx) => (
            <div key={idx} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <h4 className="font-bold text-sm text-indigo-400 flex items-center gap-2">
                <HelpCircle className="w-4 h-4" /> Behavioral Question: {q.question}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2 text-xs">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="font-bold text-emerald-400 block mb-1">Situation</span>
                  <p className="text-slate-400 text-[11px]">{q.situation}</p>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="font-bold text-blue-400 block mb-1">Task</span>
                  <p className="text-slate-400 text-[11px]">{q.task}</p>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="font-bold text-purple-400 block mb-1">Action</span>
                  <p className="text-slate-400 text-[11px]">{q.action}</p>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="font-bold text-amber-400 block mb-1">Result</span>
                  <p className="text-slate-400 text-[11px]">{q.result}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MODULE 3: OPPORTUNITY FINDER & WEB RADAR
// ============================================================================
function OpportunityRadarModule({ opportunities, setOpportunities, resumeSkills, applications, setApplications, onShare, onImportToResume }) {
  const [subTab, setSubTab] = useState('radar');
  const [isScraping, setIsScraping] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const triggerScrape = () => {
    setIsScraping(true);
    setTimeout(() => {
      const scraped = [
        {
          id: `opp-scraped-${Date.now()}`,
          title: 'Staff AI Infrastructure Architect',
          organization: 'Anthropic Labs',
          source: 'Indeed',
          type: 'Full-Time Remote',
          category: 'Job',
          location: 'Remote',
          funding: '$180,000 - $240,000 / yr',
          skills: ['Python', 'LLMs', 'React', 'AWS'],
          matchScore: 97,
          deadline: 'Closing in 8 days',
          url: 'https://anthropic.com',
          description: 'Architect distributed cluster inference engines for next-generation alignment models.'
        }
      ];
      setOpportunities(prev => [...scraped, ...prev]);
      setIsScraping(false);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex gap-2">
          <button onClick={() => setSubTab('radar')} className={`px-4 py-2 rounded-xl text-xs font-bold ${subTab === 'radar' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>
            Live Radar Feed
          </button>
          <button onClick={() => setSubTab('kanban')} className={`px-4 py-2 rounded-xl text-xs font-bold ${subTab === 'kanban' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>
            Application Kanban ({applications.length})
          </button>
        </div>
        <button onClick={triggerScrape} disabled={isScraping} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-2">
          <RefreshCw className={`w-3.5 h-3.5 ${isScraping ? 'animate-spin' : ''}`} /> Fetch Live Web
        </button>
      </div>

      {subTab === 'radar' && (
        <div className="space-y-4">
          {opportunities.map((opp) => (
            <div key={opp.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400">{opp.category}</span>
                  <h4 className="text-base font-extrabold text-slate-900 dark:text-white mt-1">{opp.title}</h4>
                  <p className="text-xs text-slate-400">{opp.organization} • {opp.location}</p>
                </div>
                <span className="text-lg font-black text-emerald-400">{opp.matchScore}% Match</span>
              </div>
              <p className="text-xs text-slate-300">{opp.description}</p>
              <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                <span className="text-xs text-emerald-400 font-bold">{opp.funding}</span>
                <div className="flex gap-2">
                  <button onClick={() => onImportToResume(opp)} className="px-3 py-1.5 bg-indigo-500/10 text-indigo-400 text-xs font-bold rounded-xl">
                    Import to CV Target
                  </button>
                  <button onClick={() => onShare(`🚀 Exciting opportunity found: ${opp.title} at ${opp.organization}!`)} className="px-3 py-1.5 border border-slate-700 text-slate-300 text-xs font-bold rounded-xl">
                    Share Post
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {subTab === 'kanban' && (
        <div className="grid grid-cols-3 gap-4">
          {['Saved', 'Applied', 'Interviewing'].map((col) => (
            <div key={col} className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800 space-y-3 min-h-[300px]">
              <h4 className="font-bold text-xs uppercase text-slate-400">{col}</h4>
              {applications.filter(a => a.status === col).map(app => (
                <div key={app.id} className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                  <h5 className="font-bold text-xs text-white">{app.title}</h5>
                  <p className="text-[10px] text-slate-400">{app.org}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MODULE 4: SOCIAL MEDIA MANAGEMENT & STUDIO
// ============================================================================
function SocialStudioModule({ scheduledPosts, setScheduledPosts }) {
  const [postText, setPostText] = useState('');

  const handleSchedule = () => {
    if (!postText.trim()) return;
    setScheduledPosts([{
      id: `post-${Date.now()}`,
      text: postText,
      platforms: ['linkedin', 'twitter'],
      date: 'Scheduled Soon',
      status: 'Scheduled'
    }, ...scheduledPosts]);
    setPostText('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
          <Share2 className="w-4 h-4 text-indigo-500" /> Multi-Platform Publisher
        </h3>
        <textarea
          value={postText}
          onChange={(e) => setPostText(e.target.value)}
          placeholder="Share your career milestone or job announcement..."
          className="w-full h-32 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none resize-none"
        />
        <div className="flex justify-end">
          <button onClick={handleSchedule} className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl">
            Schedule Post
          </button>
        </div>
      </div>

      <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
        <h4 className="font-bold text-xs text-slate-400 uppercase">Scheduled Queue</h4>
        {scheduledPosts.map(p => (
          <div key={p.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
            <p className="text-slate-200">{p.text}</p>
            <span className="text-[10px] text-indigo-400 font-bold">{p.date}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// MODAL: SHARE TO SOCIAL
function ShareToSocialModal({ initialText, onClose, onAddPost }) {
  const [text, setText] = useState(initialText);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h3 className="font-bold text-sm text-white">Share to Social Media Studio</h3>
          <button onClick={onClose} className="text-slate-400"><X className="w-4 h-4" /></button>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full h-36 p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none"
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-400">Cancel</button>
          <button
            onClick={() => {
              onAddPost({ id: `post-${Date.now()}`, text, platforms: ['linkedin'], date: 'Just now', status: 'Scheduled' });
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
          >
            Post Now
          </button>
        </div>
      </div>
    </div>
  );
}
