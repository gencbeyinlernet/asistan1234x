import React, { useState } from 'react';
import { 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Bot, 
  ArrowRight, 
  Layers, 
  Filter, 
  Save, 
  Check, 
  Sparkles, 
  Building, 
  Calendar, 
  SlidersHorizontal,
  ShieldCheck,
  Tag
} from 'lucide-react';
import { DocumentRecord, AccountingEntry, AuditFinding } from '../types';

interface IntegratorModuleProps {
  documents: DocumentRecord[];
  accountingEntries: AccountingEntry[];
  selectedCompany: string;
  selectedPeriod: string;
  onSyncIntegrator: () => void;
  onReassignAccountCode: (docId: string, newAccountCode: string) => void;
  onOpenDocViewer: (doc: DocumentRecord) => void;
  onOpenAiChat: () => void;
}

export const IntegratorModule: React.FC<IntegratorModuleProps> = ({
  documents,
  accountingEntries,
  selectedCompany,
  selectedPeriod,
  onSyncIntegrator,
  onReassignAccountCode,
  onOpenDocViewer,
  onOpenAiChat,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'conflicts' | 'integrator_only' | 'manual_only'>('all');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);
  const [aiAnalyzingId, setAiAnalyzingId] = useState<string | null>(null);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<{ docId: string; data: any } | null>(null);

  const handleSyncClick = () => {
    setIsSyncing(true);
    setTimeout(() => {
      onSyncIntegrator();
      setIsSyncing(false);
      setSyncSuccessMsg("GİB ve Özel Entegratör portalinden son e-Belgeler başarıyla çekildi ve hesap kodu kuralları uygulandı.");
      setTimeout(() => setSyncSuccessMsg(null), 4000);
    }, 1200);
  };

  const handleAiClassify = async (doc: DocumentRecord) => {
    setAiAnalyzingId(doc.id);
    try {
      const res = await fetch('/api/ai/classify-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemName: doc.fileName.includes('macbook') ? "Apple MacBook Pro M3 Bilgisayar" : doc.fileName,
          supplier: doc.companyName,
          amount: doc.baseAmount,
          vatRate: doc.vatRate,
          currentAccount: doc.assignedAccountCode || "153.01",
        }),
      });
      const data = await res.json();
      setAiAnalysisResult({ docId: doc.id, data });
    } catch (e) {
      console.error(e);
    } finally {
      setAiAnalyzingId(null);
    }
  };

  const filteredDocs = documents.filter((doc) => {
    if (filterType === 'conflicts' && !doc.hasAccountConflict) return false;
    if (filterType === 'integrator_only' && doc.source !== 'integrator_sync') return false;
    if (filterType === 'manual_only' && doc.source === 'integrator_sync') return false;
    return true;
  });

  // Calculate stats
  const totalIntegratorDocs = documents.filter(d => d.source === 'integrator_sync').length;
  const totalConflictDocs = documents.filter(d => d.hasAccountConflict).length;
  const manualDocsCount = documents.filter(d => d.source !== 'integrator_sync').length;

  return (
    <div className="space-y-6">
      {/* Step Guide Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">
                Entegratör Merkezi
              </span>
              <h2 className="text-base font-bold text-slate-100">
                Entegratör Faturaları & Otomatik Hesap Kodu İşleme Motoru
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              GİB ve özel entegratör üzerinden faturaları çeker, satır içeriğine göre kullanım amacını analiz eder ve yanlış otomatik hesap eşleştirmelerini işaretler.
            </p>
          </div>

          <button
            onClick={handleSyncClick}
            disabled={isSyncing}
            className="flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md shadow-emerald-900/40 transition shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Entegratörden Çekiliyor...' : 'Entegratör Verilerini Eşitle'}</span>
          </button>
        </div>

        {/* 5-Step Process Indicator */}
        <div className="pt-4 grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
          <div className="p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/60">
            <span className="text-[10px] text-emerald-400 font-bold block">1. ADIM</span>
            <span className="font-semibold text-slate-200">Firma & Dönem Seç</span>
            <p className="text-[10px] text-slate-400 mt-0.5">{selectedPeriod} aktif</p>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/60">
            <span className="text-[10px] text-emerald-400 font-bold block">2. ADIM</span>
            <span className="font-semibold text-slate-200">Verileri Eşitle</span>
            <p className="text-[10px] text-slate-400 mt-0.5">{totalIntegratorDocs} e-Fatura çekildi</p>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/60">
            <span className="text-[10px] text-emerald-400 font-bold block">3. ADIM</span>
            <span className="font-semibold text-slate-200">Kontrolleri Çalıştır</span>
            <p className="text-[10px] text-amber-300 font-medium mt-0.5">{totalConflictDocs} hesap çelişkisi</p>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/60">
            <span className="text-[10px] text-emerald-400 font-bold block">4. ADIM</span>
            <span className="font-semibold text-slate-200">Farkları İncele</span>
            <p className="text-[10px] text-slate-400 mt-0.5">Belge satır analizi</p>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-600/40">
            <span className="text-[10px] text-emerald-400 font-bold block">5. ADIM</span>
            <span className="font-semibold text-emerald-200">SMMM Onayla & Kaydet</span>
            <p className="text-[10px] text-emerald-400/80 mt-0.5">Yeniden kontrol et</p>
          </div>
        </div>

        {syncSuccessMsg && (
          <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center space-x-2 text-emerald-300 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{syncSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* Filter and Highlights Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-400 font-medium flex items-center space-x-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filtrele:</span>
          </span>
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              filterType === 'all'
                ? 'bg-slate-700 text-white font-bold'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            Tüm Faturalar ({documents.length})
          </button>
          <button
            onClick={() => setFilterType('conflicts')}
            className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center space-x-1.5 ${
              filterType === 'conflicts'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold'
                : 'bg-slate-800/80 text-rose-400 hover:bg-slate-800'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Hesap Kodu Çelişkileri ({totalConflictDocs})</span>
          </button>
          <button
            onClick={() => setFilterType('integrator_only')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              filterType === 'integrator_only'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            Sadece Entegratör ({totalIntegratorDocs})
          </button>
          <button
            onClick={() => setFilterType('manual_only')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              filterType === 'manual_only'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 font-bold'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            Entegratör Dışı / Manuel ({manualDocsCount})
          </button>
        </div>

        <div className="text-slate-400 text-[11px] flex items-center space-x-1.5">
          <ShieldCheck className="w-4 h-4 text-teal-400" />
          <span>Firma adı yerine fatura satırı & kullanım amacı denetlenir.</span>
        </div>
      </div>

      {/* Invoices and Account Assignment Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-800/40 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-200">
            Fatura Satırları, Otomatik Atanan Hesap Kodları ve Kullanım Amacı Analizi
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            {filteredDocs.length} Belge Listeleniyor
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-800/70 text-slate-300 font-semibold border-b border-slate-700/80">
              <tr>
                <th className="py-3 px-4">Belge No & Tarih</th>
                <th className="py-3 px-3">Tedarikçi / Müşteri</th>
                <th className="py-3 px-3">Fatura Kalemi</th>
                <th className="py-3 px-3 text-right">Matrah & KDV</th>
                <th className="py-3 px-4">Atanan Hesap</th>
                <th className="py-3 px-4">Sistem & Yapay Zekâ Uyarısı</th>
                <th className="py-3 px-3 text-center">Hesap Değiştir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredDocs.map((doc) => {
                const isConflict = doc.hasAccountConflict;

                return (
                  <tr
                    key={doc.id}
                    className={`hover:bg-slate-800/30 transition ${
                      isConflict ? 'bg-rose-950/15' : ''
                    }`}
                  >
                    {/* Doc No & Date */}
                    <td className="py-3.5 px-4 align-top">
                      <div className="flex items-center space-x-1.5">
                        <FileText className={`w-3.5 h-3.5 ${isConflict ? 'text-rose-400' : 'text-slate-400'}`} />
                        <button
                          onClick={() => onOpenDocViewer(doc)}
                          className="font-semibold text-slate-200 hover:text-teal-300 underline underline-offset-2"
                        >
                          {doc.documentNumber}
                        </button>
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-0.5">{doc.date}</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 inline-block mt-1 font-mono">
                        {doc.source}
                      </span>
                    </td>

                    {/* Company */}
                    <td className="py-3.5 px-3 align-top">
                      <p className="font-semibold text-slate-200 truncate max-w-[150px]" title={doc.companyName}>
                        {doc.companyName}
                      </p>
                      <span className="text-[10px] text-slate-500 font-mono">VKN: {doc.taxId}</span>
                    </td>

                    {/* Item Description */}
                    <td className="py-3.5 px-3 align-top text-slate-300">
                      {doc.id === 'doc-06' ? (
                        <div>
                          <span className="font-semibold text-slate-100">Apple MacBook Pro M3 Bilgisayar (3 Adet)</span>
                          <span className="block text-[10px] text-amber-400 mt-0.5">
                            *Ofiste yazılımcılar için donanım
                          </span>
                        </div>
                      ) : doc.id === 'doc-05' ? (
                        <span>Bulut Sunucu & Veri Depolama Hizmeti</span>
                      ) : doc.id === 'doc-07' ? (
                        <span>Ofis Büro Kağıt ve Kırtasiye</span>
                      ) : doc.id === 'doc-08' ? (
                        <span>Şehirlerarası Kargo Gönderimi</span>
                      ) : (
                        <span className="capitalize">{doc.documentType.replace('_', ' ')}</span>
                      )}
                    </td>

                    {/* Amounts */}
                    <td className="py-3.5 px-3 align-top text-right font-mono">
                      <div className="font-bold text-slate-200">
                        {doc.baseAmount.toLocaleString('tr-TR')} TL
                      </div>
                      <div className="text-[10px] text-emerald-400">
                        KDV: {doc.vatAmount.toLocaleString('tr-TR')} TL (%{doc.vatRate})
                      </div>
                    </td>

                    {/* Assigned Account */}
                    <td className="py-3.5 px-4 align-top">
                      <div className="flex items-center space-x-1.5">
                        <span
                          className={`font-mono text-xs font-bold px-2 py-0.5 rounded border ${
                            isConflict
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              : 'bg-slate-800 text-slate-200 border-slate-700'
                          }`}
                        >
                          {doc.assignedAccountCode || 'Tanımsız'}
                        </span>
                      </div>
                      {doc.integratorAutoRule && (
                        <span className="text-[10px] text-slate-500 block mt-1 italic">
                          {doc.integratorAutoRule}
                        </span>
                      )}
                    </td>

                    {/* System & AI Warning */}
                    <td className="py-3.5 px-4 align-top max-w-sm">
                      {isConflict ? (
                        <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-200 text-[11px] space-y-1.5">
                          <div className="flex items-center space-x-1 text-rose-400 font-bold">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Kullanım Amacı Çelişkisi:</span>
                          </div>
                          <p className="leading-relaxed text-slate-300">
                            {doc.accountConflictMessage}
                          </p>

                          <div className="pt-1 flex items-center space-x-2">
                            <button
                              onClick={() => handleAiClassify(doc)}
                              disabled={aiAnalyzingId === doc.id}
                              className="text-[10px] bg-slate-800 hover:bg-slate-700 text-teal-300 px-2 py-0.5 rounded border border-slate-700 flex items-center space-x-1 transition"
                            >
                              <Sparkles className="w-3 h-3 text-teal-400" />
                              <span>{aiAnalyzingId === doc.id ? 'Analiz ediliyor...' : 'Yapay Zekâya Sor'}</span>
                            </button>
                            <button
                              onClick={() => onReassignAccountCode(doc.id, '255.00')}
                              className="text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2 py-0.5 rounded transition flex items-center space-x-1"
                            >
                              <Check className="w-3 h-3" />
                              <span>255 Demirbaşlara Düzelt</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 flex items-center space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Fatura satırı ve hesap kodu uyumlu</span>
                        </span>
                      )}
                    </td>

                    {/* Manual Account Selector */}
                    <td className="py-3.5 px-3 align-top text-center">
                      <select
                        value={doc.assignedAccountCode || ''}
                        onChange={(e) => onReassignAccountCode(doc.id, e.target.value)}
                        className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-teal-500"
                      >
                        <option value="153.01">153 Ticari Mallar</option>
                        <option value="255.00">255 Demirbaşlar</option>
                        <option value="770.01">770 Genel Yönetim</option>
                        <option value="760.01">760 Pazarlama Gideri</option>
                        <option value="740.01">740 Hizmet Üretim</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Line Classification Result Modal */}
      {aiAnalysisResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl text-slate-100">
            <div className="px-5 py-4 border-b border-slate-800 bg-slate-800/80 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Bot className="w-5 h-5 text-teal-400" />
                <h3 className="font-bold text-sm text-slate-100">Yapay Zekâ Alım Amacı & Hesap Önerisi</h3>
              </div>
              <button onClick={() => setAiAnalysisResult(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700">
                <span className="text-slate-400">Yapay Zekânın Önerdiği Hesap:</span>
                <span className="font-mono text-sm font-bold text-emerald-300 px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40">
                  {aiAnalysisResult.data.recommendedAccount} ({aiAnalysisResult.data.accountName || "Demirbaşlar"})
                </span>
              </div>

              {aiAnalysisResult.data.warning && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300">
                  <p className="font-semibold text-xs">Mesleki Uyarı:</p>
                  <p className="mt-1 text-slate-200">{aiAnalysisResult.data.warning}</p>
                </div>
              )}

              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-slate-300 leading-relaxed">
                <p className="font-semibold text-slate-400 mb-1">Mevzuat Gerekçesi (VUK):</p>
                <p>{aiAnalysisResult.data.reason || "İşletmede kullanılacak demirbaş iktisadi kıymetler doğrudan gider yazılamaz; 255 Demirbaşlar hesabında aktifleştirilip amortisman ayrılmalıdır."}</p>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-slate-800 bg-slate-800/40 flex justify-end space-x-2 text-xs">
              <button
                onClick={() => setAiAnalysisResult(null)}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg"
              >
                Kapat
              </button>
              <button
                onClick={() => {
                  onReassignAccountCode(aiAnalysisResult.docId, aiAnalysisResult.data.recommendedAccount || '255.00');
                  setAiAnalysisResult(null);
                }}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-sm"
              >
                Önerilen Hesabı Uygula ({aiAnalysisResult.data.recommendedAccount || '255'})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
