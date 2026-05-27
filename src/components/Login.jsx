import React, { useState } from 'react';
import Swal from 'sweetalert2';
import { LogIn, Mail, Lock, Store, ChevronRight, ArrowLeft, ShieldCheck, User, Search } from 'lucide-react';
import MyPhoneIcon from './LocalIcons';
import { useAppContext } from '../context/AppContext';

const Login = ({ onTrackingClick }) => {
    const { login, API_URL } = useAppContext();
    const [step, setStep] = useState(1); // 1: Email, 2: Password
    const [email, setEmail] = useState('');
    const [userName, setUserName] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [resetEmail, setResetEmail] = useState('');

    const handleCheckEmail = async (e) => {
        e.preventDefault();
        if (!email) return;
        setIsLoading(true);
        setError('');

        try {
            const response = await fetch(`${API_URL}/users/check-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await response.json();
            
            if (data.success) {
                setUserName(data.name);
                setStep(2);
            } else {
                setError(data.message || 'Kullanıcı bulunamadı.');
            }
        // eslint-disable-next-line no-unused-vars
        } catch (err) {
            setError('Bağlantı hatası.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const success = await login(email, password);
            if (!success) {
                setError('Hatalı şifre.');
                setPassword('');
            }
        // eslint-disable-next-line no-unused-vars
        } catch (err) {
            setError('Bağlantı hatası.');
            setPassword('');
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const response = await fetch(`${API_URL}/users/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: resetEmail })
            });
            const data = await response.json();
            if (data.success) {
                Swal.fire({ icon: 'success', title: 'Tamamlandı', text: 'E-posta gönderildi.', confirmButtonColor: '#007aff' });
                setShowForgotPassword(false);
            } else {
                Swal.fire({ icon: 'error', title: 'Hata', text: data.message });
            }
        // eslint-disable-next-line no-unused-vars
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Hata', text: 'Bağlantı hatası.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#fbfbfd] p-4 relative overflow-hidden font-sans select-none">
            {/* Minimal Background */}
            <div className="absolute top-0 left-0 w-full h-full opacity-50 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] rounded-full bg-blue-50/50 blur-[140px]"></div>
            </div>

            <div className="relative w-full max-w-[380px] z-20">
                <div className="bg-white p-10 md:p-12 rounded-[32px] border border-gray-100 shadow-[0_20px_50px_rgba(0,0,0,0.04)] animate-fade-in-up duration-700">
                    
                    {/* Minimal Branding */}
                    <div className="text-center mb-10">
                        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-5 shadow-lg shadow-blue-500/20">
                            <Store size={32} strokeWidth={2.5} />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">OSS</h1>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">Servis Yönetimi</p>
                    </div>

                    {!showForgotPassword ? (
                        <div className="relative">
                            {step === 1 ? (
                                <form onSubmit={handleCheckEmail} className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
                                    <div className="space-y-2">
                                        <div className="relative group">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-500 transition-colors" size={20} />
                                            <input
                                                type="email"
                                                placeholder="E-posta adresi"
                                                className="w-full pl-12 pr-4 py-4 rounded-xl bg-gray-50 border border-transparent focus:bg-white focus:border-blue-500/30 outline-none transition-all text-gray-900 font-medium text-base placeholder:text-gray-300"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>

                                    {error && (
                                        <div className="text-center text-[11px] text-red-500 font-bold bg-red-50 py-3 rounded-xl border border-red-100 animate-shake">
                                            {error}
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/10 hover:bg-blue-700 hover:-translate-y-0.5 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                                    >
                                        {isLoading ? (
                                            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                        ) : (
                                            <>
                                                <span className="text-sm">Devam Et</span>
                                                <ChevronRight size={18} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
                                            </>
                                        )}
                                    </button>
                                </form>
                            ) : (
                                <form onSubmit={handleLogin} className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                                    <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-blue-500 shadow-sm">
                                            <User size={20} />
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">HOŞ GELDİNİZ</p>
                                            <h3 className="text-gray-900 font-bold text-sm truncate">{userName}</h3>
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={() => { setStep(1); setPassword(''); }}
                                            className="p-2 text-gray-400 hover:text-gray-900 transition-colors"
                                        >
                                            <ArrowLeft size={16} />
                                        </button>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="relative group">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-500 transition-colors" size={20} />
                                            <input
                                                type="password"
                                                placeholder="Güvenlik anahtarı"
                                                className="w-full pl-12 pr-4 py-4 rounded-xl bg-gray-50 border border-transparent focus:bg-white focus:border-blue-500/30 outline-none transition-all text-gray-900 font-mono text-base tracking-[0.2em] placeholder:text-gray-300 placeholder:tracking-normal"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                autoFocus
                                                required
                                            />
                                        </div>
                                    </div>

                                    {error && (
                                        <div className="text-center text-[11px] text-red-500 font-bold bg-red-50 py-3 rounded-xl border border-red-100 animate-shake">
                                            {error}
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/10 hover:bg-blue-700 hover:-translate-y-0.5 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                                    >
                                        {isLoading ? (
                                            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                        ) : (
                                            <>
                                                <span className="text-sm text-center">Giriş Yap</span>
                                            </>
                                        )}
                                    </button>
                                </form>
                            )}
                            
                            <div className="text-center mt-6">
                                <button 
                                    type="button"
                                    onClick={() => setShowForgotPassword(true)}
                                    className="text-[10px] text-gray-400 hover:text-blue-600 font-bold uppercase tracking-widest transition-colors"
                                >
                                    Şifremi Unuttum
                                </button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleForgotPassword} className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
                            <div className="space-y-2">
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                                    <input
                                        type="email"
                                        placeholder="Kayıtlı e-posta"
                                        className="w-full pl-12 pr-4 py-4 rounded-xl bg-gray-50 border border-transparent focus:bg-white focus:border-blue-500/30 outline-none transition-all text-gray-900 font-medium"
                                        value={resetEmail}
                                        onChange={(e) => setResetEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-blue-700 transition-all disabled:opacity-50 text-sm"
                            >
                                {isLoading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto"></div> : "E-Posta Gönder"}
                            </button>

                            <button 
                                type="button"
                                onClick={() => setShowForgotPassword(false)}
                                className="w-full text-[10px] text-gray-400 hover:text-gray-900 font-bold uppercase tracking-widest transition-colors text-center"
                            >
                                Vazgeç
                            </button>
                        </form>
                    )}

                    <div className="mt-10 pt-8 border-t border-gray-50 text-center">
                        <button 
                            onClick={onTrackingClick}
                            className="w-full py-4 text-blue-600 font-bold text-[10px] tracking-widest uppercase hover:text-blue-700 transition-all flex items-center justify-center gap-2 group"
                        >
                            <Search size={16} className="group-hover:scale-110 transition-transform" /> CİHAZ TAKİBİ
                        </button>
                    </div>
                </div>
                
                <div className="mt-8 text-center">
                    <p className="text-[9px] text-gray-300 font-bold uppercase tracking-[0.3em]">OSS Operating Software Solution</p>
                </div>
            </div>
        </div>
    );
};

export default Login;
