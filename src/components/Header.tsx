import React from 'react';
import { 
  ShieldCheck, 
  FileCheck2, 
  Building2, 
  Calendar, 
  Bot, 
  RefreshCw, 
  Sparkles,
  CheckCircle2
} from 'lucide-react';

interface HeaderProps {
  activeTab: 'audit' | 'integrator' | 'ledger';
  setActiveTab: (tab: 'audit' | 'integrator' | 'ledger') => void;
  selectedCompany: string;
  setSelectedCompany: (company: string) => void;
  selectedPeriod: string;
  setSelectedPeriod: (period: string) => void;
  onRefreshData: () => void;
  onOpenAiDrawer: () => void;
  pendingFindingsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  selectedCompany,
  setSelectedCompany,
  selectedPeriod,
  setSelectedPeriod,
  onRefreshData,
  onOpenAiDrawer,
  pendingFindingsCount,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-40 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top bar with branding & company context */}
        <div className="flex flex-col md:flex-row md:items-center justify-between py-3 gap-3 border-b border-slate-800/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-900/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg text-white tracking-tight">Novarge-smm Asistan</span>
                <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">
                  v3.8 Denetim Motoru
                </span>
                <span className="px-2 py-0.5 text-xs font-medium bg-blue-500/20 text-blue-300 rounded border border-blue-500/30 hidden sm:inline-flex">
                  GİB KDV1 Uyumlu
                </span>
              </div>
              <p className="text-xs text-slate-400">
                KDV Beyannamesi Otomatik Kontrol, Entegratör ve Muhasebe Denetim Asistanı
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Company selector */}
            <div className="flex items-center space-x-1.5 bg-slate-800/90 rounded-lg px-2.5 py-1.5 border border-slate-700">
              <Building2 className="w-4 h-4 text-slate-400" />
              <select 
                value={selectedCompany} 
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="bg-transparent text-xs text-slate-200 font-medium focus:outline-none cursor-pointer"
              >
                <option value="ABC Teknoloji Sanayi ve Tic. Ltd. Şti." className="bg-slate-900">ABC Teknoloji Sanayi ve Tic. Ltd. Şti. (1234567890)</option>
                <option value="Kuzey İnşaat ve Mühendislik A.Ş." className="bg-slate-900">Kuzey İnşaat ve Mühendislik A.Ş. (9876543210)</option>
                <option value="Nova Danışmanlık ve Yazılım Ltd." className="bg-slate-900">Nova Danışmanlık ve Yazılım Ltd. (5544332211)</option>
              </select>
            </div>

            {/* Period selector */}
            <div className="flex items-center space-x-1.5 bg-slate-800/90 rounded-lg px-2.5 py-1.5 border border-slate-700">
              <Calendar className="w-4 h-4 text-slate-400" />
              <select 
                value={selectedPeriod} 
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="bg-transparent text-xs text-slate-200 font-medium focus:outline-none cursor-pointer"
              >
                <option value="2026/08" className="bg-slate-900">2026 / 08 - Ağustos</option>
                <option value="2026/07" className="bg-slate-900">2026 / 07 - Temmuz</option>
                <option value="2026/06" className="bg-slate-900">2026 / 06 - Haziran</option>
              </select>
            </div>

            {/* Live GİB status */}
            <div className="hidden lg:flex items-center space-x-1.5 px-2 py-1 bg-emerald-950/60 border border-emerald-700/40 rounded-md text-[11px] text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Entegratör: Çevrimiçi</span>
            </div>

            {/* Sync & Re-audit button */}
            <button
              id="header-refresh-btn"
              onClick={onRefreshData}
              title="Tüm belgeleri ve muhasebe kayıtlarını yeniden tara ve denetle"
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Verileri Eşitle & Kontrol Et</span>
            </button>

            {/* AI Assistant Drawer Trigger */}
            <button
              id="header-ai-btn"
              onClick={onOpenAiDrawer}
              className="flex items-center space-x-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-sm shadow-teal-900/40 transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>SMMM Yapay Zekâ</span>
            </button>
          </div>
        </div>

        {/* 3 Main Menus Navigation */}
        <div className="flex items-center justify-between pt-2">
          <nav className="flex space-x-2 overflow-x-auto pb-2 scrollbar-none" aria-label="Tabs">
            <button
              id="nav-tab-1"
              onClick={() => setActiveTab('audit')}
              className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 whitespace-nowrap ${
                activeTab === 'audit'
                  ? 'border-emerald-500 text-emerald-400 bg-slate-800/80 shadow-sm'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <FileCheck2 className="w-4 h-4" />
              <span>1. KDV Beyanname Otomatik Kontrol Sistemi</span>
              {pendingFindingsCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-300 rounded-full border border-amber-500/40">
                  {pendingFindingsCount}
                </span>
              )}
            </button>

            <button
              id="nav-tab-2"
              onClick={() => setActiveTab('integrator')}
              className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 whitespace-nowrap ${
                activeTab === 'integrator'
                  ? 'border-emerald-500 text-emerald-400 bg-slate-800/80 shadow-sm'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              <span>2. Entegratör Faturaları & Otomatik Hesap Kodu İşleme</span>
            </button>

            <button
              id="nav-tab-3"
              onClick={() => setActiveTab('ledger')}
              className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 whitespace-nowrap ${
                activeTab === 'ledger'
                  ? 'border-emerald-500 text-emerald-400 bg-slate-800/80 shadow-sm'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>3. E-Belge İşleme, Muavin, Mizan ve Beyanname Hazırlama</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
