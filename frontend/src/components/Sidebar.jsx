import React from 'react';
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  ShieldAlert, 
  BellRing, 
  Settings,
  ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard' },
  { icon: ArrowLeftRight, label: 'Transactions' },
  { icon: ShieldAlert, label: 'Risk Monitor' },
  { icon: BellRing, label: 'Alerts' },
  { icon: Settings, label: 'Settings' },
];

const Sidebar = ({ activeView, onViewChange }) => {
  return (
    <aside className="fixed left-0 top-[73px] bottom-0 w-64 glass-dark border-r border-white/5 flex flex-col p-4 z-40">
      <div className="space-y-2">
        {menuItems.map((item, index) => (
          <motion.button
            key={item.label}
            whileHover={{ x: 4 }}
            onClick={() => onViewChange(item.label)}
            className={`w-full nav-link group ${activeView === item.label ? 'active' : ''}`}
          >
            <item.icon className={`w-5 h-5 transition-colors ${activeView === item.label ? 'text-blue-400' : 'group-hover:text-white'}`} />
            <span className="flex-1 text-left font-medium">{item.label}</span>
            {activeView === item.label && (
              <motion.div 
                layoutId="active-indicator"
                className="w-1 h-5 bg-blue-500 rounded-full"
              />
            )}
            {activeView !== item.label && (
              <ChevronRight className="w-4 h-4 text-gray-600 opacity-0 group-hover:opacity-100 transition-all" />
            )}
          </motion.button>
        ))}
      </div>
    </aside>
  );
};

export default Sidebar;
