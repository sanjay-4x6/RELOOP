import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Activity, 
  BatteryWarning, 
  Settings2, 
  BookOpen 
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/': return 'Intelligence Console';
      case '/assessment': return 'Battery Assessment';
      case '/matcher': return 'Application Matcher';
      case '/passport': return 'Digital Battery Passport';
      default: return 'RELOOP Platform';
    }
  };

  const navItems = [
    { path: '/', label: 'Intelligence Console', icon: Activity },
    { path: '/assessment', label: 'Battery Assessment', icon: BatteryWarning },
    { path: '/matcher', label: 'Application Matcher', icon: Settings2 },
    { path: '/passport', label: 'Digital Passport', icon: BookOpen },
  ];

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          RELOOP
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
      
      <main className="main-content">
        <header className="top-header">
          <h1 className="page-title">{getPageTitle()}</h1>
          <div className="demo-badge">Demo Data Mode</div>
        </header>
        <div className="content-region">
          {children}
        </div>
      </main>
    </div>
  );
}
