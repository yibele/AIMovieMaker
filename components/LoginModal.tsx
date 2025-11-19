import React, { useState } from 'react';
import { Mail, Lock, Loader2, Github, Sparkles, X } from 'lucide-react';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLoginSuccess: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        // Simulate network delay for effect
        setTimeout(() => {
            setIsLoading(false);
            onLoginSuccess();
        }, 1500);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 perspective-[2000px]">
            {/* Backdrop with smoother blur transition */}
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-[8px] transition-all duration-500 animate-in fade-in"
                onClick={onClose}
            />

            {/* Modal Card with Spring Physics Animation */}
            <div className="relative w-full max-w-md animate-modal-spring origin-center">

                {/* Glass Container */}
                <div className="relative bg-white/90 backdrop-blur-2xl rounded-3xl shadow-[0_0_0_1px_rgba(255,255,255,0.5),0_40px_80px_-20px_rgba(0,0,0,0.3)] overflow-hidden p-8 md:p-10">

                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100/50 rounded-full transition-all z-20"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* Decorative Sheen */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500"></div>

                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-violet-50 text-violet-600 mb-4 shadow-sm ring-1 ring-violet-100 group hover:scale-110 transition-transform duration-500">
                            <Sparkles className="w-6 h-6" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">Welcome Back</h2>
                        <p className="text-slate-500 text-sm">Enter your credentials to access the Morpheus engine.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700 ml-1">Email</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-3.5 w-4 h-4 text-slate-400 group-focus-within:text-violet-600 transition-colors" />
                                <input
                                    type="email"
                                    required
                                    placeholder="creator@morpheus.ai"
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl px-10 py-3 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all placeholder:text-slate-400 hover:border-slate-300"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center ml-1">
                                <label className="text-xs font-semibold text-slate-700">Password</label>
                                <a href="#" className="text-[10px] font-medium text-violet-600 hover:text-violet-700">Forgot?</a>
                            </div>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-3.5 w-4 h-4 text-slate-400 group-focus-within:text-violet-600 transition-colors" />
                                <input
                                    type="password"
                                    required
                                    placeholder="••••••••"
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl px-10 py-3 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all placeholder:text-slate-400 hover:border-slate-300"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full relative overflow-hidden bg-slate-900 text-white font-semibold rounded-xl py-3.5 shadow-lg shadow-slate-900/20 hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>

                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-100"></div>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white/80 px-2 text-slate-400">Or continue with</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button className="flex items-center justify-center px-4 py-2.5 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 hover:border-slate-300 transition-all text-sm font-medium text-slate-700 group">
                            <svg className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Google
                        </button>
                        <button className="flex items-center justify-center px-4 py-2.5 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 hover:border-slate-300 transition-all text-sm font-medium text-slate-700 group">
                            <Github className="w-4 h-4 mr-2 text-slate-900 group-hover:scale-110 transition-transform" />
                            GitHub
                        </button>
                    </div>

                    <div className="mt-8 text-center">
                        <p className="text-xs text-slate-400">
                            Don't have an account?{' '}
                            <button className="text-violet-600 hover:text-violet-700 font-semibold hover:underline">Create one now</button>
                        </p>
                    </div>

                </div>
            </div>
        </div>
    );
};
