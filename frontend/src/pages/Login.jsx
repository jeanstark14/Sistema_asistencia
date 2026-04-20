import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, Mail, Lock, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import Button from '../components/ui/Button';
import InputField from '../components/ui/InputField';
import { Card } from '../components/ui/Card';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        const result = await login(email, password);
        
        if (result.success) {
            navigate('/');
        } else {
            setError(result.error);
        }
        setIsSubmitting(false);
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden font-sans">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/10 rounded-full blur-[120px]" />

            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-[440px] relative z-10"
            >
                <Card className="p-10">
                    <div className="text-center mb-10">
                        <div className="w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 relative overflow-hidden group p-2 bg-slate-900 border border-white/5">
                             <img src="/logo.png" alt="Logo" className="w-full h-full object-contain relative z-10" />
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tighter mb-2 italic uppercase">Sistema TID</h1>
                        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em]">Panel Administrativo Central</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <InputField 
                            label="Identidad Digital"
                            icon={Mail}
                            type="email"
                            placeholder="admin@sistema.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />

                        <InputField 
                            label="Código de Acceso"
                            icon={Lock}
                            type="password"
                            placeholder="••••••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />

                        <AnimatePresence>
                            {error && (
                                <motion.div 
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-2xl text-xs font-bold flex items-center gap-3 overflow-hidden"
                                >
                                    <AlertCircle size={16} />
                                    <span>{error}</span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <Button 
                            type="submit" 
                            className="w-full py-5 text-base uppercase tracking-[0.2em]"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? <Loader2 className="animate-spin" size={24} /> : 'Iniciar Auditoría'}
                        </Button>
                    </form>

                    <div className="mt-10 flex items-center justify-center gap-2 py-4 border-t border-white/5 opacity-50">
                        <ShieldCheck className="text-emerald-500" size={14} />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Acceso Seguro mediante SSL</span>
                    </div>
                </Card>
            </motion.div>
        </div>
    );
};

export default Login;
