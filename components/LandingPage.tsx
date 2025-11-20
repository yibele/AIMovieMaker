import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Sparkles, Palette, Type, Image as ImageIcon, Move3d, Check, Star, Quote, Zap, Crown, Infinity, Twitter, Github, Linkedin, Globe, MessageCircle } from 'lucide-react';
import { ParticleField } from './ParticleField';

import { supabase } from '@/lib/supabaseClient';

interface LandingPageProps {
    onGetStarted: () => void;
    onLoginClick: () => void;
}

interface PlanFeature {
    text: string;
    icon: string;
}

interface Plan {
    id: string;
    name: string;
    price: number;
    currency: string;
    interval_label: string;
    features: PlanFeature[];
    badge?: string;
    discount_label?: string;
    button_text: string;
    tier: 'basic' | 'popular' | 'premium' | 'standard';
}

const iconMap: Record<string, React.ElementType> = {
    Zap, Check, Move3d, Infinity, Star, Palette
};

// Define the structure for our floating nodes
interface FloatingNode {
    id: number;
    xPct: number; // Base X position in % (0-100)
    yPct: number; // Base Y position in % (0-100)
    depth: number; // Parallax depth multiplier
    content: React.ReactNode;
    align: 'left' | 'right'; // for visual refinement if needed
    delay: string;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onLoginClick }) => {
    const observerRef = useRef<IntersectionObserver | null>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
    const [hoveredNodeId, setHoveredNodeId] = useState<number | null>(null);
    const pricingRef = useRef<HTMLElement>(null);

    // Typewriter Effect State
    const [displayText, setDisplayText] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    const [loopNum, setLoopNum] = useState(0);
    const [typingSpeed, setTypingSpeed] = useState(150);
    const [plans, setPlans] = useState<Plan[]>([]);

    const words = ["Mix it.", "Dream it.", "Ship it.", "Scale it."];

    useEffect(() => {
        const fetchPlans = async () => {
            const { data, error } = await supabase
                .from('plans')
                .select('*')
                .order('sort_order', { ascending: true });

            if (error) {
                console.error('Error fetching plans:', error);
            } else if (data) {
                setPlans(data);
            }
        };

        fetchPlans();
    }, []);

    useEffect(() => {
        const handleType = () => {
            const i = loopNum % words.length;
            const fullText = words[i];

            setDisplayText(
                isDeleting
                    ? fullText.substring(0, displayText.length - 1)
                    : fullText.substring(0, displayText.length + 1)
            );

            // Dynamic typing speed
            let nextSpeed = 150;

            if (isDeleting) {
                nextSpeed = 75; // Deleting is faster
            }

            // If word is finished typing
            if (!isDeleting && displayText === fullText) {
                nextSpeed = 2000; // Pause at end of word
                setIsDeleting(true);
            }
            // If word is finished deleting
            else if (isDeleting && displayText === '') {
                setIsDeleting(false);
                setLoopNum(loopNum + 1);
                nextSpeed = 500; // Small pause before next word
            }

            setTypingSpeed(nextSpeed);
        };

        const timer = setTimeout(handleType, typingSpeed);
        return () => clearTimeout(timer);
    }, [displayText, isDeleting, loopNum, typingSpeed, words]);

    useEffect(() => {
        // Initialize window size
        setWindowSize({ width: window.innerWidth, height: window.innerHeight });

        const handleResize = () => {
            setWindowSize({ width: window.innerWidth, height: window.innerHeight });
        };

        window.addEventListener('resize', handleResize);

        // Scroll Reveal Observer
        observerRef.current = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const delay = (entry.target as HTMLElement).dataset.delay || '0';
                    setTimeout(() => {
                        entry.target.classList.add('reveal-visible');
                    }, parseInt(delay));
                    observerRef.current?.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

        const elements = document.querySelectorAll('.reveal-on-scroll');
        elements.forEach((el) => observerRef.current?.observe(el));

        // Mouse Parallax Handler
        const handleMouseMove = (e: MouseEvent) => {
            const x = (e.clientX / window.innerWidth - 0.5) * 2; // -1 to 1
            const y = (e.clientY / window.innerHeight - 0.5) * 2; // -1 to 1
            setMousePos({ x, y });
        };

        window.addEventListener('mousemove', handleMouseMove);

        return () => {
            observerRef.current?.disconnect();
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    const scrollToPricing = () => {
        pricingRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Node Configuration
    const nodes: FloatingNode[] = [
        {
            id: 1,
            xPct: 28,
            yPct: 25,
            depth: -20,
            align: 'left',
            delay: '0.8s',
            content: (
                <div className="bg-white p-3 pb-8 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] rotate-[-6deg] w-64 border border-slate-100 animate-float-delayed pointer-events-auto backdrop-blur-sm bg-white/90 hover:rotate-0 hover:scale-110 transition-all duration-500 cursor-pointer">
                    <div className="h-40 rounded-xl bg-slate-100 overflow-hidden relative">
                        <img src="https://picsum.photos/seed/future/400/300" alt="Asset" className="w-full h-full object-cover" />
                        <div className="absolute bottom-2 right-2 bg-black/50 backdrop-blur text-white text-[10px] px-2 py-1 rounded-md">Generated</div>
                    </div>
                    <div className="mt-3 flex items-center space-x-2">
                        <div className="w-6 h-6 rounded-full bg-pink-100 flex items-center justify-center">
                            <ImageIcon className="w-3 h-3 text-pink-600" />
                        </div>
                        <span className="text-xs font-semibold text-slate-700">Cyberpunk_V2.png</span>
                    </div>
                </div>
            )
        },
        {
            id: 2,
            xPct: 72,
            yPct: 25,
            depth: 15,
            align: 'right',
            delay: '1.2s',
            content: (
                <div className="bg-white/80 backdrop-blur-md p-4 rounded-3xl shadow-xl border border-white/50 rotate-[5deg] w-48 animate-float-slow pointer-events-auto hover:rotate-0 hover:scale-110 transition-all duration-500">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold text-slate-400">Palette</span>
                        <Palette className="w-3 h-3 text-slate-400" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="h-12 rounded-xl bg-[#8b5cf6] shadow-sm"></div>
                        <div className="h-12 rounded-xl bg-[#f472b6] shadow-sm"></div>
                        <div className="h-12 rounded-xl bg-[#38bdf8] shadow-sm"></div>
                        <div className="h-12 rounded-xl bg-[#fbbf24] shadow-sm"></div>
                    </div>
                </div>
            )
        },
        {
            id: 3,
            xPct: 72,
            yPct: 75,
            depth: -30,
            align: 'right',
            delay: '1s',
            content: (
                <div className="bg-[#fffbeb]/90 backdrop-blur-sm p-6 rounded-tl-none rounded-tr-2xl rounded-br-2xl rounded-bl-2xl shadow-[0_10px_40px_rgba(0,0,0,0.08)] rotate-[3deg] w-72 border border-amber-100/50 animate-float pointer-events-auto hover:rotate-0 hover:scale-105 transition-all duration-300">
                    <div className="flex items-start space-x-3 mb-3">
                        <Type className="w-4 h-4 text-amber-600 mt-1" />
                        <p className="text-sm font-medium text-slate-800 font-mono leading-relaxed">
                            "A translucent glass sculpture of a lion, glowing from within..."
                        </p>
                    </div>
                    <div className="flex justify-between items-center mt-4 border-t border-amber-200/30 pt-3">
                        <span className="text-[10px] uppercase tracking-wider text-amber-700 font-bold">Prompt v.04</span>
                        <div className="flex -space-x-2">
                            <div className="w-6 h-6 rounded-full bg-violet-200 border-2 border-white"></div>
                            <div className="w-6 h-6 rounded-full bg-indigo-200 border-2 border-white"></div>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 4,
            xPct: 28,
            yPct: 75,
            depth: 25,
            align: 'left',
            delay: '1.4s',
            content: (
                <div className="bg-slate-900/90 backdrop-blur-md text-white p-5 rounded-2xl shadow-2xl rotate-[-2deg] w-56 animate-float-delayed pointer-events-auto hover:rotate-0 hover:scale-105 transition-all duration-500">
                    <div className="flex items-center space-x-2 mb-4 border-b border-slate-700 pb-3">
                        <Move3d className="w-4 h-4 text-violet-400" />
                        <span className="text-xs font-semibold">Model Settings</span>
                    </div>
                    <div className="space-y-3">
                        <div>
                            <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                                <span>Creativity</span>
                                <span>85%</span>
                            </div>
                            <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden">
                                <div className="w-[85%] h-full bg-gradient-to-r from-violet-500 to-fuchsia-500"></div>
                            </div>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 5,
            xPct: 18,
            yPct: 50,
            depth: 20,
            align: 'left',
            delay: '1.6s',
            content: (
                <div className="bg-emerald-50/90 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-emerald-100 rotate-[4deg] w-52 animate-float pointer-events-auto hover:rotate-0 hover:scale-105 transition-all duration-500">
                    <div className="flex items-center space-x-2 mb-3">
                        <MessageCircle className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-bold text-emerald-800">Collaborators</span>
                    </div>
                    <div className="flex items-center space-x-2 bg-white/50 p-2 rounded-xl">
                        <div className="relative">
                            <div className="w-8 h-8 rounded-full bg-slate-200"></div>
                            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                        </div>
                        <div className="flex-1">
                            <div className="h-2 w-20 bg-emerald-200/50 rounded mb-1"></div>
                            <div className="h-2 w-12 bg-emerald-200/30 rounded"></div>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 6,
            xPct: 82,
            yPct: 50,
            depth: -25,
            align: 'right',
            delay: '1.8s',
            content: (
                <div className="bg-violet-50/90 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-violet-100 rotate-[-3deg] w-48 animate-float-slow pointer-events-auto hover:rotate-0 hover:scale-105 transition-all duration-500">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-violet-800">Performance</span>
                        <Zap className="w-4 h-4 text-violet-600" />
                    </div>
                    <div className="flex items-end space-x-1 h-12">
                        <div className="w-1/5 bg-violet-200 rounded-t-md h-[40%]"></div>
                        <div className="w-1/5 bg-violet-300 rounded-t-md h-[60%]"></div>
                        <div className="w-1/5 bg-violet-400 rounded-t-md h-[30%]"></div>
                        <div className="w-1/5 bg-violet-500 rounded-t-md h-[80%]"></div>
                        <div className="w-1/5 bg-violet-600 rounded-t-md h-[100%]"></div>
                    </div>
                </div>
            )
        }
    ];

    // Calculate exact pixel position for nodes including parallax offset
    const getNodePosition = (node: FloatingNode) => {
        const { width, height } = windowSize;
        if (width === 0 || height === 0) return { x: 0, y: 0, realX: 0, realY: 0 };

        const baseX = (node.xPct / 100) * width;
        const baseY = (node.yPct / 100) * height;
        const offsetX = mousePos.x * node.depth;
        const offsetY = mousePos.y * node.depth;

        // Adjust for center of elements roughly (assuming average size 200x150 for centering lines)
        // This is approximate to land lines near the "center" of the card visually
        const centerXOffset = node.align === 'left' ? 100 : -100;
        const centerYOffset = 80;

        return {
            x: baseX + offsetX + centerXOffset,
            y: baseY + offsetY + centerYOffset,
            realX: baseX, // Base CSS Left value
            realY: baseY  // Base CSS Top value
        };
    };

    // Connections definitions with curvature
    // curve: controls the amplitude of the wave (S-shape)
    const connections = [
        { startId: 1, endId: 2, curve: 0.3 },
        { startId: 2, endId: 6, curve: -0.3 },
        { startId: 6, endId: 3, curve: 0.3 },
        { startId: 3, endId: 4, curve: -0.3 },
        { startId: 4, endId: 5, curve: 0.3 },
        { startId: 5, endId: 1, curve: -0.3 },
        { startId: 5, endId: 6, curve: 0.4 }, // Cross connection
    ];

    return (
        <div className="relative bg-dot-pattern selection:bg-violet-200" style={{ minHeight: '200vh' }}>

            {/* Film Grain Texture Overlay */}
            <div className="bg-noise fixed inset-0"></div>

            {/* Ambient Background Glows */}
            <div className="fixed top-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-200/40 rounded-full blur-[120px] animate-pulse-slow pointer-events-none z-0" />
            <div className="fixed bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-200/40 rounded-full blur-[120px] pointer-events-none z-0" />

            {/* Floating Navbar - Enhanced Glass Capsule */}
            <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 hover:scale-[1.02] opacity-0 animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
                <nav className="flex items-center bg-white/70 backdrop-blur-xl border border-white/50 shadow-lg shadow-slate-200/20 rounded-full p-1.5 pr-2 ring-1 ring-slate-900/5">

                    {/* Logo Area */}

                    <div className="flex items-center space-x-2 pl-5 pr-6 border-r border-slate-200/50">
                        {/* <img src="" alt="Morpheus" className="w-8 h-8 object-contain" /> */}
                        <span className="text-sm font-bold text-slate-800 tracking-tight">Morpheus</span>
                    </div>

                    {/* Nav Links & CTA */}
                    <div className="flex items-center space-x-1 px-2">
                        <button
                            onClick={scrollToPricing}
                            className="px-4 py-2 rounded-full text-xs font-medium text-slate-600 hover:bg-slate-100/50 hover:text-slate-900 transition-all"
                        >
                            Pricing
                        </button>

                        <a
                            href="#"
                            className="flex items-center space-x-1.5 px-4 py-2 rounded-full text-xs font-medium text-slate-600 hover:bg-[#5865F2]/10 hover:text-[#5865F2] transition-all group"
                            title="Join our Discord"
                        >
                            <svg className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.118.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                            </svg>
                            <span>Community</span>
                        </a>

                        <div className="w-px h-4 bg-slate-200 mx-1"></div>

                        <button
                            onClick={onLoginClick}
                            className="px-5 py-2 rounded-full bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition-all hover:shadow-lg hover:shadow-slate-500/20 flex items-center gap-2 ml-1"
                        >
                            Log In
                        </button>
                    </div>
                </nav>
            </div>

            {/* --- HERO SECTION --- */}
            <div className="relative w-screen h-screen flex flex-col items-center justify-center z-10 pb-20 perspective-[1000px]">

                {/* Antigravity Particle Field */}
                <ParticleField />

                {/* DYNAMIC CONNECTOR LINES (SVG OVERLAY) */}
                {/* Only visible on md+ screens where nodes are visible */}
                <div className="absolute inset-0 w-full h-full pointer-events-none z-0 hidden md:block">
                    <svg className="w-full h-full overflow-visible">
                        <defs>
                            {/* Default Gradient */}
                            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0" />
                                <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.4" />
                                <stop offset="100%" stopColor="#c4b5fd" stopOpacity="0" />
                            </linearGradient>
                            {/* Active Gradient (Brighter/Pinker) */}
                            <linearGradient id="lineGradientActive" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#f472b6" stopOpacity="0" />
                                <stop offset="50%" stopColor="#db2777" stopOpacity="0.8" />
                                <stop offset="100%" stopColor="#f472b6" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        {connections.map((conn, idx) => {
                            const startNode = nodes.find(n => n.id === conn.startId);
                            const endNode = nodes.find(n => n.id === conn.endId);
                            if (!startNode || !endNode) return null;

                            const p1 = getNodePosition(startNode);
                            const p2 = getNodePosition(endNode);

                            // Check if this connection touches the hovered node
                            const isActive = hoveredNodeId === conn.startId || hoveredNodeId === conn.endId;

                            // Calculate Midpoint and Control Points for "Wave" effect
                            const dx = p2.x - p1.x;
                            const dy = p2.y - p1.y;
                            const dist = Math.sqrt(dx * dx + dy * dy);

                            if (dist < 0.01 || isNaN(dist)) return null;

                            // Geometric center
                            const midX = (p1.x + p2.x) / 2;
                            const midY = (p1.y + p2.y) / 2;

                            // Normal vector
                            const normX = -dy / dist;
                            const normY = dx / dist;

                            // Control Points for S-Curve
                            // CP1 pulls first half one way, CP2 pulls second half the other way
                            const amplitude = dist * conn.curve;

                            const cp1x = (p1.x + midX) / 2 + normX * amplitude;
                            const cp1y = (p1.y + midY) / 2 + normY * amplitude;

                            const cp2x = (midX + p2.x) / 2 - normX * amplitude;
                            const cp2y = (midY + p2.y) / 2 - normY * amplitude;

                            return (
                                <g key={`${conn.startId}-${conn.endId}`} className="transition-all duration-500">
                                    <path
                                        d={`M ${p1.x} ${p1.y} Q ${cp1x} ${cp1y} ${midX} ${midY} Q ${cp2x} ${cp2y} ${p2.x} ${p2.y}`}
                                        fill="none"
                                        stroke={isActive ? "url(#lineGradientActive)" : "url(#lineGradient)"}
                                        strokeWidth={isActive ? "2.5" : "1.5"}
                                        strokeDasharray="8 8"
                                        className={isActive ? "animate-dash-draw-fast" : "animate-dash-draw"}
                                    />
                                    {/* Start Dot */}
                                    <circle
                                        cx={p1.x} cy={p1.y}
                                        r={isActive ? "5" : "3"}
                                        fill={isActive ? "#db2777" : "#a78bfa"}
                                        className="transition-all duration-300"
                                    />
                                    {/* Middle Dot (The "Point" in Point-to-Point-to-Point) */}
                                    <circle
                                        cx={midX} cy={midY}
                                        r={isActive ? "4" : "2"}
                                        fill={isActive ? "#db2777" : "#c4b5fd"}
                                        className="transition-all duration-300 opacity-80"
                                    />
                                    {/* End Dot */}
                                    <circle
                                        cx={p2.x} cy={p2.y}
                                        r={isActive ? "5" : "3"}
                                        fill={isActive ? "#db2777" : "#a78bfa"}
                                        className="transition-all duration-300"
                                    />
                                </g>
                            );
                        })}
                    </svg>
                </div>

                {/* Central Typography Hub */}
                <div className="z-10 text-center max-w-4xl px-6 relative">
                    <div className="inline-flex items-center space-x-2 bg-white/50 backdrop-blur-sm border border-violet-100/50 rounded-full px-4 py-1.5 mb-8 shadow-sm opacity-0 animate-blur-in-up" style={{ animationDelay: '0.1s' }}>
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
                        </span>
                        <span className="text-[10px] font-bold text-violet-600 uppercase tracking-widest">Gemini Powered Canvas</span>
                    </div>

                    <h1 className="text-7xl md:text-9xl font-extrabold tracking-tighter text-slate-900 mb-8 leading-[0.9] opacity-0 animate-blur-in-up min-h-[1.8em]" style={{ animationDelay: '0.2s' }}>
                        Think it.<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-indigo-500 to-purple-600 animate-shimmer bg-[length:200%_100%] inline-block w-[320px] md:w-[500px] text-center">
                            {displayText}
                            <span className="inline-block w-1 h-[0.8em] bg-violet-500 ml-2 align-middle animate-cursor-blink"></span>
                        </span>
                    </h1>

                    <p className="text-lg md:text-xl text-slate-500 max-w-lg mx-auto mb-10 font-medium leading-relaxed opacity-0 animate-blur-in-up" style={{ animationDelay: '0.4s' }}>
                        The infinite creative mixboard for your wildest ideas. Where AI meets your flow state.
                    </p>

                    <div className="opacity-0 animate-blur-in-up" style={{ animationDelay: '0.6s' }}>
                        <button
                            onClick={onGetStarted}
                            className="group relative inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white transition-all duration-300 bg-slate-900 rounded-full hover:bg-violet-600 hover:scale-105 hover:shadow-[0_0_40px_rgba(124,58,237,0.3)] focus:outline-none"
                        >
                            Enter Studio
                            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>

                {/* Floating "Mixboard" Assets with Parallax & Entrance Animation */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0 hidden md:block">
                    {nodes.map(node => (
                        <div
                            key={node.id}
                            className="absolute opacity-0 animate-enter-spin-out"
                            style={{
                                top: `${node.yPct}%`,
                                left: node.align === 'left' ? `${node.xPct}%` : 'auto',
                                right: node.align === 'right' ? `${100 - node.xPct}%` : 'auto',
                                animationDelay: node.delay
                            }}
                        >
                            <div
                                className="transition-transform duration-100 ease-out pointer-events-auto"
                                style={{
                                    transform: `translate(${mousePos.x * node.depth}px, ${mousePos.y * node.depth}px)`
                                }}
                                onMouseEnter={() => setHoveredNodeId(node.id)}
                                onMouseLeave={() => setHoveredNodeId(null)}
                            >
                                {node.content}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* --- PRICING SECTION (Redesigned for High Desire) --- */}
            <section ref={pricingRef} className="relative z-10 py-32 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-24 reveal-on-scroll">
                        <h2 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6 tracking-tighter">Choose Your Flow</h2>
                        <p className="text-lg text-slate-500 max-w-2xl mx-auto">Unlock the full potential of the Morpheus engine. Start small, dream big.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                        {plans.map((plan, index) => {
                            const isPremium = plan.tier === 'premium';
                            const isPopular = plan.tier === 'popular';
                            const isStandard = plan.tier === 'standard';

                            // Dynamic classes based on tier
                            let cardClasses = "relative h-full p-8 backdrop-blur-xl rounded-[2rem] border shadow-xl transition-all duration-500 group z-10";
                            let buttonClasses = "w-full py-3.5 rounded-xl font-bold transition-colors";
                            let priceColor = "text-slate-900";
                            let titleColor = "text-slate-500";
                            let iconColor = "text-violet-500";
                            let checkColor = "text-slate-300";

                            if (isPremium) {
                                // Premium styling handled separately in render structure below due to complexity
                            } else if (isPopular) {
                                cardClasses += " bg-white/80 border-white hover:shadow-2xl hover:shadow-blue-100 hover:-translate-y-3";
                                buttonClasses += " bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100";
                                titleColor = "text-blue-600";
                                iconColor = "text-blue-500";
                                checkColor = "text-blue-300";
                            } else if (isStandard) {
                                cardClasses += " bg-white/70 border-white hover:shadow-2xl hover:shadow-pink-100 hover:-translate-y-3";
                                buttonClasses += " bg-white border border-pink-200 text-pink-700 hover:bg-pink-50";
                                titleColor = "text-pink-600";
                                iconColor = "text-pink-500";
                                checkColor = "text-pink-300";
                            } else {
                                // Basic
                                cardClasses += " bg-white/70 border-white hover:shadow-2xl hover:-translate-y-3";
                                buttonClasses += " bg-slate-100 text-slate-900 hover:bg-slate-200";
                            }

                            if (isPremium) {
                                return (
                                    <div key={plan.id} className="reveal-on-scroll lg:-mt-12 lg:mb-4" data-delay={index * 100}>
                                        <div className="relative p-1 rounded-[2.2rem] bg-gradient-to-b from-violet-400 via-fuchsia-500 to-indigo-600 shadow-2xl shadow-violet-200 hover:shadow-[0_20px_60px_rgba(139,92,246,0.4)] hover:-translate-y-4 transition-all duration-500 z-20 group overflow-hidden">
                                            {/* Sheen Effect Overlay */}
                                            <div className="absolute inset-0 z-30 pointer-events-none overflow-hidden rounded-[2.2rem]">
                                                <div className="absolute top-0 bottom-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-sheen"></div>
                                            </div>

                                            {plan.badge && (
                                                <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1 whitespace-nowrap ring-4 ring-white z-40">
                                                    <Crown className="w-3 h-3 text-yellow-400" /> {plan.badge}
                                                </div>
                                            )}

                                            <div className="h-full p-8 bg-white rounded-[2rem] relative overflow-hidden">
                                                {/* Animated Mesh Gradient Background */}
                                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-violet-100/50 via-transparent to-transparent"></div>

                                                <div className="relative z-10">
                                                    <h3 className="text-lg font-bold text-violet-600 mb-2 flex items-center gap-2">
                                                        {plan.name}
                                                        {plan.discount_label && (
                                                            <span className="text-[10px] bg-violet-100 px-2 py-0.5 rounded-full text-violet-700">{plan.discount_label}</span>
                                                        )}
                                                    </h3>
                                                    <div className="flex items-baseline mb-6">
                                                        <span className="text-5xl font-extrabold text-slate-900 tracking-tight">{plan.currency}{plan.price}</span>
                                                        <span className="ml-1 text-slate-400 font-medium">{plan.interval_label}</span>
                                                    </div>

                                                    <div className="space-y-4 mb-8">
                                                        {plan.features.map((feature, i) => {
                                                            const Icon = iconMap[feature.icon] || Check;
                                                            return (
                                                                <div key={i} className="flex items-center text-sm text-slate-900 font-bold">
                                                                    <div className={`w-6 h-6 rounded-full ${i === 0 ? 'bg-violet-100 text-violet-600' : i === 1 ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'} flex items-center justify-center mr-3`}>
                                                                        <Icon className="w-3 h-3" />
                                                                    </div>
                                                                    {feature.text}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>

                                                    <button onClick={onLoginClick} className="w-full py-4 rounded-xl bg-slate-900 text-white font-bold text-lg shadow-lg shadow-slate-900/20 hover:bg-violet-600 hover:shadow-violet-500/30 transition-all duration-300 transform active:scale-95 relative overflow-hidden">
                                                        <span className="relative z-10">{plan.button_text}</span>
                                                        <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-fuchsia-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <div key={plan.id} className="reveal-on-scroll" data-delay={index * 100}>
                                    <div className={cardClasses}>
                                        {plan.tier === 'basic' && (
                                            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent opacity-50"></div>
                                        )}
                                        {plan.badge && (
                                            <div className="absolute -top-3 right-6 bg-blue-100 text-blue-700 text-[10px] font-bold px-3 py-1 rounded-full">{plan.badge}</div>
                                        )}
                                        <h3 className={`text-lg font-semibold mb-2 ${titleColor}`}>{plan.name}</h3>
                                        <div className="flex items-baseline mb-6">
                                            <span className="text-4xl font-bold text-slate-900">{plan.currency}{plan.price}</span>
                                            <span className="ml-1 text-slate-400">{plan.interval_label}</span>
                                        </div>
                                        <div className="space-y-4 mb-8">
                                            {plan.features.map((feature, i) => {
                                                const Icon = iconMap[feature.icon] || Check;
                                                const isFirst = i === 0;
                                                return (
                                                    <div key={i} className={`flex items-center text-sm ${isFirst ? 'font-medium text-slate-700' : 'text-slate-600'}`}>
                                                        <Icon className={`w-4 h-4 mr-3 flex-shrink-0 ${isFirst ? iconColor : checkColor}`} />
                                                        {feature.text}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <button onClick={onLoginClick} className={buttonClasses}>{plan.button_text}</button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* --- TESTIMONIALS SECTION (Canvas Sticky Notes Style) --- */}
            <section className="relative z-10 py-32 px-6 overflow-hidden">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-20 reveal-on-scroll">
                        <h2 className="text-4xl font-bold text-slate-900 mb-2 tracking-tight">Voices from the Studio</h2>
                        <p className="text-slate-500">Creators crafting their reality.</p>
                    </div>

                    <div className="relative h-[600px] md:h-[500px] w-full">

                        {/* Testimonial 1 (Top Left) */}
                        <div className="absolute top-0 left-0 md:left-20 w-72 bg-[#fefce8] p-6 rounded-br-3xl rounded-tl-none rounded-tr-xl rounded-bl-xl shadow-[0_10px_30px_rgba(0,0,0,0.05)] border border-yellow-100/50 rotate-[-2deg] reveal-on-scroll hover:scale-105 hover:z-20 hover:rotate-0 transition-all duration-500 cursor-pointer" data-delay="0">
                            <Quote className="w-6 h-6 text-yellow-400 mb-3 opacity-50" />
                            <p className="text-slate-800 text-sm font-medium leading-relaxed mb-4 font-serif italic">
                                "Morpheus isn't just an AI tool. It's a second brain. The mixboard interface changed how I visualize my novels."
                            </p>
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden ring-2 ring-white shadow-sm">
                                    <img src="https://i.pravatar.cc/150?u=1" alt="User" />
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-slate-900">Elena R.</div>
                                    <div className="text-[10px] text-slate-500 uppercase tracking-wide">Sci-Fi Author</div>
                                </div>
                            </div>
                        </div>

                        {/* Testimonial 2 (Middle Right) */}
                        <div className="absolute top-40 right-0 md:right-24 w-80 bg-white p-8 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.08)] border border-slate-100 rotate-[3deg] reveal-on-scroll hover:scale-105 hover:z-20 hover:rotate-0 transition-all duration-500 cursor-pointer" data-delay="150">
                            <div className="flex space-x-1 mb-4">
                                <Star className="w-3 h-3 fill-violet-500 text-violet-500" />
                                <Star className="w-3 h-3 fill-violet-500 text-violet-500" />
                                <Star className="w-3 h-3 fill-violet-500 text-violet-500" />
                                <Star className="w-3 h-3 fill-violet-500 text-violet-500" />
                                <Star className="w-3 h-3 fill-violet-500 text-violet-500" />
                            </div>
                            <p className="text-slate-700 text-sm font-medium leading-relaxed mb-6">
                                "Finally, a workspace that feels like a designer's desk and not a spreadsheet. The infinite canvas is pure joy."
                            </p>
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden ring-2 ring-white shadow-sm">
                                    <img src="https://i.pravatar.cc/150?u=4" alt="User" />
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-slate-900">Marcus J.</div>
                                    <div className="text-[10px] text-slate-500 uppercase tracking-wide">Concept Artist</div>
                                </div>
                            </div>
                        </div>

                        {/* Testimonial 3 (Bottom Left) */}
                        <div className="absolute bottom-10 left-4 md:left-40 w-72 bg-indigo-50 p-6 rounded-xl shadow-lg border border-indigo-100 rotate-[1deg] reveal-on-scroll hover:scale-105 hover:z-20 hover:rotate-0 transition-all duration-500 cursor-pointer" data-delay="300">
                            <p className="text-indigo-900 text-xs font-semibold leading-relaxed mb-4 font-mono">
                                &gt; Generated 50 assets in 10 minutes.<br />&gt; Quality: Exceptional.<br />&gt; Status: Hooked.
                            </p>
                            <div className="flex items-center justify-between border-t border-indigo-200 pt-3">
                                <span className="text-[10px] font-bold text-indigo-400">@pixelsmith</span>
                                <div className="flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                                    <span className="text-[10px] text-indigo-400">Online</span>
                                </div>
                            </div>
                        </div>

                        {/* Decorative Sticker */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 reveal-on-scroll hidden md:block" data-delay="400">
                            <div className="bg-violet-600 text-white text-sm font-bold px-6 py-3 rounded-full shadow-2xl shadow-violet-500/40 rotate-[-12deg] border-2 border-white/20 hover:scale-110 transition-transform duration-300">
                                Join 10,000+ Creators 🚀
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* --- PROFESSIONAL FOOTER --- */}
            <footer className="bg-white border-t border-slate-200 pt-16 pb-8 relative z-10">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
                        <div className="col-span-2 lg:col-span-2">
                            <div className="flex items-center space-x-2 mb-4">
                                <Sparkles className="w-5 h-5 text-violet-600" />
                                <span className="text-xl font-bold text-slate-900 tracking-tight">Morpheus</span>
                            </div>
                            <p className="text-slate-500 text-sm mb-6 max-w-xs leading-relaxed">
                                The next-generation creative studio powered by Gemini. We help creators visualize the impossible through an infinite mixboard interface.
                            </p>
                            <div className="flex space-x-4">
                                <a href="#" className="text-slate-400 hover:text-slate-600 transition-colors"><Twitter className="w-5 h-5" /></a>
                                <a href="#" className="text-slate-400 hover:text-slate-600 transition-colors"><Github className="w-5 h-5" /></a>
                                <a href="#" className="text-slate-400 hover:text-slate-600 transition-colors"><Linkedin className="w-5 h-5" /></a>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-bold text-slate-900 mb-4">Product</h4>
                            <ul className="space-y-2 text-sm text-slate-500">
                                <li><a href="#" className="hover:text-violet-600 transition-colors">Features</a></li>
                                <li><a href="#" className="hover:text-violet-600 transition-colors">Pricing</a></li>
                                <li><a href="#" className="hover:text-violet-600 transition-colors">Showcase</a></li>
                                <li><a href="#" className="hover:text-violet-600 transition-colors">API</a></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-bold text-slate-900 mb-4">Resources</h4>
                            <ul className="space-y-2 text-sm text-slate-500">
                                <li><a href="#" className="hover:text-violet-600 transition-colors">Community</a></li>
                                <li><a href="#" className="hover:text-violet-600 transition-colors">Documentation</a></li>
                                <li><a href="#" className="hover:text-violet-600 transition-colors">Blog</a></li>
                                <li><a href="#" className="hover:text-violet-600 transition-colors">Help Center</a></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-bold text-slate-900 mb-4">Company</h4>
                            <ul className="space-y-2 text-sm text-slate-500">
                                <li><a href="#" className="hover:text-violet-600 transition-colors">About</a></li>
                                <li><a href="#" className="hover:text-violet-600 transition-colors">Careers</a></li>
                                <li><a href="#" className="hover:text-violet-600 transition-colors">Privacy</a></li>
                                <li><a href="#" className="hover:text-violet-600 transition-colors">Terms</a></li>
                            </ul>
                        </div>
                    </div>

                    <div className="border-t border-slate-100 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-slate-400 text-xs">© 2024 Morpheus Studio Inc. All rights reserved.</p>
                        <div className="flex items-center space-x-2 text-xs text-slate-500">
                            <Globe className="w-3 h-3" />
                            <span>English (US)</span>
                        </div>
                    </div>
                </div>
            </footer>

        </div>
    );
};
