import { LayoutDashboard, Users, Download, Settings, Menu, X, AlertTriangle } from 'lucide-react';
import { Page } from '@/app/App';
import { useState } from 'react';
import logo from '@/assets/e7e41f04542fce7954ea5453ee29ba88235cf6cb.png';
import { TEXTS } from '@/constants/texts';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  showLogout?: boolean;
  onLogout?: () => void;
}

const menuItems = [
  { id: 'dashboard' as Page, label: TEXTS.nav.dashboard, icon: LayoutDashboard },
  { id: 'trabajadores' as Page, label: TEXTS.nav.trabajadores, icon: Users, section: TEXTS.nav.administracion },
  { id: 'incidencias' as Page, label: TEXTS.nav.incidencias, icon: AlertTriangle },
  { id: 'exports' as Page, label: TEXTS.nav.exports, icon: Download },
  { id: 'ajustes' as Page, label: TEXTS.nav.ajustes, icon: Settings },
];

export function Sidebar({ currentPage, onNavigate, showLogout, onLogout }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  /* 
    UI NOTE: Visual hierarchy
    - Mobile: Header > Sidebar > Backdrop
    - Desktop: Sidebar fixed, always visible
    - Transitions and animations handled in frontend implementation
  */

  return (
    <>
      {/* Mobile header bar - PRESENTATIONAL ONLY */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#000935] border-b border-[#1a2860] flex items-center px-4 gap-4 z-40">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 text-white rounded-lg hover:bg-[#0a1850] transition-colors"
          aria-label={isOpen ? TEXTS.sidebar.aria.closeMenu : TEXTS.sidebar.aria.openMenu}
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        <img src={logo} alt="ONUS" className="h-7" />
      </header>

      {/* Desktop sidebar - PRESENTATIONAL ONLY */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-[#000935] border-r border-[#1a2860] h-screen">
        <div className="p-6 border-b border-[#1a2860]">
          <img src={logo} alt="ONUS" className="h-8" />
        </div>
        
        <nav className="flex-1 p-4">
          <div className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              
              return (
                <div key={item.id}>
                  {item.section && (
                    <div className="px-3 py-2 mt-4 mb-2">
                      <span className="text-xs text-[#00C9CE] uppercase tracking-wider">
                        {item.section}
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => onNavigate(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-[#00C9CE] text-white'
                        : 'text-white hover:bg-[#0a1850]'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </nav>
        {showLogout && onLogout && (
          <div className="p-4 border-t border-[#1a2860]">
            <button
              onClick={onLogout}
              className="w-full px-3 py-2.5 rounded-lg text-white border border-[#1a2860] hover:bg-[#0a1850] transition-colors"
            >
              {TEXTS.login.actions.logout}
            </button>
          </div>
        )}
      </aside>

      {/* Mobile sidebar - PRESENTATIONAL ONLY */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsOpen(false)}
          />
          {/* Sidebar panel */}
          <aside className="lg:hidden fixed left-0 top-16 bottom-0 w-64 bg-[#000935] border-r border-[#1a2860] flex flex-col z-50">
            <nav className="flex-1 p-4">
              <div className="space-y-1">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPage === item.id;
                  
                  return (
                    <div key={item.id}>
                      {item.section && (
                        <div className="px-3 py-2 mt-4 mb-2">
                          <span className="text-xs text-[#00C9CE] uppercase tracking-wider">
                            {item.section}
                          </span>
                        </div>
                      )}
                      <button
                        onClick={() => {
                          onNavigate(item.id);
                          setIsOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                          isActive
                            ? 'bg-[#00C9CE] text-white'
                            : 'text-white hover:bg-[#0a1850]'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span>{item.label}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </nav>
            {showLogout && onLogout && (
              <div className="p-4 border-t border-[#1a2860]">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onLogout();
                  }}
                  className="w-full px-3 py-2.5 rounded-lg text-white border border-[#1a2860] hover:bg-[#0a1850] transition-colors"
                >
                  {TEXTS.login.actions.logout}
                </button>
              </div>
            )}
          </aside>
        </>
      )}
    </>
  );
}

