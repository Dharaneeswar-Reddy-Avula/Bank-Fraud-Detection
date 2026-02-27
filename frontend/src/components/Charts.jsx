import React, { useMemo } from 'react';
import { 
  AreaChart, Area, 
  BarChart, Bar, 
  PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend
} from 'recharts';
import { motion } from 'framer-motion';
import { PieChart as PieIcon, LineChart as LineIcon, BarChart3 } from 'lucide-react';

const PIE_COLORS = ['#3b82f6', '#ef4444', '#f59e0b'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass p-3 rounded-lg border border-white/10 shadow-xl">
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-sm font-bold text-white">
          {payload[0].name}: <span className="text-blue-400">{payload[0].value}</span>
        </p>
      </div>
    );
  }
  return null;
};

const EmptyState = ({ icon: Icon, title }) => (
  <div className="flex flex-col items-center justify-center h-full opacity-30 text-center p-6">
    <Icon className="w-12 h-12 mb-4 text-gray-500" />
    <h4 className="text-sm font-bold uppercase tracking-widest text-gray-400">{title}</h4>
    <p className="text-[10px] mt-2 max-w-[200px]">No transaction data available yet. Analyze a transaction to see results.</p>
  </div>
);

const Charts = ({ transactions = [] }) => {
  // Compute chart data dynamically
  const { lineData, barData, pieData } = useMemo(() => {
    if (transactions.length === 0) return { lineData: [], barData: [], pieData: [] };

    // Line Data: Risk scores over time (last 10 transactions)
    const line = [...transactions].reverse().slice(-10).map(t => ({
      name: t.time.split(':')[0] + ':' + t.time.split(':')[1], // HH:MM
      risk: t.risk
    }));

    // Bar Data: Transaction amounts
    const bar = [...transactions].reverse().slice(-7).map(t => ({
      name: t.id.split('-')[1],
      vol: t.amount
    }));

    // Pie Data: Decision distribution
    const decisions = transactions.reduce((acc, t) => {
      acc[t.decision] = (acc[t.decision] || 0) + 1;
      return acc;
    }, {});

    const pie = [
      { name: 'Approve', value: decisions['APPROVE'] || 0 },
      { name: 'Block', value: decisions['BLOCK'] || 0 },
      { name: 'OTP', value: decisions['OTP_VERIFICATION'] || 0 }
    ].filter(d => d.value > 0);

    return { lineData: line, barData: bar, pieData: pie };
  }, [transactions]);

  const hasData = transactions.length > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
      {/* Risk Trend Line Chart */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="lg:col-span-2 glass-card h-[350px]"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Risk Trend (Live)</h3>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-[10px] text-gray-400 uppercase tracking-widest">Session Risk</span>
          </div>
        </div>
        <div className="w-full h-full -ml-4 pb-12">
          {hasData ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={lineData}>
                <defs>
                  <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="risk" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorRisk)" 
                  animationDuration={2000}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon={LineIcon} title="No Risk Trend" />
          )}
        </div>
      </motion.div>

      {/* Decision Pie Chart */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card h-[350px]"
      >
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6 text-center">Decision Mix</h3>
        <div className="w-full h-full pb-12">
          {hasData ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  animationDuration={2000}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="bottom" 
                  height={36} 
                  iconType="circle"
                  formatter={(value) => <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon={PieIcon} title="No Decision Mix" />
          )}
        </div>
      </motion.div>

      {/* Transaction Volume Bar Chart */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="lg:col-span-3 glass-card h-[350px]"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Recent Amounts</h3>
        </div>
        <div className="w-full h-full -ml-4 pb-12">
          {hasData ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="vol" 
                  name="Amount"
                  fill="#3b82f6" 
                  radius={[4, 4, 0, 0]} 
                  animationDuration={2000}
                >
                  {barData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={index === barData.length - 1 ? '#3b82f6' : 'rgba(59, 130, 246, 0.3)'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon={BarChart3} title="No Transaction History" />
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Charts;
