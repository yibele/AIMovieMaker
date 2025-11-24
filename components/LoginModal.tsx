import React, { useState } from 'react';
import { Loader2, Sparkles, X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLoginSuccess: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/`, // Redirect back to home
                },
            });

            if (error) {
                throw error;
            }

            // OAuth will redirect the user, so we don't need to manually call onLoginSuccess here immediately.
            // The session check on the main page should handle the state update after redirect.

        } catch (error: any) {
            console.error('Login error:', error);
            toast.error(`Login failed: ${error.message}`);
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 perspective-[2000px]">
            {/* Backdrop with smoother blur transition */}
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-[8px] transition-all duration-500 animate-in fade-in"
                onClick={onClose}
            />

            {/* Modal Card with Spring Physics Animation */}
            <div className="relative w-full max-w-sm animate-modal-spring origin-center">

                {/* Glass Container */}
                <div className="relative bg-white/90 backdrop-blur-2xl rounded-3xl shadow-[0_0_0_1px_rgba(255,255,255,0.5),0_40px_80px_-20px_rgba(0,0,0,0.3)] overflow-hidden p-8">

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
                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">Welcome</h2>
                        <p className="text-slate-500 text-sm">Sign in to continue to Morpheus</p>
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={handleGoogleLogin}
                            disabled={isLoading}
                            className="w-full flex items-center justify-center px-4 py-3 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 hover:border-slate-300 transition-all text-sm font-medium text-slate-700 group relative overflow-hidden"
                        >
                            <svg className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Continue with Google
                            {isLoading && <Loader2 className="absolute right-4 w-4 h-4 animate-spin text-slate-400" />}
                        </button>
                    </div>

                    <div className="mt-8 text-center">
                        <p className="text-xs text-slate-400">
                            By continuing, you agree to our{' '}
                            <a href="#" className="text-slate-500 hover:text-slate-700 hover:underline">Terms of Service</a>
                            {' '}and{' '}
                            <a href="#" className="text-slate-500 hover:text-slate-700 hover:underline">Privacy Policy</a>.
                        </p>
                    </div>

                </div>
            </div>
        </div>
    );
};
