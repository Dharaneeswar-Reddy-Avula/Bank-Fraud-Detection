import React, { useState, useEffect } from 'react';
import { Shield, Bell, User, Wifi, WifiOff } from 'lucide-react';
import { motion } from 'framer-motion';

const Navbar = ({ isConnected }) => {
  const [time, setTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-dark border-b border-white/5 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="bg-blue-500 p-2 rounded-lg">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <span className="text-xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
          FraudShield AI
        </span>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
          {isConnected ? (
            <>
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-green-400 font-medium uppercase tracking-wider">API Connected</span>
              <Wifi className="w-3.5 h-3.5 text-green-400" />
            </>
          ) : (
            <>
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-xs text-red-400 font-medium uppercase tracking-wider">API Disconnected</span>
              <WifiOff className="w-3.5 h-3.5 text-red-400" />
            </>
          )}
        </div>

        <div className="text-sm text-gray-400 font-mono bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
          {time}
        </div>

        <div className="flex items-center gap-4">
          <button className="relative p-2 text-gray-400 hover:text-white transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full border-2 border-dark-900" />
          </button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center cursor-pointer border border-white/20">
            <User className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
