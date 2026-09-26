import { useNavigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { ShieldAlert, MapPin, Satellite, Network, ArrowRight, Activity, Globe } from 'lucide-react';

// Animated floating particle dot
const Particle = ({ style }) => (
  <div
    className="absolute rounded-full bg-blue-400/20 blur-sm animate-pulse"
    style={style}
  />
);

const LandingPage = () => {
  const navigate = useNavigate();
  const canvasRef = useRef(null);

  // Draw animated grid lines on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animFrame;
    let offset = 0;

    const draw = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Grid lines
      ctx.strokeStyle = 'rgba(96, 165, 250, 0.07)';
      ctx.lineWidth = 1;
      const spacing = 50;
      for (let x = 0; x < canvas.width; x += spacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = -spacing + (offset % spacing); y < canvas.height; y += spacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      offset += 0.3;
      animFrame = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animFrame);
  }, []);

  const particles = [
    { width: 180, height: 180, top: '10%',  left: '5%',  animationDelay: '0s',   animationDuration: '4s' },
    { width: 120, height: 120, top: '60%',  left: '2%',  animationDelay: '1s',   animationDuration: '5s' },
    { width: 200, height: 200, top: '20%',  right: '3%', animationDelay: '0.5s', animationDuration: '6s' },
    { width: 100, height: 100, top: '70%',  right: '8%', animationDelay: '2s',   animationDuration: '4s' },
    { width: 140, height: 140, top: '40%',  left: '45%', animationDelay: '1.5s', animationDuration: '5s' },
  ];

  const features = [
    { icon: <Satellite className="w-6 h-6" />, label: 'Satellite Imagery Analysis' },
    { icon: <MapPin className="w-6 h-6" />,    label: 'Precise GIS Location Tracking' },
    { icon: <Activity className="w-6 h-6" />,  label: 'Change Detection Engine' },
    { icon: <Globe className="w-6 h-6" />,     label: 'Pune Urban Monitoring' },
  ];

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#040d1f] flex flex-col items-center justify-center">

      {/* Animated canvas grid */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {/* Radial glow blobs */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-700/10 blur-[120px] pointer-events-none" />
      <div className="absolute top-2/3 left-1/4 w-[350px] h-[350px] rounded-full bg-cyan-600/10 blur-[100px] pointer-events-none" />
      <div className="absolute top-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-indigo-700/10 blur-[90px] pointer-events-none" />

      {/* Floating particles */}
      {particles.map((p, i) => <Particle key={i} style={p} />)}

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-4xl mx-auto">

        {/* Badge */}
        <div className="flex items-center gap-2 mb-8 px-4 py-2 rounded-full border border-blue-500/30 bg-blue-950/40 backdrop-blur-sm">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-blue-300 text-xs font-semibold tracking-widest uppercase">
            Pune Municipal Corporation · AI Monitoring Platform
          </span>
        </div>

        {/* Logo icon */}
        <div className="mb-6 relative">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-900 border border-blue-500/40 shadow-[0_0_60px_rgba(59,130,246,0.4)] flex items-center justify-center">
            <ShieldAlert className="w-12 h-12 text-blue-200" />
          </div>
          {/* orbit dot */}
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-400 rounded-full animate-ping opacity-70" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-400 rounded-full" />
        </div>

        {/* Title */}
        <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight text-white mb-4 drop-shadow-lg">
          Urban<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Watch</span>{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">AI</span>
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-xl text-blue-200/80 font-medium max-w-2xl mb-4 leading-relaxed">
          AI-Powered Urban Construction &amp; Encroachment Monitoring
        </p>
        <p className="text-sm text-slate-500 max-w-xl mb-12">
          Satellite-assisted change detection for Pune's urban planning authorities. Identify, investigate and manage suspected new constructions and encroachments.
        </p>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-3 mb-14">
          {features.map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-blue-700/40 bg-blue-950/50 backdrop-blur-sm text-blue-300 text-sm font-medium"
            >
              <span className="text-cyan-400">{f.icon}</span>
              {f.label}
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <button
          onClick={() => navigate('/dashboard')}
          className="group relative inline-flex items-center gap-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold text-lg px-10 py-4 rounded-xl shadow-[0_0_40px_rgba(59,130,246,0.45)] hover:shadow-[0_0_60px_rgba(59,130,246,0.7)] transition-all duration-300"
        >
          <span>Enter Dashboard</span>
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
          {/* shimmer */}
          <span className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
            <span className="absolute inset-0 bg-white/5 group-hover:translate-x-full transition-transform duration-700 -skew-x-12" />
          </span>
        </button>

        {/* Disclaimer */}
        <p className="mt-8 text-xs text-slate-600 max-w-lg leading-relaxed">
          This is a prototype / demonstration platform. Detection results are simulated and do not represent confirmed illegal-construction findings. All data shown is for evaluation purposes only.
        </p>
      </div>

      {/* Bottom corner decorations */}
      <div className="absolute bottom-6 left-6 text-slate-700 text-xs flex items-center gap-2">
        <Network className="w-4 h-4" />
        <span>UrbanWatch AI · v1.0 Prototype</span>
      </div>
      <div className="absolute bottom-6 right-6 text-slate-700 text-xs">
        Pune, Maharashtra, India
      </div>
    </div>
  );
};

export default LandingPage;
