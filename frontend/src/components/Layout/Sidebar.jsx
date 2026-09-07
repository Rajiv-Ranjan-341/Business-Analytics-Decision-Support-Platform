import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Upload,
  TrendingUp,
  Users,
  Package,
  Search,
  SlidersHorizontal,
  Bot,
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/upload', icon: Upload, label: 'Upload Data' },
  { to: '/forecast', icon: TrendingUp, label: 'Forecasting' },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/products', icon: Package, label: 'Products' },
  { to: '/diagnosis', icon: Search, label: 'Diagnosis' },
  { to: '/simulator', icon: SlidersHorizontal, label: 'What-If' },
  { to: '/assistant', icon: Bot, label: 'AI Assistant' },
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-gray-900 text-gray-300 flex flex-col min-h-screen">
      <div className="p-5 border-b border-gray-700">
        <h1 className="text-xl font-bold text-white tracking-tight">
          BizOpt<span className="text-blue-400">AI</span>
        </h1>
        <p className="text-xs text-gray-500 mt-1">Business Intelligence Platform</p>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-700 text-xs text-gray-500">
        v0.1.0 &middot; Phase 1
      </div>
    </aside>
  );
}
