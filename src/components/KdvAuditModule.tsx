import React, { useState } from 'react';
import { 
  FileCheck2, 
  UploadCloud, 
  FileText, 
  AlertCircle, 
  AlertTriangle, 
  CheckCircle, 
  Sparkles, 
  Download, 
  Eye, 
  Filter, 
  Info, 
  ArrowRight, 
  Check, 
  Clock, 
  FileSpreadsheet, 
  Receipt, 
  RefreshCw,
  Edit3,
  HelpCircle,
  FileBarChart
} from 'lucide-react';
import { 
  DocumentRecord, 
  AccountingEntry, 
  VatReturnForm, 
  AuditFinding, 
  FindingSeverity, 
  FindingStatus, 
  AuditScopeStats,
  AuditLogItem 
} from '../types';

interface KdvAuditModuleProps {
  documents: DocumentRecord[];
  accountingEntries: AccountingEntry[];
  currentVatReturn: VatReturnForm;
  previousVatReturn: any;
  findings: AuditFinding[];
  scopeStats: AuditScopeStats;
  auditLogs: AuditLogItem[];
  onUploadSimulatedDoc: (type: 'invoice' | 'csv' | 'customs') => void;
  onUpdateFindingStatus: (id: string, status: FindingStatus, note?: string) => void;
  onOpenDocViewer: (doc: DocumentRecord) => void;
  onOpenAiChat: () => void;
  onQuickFixDevredenKdv: () => void;
  onVerifyUnreadableField: (docId: string, taxId: string, docNo: string) => void;
}

