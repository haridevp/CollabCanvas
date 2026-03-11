import React, { useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { PenTool, Users, Share2, Shield, Layers, ChevronRight, Zap } from 'lucide-react';
import { Button } from '../components/ui/Button';

const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const { scrollYProgress } = useScroll();
    const yPosAnim = useTransform(scrollYProgress, [0, 1], [0, 200]);
    const opacityAnim = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

    // Mouse tracking for background glow
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const springConfig = { damping: 25, stiffness: 120 };
    const mouseX = useSpring(0, springConfig);
    const mouseY = useSpring(0, springConfig);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            mouseX.set(e.clientX);
            mouseY.set(e.clientY);
            setMousePosition({ x: e.clientX, y: e.clientY });
        };

        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, [mouseX, mouseY]);

    const features = [
        {
            icon: <PenTool className="w-6 h-6 text-black" />,
            title: "Infinite Canvas",
            description: "Express your ideas freely on an endless whiteboard that grows with your imagination.",
            delay: 0.1
        },
        {
            icon: <Users className="w-6 h-6 text-black" />,
            title: "Real-time Collaboration",
            description: "Work seamlessly with your team. See cursors move and changes happen instantly.",
            delay: 0.2
        },
        {
            icon: <Share2 className="w-6 h-6 text-black" />,
            title: "Instant Sharing",
            description: "Share your canvas with a simple link. Control access rights with robust permissions.",
            delay: 0.4
        },
        {
            icon: <Layers className="w-6 h-6 text-black" />,
            title: "Smart Components",
            description: "Drop in pre-built shapes, sticky notes, and drawing tools to speed up your workflow.",
            delay: 0.5
        },
        {
            icon: <Shield className="w-6 h-6 text-black" />,
            title: "Enterprise Security",
            description: "Your data is encrypted end-to-end. We take privacy as seriously as you do.",
            delay: 0.6
        }
    ];

    return (
        <div className="min-h-screen bg-white text-slate-800 overflow-hidden font-sans relative">
            {/* Background Teal Glow Tracking Mouse */}
            <motion.div
                className="pointer-events-none fixed inset-0 z-10 h-full w-full mix-blend-multiply"
                style={{
                    background: `radial-gradient(800px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(20, 184, 166, 0.25), transparent 60%)`
                }}
            />

            {/* Navigation Bar */}
            <motion.nav
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex justify-between items-center"
            >
                <div className="flex items-center gap-3">
                    <img src="/CollabCanvas/logo.png" alt="CollabCanvas" className="h-8 w-auto mix-blend-multiply" />
                    <span className="text-xl font-bold tracking-tight text-black">Collab Canvas</span>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/login')}
                        className="text-sm font-semibold text-slate-600 hover:text-black transition-colors px-4 py-2"
                    >
                        Sign In
                    </button>
                    <Button
                        onClick={() => navigate('/register')}
                        className="bg-black text-white hover:bg-slate-800 border-none shadow-md hover:shadow-lg transition-all active:scale-[0.98] py-2 px-5 text-sm"
                    >
                        Get Started
                    </Button>
                </div>
            </motion.nav>

            {/* Hero Section */}
            <section className="relative pt-40 pb-24 px-6 max-w-7xl mx-auto min-h-screen flex flex-col justify-center">
                {/* Abstract Background Shapes */}
                <motion.div
                    style={{ y: yPosAnim, opacity: opacityAnim }}
                    className="absolute top-20 right-0 w-96 h-96 bg-blue-50 rounded-full blur-3xl -z-10 mix-blend-multiply opacity-50"
                />
                <motion.div
                    animate={{
                        scale: [1, 1.1, 1],
                        rotate: [0, 5, 0]
                    }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-20 -left-20 w-[500px] h-[500px] bg-blue-100 rounded-full blur-3xl -z-10 mix-blend-multiply opacity-40"
                />

                <div className="text-center max-w-4xl mx-auto z-10">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-semibold uppercase tracking-wider mb-8"
                    >
                        <Zap size={14} />
                        The future of visual collaboration
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                        className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.1] mb-8"
                    >
                        Think, Draw, and <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-black to-blue-600">Create Together.</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.5 }}
                        className="text-lg md:text-xl text-slate-600 leading-relaxed mb-12 max-w-2xl mx-auto"
                    >
                        A powerful workspace where teams ideate visually. Connect across the globe with real-time syncing, integrated calls, and an infinite board.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.7 }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-4"
                    >
                        <Button
                            onClick={() => navigate('/register')}
                            className="w-full sm:w-auto text-base py-6 px-10 bg-black hover:bg-slate-800 text-white border-none shadow-xl hover:shadow-2xl transition-all active:scale-[0.98] rounded-xl flex items-center justify-center gap-2 group"
                        >
                            Start for free
                            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Button>
                        <Button
                            onClick={() => navigate('/login')}
                            variant="outline"
                            className="w-full sm:w-auto text-base py-6 px-10 bg-white border-2 border-slate-200 text-slate-700 hover:border-black hover:text-black shadow-sm transition-all active:scale-[0.98] rounded-xl"
                        >
                            Sign In
                        </Button>
                    </motion.div>
                </div>

                {/* Dashboard Preview Mockup */}
                <motion.div
                    initial={{ opacity: 0, y: 100 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: 1, ease: "easeOut" }}
                    className="mt-24 relative mx-auto max-w-5xl"
                >
                    <div className="rounded-2xl border border-slate-200 shadow-2xl overflow-hidden bg-white aspect-[16/9] flex items-center justify-center relative group">
                        {/* Mock UI Frame */}
                        <div className="absolute top-0 left-0 right-0 h-10 bg-slate-50 border-b border-slate-200 flex items-center px-4 gap-2">
                            <div className="flex gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                                <div className="w-3 h-3 rounded-full bg-green-400"></div>
                            </div>
                        </div>

                        {/* Simple visual representation of canvas */}
                        <div className="w-full h-full pt-10 px-8 pb-8 flex flex-col items-center justify-center opacity-70 group-hover:opacity-100 transition-opacity duration-700">
                            <div className="grid grid-cols-3 gap-6 w-full max-w-3xl">
                                <motion.div
                                    whileHover={{ scale: 1.05, rotate: -2 }}
                                    className="h-32 bg-blue-50 rounded-xl border-2 border-blue-100 p-4 shadow-sm"
                                >
                                    <div className="w-1/2 h-4 bg-blue-200 rounded mb-2"></div>
                                    <div className="w-3/4 h-3 bg-slate-200 rounded mb-2"></div>
                                    <div className="w-full h-3 bg-slate-200 rounded"></div>
                                </motion.div>
                                <motion.div
                                    whileHover={{ scale: 1.05, rotate: 2 }}
                                    className="h-32 bg-purple-50 rounded-xl border-2 border-purple-100 p-4 shadow-sm transform translate-y-4"
                                >
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-8 h-8 rounded-full bg-black"></div>
                                        <div className="w-20 h-4 bg-purple-200 rounded"></div>
                                    </div>
                                    <div className="w-full h-3 bg-slate-200 rounded mb-2"></div>
                                </motion.div>
                                <motion.div
                                    whileHover={{ scale: 1.05, rotate: -1 }}
                                    className="h-32 bg-amber-50 rounded-xl border-2 border-amber-100 p-4 shadow-sm"
                                >
                                    <div className="w-full h-full border-2 border-dashed border-amber-300 rounded-lg flex items-center justify-center text-amber-500 font-medium text-xs">Drop image</div>
                                </motion.div>
                            </div>

                            {/* Fake floating toolbar */}
                            <div className="absolute bottom-8 content-center bg-white shadow-xl rounded-full px-6 py-3 border border-slate-100 flex gap-4">
                                {[PenTool, Users, Share2, Layers].map((Icon, i) => (
                                    <div key={i} className="p-2 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors">
                                        <Icon size={20} className="text-slate-600" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </section>

            {/* Features Section */}
            <section className="bg-slate-50 py-32 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-20">
                        <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6">Built for speed.<br />Designed for teams.</h2>
                        <p className="text-lg text-slate-600 max-w-2xl mx-auto">Everything you need to map out your next big idea, coordinate with your colleagues in real-time, and ship faster.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {features.map((feature, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-100px" }}
                                transition={{ duration: 0.6, delay: feature.delay }}
                                whileHover={{ y: -5, boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)" }}
                                className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm transition-all"
                            >
                                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-6">
                                    {feature.icon}
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                                <p className="text-slate-600 leading-relaxed">{feature.description}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-32 px-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-black -z-20"></div>
                {/* Abstract background for Dark CTA replacing blue with teal (via black overrides) */}
                <div className="absolute inset-0 bg-blue-900/20 -z-10 mix-blend-overlay"></div>

                <div className="max-w-4xl mx-auto text-center z-10">
                    <motion.h2
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="text-4xl md:text-6xl font-bold text-teal mb-8"
                    >
                        Ready to unleash your creativity?
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="text-xl text-blue-100 mb-12 max-w-2xl mx-auto"
                    >
                        Join thousands of teams already using Collab Canvas to build the future.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                    >
                        <Button
                            onClick={() => navigate('/register')}
                            className="py-6 px-12 bg-white text-black hover:bg-slate-100 text-lg font-bold rounded-xl shadow-2xl transition-transform active:scale-95 border-none"
                        >
                            Start for free today
                        </Button>
                    </motion.div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-white border-t border-slate-100 py-12 px-6">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2">
                        <img src="/CollabCanvas/logo.png" alt="CollabCanvas" className="h-6 w-auto mix-blend-multiply opacity-80" />
                        <span className="font-bold text-slate-800">Collab Canvas</span>
                    </div>
                    <div className="text-slate-500 text-sm">
                        © {new Date().getFullYear()} Collab Canvas. All rights reserved.
                    </div>
                    <div className="flex gap-6 text-sm font-medium text-slate-600">
                        <a href="#" className="hover:text-black transition-colors">Privacy</a>
                        <a href="#" className="hover:text-black transition-colors">Terms</a>
                        <a href="#" className="hover:text-black transition-colors">Contact</a>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
