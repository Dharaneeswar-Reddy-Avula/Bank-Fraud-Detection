import React, { useState } from 'react';
import { Send, Loader2, Sparkles, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TransactionForm = ({ onPredict, loading }) => {
  const [formData, setFormData] = useState({
    Source: '',
    Target: '',
    Weight: '',
    typeTrans: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onPredict({
      Source: Number(formData.Source),
      Target: Number(formData.Target),
      Weight: Number(formData.Weight),
      typeTrans: Number(formData.typeTrans)
    });
  };

  return (
    <div className="glass-card h-full flex flex-col relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
        <Database className="w-24 h-24" />
      </div>

      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 bg-blue-500/10 rounded-lg">
          <Sparkles className="w-4 h-4 text-blue-400" />
        </div>
        <h3 className="text-gray-100 font-bold text-sm uppercase tracking-widest">Analyze Transaction</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 flex-1">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Source ID</label>
            <input
              required
              type="number"
              name="Source"
              placeholder="e.g. 1001"
              value={formData.Source}
              onChange={handleChange}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Target ID</label>
            <input
              required
              type="number"
              name="Target"
              placeholder="e.g. 2005"
              value={formData.Target}
              onChange={handleChange}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Amount (Weight)</label>
          <div className="relative">
            <input
              required
              type="number"
              name="Weight"
              placeholder="0.00"
              value={formData.Weight}
              onChange={handleChange}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Transaction Type</label>
          <select
            required
            name="typeTrans"
            value={formData.typeTrans}
            onChange={handleChange}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all appearance-none cursor-pointer"
          >
            <option value="" disabled className="bg-dark-800">Select Type</option>
            <option value="1" className="bg-dark-800">Transfer</option>
            <option value="2" className="bg-dark-800">Cash Out</option>
            <option value="3" className="bg-dark-800">Payment</option>
            <option value="4" className="bg-dark-800">Debit</option>
            <option value="5" className="bg-dark-800">Cash In</option>
          </select>
        </div>

        <button
          disabled={loading}
          type="submit"
          className="w-full group bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 overflow-hidden relative"
        >
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Loader2 className="w-5 h-5 animate-spin" />
              </motion.div>
            ) : (
              <motion.div
                key="submit"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2"
              >
                <span>Run Prediction</span>
                <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </form>
    </div>
  );
};

export default TransactionForm;
