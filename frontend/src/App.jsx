import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Toaster, toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import RiskGauge from './components/RiskGauge';
import TransactionForm from './components/TransactionForm';
import ResultCard from './components/ResultCard';
import Charts from './components/Charts';
import TransactionsTable from './components/TransactionsTable';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Settings as SettingsIcon, 
  Bell, 
  Activity, 
  Zap,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

const API_BASE_URL = 'http://127.0.0.1:8000';

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [predictionResult, setPredictionResult] = useState(null);
  const [riskScore, setRiskScore] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [activeView, setActiveView] = useState('Dashboard');
  const [systemSettings, setSystemSettings] = useState({
    threshold: 0.3,
    autoBlock: true,
    notificationSound: true,
    strictMode: false
  });

  // Check API Connection
  useEffect(() => {
    const checkConnection = async () => {
      try {
        await axios.get(`${API_BASE_URL}/`);
        setIsConnected(true);
      } catch (error) {
        setIsConnected(false);
      }
    };
    checkConnection();
    const interval = setInterval(checkConnection, 5000);
    return () => clearInterval(interval);
  }, []);

  const handlePredict = async (formData) => {
    setLoading(true);
    const toastId = toast.loading('Analyzing transaction patterns...', {
      style: {
        background: '#1a1a1a',
        color: '#fff',
        border: '1px solid rgba(255,255,255,0.1)',
        fontSize: '12px',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: '1px'
      }
    });

    try {
      const response = await axios.post(`${API_BASE_URL}/predict`, formData);
      const result = response.data;
      
      // Override decision based on local system settings for demonstration of "functionality"
      let finalDecision = result.decision;
      const prob = result.risk_score;
      
      if (prob > 0.7) {
        finalDecision = 'BLOCK';
      } else if (prob > systemSettings.threshold) {
        finalDecision = 'OTP_VERIFICATION';
      } else {
        finalDecision = 'APPROVE';
      }

      const processedResult = { ...result, decision: finalDecision };
      
      setPredictionResult(processedResult);
      setRiskScore(prob * 100);
      
      // Add to transaction history
      const newTransaction = {
        id: `TXN-${Math.floor(Math.random() * 900000) + 100000}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        source: formData.Source,
        target: formData.Target,
        amount: formData.Weight,
        risk: Math.round(prob * 100),
        decision: finalDecision
      };
      setTransactions(prev => [newTransaction, ...prev]);
      
      toast.success('Analysis Complete', {
        id: toastId,
        duration: 4000,
        icon: '🛡️',
        style: {
          background: '#1a1a1a',
          color: '#fff',
          border: '1px solid rgba(59, 130, 246, 0.2)'
        }
      });

      // Specific toasts based on decision
      if (result.decision === 'BLOCK') {
        toast.error('CRITICAL: High Fraud Risk Detected', {
          duration: 6000,
          style: { background: '#ef4444', color: '#fff' }
        });
      } else if (result.decision === 'OTP_VERIFICATION') {
        toast('Verification Required', {
          icon: '⚠️',
          duration: 5000,
          style: { background: '#f59e0b', color: '#fff' }
        });
      }

    } catch (error) {
      console.error('Prediction error:', error);
      toast.error('Prediction failed. Please check backend connection.', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 text-gray-100 selection:bg-blue-500/30">
      <Toaster position="top-right" />
      
      <Navbar isConnected={isConnected} />
      <Sidebar activeView={activeView} onViewChange={setActiveView} />

      <main className="pl-64 pt-[73px] min-h-screen">
        <div className="p-8 max-w-[1600px] mx-auto space-y-8">
          
          {/* View Heading */}
          <motion.div 
            key={activeView}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col md:flex-row md:items-end justify-between gap-4"
          >
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase tracking-widest border border-blue-500/20">
                  {activeView === 'Dashboard' ? 'Live Monitor' : activeView}
                </span>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                  System v2.4.0
                </span>
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white uppercase italic">
                {activeView} <span className="text-blue-500">{activeView === 'Dashboard' ? 'Dashboard' : ''}</span>
              </h1>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Last Sync</p>
                <p className="text-xs font-mono text-gray-300">Just now</p>
              </div>
              <button className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-widest transition-all">
                Export Data
              </button>
            </div>
          </motion.div>

          {/* Conditional View Rendering */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeView === 'Dashboard' && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                    <div className="xl:col-span-3">
                      <RiskGauge score={riskScore} />
                    </div>
                    <div className="xl:col-span-4">
                      <TransactionForm onPredict={handlePredict} loading={loading} />
                    </div>
                    <div className="xl:col-span-5">
                      <ResultCard result={predictionResult} />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
                      <h2 className="text-lg font-bold text-white uppercase tracking-wider">Network Analytics</h2>
                    </div>
                    <Charts transactions={transactions} />
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
                      <h2 className="text-lg font-bold text-white uppercase tracking-wider">Recent Activity</h2>
                    </div>
                    <TransactionsTable transactions={transactions} />
                  </div>
                </div>
              )}

              {activeView === 'Transactions' && (
                <div className="space-y-6">
                  <TransactionsTable transactions={transactions} />
                </div>
              )}

              {activeView === 'Risk Monitor' && (
                <div className="space-y-8">
                  {/* Summary Row */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="glass-card p-4 flex items-center gap-4">
                      <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
                        <Activity className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Live Volume</p>
                        <p className="text-xl font-mono font-bold">{transactions.length}</p>
                      </div>
                    </div>
                    <div className="glass-card p-4 flex items-center gap-4">
                      <div className="p-3 bg-red-500/10 rounded-xl text-red-400">
                        <ShieldAlert className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Blocks</p>
                        <p className="text-xl font-mono font-bold text-red-400">
                          {transactions.filter(t => t.decision === 'BLOCK').length}
                        </p>
                      </div>
                    </div>
                    <div className="glass-card p-4 flex items-center gap-4">
                      <div className="p-3 bg-green-500/10 rounded-xl text-green-400">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Approved</p>
                        <p className="text-xl font-mono font-bold text-green-400">
                          {transactions.filter(t => t.decision === 'APPROVE').length}
                        </p>
                      </div>
                    </div>
                    <div className="glass-card p-4 flex items-center gap-4">
                      <div className="p-3 bg-yellow-500/10 rounded-xl text-yellow-400">
                        <Zap className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Fraud Rate</p>
                        <p className="text-xl font-mono font-bold text-yellow-400">
                          {transactions.length > 0 ? ((transactions.filter(t => t.decision === 'BLOCK').length / transactions.length) * 100).toFixed(1) : '0.0'}%
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="glass-card min-h-[400px]">
                      <h3 className="text-sm font-bold text-gray-100 uppercase tracking-widest mb-6">Threat Distribution</h3>
                      <Charts transactions={transactions} />
                    </div>
                    <div className="glass-card min-h-[400px]">
                      <h3 className="text-sm font-bold text-gray-100 uppercase tracking-widest mb-6">Network Health</h3>
                      <div className="space-y-6">
                        {['Neural Engine', 'Database Sync', 'Prediction API', 'Model Cache'].map((service, i) => (
                          <div key={service} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                              <span className="text-sm font-medium">{service}</span>
                            </div>
                            <span className="text-[10px] font-mono text-gray-500 uppercase">Operational</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeView === 'Alerts' && (
                <div className="space-y-6">
                  {transactions.filter(t => t.decision === 'BLOCK' || t.decision === 'OTP_VERIFICATION').length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                      {transactions.filter(t => t.decision === 'BLOCK' || t.decision === 'OTP_VERIFICATION').map((alert, i) => (
                        <motion.div 
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          key={alert.id}
                          className={`glass-card p-6 border-l-4 ${alert.decision === 'BLOCK' ? 'border-l-red-500 bg-red-500/5' : 'border-l-yellow-500 bg-yellow-500/5'} flex items-center justify-between`}
                        >
                          <div className="flex items-center gap-6">
                            <div className={`p-4 rounded-full ${alert.decision === 'BLOCK' ? 'bg-red-500/10 text-red-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                              <AlertCircle className="w-6 h-6" />
                            </div>
                            <div>
                              <h4 className="font-bold text-white uppercase tracking-wider">{alert.decision} ALERT</h4>
                              <p className="text-xs text-gray-400 mt-1">Transaction <span className="text-blue-400 font-mono">{alert.id}</span> exceeded safety thresholds.</p>
                              <div className="flex items-center gap-4 mt-3">
                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Amount: ${alert.amount}</span>
                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Time: {alert.time}</span>
                                <span className="text-[10px] text-red-400 font-bold uppercase tracking-widest">Risk: {alert.risk}%</span>
                              </div>
                            </div>
                          </div>
                          <button className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-white/10 transition-all">
                            Review Evidence
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="glass-card h-[400px] flex flex-col items-center justify-center text-center">
                      <div className="p-6 bg-green-500/10 rounded-full text-green-400 mb-6">
                        <ShieldCheck className="w-12 h-12" />
                      </div>
                      <h3 className="text-xl font-bold text-white uppercase tracking-widest mb-2">System Secure</h3>
                      <p className="text-gray-500 max-w-sm">No high-risk transactions detected. All activities are within normal parameters.</p>
                    </div>
                  )}
                </div>
              )}

              {activeView === 'Settings' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="glass-card p-8">
                    <div className="flex items-center gap-3 mb-8">
                      <SettingsIcon className="w-5 h-5 text-blue-400" />
                      <h3 className="text-sm font-bold text-gray-100 uppercase tracking-widest">Detection Thresholds</h3>
                    </div>
                    <div className="space-y-8">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Global Fraud Sensitivity</label>
                          <span className="text-blue-400 font-mono font-bold">{(systemSettings.threshold * 100).toFixed(0)}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="10" 
                          max="90" 
                          value={systemSettings.threshold * 100}
                          onChange={(e) => setSystemSettings(prev => ({ ...prev, threshold: e.target.value / 100 }))}
                          className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                        <div className="flex justify-between text-[10px] text-gray-600 font-bold uppercase tracking-widest">
                          <span>Low Sensitivity</span>
                          <span>Balanced</span>
                          <span>Strict</span>
                        </div>
                      </div>

                      <div className="space-y-4 pt-4 border-t border-white/5">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-bold text-white uppercase tracking-wider">Automatic Blocking</p>
                            <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest">Instantly stop transactions above threshold</p>
                          </div>
                          <button 
                            onClick={() => setSystemSettings(prev => ({ ...prev, autoBlock: !prev.autoBlock }))}
                            className={`w-12 h-6 rounded-full transition-colors relative ${systemSettings.autoBlock ? 'bg-blue-500' : 'bg-white/10'}`}
                          >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${systemSettings.autoBlock ? 'left-7' : 'left-1'}`} />
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-bold text-white uppercase tracking-wider">Neural Over-ride</p>
                            <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest">Use AI to override manual thresholds</p>
                          </div>
                          <button 
                            onClick={() => setSystemSettings(prev => ({ ...prev, strictMode: !prev.strictMode }))}
                            className={`w-12 h-6 rounded-full transition-colors relative ${systemSettings.strictMode ? 'bg-blue-500' : 'bg-white/10'}`}
                          >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${systemSettings.strictMode ? 'left-7' : 'left-1'}`} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="glass-card p-8">
                    <div className="flex items-center gap-3 mb-8">
                      <TrendingUp className="w-5 h-5 text-purple-400" />
                      <h3 className="text-sm font-bold text-gray-100 uppercase tracking-widest">System Maintenance</h3>
                    </div>
                    <div className="space-y-6">
                      <button className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-widest transition-all text-left px-6">
                        Reset Transaction Cache
                      </button>
                      <button className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-widest transition-all text-left px-6">
                        Download Security Logs
                      </button>
                      <button className="w-full py-4 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-xl text-xs font-bold uppercase tracking-widest transition-all text-blue-400 px-6">
                        Sync Neural Model v2.4
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Background blobs */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[120px] -z-10 pointer-events-none" />
      <div className="fixed bottom-0 left-64 w-[500px] h-[500px] bg-purple-600/5 rounded-full blur-[120px] -z-10 pointer-events-none" />
    </div>
  );
}

export default App;
