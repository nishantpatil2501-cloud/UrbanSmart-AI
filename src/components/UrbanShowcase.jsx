import { useRef, useEffect, useState } from 'react';
import { MapPin, Phone, Mail, Globe, ExternalLink, Building2, TreePine, Zap, ShieldCheck, Navigation, ChevronDown } from 'lucide-react';

/* ─────────────────────────────────────────────────────────
   3-D FLOATING BUILDING CARD  (pure CSS 3D transform)
───────────────────────────────────────────────────────── */
const Building3D = ({ floors, color, label, height, delay }) => {
  const floors_arr = Array.from({ length: floors });
  return (
    <div
      className="flex flex-col-reverse items-center gap-0.5 animate-[float_4s_ease-in-out_infinite]"
      style={{ animationDelay: delay }}
    >
      {floors_arr.map((_, i) => (
        <div
          key={i}
          className="relative"
          style={{ width: `${height}px`, height: '14px', transform: 'rotateX(20deg)' }}
        >
          {/* Floor face */}
          <div
            className="absolute inset-0 rounded-sm"
            style={{ background: i === floors - 1 ? color : `${color}cc`, boxShadow: `0 1px 3px rgba(0,0,0,0.4)` }}
          />
          {/* Window dots */}
          <div className="absolute inset-0 flex items-center justify-around px-1">
            {Array.from({ length: Math.floor(height / 16) }).map((_, wi) => (
              <div
                key={wi}
                className="w-1.5 h-2 rounded-sm"
                style={{ background: i % 3 !== 0 ? 'rgba(255,255,200,0.8)' : 'rgba(100,200,255,0.5)' }}
              />
            ))}
          </div>
        </div>
      ))}
      {/* Roof */}
      <div
        className="w-1.5 rounded-full"
        style={{ height: '20px', background: color, boxShadow: `0 0 12px ${color}80` }}
      />
      <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mt-2 text-center">
        {label}
      </p>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────
   ANIMATED PULSE GRID BACKGROUND
───────────────────────────────────────────────────────── */
const GridBg = () => (
  <div
    className="absolute inset-0 opacity-20 dark:opacity-10 pointer-events-none"
    style={{
      backgroundImage:
        'linear-gradient(to right, #3b82f680 1px, transparent 1px), linear-gradient(to bottom, #3b82f680 1px, transparent 1px)',
      backgroundSize: '40px 40px',
    }}
  />
);

/* ─────────────────────────────────────────────────────────
   3D CARD  with tilt-on-hover
───────────────────────────────────────────────────────── */
const Card3D = ({ children, className }) => {
  const ref = useRef(null);

  const handleMove = (e) => {
    const card = ref.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    card.style.transform = `perspective(700px) rotateY(${dx * 9}deg) rotateX(${-dy * 9}deg) scale(1.04)`;
  };

  const handleLeave = () => {
    const card = ref.current;
    if (card) card.style.transform = 'perspective(700px) rotateY(0deg) rotateX(0deg) scale(1)';
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={`transition-transform duration-200 ease-out will-change-transform cursor-default ${className}`}
    >
      {children}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────
   FEATURE SHOWCASE CARD
───────────────────────────────────────────────────────── */
const FeatureCard = ({ icon: Icon, title, desc, gradient, glowColor, delay }) => (
  <Card3D
    className="rounded-2xl overflow-hidden border border-white/10 dark:border-slate-700/40"
    style={{ animationDelay: delay }}
  >
    <div
      className="p-6 h-full relative"
      style={{ background: gradient }}
    >
      {/* Glow blob */}
      <div
        className="absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-40"
        style={{ background: glowColor }}
      />
      <div className="relative z-10">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-lg"
          style={{ background: glowColor, boxShadow: `0 0 20px ${glowColor}80` }}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>
        <h3 className="text-white font-bold text-base mb-2">{title}</h3>
        <p className="text-white/70 text-xs leading-relaxed">{desc}</p>
      </div>
    </div>
  </Card3D>
);

/* ─────────────────────────────────────────────────────────
   CONTACT CARD
───────────────────────────────────────────────────────── */
const ContactCard = ({ name, role, address, phone, email, website, accentColor }) => (
  <div className="bg-white/5 dark:bg-slate-800/40 backdrop-blur-sm border border-white/10 dark:border-slate-700/50 rounded-2xl p-5 flex flex-col gap-3 hover:border-blue-500/50 hover:bg-white/10 transition-all group">
    <div className="flex items-start gap-3">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: accentColor, boxShadow: `0 0 16px ${accentColor}60` }}
      >
        <Building2 className="w-5 h-5 text-white" />
      </div>
      <div>
        <h4 className="text-white font-bold text-sm group-hover:text-blue-300 transition-colors">
          {name}
        </h4>
        <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-white/10 text-white/60">
          {role}
        </span>
      </div>
    </div>

    <div className="space-y-2">
      <div className="flex items-start gap-2 text-xs text-white/60">
        <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-blue-400" />
        <span>{address}</span>
      </div>
      {phone && (
        <div className="flex items-center gap-2 text-xs text-white/60">
          <Phone className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
          <a href={`tel:${phone}`} className="hover:text-white transition-colors">{phone}</a>
        </div>
      )}
      {email && (
        <div className="flex items-center gap-2 text-xs text-white/60">
          <Mail className="w-3.5 h-3.5 shrink-0 text-amber-400" />
          <a href={`mailto:${email}`} className="hover:text-white transition-colors truncate">{email}</a>
        </div>
      )}
      {website && (
        <div className="flex items-center gap-2 text-xs text-white/60">
          <Globe className="w-3.5 h-3.5 shrink-0 text-purple-400" />
          <a href={website} target="_blank" rel="noreferrer" className="hover:text-white transition-colors flex items-center gap-1">
            {website.replace('https://', '')}
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      )}
    </div>
  </div>
);

/* ─────────────────────────────────────────────────────────
   MAIN EXPORT: URBAN SHOWCASE SLIDE
───────────────────────────────────────────────────────── */
const UrbanShowcase = () => {
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const features = [
    {
      icon: Building2,
      title: 'Smart Urban Zoning',
      desc: 'AI-assisted categorization of residential, commercial, and industrial zones with real-time boundary enforcement across Pune\'s 11 planning sectors.',
      gradient: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
      glowColor: '#3b82f6',
    },
    {
      icon: TreePine,
      title: 'Green Belt Preservation',
      desc: 'Satellite monitoring of ecological buffer zones, forest cover changes, and urban tree-canopy health across Pune–Pimpri-Chinchwad metro zone.',
      gradient: 'linear-gradient(135deg, #052e16 0%, #14532d 100%)',
      glowColor: '#22c55e',
    },
    {
      icon: Zap,
      title: 'Infrastructure Cadaster',
      desc: 'Real-time digital twin mapping of roads, drainage, electrical grids, and water utility networks synchronized with PMRDA master plans.',
      gradient: 'linear-gradient(135deg, #1c1917 0%, #3b2610 100%)',
      glowColor: '#f59e0b',
    },
    {
      icon: ShieldCheck,
      title: 'Compliance Enforcement',
      desc: 'Automated cross-referencing of new constructions against PMC approved building permits, floor-space index limits, and setback regulations.',
      gradient: 'linear-gradient(135deg, #1a0f2e 0%, #2d1b4e 100%)',
      glowColor: '#a855f7',
    },
    {
      icon: Navigation,
      title: 'Transit-Oriented Dev',
      desc: 'Plan and evaluate high-density mixed-use corridors along Pune Metro Rail Phase 1 & 2 lines to maximize ridership catchment areas.',
      gradient: 'linear-gradient(135deg, #0c1a2e 0%, #0e3a5a 100%)',
      glowColor: '#06b6d4',
    },
    {
      icon: MapPin,
      title: 'Heritage Zone Audit',
      desc: 'Cultural and architectural heritage preservation enforcement using multi-spectral satellite differential analysis in Pune\'s Peth localities.',
      gradient: 'linear-gradient(135deg, #1a0f0f 0%, #451212 100%)',
      glowColor: '#ef4444',
    },
  ];

  const contacts = [
    {
      name: 'Pune Municipal Corporation',
      role: 'Municipal Planning Authority',
      address: 'Shivajinagar, Pune – 411 005, Maharashtra, India',
      phone: '+91-20-25501010',
      email: 'commissioner@punecorporation.org',
      website: 'https://pmc.gov.in',
      accentColor: '#3b82f6',
    },
    {
      name: 'PMRDA – Pune Metropolitan Region Dev. Authority',
      role: 'Metropolitan Urban Planning',
      address: 'Baner Road, Baner, Pune – 411 045, Maharashtra',
      phone: '+91-20-27271000',
      email: 'info@pmrda.gov.in',
      website: 'https://pmrda.gov.in',
      accentColor: '#8b5cf6',
    },
    {
      name: 'PCMC – Pimpri-Chinchwad Municipal Corporation',
      role: 'Municipal Planning (PCMC Zone)',
      address: 'Morya Gosavi Chowk, Pimpri, Pune – 411 018',
      phone: '+91-20-27425100',
      email: 'commissioner@pcmcindia.gov.in',
      website: 'https://pcmcindia.gov.in',
      accentColor: '#06b6d4',
    },
    {
      name: 'UDRI – Urban Design Research Institute',
      role: 'Urban Design & Research',
      address: 'AIACA House, 30A Shahid Bhagat Singh Rd, Mumbai – 400 001',
      phone: '+91-22-22614960',
      email: 'info@udri.org',
      website: 'https://udri.org',
      accentColor: '#22c55e',
    },
    {
      name: 'Town Planning Dept – Maharashtra Govt.',
      role: 'State Urban Planning Authority',
      address: 'Mahapalika Marg, Byculla, Mumbai – 400 027',
      phone: '+91-22-23010782',
      email: 'tp.maharashtra@gov.in',
      website: 'https://mahaurban.maharashtra.gov.in',
      accentColor: '#f59e0b',
    },
    {
      name: 'National Urban Affairs Ministry',
      role: 'Union Govt. – Urban Dev. Ministry',
      address: 'Nirman Bhawan, Maulana Azad Road, New Delhi – 110 011',
      phone: '+91-11-23061234',
      email: 'secy-moud@nic.in',
      website: 'https://mohua.gov.in',
      accentColor: '#ef4444',
    },
  ];

  return (
    <div ref={sectionRef} className="relative overflow-hidden rounded-3xl">
      {/* ── DEEP SPACE BACKGROUND ── */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% -10%, #1e3a5f 0%, #0a0f1a 55%, #000510 100%)',
        }}
      />
      <GridBg />

      {/* Ambient glow orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-[120px] opacity-20 pointer-events-none" style={{ background: '#3b82f6' }} />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-[120px] opacity-15 pointer-events-none" style={{ background: '#8b5cf6' }} />
      <div className="absolute top-1/2 left-0 w-64 h-64 rounded-full blur-[100px] opacity-10 pointer-events-none" style={{ background: '#22c55e' }} />

      <div className="relative z-10">
        {/* ══ HERO TITLE SECTION ══ */}
        <div
          className={`text-center px-6 pt-16 pb-10 transition-all duration-1000 ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-500/30 bg-blue-950/40 mb-6">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-blue-300 text-xs font-bold tracking-widest uppercase">
              Pune Smart City Mission · Urban Planning Portal 2026
            </span>
          </div>

          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-4 leading-tight">
            Shaping the{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-400">
              Future
            </span>{' '}
            of<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
              Pune's Urban Landscape
            </span>
          </h2>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Leveraging satellite intelligence, GIS precision, and AI enforcement to build a
            transparent, compliant, and sustainable urban future for Pune's 8 million citizens.
          </p>
        </div>

        {/* ══ 3D CITY SKYLINE VISUALIZATION ══ */}
        <div
          className={`flex items-end justify-center gap-4 sm:gap-6 px-6 pb-6 transition-all duration-1000 delay-200 ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          {/* Ground line glow */}
          <div className="absolute h-px w-full max-w-2xl mx-auto left-1/2 -translate-x-1/2 pointer-events-none" style={{ background: 'linear-gradient(90deg, transparent, #3b82f680, #06b6d480, transparent)', bottom: '0' }} />

          {/* Left district */}
          <Building3D floors={5}  color="#3b82f6" label="Residential" height={48} delay="0.0s" />
          <Building3D floors={9}  color="#6366f1" label="Commercial"  height={60} delay="0.2s" />
          <Building3D floors={14} color="#0ea5e9" label="CBD Tower"   height={52} delay="0.4s" />
          <Building3D floors={18} color="#a855f7" label="IT Hub"      height={56} delay="0.6s" />
          <Building3D floors={22} color="#06b6d4" label="PMC Zone"    height={64} delay="0.8s" />
          <Building3D floors={16} color="#8b5cf6" label="PCMC Hub"    height={52} delay="1.0s" />
          <Building3D floors={12} color="#10b981" label="Green Core"  height={48} delay="1.2s" />
          <Building3D floors={8}  color="#f59e0b" label="Heritage"    height={44} delay="1.4s" />
          <Building3D floors={6}  color="#ef4444" label="Industrial"  height={40} delay="1.6s" />
        </div>

        {/* Ground glow bar */}
        <div
          className="h-px w-full mx-auto max-w-3xl opacity-60"
          style={{ background: 'linear-gradient(90deg, transparent 0%, #3b82f6 30%, #06b6d4 50%, #8b5cf6 70%, transparent 100%)' }}
        />

        {/* ══ FEATURE CARDS GRID ══ */}
        <div className="px-6 py-14">
          <div
            className={`text-center mb-10 transition-all duration-1000 delay-300 ${
              visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">
              Platform Capabilities
            </span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white mt-2">
              Integrated Urban Intelligence Modules
            </h3>
          </div>

          <div
            className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto transition-all duration-1000 delay-400 ${
              visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            {features.map((f, i) => (
              <FeatureCard key={i} {...f} delay={`${i * 0.1}s`} />
            ))}
          </div>
        </div>

        {/* ══ STATS HIGHLIGHT STRIP ══ */}
        <div
          className={`border-y border-white/10 bg-white/5 py-10 px-6 transition-all duration-1000 delay-500 ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-4xl mx-auto text-center">
            {[
              { val: '452 km²',  label: 'Area Monitored',        color: '#3b82f6' },
              { val: '11',       label: 'Pune Zones Active',     color: '#22c55e' },
              { val: '8M+',      label: 'Citizens Served',       color: '#f59e0b' },
              { val: '94%',      label: 'AI Detection Accuracy', color: '#a855f7' },
            ].map((s, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <span
                  className="text-3xl sm:text-4xl font-extrabold"
                  style={{ color: s.color, textShadow: `0 0 20px ${s.color}80` }}
                >
                  {s.val}
                </span>
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ══ CONTACT DIRECTORY ══ */}
        <div className="px-6 py-14">
          <div
            className={`text-center mb-10 transition-all duration-1000 delay-600 ${
              visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
              Official Government Directory
            </span>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white mt-2">
              Urban Planning Authorities — Contact Register
            </h3>
            <p className="text-slate-400 text-sm mt-2 max-w-xl mx-auto">
              Reach the relevant statutory bodies for urban development approvals, complaints, and
              building permit queries across Maharashtra.
            </p>
          </div>

          <div
            className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto transition-all duration-1000 delay-700 ${
              visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            {contacts.map((c, i) => (
              <ContactCard key={i} {...c} />
            ))}
          </div>
        </div>

        {/* ══ FOOTER STRIP ══ */}
        <div className="border-t border-white/10 px-6 py-8">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono">UrbanWatch AI · Pune PMC Integration · v1.0 Prototype</span>
            </div>
            <div className="flex flex-wrap justify-center sm:justify-end gap-4">
              <span>Data: ISRO Bhuvan · Sentinel-2 ESA · Esri World Imagery</span>
              <span>·</span>
              <span>Legal: For demonstration & evaluation purposes only</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating animation keyframes injected via style tag */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
};

export default UrbanShowcase;
