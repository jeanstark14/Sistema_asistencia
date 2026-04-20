export const Card = ({ children, className = '', ...props }) => {
  return (
    <div 
      className={`bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-[2rem] shadow-2xl p-6 ${className}`} 
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
