import React from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Info,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ResultCard = ({ result }) => {
  if (!result) return (
    <div className="glass-card h-full flex flex-col items-center justify-center text-center p-12 border-dashed border-2 border-white/5 opacity-40">
      <div className="p-4 bg-white/5 rounded-full mb-4">
        <Info className="w-8 h-8 text-gray-500" />
      </div>
      <h3 className="text-lg font-bold text-gray-500 uppercase tracking-widest mb-2">No Active Result</h3>
      <p className="text-sm text-gray-600 max-w-[240px]">Fill out the form to run a fraud prediction analysis.</p>
    </div>
  );

  const { risk_score, decision, model } = result;
  const score = risk_score * 100;

  const getStyle = () => {
    switch (decision) {
      case 'APPROVE':
        return {
          icon: CheckCircle2,
          color: 'text-green-400',
          bg: 'bg-green-500/10',
          border: 'border-green-500/20',
          shadow: 'shadow-green-500/10',
          text: 'APPROVE',
          msg: 'Transaction appears safe. No immediate fraud risk detected.',
          sub: 'Verified by AI v1'
        };
      case 'OTP_VERIFICATION':
        return {
          icon: AlertTriangle,
          color: 'text-yellow-400',
          bg: 'bg-yellow-500/10',
          border: 'border-yellow-500/20',
          shadow: 'shadow-yellow-500/10',
          text: 'OTP REQUIRED',
          msg: 'Unusual patterns detected. Additional verification recommended.',
          sub: 'Risk Score Elevated'
        };
      case 'BLOCK':
        return {
          icon: XCircle,
          color: 'text-red-400',
          bg: 'bg-red-500/10',
          border: 'border-red-500/20',
          shadow: 'shadow-red-500/10',
          text: 'BLOCK',
          msg: 'High fraud probability detected. Transaction blocked.',
          sub: 'Critical Threat Level'
        };
      default:
        return {};
    }
  };

  const style = getStyle();
  const Icon = style.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`glass-card h-full flex flex-col relative overflow-hidden border-2 ${style.border} ${style.shadow}`}
    >
      <div className="absolute top-0 right-0 p-2 text-[10px] font-mono text-gray-600 tracking-widest bg-white/5 rounded-bl-xl border-l border-b border-white/5">
        ID: TXN-{Math.floor(Math.random() * 900000) + 100000}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <motion.div
          initial={{ rotate: -45, scale: 0.5 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          className={`p-6 rounded-3xl ${style.bg} mb-6 relative`}
        >
          <Icon className={`w-16 h-16 ${style.color} drop-shadow-lg`} />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`absolute -inset-2 rounded-3xl blur-2xl -z-10 ${style.bg}`}
          />
        </motion.div>

        <h3 className={`text-3xl font-black uppercase tracking-tighter mb-2 ${style.color}`}>
          {style.text}
        </h3>
        
        <div className="flex items-center gap-2 mb-6">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{style.sub}</span>
          <div className="w-1 h-1 rounded-full bg-gray-600" />
          <span className="text-xs font-mono text-blue-400">{model}</span>
        </div>

        <div className="w-full bg-white/5 rounded-2xl p-4 border border-white/5 mb-6">
          <p className="text-sm text-gray-300 leading-relaxed font-medium">
            "{style.msg}"
          </p>
        </div>

        <div className="w-full grid grid-cols-2 gap-3">
          <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-left">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Risk Score</p>
            <p className={`text-xl font-mono font-bold ${style.color}`}>{score.toFixed(2)}%</p>
          </div>
          <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-left">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Time</p>
            <p className="text-xl font-mono font-bold text-gray-300">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>
      </div>

      <button className="w-full py-4 bg-white/5 hover:bg-white/10 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-white transition-all border-t border-white/5 flex items-center justify-center gap-2 group">
        View Detailed Report
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </button>
    </motion.div>
  );
};

export default ResultCard;
