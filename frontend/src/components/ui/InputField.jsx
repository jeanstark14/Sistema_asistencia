import { motion } from 'framer-motion';

const InputField = ({ label, icon: Icon, type = 'text', error, className = '', ...props }) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] pl-1">
          {label}
        </label>
      )}
      <div className="relative group">
        {Icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
            <Icon size={18} />
          </div>
        )}
        <input 
          type={type} 
          className={`
            w-full bg-slate-900/50 border border-white/5 rounded-2xl p-4 text-white 
            focus:outline-none focus:border-indigo-500/50 focus:bg-slate-900/80 
            transition-all placeholder:text-slate-700 font-medium
            ${Icon ? 'pl-12' : ''}
            ${error ? 'border-rose-500/50 bg-rose-500/5' : ''}
          `}
          {...props}
        />
      </div>
      {error && (
        <motion.p 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="text-xs font-bold text-rose-500 pl-1"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
};

export default InputField;
