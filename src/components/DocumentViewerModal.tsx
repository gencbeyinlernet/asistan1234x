import React from 'react';
import { X, FileText, CheckCircle2, AlertTriangle, Building, Calendar, DollarSign, Layers } from 'lucide-react';
import { DocumentRecord } from '../types';

interface DocumentViewerModalProps {
  document: DocumentRecord | null;
  onClose: () => void;
  onUpdateDocument?: (doc: DocumentRecord) => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  document,
  onClose,
  onUpdateDocument,
}) => {
  if (!document) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-800/60">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-slate-100 flex items-center space-x-2">
                <span>{document.documentNumber}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-normal">
                  {document.source}
                </span>
              </h3>
              <p className="text-xs text-slate-400">{document.fileName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status banner */}
          {document.status === 'unreadable_fields' ? (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start space-x-3 text-amber-300 text-xs">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <p className="font-semibold">Okunamayan Alanlar Tespit Edildi (Doğrulama Gerekli)</p>
                <p className="text-amber-200/80 mt-0.5">
                  Bu belge taranmış görüntü/leke nedeniyle tam okunamamıştır. Mevzuat gereği tahminle doldurulmamış, SMMM doğrulamasına bırakılmıştır: {document.unreadableFields?.join(', ')}.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center space-x-2 text-emerald-300 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Veri bütünlüğü doğrulandı: GİB e-Fatura şemasına tam uyumlu.</span>
            </div>
          )}

          {/* Key Fields Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-800/40 p-4 rounded-xl border border-slate-800">
            <div>
              <span className="text-[11px] font-medium text-slate-400 flex items-center space-x-1 mb-1">
                <Building className="w-3 h-3" />
                <span>Karşı Firma</span>
              </span>
              <p className="text-xs font-semibold text-slate-200 truncate" title={document.companyName}>
                {document.companyName}
              </p>
              <p className="text-[10px] text-slate-500 font-mono">VKN: {document.taxId || 'Okunamadı'}</p>
            </div>

            <div>
              <span className="text-[11px] font-medium text-slate-400 flex items-center space-x-1 mb-1">
                <Calendar className="w-3 h-3" />
                <span>Belge Tarihi & Dönem</span>
              </span>
              <p className="text-xs font-semibold text-slate-200">{document.date}</p>
              <p className="text-[10px] text-slate-500">Dönem: {document.period}</p>
            </div>

            <div>
              <span className="text-[11px] font-medium text-slate-400 flex items-center space-x-1 mb-1">
                <DollarSign className="w-3 h-3" />
                <span>Matrah & KDV Oranı</span>
              </span>
              <p className="text-xs font-semibold text-slate-200">
                {document.baseAmount.toLocaleString('tr-TR')} TL
              </p>
              <p className="text-[10px] text-emerald-400 font-medium">Oran: %{document.vatRate}</p>
            </div>

            <div>
              <span className="text-[11px] font-medium text-slate-400 flex items-center space-x-1 mb-1">
                <Layers className="w-3 h-3" />
                <span>KDV Tutarı & Toplam</span>
              </span>
              <p className="text-xs font-bold text-emerald-300">
                {document.vatAmount.toLocaleString('tr-TR')} TL
              </p>
              <p className="text-[10px] text-slate-400">
                Toplam: {document.totalAmount.toLocaleString('tr-TR')} TL
              </p>
            </div>
          </div>

          {/* Special fields (Tevkifat, İstisna) */}
          {(document.withholdingCode || document.exemptionCode) && (
            <div className="bg-slate-800/70 border border-slate-700/60 rounded-xl p-3.5 space-y-1.5 text-xs">
              <span className="font-semibold text-slate-200">Özel Vergi Rejimi / İstisna Bilgisi</span>
              {document.withholdingCode && (
                <div className="flex justify-between text-slate-300">
                  <span>Tevkifat Kodu ve Tutarı:</span>
                  <span className="font-mono text-amber-300">
                    Kod: {document.withholdingCode} (Tevkif Edilen: {document.withholdingVat?.toLocaleString('tr-TR')} TL)
                  </span>
                </div>
              )}
              {document.exemptionCode && (
                <div className="flex justify-between text-slate-300">
                  <span>İstisna Kodu ve Matrahı:</span>
                  <span className="font-mono text-cyan-300">
                    Kod: {document.exemptionCode} (İstisna Matrahı: {document.exemptionAmount?.toLocaleString('tr-TR')} TL)
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Account Code Analysis */}
          {document.assignedAccountCode && (
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Muhasebe Hesap Kodu Yönlendirmesi:</span>
                <span className="font-mono font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {document.assignedAccountCode}
                </span>
              </div>
              {document.hasAccountConflict && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-300">
                  <p className="font-semibold">⚠️ Hesap Kodu Uyuşmazlığı Uyarısı:</p>
                  <p className="mt-1 text-slate-300">{document.accountConflictMessage}</p>
                </div>
              )}
            </div>
          )}

          {/* Simulated XML Raw Snippet */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-400">UBL-TR 2.1 e-Fatura XML Verisi</span>
              <span className="text-[10px] text-slate-500 font-mono">Standart: GİB UBL-TR</span>
            </div>
            <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[11px] font-mono text-emerald-400/90 overflow-x-auto max-h-36 scrollbar-thin">
{`<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">
  <cbc:ID>${document.documentNumber}</cbc:ID>
  <cbc:IssueDate>${document.date}</cbc:IssueDate>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName><cbc:Name>${document.companyName}</cbc:Name></cac:PartyName>
      <cac:PartyTaxScheme><cbc:CompanyID>${document.taxId}</cbc:CompanyID></cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="TRY">${document.vatAmount}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="TRY">${document.baseAmount}</cbc:TaxableAmount>
      <cbc:Percent>${document.vatRate}</cbc:Percent>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
</Invoice>`}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-800/40 flex items-center justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
