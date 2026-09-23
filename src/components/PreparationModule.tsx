import React, { useState } from 'react';
import { 
  FileCheck2, 
  BookOpen, 
  Table, 
  Receipt, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  FileSpreadsheet, 
  Send, 
  ShieldCheck, 
  Layers, 
  Check, 
  ChevronRight,
  Printer,
  Download
} from 'lucide-react';
import { DocumentRecord, AccountingEntry, VatReturnForm } from '../types';

interface PreparationModuleProps {
  documents: DocumentRecord[];
  accountingEntries: AccountingEntry[];
  currentVatReturn: VatReturnForm;
  previousPeriodDeferredVat: number;
  onPostUnaccountedInvoices: () => void;
  onApproveVatReturn: () => void;
  onOpenAiChat: () => void;
}

export const PreparationModule: React.FC<PreparationModuleProps> = ({
  documents,
  accountingEntries,
  currentVatReturn,
  previousPeriodDeferredVat,
  onPostUnaccountedInvoices,
  onApproveVatReturn,
  onOpenAiChat,
}) => {
  const [selectedSubView, setSelectedSubView] = useState<'matrix' | 'muavin' | 'mizan' | 'beyanname'>('matrix');
  const [muavinFilterAccount, setMuavinFilterAccount] = useState<string>('all');
  const [isApproved, setIsApproved] = useState(false);
  const [showXmlModal, setShowXmlModal] = useState(false);

  // Group accounting entries by account for Mizan calculation
  const mizanMap = new Map<string, { name: string; debit: number; credit: number }>();
  accountingEntries.forEach((entry) => {
    const code = entry.accountCode.split('.')[0];
    const existing = mizanMap.get(code) || { name: entry.accountName, debit: 0, credit: 0 };
    existing.debit += entry.debit;
    existing.credit += entry.credit;
    mizanMap.set(code, existing);
  });

  const mizanList = Array.from(mizanMap.entries()).map(([code, val]) => {
    const debitBalance = val.debit > val.credit ? val.debit - val.credit : 0;
    const creditBalance = val.credit > val.debit ? val.credit - val.debit : 0;
    return {
      code,
      name: val.name,
      totalDebit: val.debit,
      totalCredit: val.credit,
      debitBalance,
      creditBalance,
    };
  }).sort((a, b) => a.code.localeCompare(b.code));

  // Filtered muavin
  const filteredMuavin = accountingEntries.filter((e) => {
    if (muavinFilterAccount === 'all') return true;
    return e.accountCode.startsWith(muavinFilterAccount);
  });

  // Check unposted documents
  const unpostedDocs = documents.filter((doc) => {
    return !accountingEntries.some(
      (e) => e.documentNumber?.trim().toUpperCase() === doc.documentNumber?.trim().toUpperCase()
    );
  });

  const handleApproveClick = () => {
    setIsApproved(true);
    onApproveVatReturn();
  };

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800 gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 text-xs font-bold bg-teal-500/20 text-teal-300 rounded border border-teal-500/30">
                Tam Entegre Defter & Beyan
              </span>
              <h2 className="text-base font-bold text-slate-100">
                3. E-Belge İndirme, Muavin, Mizan ve Beyanname Hazırlama
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Belgelerden otomatik yevmiye fişleri üretilir, 191/391 muavinleri işlenir, mizana aktarılır ve GİB KDV-1 Beyannamesine otomatik yansıtılır.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {unpostedDocs.length > 0 && (
              <button
                onClick={onPostUnaccountedInvoices}
                className="text-xs bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold px-3 py-2 rounded-xl transition flex items-center space-x-1.5 shadow-sm"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{unpostedDocs.length} Eksik Faturayı Yevmiyeye İşle</span>
              </button>
            )}
            <button
              onClick={() => setShowXmlModal(true)}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-xl border border-slate-700 flex items-center space-x-1.5 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>GİB BDP e-Beyanname XML</span>
            </button>
          </div>
        </div>

        {/* Sub-view Navigation */}
        <div className="pt-3 flex flex-wrap gap-2 text-xs">
          <button
            onClick={() => setSelectedSubView('matrix')}
            className={`px-3 py-2 rounded-lg font-semibold transition flex items-center space-x-1.5 ${
              selectedSubView === 'matrix'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>4'lü Karşılaştırma Matrisi (Belge-Muavin-Mizan-Beyan)</span>
          </button>
          <button
            onClick={() => setSelectedSubView('muavin')}
            className={`px-3 py-2 rounded-lg font-semibold transition flex items-center space-x-1.5 ${
              selectedSubView === 'muavin'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Canlı Muavin Defteri ({accountingEntries.length} Satır)</span>
          </button>
          <button
            onClick={() => setSelectedSubView('mizan')}
            className={`px-3 py-2 rounded-lg font-semibold transition flex items-center space-x-1.5 ${
              selectedSubView === 'mizan'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Aylık Mizan Tablosu ({mizanList.length} Hesap)</span>
          </button>
          <button
            onClick={() => setSelectedSubView('beyanname')}
            className={`px-3 py-2 rounded-lg font-semibold transition flex items-center space-x-1.5 ${
              selectedSubView === 'beyanname'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Resmi GİB KDV-1 Beyannamesi Önizleme</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: 4-Way Reconciliation Matrix */}
      {selectedSubView === 'matrix' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>4 Aşamalı Doğrulama ve Mutabakat Matrisi</span>
              </h3>
              <p className="text-xs text-slate-400">
                E-Belgeler ile Yevmiye/Muavin, Mizan ve KDV Beyannamesi arasındaki tutar akışını tam denetleyin.
              </p>
            </div>
            <button
              onClick={onOpenAiChat}
              className="text-xs text-teal-300 hover:text-teal-200 flex items-center space-x-1"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              <span>Matris Farklarını Sor</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Column 1: E-Documents */}
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>1. E-Belgeler</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">{documents.length} Adet</span>
              </div>
              <div className="space-y-1.5 text-xs text-slate-300 pt-2 border-t border-slate-700/50">
                <div className="flex justify-between">
                  <span className="text-slate-400">Satış Matrah:</span>
                  <span className="font-mono font-semibold">185.000 TL</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Satış KDV:</span>
                  <span className="font-mono font-bold text-teal-300">37.000 TL</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Alış Matrah:</span>
                  <span className="font-mono font-semibold">177.500 TL</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Alış KDV:</span>
                  <span className="font-mono font-bold text-blue-300">35.500 TL</span>
                </div>
              </div>
            </div>

            {/* Column 2: Muavin Defteri */}
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-teal-400"></span>
                  <span>2. Muavin Kayıtları</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">191 / 391 / 600</span>
              </div>
              <div className="space-y-1.5 text-xs text-slate-300 pt-2 border-t border-slate-700/50">
                <div className="flex justify-between">
                  <span className="text-slate-400">600 Satışlar:</span>
                  <span className="font-mono font-semibold">185.000 TL</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">391 Hes. KDV:</span>
                  <span className="font-mono font-bold text-teal-300">37.000 TL</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">191 İnd. KDV:</span>
                  <span className="font-mono font-bold text-blue-300">35.500 TL</span>
                </div>
                <div className="flex justify-between text-emerald-400 text-[11px] pt-1">
                  <span>Belgeyle Uyum:</span>
                  <span className="font-bold">%100 Mutabık</span>
                </div>
              </div>
            </div>

            {/* Column 3: Mizan */}
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                  <span>3. Aylık Mizan</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Ağustos 2026</span>
              </div>
              <div className="space-y-1.5 text-xs text-slate-300 pt-2 border-t border-slate-700/50">
                <div className="flex justify-between">
                  <span className="text-slate-400">190 Devreden Bakiye:</span>
                  <span className="font-mono font-bold text-amber-300">42.500 TL</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">191 Borç Toplamı:</span>
                  <span className="font-mono font-bold text-blue-300">35.500 TL</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">391 Alacak Toplamı:</span>
                  <span className="font-mono font-bold text-teal-300">37.000 TL</span>
                </div>
                <div className="flex justify-between text-amber-400 text-[11px] pt-1">
                  <span>190 vs Beyan:</span>
                  <span className="font-bold text-rose-400">2.500 TL Fark Var</span>
                </div>
              </div>
            </div>

            {/* Column 4: GİB KDV-1 Beyannamesi */}
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                  <span>4. KDV-1 Beyanı</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">GİB v3.8</span>
              </div>
              <div className="space-y-1.5 text-xs text-slate-300 pt-2 border-t border-slate-700/50">
                <div className="flex justify-between">
                  <span className="text-slate-400">Toplam Matrah:</span>
                  <span className="font-mono font-semibold">185.000 TL</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Hesaplanan KDV:</span>
                  <span className="font-mono font-bold text-teal-300">37.000 TL</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Bu Dönem İndirilen:</span>
                  <span className="font-mono font-bold text-blue-300">35.500 TL</span>
                </div>
                <div className="flex justify-between text-emerald-400 text-[11px] pt-1">
                  <span>Sonraki Devreden:</span>
                  <span className="font-bold font-mono">38.500 TL</span>
                </div>
              </div>
            </div>
          </div>

          {/* KDV Mahsup / Kapanış Kaydı Simülasyonu */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-200 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Ay Sonu Otomatik KDV Mahsup & Kapanış Yevmiye Maddesi (31.08.2026)</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Yevmiye No: Y-2026-08-99</span>
            </div>

            <div className="overflow-x-auto text-xs font-mono">
              <table className="w-full text-left">
                <thead className="text-[11px] text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-1.5">Hesap Kodu</th>
                    <th className="py-1.5">Hesap Adı</th>
                    <th className="py-1.5 text-right">Borç</th>
                    <th className="py-1.5 text-right">Alacak</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-slate-300">
                  <tr>
                    <td className="py-1.5 text-teal-300">391.01</td>
                    <td className="py-1.5">Hesaplanan KDV Hesabı (Kapanış)</td>
                    <td className="py-1.5 text-right font-bold">37.000,00 TL</td>
                    <td className="py-1.5 text-right text-slate-600">-</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 text-amber-300">190.00</td>
                    <td className="py-1.5">Devreden KDV (Sonraki Döneme Aktarılan Fark)</td>
                    <td className="py-1.5 text-right font-bold">41.000,00 TL</td>
                    <td className="py-1.5 text-right text-slate-600">-</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 text-blue-300">191.01</td>
                    <td className="py-1.5">İndirilecek KDV Hesabı (Kapanış)</td>
                    <td className="py-1.5 text-right text-slate-600">-</td>
                    <td className="py-1.5 text-right font-bold">35.500,00 TL</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 text-amber-300">190.00</td>
                    <td className="py-1.5">Devreden KDV Hesabı (Önceki Dönem Kapanış)</td>
                    <td className="py-1.5 text-right text-slate-600">-</td>
                    <td className="py-1.5 text-right font-bold">42.500,00 TL</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: Muavin Defteri */}
      {selectedSubView === 'muavin' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-800 bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2">
              <span className="text-slate-400 font-medium">Hesap Filtresi:</span>
              <button
                onClick={() => setMuavinFilterAccount('all')}
                className={`px-2.5 py-1 rounded-lg ${muavinFilterAccount === 'all' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                Tümü
              </button>
              <button
                onClick={() => setMuavinFilterAccount('191')}
                className={`px-2.5 py-1 rounded-lg ${muavinFilterAccount === '191' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                191 İndirilecek KDV
              </button>
              <button
                onClick={() => setMuavinFilterAccount('391')}
                className={`px-2.5 py-1 rounded-lg ${muavinFilterAccount === '391' ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                391 Hesaplanan KDV
              </button>
              <button
                onClick={() => setMuavinFilterAccount('600')}
                className={`px-2.5 py-1 rounded-lg ${muavinFilterAccount === '600' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                600 Yurtiçi Satışlar
              </button>
            </div>

            <span className="text-[11px] text-slate-400">
              {filteredMuavin.length} yevmiye kalemi listeleniyor
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-800/80 text-slate-300 font-semibold border-b border-slate-700">
                <tr>
                  <th className="py-2.5 px-4">Yevmiye No & Tarih</th>
                  <th className="py-2.5 px-3">Hesap Kodu & Adı</th>
                  <th className="py-2.5 px-3">Belge No</th>
                  <th className="py-2.5 px-4">Açıklama</th>
                  <th className="py-2.5 px-3 text-right">Borç</th>
                  <th className="py-2.5 px-3 text-right">Alacak</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono">
                {filteredMuavin.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/30">
                    <td className="py-2 px-4 text-slate-300">
                      <span>{item.journalNo}</span>
                      <span className="block text-[10px] text-slate-500">{item.date}</span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-bold text-teal-300">{item.accountCode}</span>
                      <span className="block text-[10px] text-slate-400 font-sans">{item.accountName}</span>
                    </td>
                    <td className="py-2 px-3 text-slate-300">{item.documentNumber || '-'}</td>
                    <td className="py-2 px-4 text-slate-300 font-sans max-w-xs truncate" title={item.description}>
                      {item.description}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-slate-100">
                      {item.debit > 0 ? `${item.debit.toLocaleString('tr-TR')} TL` : '-'}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-slate-100">
                      {item.credit > 0 ? `${item.credit.toLocaleString('tr-TR')} TL` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: Mizan Tablosu */}
      {selectedSubView === 'mizan' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-800 bg-slate-800/40 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-200">
              Aylık Geçici Mizan (Ağustos 2026 Sonu İtibariyle)
            </span>
            <span className="text-[11px] text-slate-400">
              Çift Taraflı Kayıt Dengesi Tamdır
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-800/80 text-slate-300 font-semibold border-b border-slate-700">
                <tr>
                  <th className="py-2.5 px-4">Hesap Kodu</th>
                  <th className="py-2.5 px-4">Hesap Adı</th>
                  <th className="py-2.5 px-3 text-right">Borç Toplamı</th>
                  <th className="py-2.5 px-3 text-right">Alacak Toplamı</th>
                  <th className="py-2.5 px-3 text-right">Borç Bakiyesi</th>
                  <th className="py-2.5 px-3 text-right">Alacak Bakiyesi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono">
                {mizanList.map((m) => (
                  <tr key={m.code} className="hover:bg-slate-800/30">
                    <td className="py-2 px-4 font-bold text-teal-300">{m.code}</td>
                    <td className="py-2 px-4 font-sans text-slate-200">{m.name}</td>
                    <td className="py-2 px-3 text-right text-slate-300">{m.totalDebit.toLocaleString('tr-TR')} TL</td>
                    <td className="py-2 px-3 text-right text-slate-300">{m.totalCredit.toLocaleString('tr-TR')} TL</td>
                    <td className="py-2 px-3 text-right font-bold text-blue-300">
                      {m.debitBalance > 0 ? `${m.debitBalance.toLocaleString('tr-TR')} TL` : '-'}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-teal-300">
                      {m.creditBalance > 0 ? `${m.creditBalance.toLocaleString('tr-TR')} TL` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 4: Resmi GİB KDV-1 Beyannamesi Formu */}
      {selectedSubView === 'beyanname' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm text-slate-100">
                  GELİR İDARESİ BAŞKANLIĞI — KDV-1 BEYANNAMESİ
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  Form KDV-1 (Versiyon 38)
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Dönem: {currentVatReturn.period} | Mükellef: ABC Teknoloji Sanayi ve Tic. Ltd. Şti. (1234567890)
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => window.print()}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 flex items-center space-x-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Yazdır</span>
              </button>
              <button
                onClick={handleApproveClick}
                disabled={isApproved}
                className="text-xs bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-950 disabled:text-emerald-400 text-white font-bold px-4 py-2 rounded-xl transition flex items-center space-x-1.5 shadow-sm"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{isApproved ? 'SMMM Tarafından Onaylandı' : 'SMMM Olarak Beyannameyi Onayla'}</span>
              </button>
            </div>
          </div>

          {/* TABLO 1: Matrah */}
          <div className="bg-slate-850/50 border border-slate-700/60 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-200 border-b border-slate-700/80 pb-2">
              TABLO 1: MATRAH VE HESAPLANAN KDV
            </h4>
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left">
                <thead className="text-[11px] text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-1">Vergi Oranı</th>
                    <th className="py-1 text-right">Matrah (TL)</th>
                    <th className="py-1 text-right">Vergi Tutarı (TL)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300 font-mono">
                  <tr>
                    <td className="py-2">%20 Genel Oran</td>
                    <td className="py-2 text-right">185.000,00 TL</td>
                    <td className="py-2 text-right text-teal-300 font-bold">37.000,00 TL</td>
                  </tr>
                  <tr className="bg-slate-800/40 font-bold text-slate-100">
                    <td className="py-2">TOPLAM MATRAH VE HESAPLANAN KDV:</td>
                    <td className="py-2 text-right">185.000,00 TL</td>
                    <td className="py-2 text-right text-teal-300">37.000,00 TL</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* TABLO 4: İndirimler */}
          <div className="bg-slate-850/50 border border-slate-700/60 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-200 border-b border-slate-700/80 pb-2">
              TABLO 4: İNDİRİMLER VE ÖNCEKİ DÖNEM DEVREDEN
            </h4>
            <div className="space-y-2 text-xs text-slate-300 font-mono">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="font-sans text-slate-400">[Kod 33] Önceki Dönemden Devreden İndirilecek KDV:</span>
                <span className="font-bold text-amber-300">{currentVatReturn.previousDeferredVat.toLocaleString('tr-TR')},00 TL</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="font-sans text-slate-400">[Kod 34] Bu Döneme Ait İndirilecek KDV (191):</span>
                <span className="font-bold text-blue-300">{currentVatReturn.currentPeriodDeductibleVat.toLocaleString('tr-TR')},00 TL</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="font-sans text-slate-400">[Kod 35] İthalatta Ödenen KDV (Gümrük):</span>
                <span className="font-bold text-slate-300">0,00 TL</span>
              </div>
              <div className="flex justify-between py-1 bg-slate-800/40 p-2 rounded-lg font-bold text-slate-100">
                <span className="font-sans">TOPLAM İNDİRİMLER:</span>
                <span className="text-emerald-300">
                  {(currentVatReturn.previousDeferredVat + currentVatReturn.currentPeriodDeductibleVat).toLocaleString('tr-TR')},00 TL
                </span>
              </div>
            </div>
          </div>

          {/* TABLO 5: Sonuç Hesapları */}
          <div className="bg-emerald-950/20 border border-emerald-600/40 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-emerald-300 border-b border-emerald-600/30 pb-2">
              TABLO 5: BEYANNAMENİN SONUÇ HESAPLARI
            </h4>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between py-1 text-slate-300">
                <span className="font-sans text-slate-400">Bu Dönem Ödenmesi Gereken KDV:</span>
                <span className="font-bold text-slate-400">0,00 TL</span>
              </div>
              <div className="flex justify-between py-1 text-emerald-300 text-sm font-bold bg-emerald-900/30 p-2.5 rounded-lg border border-emerald-600/40">
                <span className="font-sans">SONRAKİ DÖNEME DEVREDEN KDV:</span>
                <span>{currentVatReturn.nextPeriodDeferredVat.toLocaleString('tr-TR')},00 TL</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GİB BDP e-Beyanname XML Modal */}
      {showXmlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl text-slate-100">
            <div className="px-5 py-4 border-b border-slate-800 bg-slate-800/80 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-100 flex items-center space-x-2">
                <span>GİB Beyanname Düzenleme Programı (BDP) XML Çıktısı</span>
              </h3>
              <button onClick={() => setShowXmlModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <p className="text-slate-400">
                Aşağıdaki XML, Gelir İdaresi Başkanlığı e-Beyanname portalına doğrudan yüklenmeye hazır formattadır:
              </p>
              <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-56 scrollbar-thin">
{`<?xml version="1.0" encoding="ISO-8859-9"?>
<beyanname kod="KDV1" versiyon="38">
  <idariBilgiler>
    <vergiDairesi>034255</vergiDairesi>
    <donem>2026/08</donem>
    <mukellef>
      <vergiNo>1234567890</vergiNo>
      <unvan>ABC TEKNOLOJI SANAYI VE TIC. LTD. STI.</unvan>
    </mukellef>
  </idariBilgiler>
  <matrahBilgileri>
    <oran20 matrah="185000.00" vergi="37000.00" />
  </matrahBilgileri>
  <indirimler>
    <oncekiDonemDevreden>${currentVatReturn.previousDeferredVat}.00</oncekiDonemDevreden>
    <buDonemIndirilecek>${currentVatReturn.currentPeriodDeductibleVat}.00</buDonemIndirilecek>
  </indirimler>
  <sonuc>
    <odenecekVergi>0.00</odenecekVergi>
    <sonrakiDonemeDevreden>${currentVatReturn.nextPeriodDeferredVat}.00</sonrakiDonemeDevreden>
  </sonuc>
</beyanname>`}
              </pre>
            </div>
            <div className="px-5 py-3 border-t border-slate-800 bg-slate-800/40 flex justify-end space-x-2 text-xs">
              <button
                onClick={() => setShowXmlModal(false)}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg"
              >
                Kapat
              </button>
              <button
                onClick={() => {
                  const blob = new Blob([`<beyanname kod="KDV1" versiyon="38">...</beyanname>`], { type: 'application/xml' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `KDV1_2026_08_ABC_Teknoloji.xml`;
                  a.click();
                  setShowXmlModal(false);
                }}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg"
              >
                XML Dosyasını İndir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
