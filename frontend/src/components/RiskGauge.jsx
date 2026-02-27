import React from 'react';
import { motion } from 'framer-motion';

const RiskGauge = ({ score = 0 }) => {
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  
  const getColor = (s) => {
    if (s < 30) return '#10b981'; // Green
    if (s < 70) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
  };

  const getStatusText = (s) => {
    if (s < 30) return 'SAFE';
    if (s < 70) return 'OTP REQUIRED';
    return 'BLOCK';
  };

  const color = getColor(score);

  return (
    <div className="glass-card flex flex-col items-center justify-center relative overflow-hidden h-full">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      
      <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-6">Risk Assessment</h3>
      
      <div className="relative w-48 h-48 flex items-center justify-center">
        {/* Background Circle */}
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="96"
            cy="96"
            r={radius}
            stroke="currentColor"
            strokeWidth="12"
            fill="transparent"
            className="text-white/5"
          />
          {/* Progress Circle */}
          <motion.circle
            cx="96"
            cy="96"
            r={radius}
            stroke={color}
            strokeWidth="12"
            fill="transparent"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - progress }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            strokeLinecap="round"
            className="drop-shadow-[0_0_8px_rgba(0,0,0,0.5)]"
          />
        </svg>

        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span 
            key={score}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold text-white tabular-nums"
          >
            {Math.round(score)}%
          </motion.span>
          <span className="text-[10px] text-gray-500 font-medium tracking-tighter uppercase">Fraud Probability</span>
        </div>
      </div>

      <div className="mt-8 flex flex-col items-center gap-2">
        <div 
          className="px-4 py-1.5 rounded-full text-[10px] font-bold tracking-widest border transition-colors duration-500"
          style={{ 
            color: color, 
            borderColor: `${color}40`,
            backgroundColor: `${color}10`
          }}
        >
          {getStatusText(score)}
        </div>
        <p className="text-[11px] text-gray-500 text-center max-w-[200px] leading-relaxed">
          AI-driven analysis based on behavioral patterns and historical data.
        </p>
      </div>

      {/* Decorative gradients */}
      <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -top-10 -left-10 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
    </div>
  );
};

export default RiskGauge;
