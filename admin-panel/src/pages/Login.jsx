import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAuthApi } from '../services/api';
import { Shield, Lock, Mail, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await adminAuthApi.login({ email: formData.email, password: formData.password });
      localStorage.setItem('admin_token', response.data.access_token);
      toast.success('Admin authenticated successfully');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid admin credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
      <div className="w-full max-w-md glass-card p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
        
        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-500/20 p-4 rounded-3xl mb-4 border border-blue-500/20">
            <Shield className="w-10 h-10 text-blue-400" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase italic">
            FraudShield <span className="text-blue-500">Admin</span>
          </h1>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-[0.2em] mt-2">Central Control Console</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1 text-shadow-glow">Admin Email</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-blue-400 transition-colors" />
              <input
                required
                type="email"
                placeholder="admin@fraudshield.ai"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-white/5 border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-sm text-white placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/40 transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1 text-shadow-glow">Security Password</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-blue-400 transition-colors" />
              <input
                required
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full bg-white/5 border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-sm text-white placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/40 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-xl mb-2">
            <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
            <p className="text-[10px] text-yellow-500/80 font-medium uppercase tracking-wider leading-relaxed">
              Authorized access only. All actions are logged and monitored.
            </p>
          </div>

          <button
            disabled={loading}
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-black uppercase tracking-[0.2em] py-5 rounded-2xl transition-all shadow-xl shadow-blue-500/10 flex items-center justify-center gap-3 active:scale-[0.98]"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Initialize Console'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">
            System Node: Core-v2.4.0-Final
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