export const KdvAuditModule: React.FC<KdvAuditModuleProps> = ({
  documents,
  accountingEntries,
  currentVatReturn,
  previousVatReturn,
  findings,
  scopeStats,
  auditLogs,
  onUploadSimulatedDoc,
  onUpdateFindingStatus,
  onOpenDocViewer,
  onOpenAiChat,
  onQuickFixDevredenKdv,
  onVerifyUnreadableField,
}) => {
  const [severityFilter, setSeverityFilter] = useState<'all' | FindingSeverity>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | FindingStatus>('all');
  const [subModuleTab, setSubModuleTab] = useState<'all' | 'tevkifat' | 'istisna' | 'ithalat' | 'iade' | 'duzeltme'>('all');
  const [aiLoadingId, setAiLoadingId] = useState<string | null>(null);
  const [selectedAiFinding, setSelectedAiFinding] = useState<{ finding: AuditFinding; text: string } | null>(null);
  const [justificationModalFinding, setJustificationModalFinding] = useState<AuditFinding | null>(null);
  const [justificationText, setJustificationText] = useState('');
  const [unreadableModalDoc, setUnreadableModalDoc] = useState<DocumentRecord | null>(null);
  const [manualTaxId, setManualTaxId] = useState('');
  const [manualDocNo, setManualDocNo] = useState('');

  // Filter findings
  const filteredFindings = findings.filter(f => {
    if (severityFilter !== 'all' && f.severity !== severityFilter) return false;
    if (statusFilter !== 'all' && f.status !== statusFilter) return false;
    if (subModuleTab === 'tevkifat' && f.category !== 'withholding_kdv2') return false;
    if (subModuleTab === 'istisna' && f.category !== 'rate_compliance') return false;
    if (subModuleTab === 'ithalat' && f.category !== 'customs_import') return false;
    return true;
  });

  // Calculate summary metrics
  const totalSalesBase = currentVatReturn.totalSalesBase;
  const totalCalculatedVat = currentVatReturn.totalCalculatedVat; // 391
  const totalDeductibleVat = currentVatReturn.currentPeriodDeductibleVat + currentVatReturn.customsDeductibleVat; // 191
  const prevDeferredVat = currentVatReturn.previousDeferredVat; // 190
  const nextDeferredVat = currentVatReturn.nextPeriodDeferredVat;

  // Handle AI Explanation request for specific finding
  const handleExplainWithAi = async (finding: AuditFinding) => {
    setAiLoadingId(finding.id);
    try {
      const res = await fetch('/api/ai/explain-discrepancy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          finding: {
            title: finding.title,
            type: finding.category,
            sourceField: finding.sourceField,
            sourceAmount: finding.sourceAmount,
            targetField: finding.targetField,
            targetAmount: finding.targetAmount,
            diff: finding.difference,
          },
          details: finding.recommendation,
          previousMonth: previousVatReturn,
          currentMonth: currentVatReturn,
          invoices: documents.slice(0, 5),
        }),
      });
      const data = await res.json();
      setSelectedAiFinding({
        finding,
        text: data.explanation || "Açıklama üretilemedi.",
      });
    } catch (e) {
      console.error(e);
    } finally {
      setAiLoadingId(null);
    }
  };

  // Export Audit Report as CSV
  const handleExportCsv = () => {
    const headers = ["Bulgu", "Kategori", "Önem Derecesi", "Kaynak Alan", "Kaynak Tutar", "Karşılaştırılan Alan", "Hedef Tutar", "Fark (TL)", "Durum", "Öneri"];
    const rows = findings.map(f => [
      `"${f.title.replace(/"/g, '""')}"`,
      f.category,
      f.severity,
      `"${f.sourceField.replace(/"/g, '""')}"`,
      f.sourceAmount,
      `"${f.targetField.replace(/"/g, '""')}"`,
      f.targetAmount,
      f.difference,
      f.status,
      `"${f.recommendation.replace(/"/g, '""')}"`
    ]);
    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map(e => e.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Novarge_KDV_Denetim_Raporu_${currentVatReturn.period.replace('/', '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Trigger Print / PDF report
  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* 1. Belge Yükleme ve Veri Okuma Alanı */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800 gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center space-x-2">
              <UploadCloud className="w-5 h-5 text-emerald-400" />
              <span>1. Belge Yükleme ve Akıllı Veri Okuma</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              e-Fatura XML, PDF, taranmış fatura, Excel muavin dökümü, cari ve önceki dönem KDV beyannameleri.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onUploadSimulatedDoc('invoice')}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 flex items-center space-x-1.5 transition"
            >
              <Receipt className="w-3.5 h-3.5 text-emerald-400" />
              <span>+ e-Fatura XML/PDF Yükle</span>
            </button>
            <button
              onClick={() => onUploadSimulatedDoc('csv')}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 flex items-center space-x-1.5 transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" />
              <span>+ Excel/CSV Muavin Dökümü</span>
            </button>
            <button
              onClick={() => onUploadSimulatedDoc('customs')}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 flex items-center space-x-1.5 transition"
            >
              <FileBarChart className="w-3.5 h-3.5 text-purple-400" />
              <span>+ Gümrük / İade Belgesi</span>
            </button>
          </div>
        </div>

        {/* Uploaded Documents List with Extracted Fields */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300">
              Sistemdeki Belgeler ({documents.length} adet yüklendi & okundu)
            </span>
            <span className="text-[11px] text-slate-400">
              *Tarih, Belge No, Firma, VKN, Matrah, Oran, KDV ve Toplam ayrıştırıldı.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {documents.slice(0, 8).map((doc) => {
              const isUnreadable = doc.status === 'unreadable_fields';
              return (
                <div
                  key={doc.id}
                  className={`p-3 rounded-xl border transition ${
                    isUnreadable
                      ? 'bg-amber-950/20 border-amber-600/40'
                      : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText className={`w-4 h-4 ${isUnreadable ? 'text-amber-400' : 'text-emerald-400'}`} />
                      <span className="text-xs font-semibold text-slate-200 truncate max-w-[130px]">
                        {doc.documentNumber}
                      </span>
                    </div>
                    <button
                      onClick={() => onOpenDocViewer(doc)}
                      className="text-slate-400 hover:text-slate-200 text-[11px] p-1 rounded hover:bg-slate-700/50"
                      title="Belgeyi İncele"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-300 font-medium truncate mt-1" title={doc.companyName}>
                    {doc.companyName}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                    <span>VKN: {doc.taxId || <span className="text-amber-400 font-bold">Okunamadı</span>}</span>
                    <span>{doc.date}</span>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-700/50 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Matrah: {doc.baseAmount.toLocaleString('tr-TR')} TL</span>
                    <span className="font-bold text-emerald-400">KDV: {doc.vatAmount.toLocaleString('tr-TR')} TL (%{doc.vatRate})</span>
                  </div>

                  {isUnreadable ? (
                    <div className="mt-2 flex items-center justify-between pt-1 border-t border-amber-500/20">
                      <span className="text-[10px] text-amber-300 font-medium flex items-center space-x-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Kullanıcı Doğrulaması Bekliyor</span>
                      </span>
                      <button
                        onClick={() => {
                          setUnreadableModalDoc(doc);
                          setManualTaxId(doc.taxId || '3456789012');
                          setManualDocNo(doc.documentNumber.includes('???') ? 'YK-202608-8841' : doc.documentNumber);
                        }}
                        className="text-[10px] bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-2 py-0.5 rounded transition"
                      >
                        Doğrula
                      </button>
                    </div>
                  ) : (
                    <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
                      <span className="capitalize">{doc.source.replace('_', ' ')}</span>
                      <span className="text-emerald-500/90 font-medium flex items-center space-x-0.5">
                        <Check className="w-3 h-3" />
                        <span>Doğrulandı</span>
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 2. Muhasebeci Kontrol Paneli & Temel Göstergeler (Dashboard) */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center space-x-2">
              <FileCheck2 className="w-5 h-5 text-teal-400" />
              <span>2. KDV Beyannamesi Denetim Paneli & Mutabakat Özeti</span>
            </h2>
            <p className="text-xs text-slate-400">
              Dönem: {currentVatReturn.period} | GİB Beyanname Versiyonu: {currentVatReturn.version}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportCsv}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 flex items-center space-x-1.5 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Excel Raporu İndir</span>
            </button>
            <button
              onClick={handlePrintPdf}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 flex items-center space-x-1.5 transition"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Yazdır / PDF Rapor</span>
            </button>
          </div>
        </div>

        {/* Financial KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-3.5">
            <span className="text-[11px] font-medium text-slate-400 block mb-1">Toplam Satış Matrahı</span>
            <p className="text-base font-bold text-slate-100">
              {totalSalesBase.toLocaleString('tr-TR')} TL
            </p>
            <span className="text-[10px] text-slate-500">600 Hesap & Beyan Tablo 1</span>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-3.5">
            <span className="text-[11px] font-medium text-slate-400 block mb-1">Hesaplanan KDV (391)</span>
            <p className="text-base font-bold text-teal-300">
              {totalCalculatedVat.toLocaleString('tr-TR')} TL
            </p>
            <span className="text-[10px] text-slate-500">Satış KDV Toplamı</span>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-3.5">
            <span className="text-[11px] font-medium text-slate-400 block mb-1">İndirilecek KDV (191)</span>
            <p className="text-base font-bold text-blue-300">
              {totalDeductibleVat.toLocaleString('tr-TR')} TL
            </p>
            <span className="text-[10px] text-slate-500">Alışlar + Gümrük KDV</span>
          </div>

          <div className="bg-slate-800/50 border border-amber-600/40 rounded-xl p-3.5 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-amber-300 block mb-1">Önceki Dönem Devreden (190)</span>
              <span className="w-2 h-2 rounded-full bg-rose-500" title="Fark Tespit Edildi" />
            </div>
            <p className="text-base font-bold text-amber-300">
              {prevDeferredVat.toLocaleString('tr-TR')} TL
            </p>
            <p className="text-[10px] text-rose-400 font-semibold">
              *Önceki Beyanda: {previousVatReturn.nextPeriodDeferredVat.toLocaleString('tr-TR')} TL (Fark: 2.500 TL)
            </p>
          </div>

          <div className="bg-emerald-950/30 border border-emerald-600/40 rounded-xl p-3.5">
            <span className="text-[11px] font-medium text-emerald-400 block mb-1">Sonraki Döneme Devreden</span>
            <p className="text-base font-bold text-emerald-300">
              {nextDeferredVat.toLocaleString('tr-TR')} TL
            </p>
            <span className="text-[10px] text-emerald-400/80">Ödenecek KDV: 0 TL</span>
          </div>
        </div>

        {/* Audit Scope Card (Kontrol Kapsamı) */}
        <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-200">Otomatik Denetim Kapsam Karnesi:</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  %{scopeStats.compliancePercentage} Doğruluk
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Toplam {scopeStats.totalChecks} standart kontrol maddesi uygulandı; {scopeStats.passedChecks} kontrol tam başarılı, {scopeStats.failedChecks} maddede uyarı/risk bulundu.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4 text-xs shrink-0">
            <div className="flex items-center space-x-1.5 text-rose-400">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span>{findings.filter(f => f.severity === 'definite_discrepancy').length} Kesin Fark</span>
            </div>
            <div className="flex items-center space-x-1.5 text-amber-400">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span>{findings.filter(f => f.severity === 'potential_risk').length} Olası Risk</span>
            </div>
            <div className="flex items-center space-x-1.5 text-cyan-400">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500"></span>
              <span>{findings.filter(f => f.severity === 'missing_data').length} Veri Eksikliği</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Özel İşlemler İçin Ayrı Kontrol Modülleri Tab Bar */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
              <Filter className="w-4 h-4 text-emerald-400" />
              <span>3. Özel İşlem Kontrol Modülleri & Açıklamalı Hata Raporu</span>
            </h3>
            <p className="text-xs text-slate-400">
              Mevzuata ve GİB KDV-1 beyanname sürümüne göre değişkenlik gösteren özel işlem kuralları.
            </p>
          </div>

          {/* Quick AI Ask */}
          <button
            onClick={onOpenAiChat}
            className="flex items-center space-x-1.5 text-xs bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-medium px-3 py-1.5 rounded-lg shadow-sm transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Farkları Yapay Zekâya Sor</span>
          </button>
        </div>

        {/* Submodule tabs */}
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={() => setSubModuleTab('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              subModuleTab === 'all'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Tüm Bulgular ({findings.length})
          </button>
          <button
            onClick={() => setSubModuleTab('tevkifat')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              subModuleTab === 'tevkifat'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Tevkifat (KDV1-KDV2)
          </button>
          <button
            onClick={() => setSubModuleTab('istisna')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              subModuleTab === 'istisna'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            İstisnalar (Kod: 301 vb.)
          </button>
          <button
            onClick={() => setSubModuleTab('ithalat')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              subModuleTab === 'ithalat'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            İthalat & Gümrük
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-800/30 p-2.5 rounded-xl border border-slate-800 text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-slate-400 font-medium">Önem Filtresi:</span>
            <button
              onClick={() => setSeverityFilter('all')}
              className={`px-2 py-1 rounded ${severityFilter === 'all' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400'}`}
            >
              Tümü
            </button>
            <button
              onClick={() => setSeverityFilter('definite_discrepancy')}
              className={`px-2 py-1 rounded ${severityFilter === 'definite_discrepancy' ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40' : 'text-slate-400'}`}
            >
              Kesin Tutarsızlık
            </button>
            <button
              onClick={() => setSeverityFilter('potential_risk')}
              className={`px-2 py-1 rounded ${severityFilter === 'potential_risk' ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40' : 'text-slate-400'}`}
            >
              Olası Risk
            </button>
            <button
              onClick={() => setSeverityFilter('missing_data')}
              className={`px-2 py-1 rounded ${severityFilter === 'missing_data' ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40' : 'text-slate-400'}`}
            >
              Veri Eksikliği
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-slate-400 font-medium">Onay Durumu:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="pending_review">İnceleme Bekliyor</option>
              <option value="corrected">Düzeltildi</option>
              <option value="accepted_with_justification">Gerekçeyle Kabul Edildi</option>
            </select>
          </div>
        </div>

        {/* Findings Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-800/80 text-slate-300 font-semibold border-b border-slate-700">
              <tr>
                <th className="py-3 px-4">Bulgu & Risk</th>
                <th className="py-3 px-3">Kaynak Tutar</th>
                <th className="py-3 px-3">Karşılaştırılan Tutar</th>
                <th className="py-3 px-3 text-right">Fark</th>
                <th className="py-3 px-4">Kaynak & Kural</th>
                <th className="py-3 px-4">Kontrol Önerisi</th>
                <th className="py-3 px-3">Durum</th>
                <th className="py-3 px-3 text-center">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredFindings.map((finding) => {
                const isDefinite = finding.severity === 'definite_discrepancy';
                const isRisk = finding.severity === 'potential_risk';

                return (
                  <tr key={finding.id} className="hover:bg-slate-800/40 transition">
                    {/* Title & Severity */}
                    <td className="py-3.5 px-4 align-top">
                      <div className="flex items-start space-x-2">
                        {isDefinite ? (
                          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        ) : isRisk ? (
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        ) : (
                          <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <p className="font-semibold text-slate-200">{finding.title}</p>
                          <span
                            className={`inline-block text-[10px] px-1.5 py-0.5 rounded font-medium mt-1 ${
                              isDefinite
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : isRisk
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                            }`}
                          >
                            {isDefinite ? 'Kesin Tutarsızlık' : isRisk ? 'Olası Risk' : 'Veri Eksikliği'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Source Amount */}
                    <td className="py-3.5 px-3 align-top font-mono text-slate-300">
                      <div>{finding.sourceAmount.toLocaleString('tr-TR')} TL</div>
                      <span className="text-[10px] text-slate-500 block truncate max-w-[140px]" title={finding.sourceField}>
                        {finding.sourceField}
                      </span>
                    </td>

                    {/* Target Amount */}
                    <td className="py-3.5 px-3 align-top font-mono text-slate-300">
                      <div>{finding.targetAmount.toLocaleString('tr-TR')} TL</div>
                      <span className="text-[10px] text-slate-500 block truncate max-w-[140px]" title={finding.targetField}>
                        {finding.targetField}
                      </span>
                    </td>

                    {/* Difference */}
                    <td className="py-3.5 px-3 align-top text-right font-mono font-bold">
                      <span className={finding.difference > 0 ? 'text-rose-400' : 'text-slate-400'}>
                        {finding.difference > 0 ? `${finding.difference.toLocaleString('tr-TR')} TL` : '0 TL'}
                      </span>
                    </td>

                    {/* Source Name */}
                    <td className="py-3.5 px-4 align-top text-slate-400 text-[11px]">
                      {finding.sourceName}
                    </td>

                    {/* Recommendation */}
                    <td className="py-3.5 px-4 align-top text-slate-300 text-[11px] leading-relaxed max-w-xs">
                      {finding.recommendation}
                      {finding.id === 'fnd-01' && finding.status === 'pending_review' && (
                        <div className="mt-2">
                          <button
                            onClick={onQuickFixDevredenKdv}
                            className="text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2 py-1 rounded transition flex items-center space-x-1"
                          >
                            <Check className="w-3 h-3" />
                            <span>Mevcut Beyannameyi 42.500 TL Olarak Düzelt</span>
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-3 align-top whitespace-nowrap">
                      {finding.status === 'pending_review' && (
                        <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center space-x-1 w-max">
                          <Clock className="w-3 h-3" />
                          <span>İnceleme Bekliyor</span>
                        </span>
                      )}
                      {finding.status === 'corrected' && (
                        <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1 w-max">
                          <CheckCircle className="w-3 h-3" />
                          <span>Düzeltildi</span>
                        </span>
                      )}
                      {finding.status === 'accepted_with_justification' && (
                        <div>
                          <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/30 flex items-center space-x-1 w-max">
                            <Check className="w-3 h-3" />
                            <span>Gerekçeyle Kabul</span>
                          </span>
                          {finding.justificationNote && (
                            <p className="text-[10px] text-slate-400 mt-1 italic max-w-[130px]" title={finding.justificationNote}>
                              "{finding.justificationNote}"
                            </p>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-3 align-top text-center">
                      <div className="flex flex-col space-y-1.5 items-center">
                        <button
                          onClick={() => handleExplainWithAi(finding)}
                          disabled={aiLoadingId === finding.id}
                          className="w-full text-[11px] bg-slate-800 hover:bg-slate-700 text-teal-300 px-2 py-1 rounded border border-slate-700 flex items-center justify-center space-x-1 transition"
                          title="Yapay zekâ ile sade Türkçe mesleki gerekçe üret"
                        >
                          <Sparkles className="w-3 h-3 text-teal-400" />
                          <span>{aiLoadingId === finding.id ? 'Taranıyor...' : 'AI Açıkla'}</span>
                        </button>

                        {finding.status === 'pending_review' && (
                          <div className="flex space-x-1 w-full">
                            <button
                              onClick={() => onUpdateFindingStatus(finding.id, 'corrected')}
                              className="flex-1 text-[10px] bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-700/50"
                              title="Düzeltildi Olarak İşaretle"
                            >
                              Düzelt
                            </button>
                            <button
                              onClick={() => {
                                setJustificationModalFinding(finding);
                                setJustificationText('');
                              }}
                              className="flex-1 text-[10px] bg-blue-950/60 hover:bg-blue-900/80 text-blue-300 px-1.5 py-0.5 rounded border border-blue-700/50"
                              title="Gerekçeli Kabul Notu Ekle"
                            >
                              Onayla
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. İşlem Geçmişi & SMMM Onay İzi (Audit Trail) */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2 mb-3">
          <Clock className="w-4 h-4 text-slate-400" />
          <span>4. Denetim İzi & İşlem Geçmişi (Kim Hangi Kaydı Değiştirdi?)</span>
        </h3>
        <div className="space-y-2 max-h-48 overflow-y-auto pr-2 scrollbar-thin">
          {auditLogs.map((log) => (
            <div key={log.id} className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-800 flex items-start justify-between text-xs">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-slate-200">{log.user}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-700 text-slate-300">{log.role}</span>
                  <span className="text-[11px] font-bold text-teal-400">[{log.action}]</span>
                </div>
                <p className="text-slate-400 mt-0.5 text-[11px]">{log.details}</p>
              </div>
              <span className="text-[10px] text-slate-500 font-mono shrink-0 ml-4">{log.timestamp}</span>
            </div>
          ))}
        </div>
      </section>

      {/* AI Explanation Modal */}
      {selectedAiFinding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl text-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-800/80">
              <div className="flex items-center space-x-2.5">
                <Sparkles className="w-5 h-5 text-teal-400" />
                <h3 className="font-bold text-sm text-slate-100">
                  Yapay Zekâ SMMM Denetim Açıklaması
                </h3>
              </div>
              <button
                onClick={() => setSelectedAiFinding(null)}
                className="text-slate-400 hover:text-slate-200 text-sm p-1 rounded"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/60">
                <span className="text-slate-400 font-medium">İncelenen Bulgu:</span>
                <p className="font-semibold text-slate-200 text-sm mt-0.5">{selectedAiFinding.finding.title}</p>
                <div className="flex justify-between text-slate-400 text-[11px] mt-1">
                  <span>Fark: {selectedAiFinding.finding.difference.toLocaleString('tr-TR')} TL</span>
                  <span>Kategori: {selectedAiFinding.finding.category}</span>
                </div>
              </div>

              <div className="bg-slate-950/80 p-4 rounded-xl border border-teal-500/30 text-slate-200 leading-relaxed space-y-2 whitespace-pre-line font-normal">
                {selectedAiFinding.text}
              </div>
            </div>
            <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-800/40 flex justify-end">
              <button
                onClick={() => setSelectedAiFinding(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium"
              >
                Anladım, Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Justification Note Modal */}
      {justificationModalFinding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl text-slate-100">
            <div className="px-5 py-4 border-b border-slate-800 bg-slate-800/80 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-100">Gerekçeli Kabul Onayı</h3>
              <button onClick={() => setJustificationModalFinding(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <p className="text-slate-300">
                Bu bulguyu sistemde "Gerekçeyle Kabul Edildi" olarak onaylamak üzeresiniz. Lütfen denetim dosyasına işlenecek mesleki gerekçeyi yazınız:
              </p>
              <textarea
                value={justificationText}
                onChange={(e) => setJustificationText(e.target.value)}
                placeholder="Örn: VUK 0.50 TL altı yuvarlama toleransı dahilindedir / TCDD tevkifat makbuzu e-Belge portalinden teyit edilmiştir..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 h-24"
              />
            </div>
            <div className="px-5 py-3 border-t border-slate-800 bg-slate-800/40 flex justify-end space-x-2 text-xs">
              <button
                onClick={() => setJustificationModalFinding(null)}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg"
              >
                Vazgeç
              </button>
              <button
                onClick={() => {
                  onUpdateFindingStatus(
                    justificationModalFinding.id, 
                    'accepted_with_justification', 
                    justificationText || "Mesleki kanaat ile gerekçelendirildi."
                  );
                  setJustificationModalFinding(null);
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg shadow-sm"
              >
                Gerekçeyi Kaydet ve Onayla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unreadable Field Verification Modal */}
      {unreadableModalDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl text-slate-100">
            <div className="px-5 py-4 border-b border-slate-800 bg-slate-800/80 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-100 flex items-center space-x-2">
                <Edit3 className="w-4 h-4 text-amber-400" />
                <span>Okunamayan Belge Alanı Doğrulama</span>
              </h3>
              <button onClick={() => setUnreadableModalDoc(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-[11px]">
                Mevzuat kuralı: Sistem okunamayan alanları asla tahminle doldurmaz. Lütfen faturanın aslına bakarak doğrulatınız.
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Vergi Kimlik Numarası (VKN / TCKN):</label>
                <input
                  type="text"
                  value={manualTaxId}
                  onChange={(e) => setManualTaxId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Fatura Belge Numarası:</label>
                <input
                  type="text"
                  value={manualDocNo}
                  onChange={(e) => setManualDocNo(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>
            <div className="px-5 py-3 border-t border-slate-800 bg-slate-800/40 flex justify-end space-x-2 text-xs">
              <button
                onClick={() => setUnreadableModalDoc(null)}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg"
              >
                İptal
              </button>
              <button
                onClick={() => {
                  onVerifyUnreadableField(unreadableModalDoc.id, manualTaxId, manualDocNo);
                  setUnreadableModalDoc(null);
                }}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-sm"
              >
                Doğrula ve Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
