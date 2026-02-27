import React from 'react';
import { 
  ArrowUpRight, 
  MoreVertical,
  Search,
  Filter,
  Inbox
} from 'lucide-react';
import { motion } from 'framer-motion';

const TransactionsTable = ({ transactions = [] }) => {
  const getBadgeStyle = (decision) => {
    switch (decision) {
      case 'APPROVE':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'OTP_VERIFICATION':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'BLOCK':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  return (
    <div className="glass-card w-full overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-sm font-bold text-gray-100 uppercase tracking-widest">Recent Transactions</h3>
          <p className="text-[10px] text-gray-500 font-medium uppercase tracking-widest mt-1">Real-time Activity Stream</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search TXN ID..." 
              className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50 w-48 transition-all"
            />
          </div>
          <button className="p-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors">
            <Filter className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto -mx-6">
        <table className="w-full min-w-[800px] border-collapse px-6">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.02]">
              <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">Transaction ID</th>
              <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">Time</th>
              <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">Source/Target</th>
              <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">Amount</th>
              <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">Risk Score</th>
              <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">Decision</th>
              <th className="px-6 py-4 text-center text-[10px] font-bold text-gray-500 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {transactions.length > 0 ? (
              transactions.map((txn, index) => (
                <motion.tr 
                  key={txn.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-white/[0.03] transition-colors group cursor-default"
                >
                  <td className="px-6 py-5">
                    <span className="text-xs font-mono font-bold text-blue-400 group-hover:text-blue-300 transition-colors">{txn.id}</span>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-xs text-gray-400 tabular-nums">{txn.time}</span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-300 tabular-nums">{txn.source}</span>
                      <ArrowUpRight className="w-3 h-3 text-gray-600" />
                      <span className="text-xs font-bold text-gray-300 tabular-nums">{txn.target}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-gray-600 font-bold">$</span>
                      <span className="text-xs font-bold text-gray-200 tabular-nums">{txn.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${txn.risk}%` }}
                          transition={{ duration: 1, delay: 0.5 + index * 0.1 }}
                          className={`h-full rounded-full ${txn.risk > 70 ? 'bg-red-500' : txn.risk > 30 ? 'bg-yellow-500' : 'bg-green-500'}`}
                        />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-gray-400 tabular-nums">{txn.risk}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`px-2 py-1 rounded-md text-[9px] font-black tracking-widest border ${getBadgeStyle(txn.decision)}`}>
                      {txn.decision}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <button className="p-1.5 hover:bg-white/5 rounded-lg text-gray-600 hover:text-white transition-all">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </td>
                </motion.tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="px-6 py-12 text-center opacity-20">
                  <div className="flex flex-col items-center justify-center">
                    <Inbox className="w-12 h-12 mb-4" />
                    <p className="text-xs font-bold uppercase tracking-widest">No Active Transactions</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between">
        <p className="text-[10px] text-gray-600 uppercase font-bold tracking-widest">
          Showing {transactions.length} transactions
        </p>
      </div>
    </div>
  );
};

export default TransactionsTable;
