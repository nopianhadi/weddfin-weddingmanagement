
import React, { useState } from 'react';
import { User } from '../types';
import { GoogleIcon } from '../constants';

const UserIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
    </svg>
);

const LockIconSvg = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
    </svg>
);

const EyeIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
);

const EyeOffIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 11 8 11 8a18.35 18.35 0 0 1-2.18 3.22" /><path d="M1.42 1.42A19.88 19.88 0 0 0 1 12s4 8 11 8a18.35 18.35 0 0 0 3.22-2.18" /><line x1="2" y1="2" x2="22" y2="22" /></svg>
);


interface LoginProps {
    onLoginSuccess: (user: User) => void;
    users: User[];
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess, users }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const cleanEmail = email.trim();
        const cleanPassword = password.trim();

        console.log('[Login] Attempting login for:', cleanEmail);

        // Fetch against database to prevent race conditions with app state
        import('../services/users').then(({ getUserByEmail }) => {
            getUserByEmail(cleanEmail).then(user => {
                if (user) {
                    console.log('[Login] User found in database');
                    if (user.password === cleanPassword || user.password === password) {
                        onLoginSuccess(user);
                    } else {
                        console.warn('[Login] Password mismatch');
                        setError('Username atau kata sandi salah.');
                    }
                } else {
                    console.warn('[Login] No user found with email:', cleanEmail);
                    setError('Username atau kata sandi salah.');
                }
            }).catch(err => {
                console.error('[Login] Supabase fetch error:', err);
                setError('Terjadi kesalahan sistem (koneksi database). Coba lagi.');
            }).finally(() => {
                setIsLoading(false);
            });
        });
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4 relative overflow-hidden">
            {/* Background Image */}
            <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
                <img src="/assets/images/backgrounds/login-bg.svg" alt="" className="w-full h-full object-cover" />
            </div>

            <div className="w-full max-w-sm mx-auto relative z-10">
                <div className="bg-white/80 backdrop-blur-xl p-8 rounded-2xl shadow-xl border border-white/50">
                    <div className="text-center mb-8">
                        <div className="flex justify-center mb-6">
                            <img src="/assets/images/logos/light-logo.svg" alt="Weddfin" className="h-10 w-auto" />
                        </div>
                        <h1 className="text-3xl font-bold text-slate-800">Login</h1>
                        <p className="text-sm text-slate-500 mt-2">Hey, masukkan detail Anda untuk masuk ke akun Anda</p>
                    </div>

                    <form className="space-y-5" onSubmit={handleSubmit}>
                        {error && (
                            <div className="p-3 bg-red-100 border border-red-200 text-red-700 rounded-lg text-sm">
                                {error}
                            </div>
                        )}
                        <div className="input-with-icon">
                            <UserIcon className="input-icon w-5 h-5" />
                            <input
                                id="email"
                                name="email"
                                type="text"
                                required
                                className="w-full h-12 px-4 bg-slate-100 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                                placeholder="Enter your username/email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="input-with-icon">
                            <LockIconSvg className="input-icon w-5 h-5" />
                            <input
                                id="password"
                                name="password"
                                type={isPasswordVisible ? 'text' : 'password'}
                                required
                                className="w-full h-12 px-4 bg-slate-100 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                                style={{ paddingRight: '2.5rem' }}
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                                aria-label={isPasswordVisible ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                            >
                                {isPasswordVisible ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                            </button>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="button-primary w-full"
                            >
                                {isLoading ? 'Logging In...' : 'Log In'}
                            </button>
                        </div>
                    </form>

                    <div className="flex items-center my-6">
                        <hr className="flex-grow border-t border-slate-200" />
                        <span className="mx-4 text-xs font-semibold text-slate-400">ATAU</span>
                        <hr className="flex-grow border-t border-slate-200" />
                    </div>

                    <button className="w-full h-12 px-4 bg-white border border-slate-300 rounded-lg flex items-center justify-center gap-2 text-slate-700 font-semibold hover:bg-slate-50 transition-colors">
                        <GoogleIcon className="w-5 h-5" />
                        Masuk dengan Google
                    </button>

                    <div className="text-center mt-4">
                        <a href="#/verify" className="text-sm text-slate-500 hover:text-blue-600 transition-colors">
                            Verifikasi Dokumen Digital
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;