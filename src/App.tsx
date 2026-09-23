import React, { useState, useMemo } from 'react';
import { Header } from './components/Header';
import { KdvAuditModule } from './components/KdvAuditModule';
import { IntegratorModule } from './components/IntegratorModule';
import { PreparationModule } from './components/PreparationModule';
import { DocumentViewerModal } from './components/DocumentViewerModal';
import { AiAssistantDrawer } from './components/AiAssistantDrawer';
import { 
  INITIAL_DOCUMENTS, 
  INITIAL_ACCOUNTING_ENTRIES, 
  INITIAL_CURRENT_VAT_RETURN, 
  INITIAL_PREVIOUS_VAT_RETURN,
  INITIAL_AUDIT_LOGS 
} from './mockData';
import { DocumentRecord, AccountingEntry, VatReturnForm, AuditFinding, FindingStatus, AuditLogItem } from './types';
import { runFullVatAudit } from './services/auditEngine';

export default function App() {
  const [activeTab, setActiveTab] = useState<'audit' | 'integrator' | 'ledger'>('audit');
  const [selectedCompany, setSelectedCompany] = useState<string>("ABC Teknoloji Sanayi ve Tic. Ltd. Şti.");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("2026/08");

  // Core application state
  const [documents, setDocuments] = useState<DocumentRecord[]>(INITIAL_DOCUMENTS);
  const [accountingEntries, setAccountingEntries] = useState<AccountingEntry[]>(INITIAL_ACCOUNTING_ENTRIES);
  const [currentVatReturn, setCurrentVatReturn] = useState<VatReturnForm>(INITIAL_CURRENT_VAT_RETURN);
  const [previousPeriodDeferredVat, setPreviousPeriodDeferredVat] = useState<number>(42500);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(INITIAL_AUDIT_LOGS);

  // Status overrides for findings (so user manual actions like 'corrected' or 'accepted_with_justification' persist)
  const [findingStatusMap, setFindingStatusMap] = useState<Record<string, { status: FindingStatus; note?: string }>>({});

  // UI Modals & Drawers
  const [selectedDocForViewer, setSelectedDocForViewer] = useState<DocumentRecord | null>(null);
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);

  // Run calculation & reconciliation engine dynamically
  const auditResult = useMemo(() => {
    const rawResult = runFullVatAudit(
      documents,
      accountingEntries,
      currentVatReturn,
      previousPeriodDeferredVat,
      "1234567890",
      selectedPeriod
    );

    // Apply manual status overrides
    const updatedFindings = rawResult.findings.map((f) => {
      const override = findingStatusMap[f.id];
      if (override) {
        return {
          ...f,
          status: override.status,
          justificationNote: override.note || f.justificationNote,
        };
      }
      return f;
    });

    return {
      ...rawResult,
      findings: updatedFindings,
    };
  }, [documents, accountingEntries, currentVatReturn, previousPeriodDeferredVat, selectedPeriod, findingStatusMap]);

  // Log action helper
  const addAuditLog = (action: string, details: string) => {
    const newLog: AuditLogItem = {
      id: `log-${Date.now()}`,
      action,
      user: "SMMM Yetkili Denetçi",
      role: "SMMM",
      timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      details,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Quick Fix: Devreden KDV discrepancy (Fixes 40.000 -> 42.500 in current return)
  const handleQuickFixDevredenKdv = () => {
    setCurrentVatReturn((prev) => {
      const newPrevDeferred = 42500;
      // Recalculate next period deferred VAT
      const nextDeferred = newPrevDeferred + prev.currentPeriodDeductibleVat - prev.totalCalculatedVat;
      return {
        ...prev,
        previousDeferredVat: newPrevDeferred,
        nextPeriodDeferredVat: nextDeferred > 0 ? nextDeferred : 0,
        payableVat: nextDeferred < 0 ? Math.abs(nextDeferred) : 0,
      };
    });

    // Mark fnd-01 as corrected
    setFindingStatusMap((prev) => ({
      ...prev,
      'fnd-01': { status: 'corrected' },
    }));

    addAuditLog("Dönem Devreden KDV Düzeltildi", "Önceki dönemden devreden KDV tutarı 40.000 TL'den 42.500 TL'ye güncellendi. Sonraki döneme devreden KDV 41.000 TL olarak revize edildi.");
  };

  // Reassign account code (e.g., 153.01 -> 255.00 for Apple MacBook)
  const handleReassignAccountCode = (docId: string, newAccountCode: string) => {
    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id === docId) {
          const isFixedToFixedAsset = newAccountCode.startsWith('255');
          return {
            ...doc,
            assignedAccountCode: newAccountCode,
            hasAccountConflict: !isFixedToFixedAsset,
            accountConflictMessage: isFixedToFixedAsset
              ? undefined
              : doc.accountConflictMessage,
          };
        }
        return doc;
      })
    );

    // Update journal entry if exists
    setAccountingEntries((prev) =>
      prev.map((entry) => {
        if (entry.documentNumber === documents.find(d => d.id === docId)?.documentNumber && entry.debit > 0 && !entry.accountCode.startsWith('191')) {
          return {
            ...entry,
            accountCode: newAccountCode,
            accountName: newAccountCode.startsWith('255') ? 'Demirbaşlar Hesabı' : entry.accountName,
          };
        }
        return entry;
      })
    );

    addAuditLog("Hesap Kodu Değiştirildi", `${docId} faturası ${newAccountCode} koduna aktarıldı. Demirbaş niteliği tescil edildi.`);
  };

  // Verify unreadable fields (Tax ID & Document Number)
  const handleVerifyUnreadableField = (docId: string, taxId: string, docNo: string) => {
    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id === docId) {
          return {
            ...doc,
            taxId,
            documentNumber: docNo,
            status: 'verified',
            unreadableFields: [],
          };
        }
        return doc;
      })
    );

    addAuditLog("Okunamayan Belge Alanı Doğrulandı", `${docId} nolu faturanın VKN (${taxId}) ve Belge No (${docNo}) SMMM tarafından fiziki nüsha kontrol edilerek sisteme girildi.`);
  };

  // Post unposted invoices to journal entries
  const handlePostUnaccountedInvoices = () => {
    const unpostedDocs = documents.filter((doc) => {
      return !accountingEntries.some(
        (e) => e.documentNumber?.trim().toUpperCase() === doc.documentNumber?.trim().toUpperCase()
      );
    });

    if (unpostedDocs.length === 0) return;

    const newEntries: AccountingEntry[] = [];
    unpostedDocs.forEach((doc, idx) => {
      const jNo = `Y-2026-08-${50 + idx}`;
      // Expense/Asset debit
      newEntries.push({
        id: `acc-auto-${doc.id}-base`,
        journalNo: jNo,
        date: doc.date,
        period: doc.period,
        accountCode: doc.assignedAccountCode || "770.01",
        accountName: doc.assignedAccountCode?.startsWith('255') ? 'Demirbaşlar' : 'Genel Yönetim Giderleri',
        debit: doc.baseAmount,
        credit: 0,
        documentNumber: doc.documentNumber,
        description: `${doc.companyName} Fatura Kaydı (Otomatik)`,
        hasMatchedDocument: true,
        isManualEntry: false,
      });
      // 191 VAT debit
      newEntries.push({
        id: `acc-auto-${doc.id}-vat`,
        journalNo: jNo,
        date: doc.date,
        period: doc.period,
        accountCode: "191.01",
        accountName: "İndirilecek KDV %20",
        debit: doc.vatAmount,
        credit: 0,
        documentNumber: doc.documentNumber,
        description: `${doc.companyName} İndirilecek KDV`,
        hasMatchedDocument: true,
        isManualEntry: false,
      });
      // 320 Supplier credit
      newEntries.push({
        id: `acc-auto-${doc.id}-supplier`,
        journalNo: jNo,
        date: doc.date,
        period: doc.period,
        accountCode: "320.01",
        accountName: `Satıcılar - ${doc.companyName}`,
        debit: 0,
        credit: doc.totalAmount,
        documentNumber: doc.documentNumber,
        description: `${doc.companyName} Cari Borç`,
        hasMatchedDocument: true,
        isManualEntry: false,
      });
    });

    setAccountingEntries((prev) => [...prev, ...newEntries]);
    addAuditLog("Eksik Faturalar Muhasebeleştirildi", `${unpostedDocs.length} adet faturanın çift taraflı yevmiye kaydı oluşturuldu.`);
  };

  // Upload simulated document
  const handleUploadSimulatedDoc = (type: 'invoice' | 'csv' | 'customs') => {
    if (type === 'invoice') {
      const newDoc: DocumentRecord = {
        id: `doc-${Date.now()}`,
        documentType: 'purchase_invoice',
        source: 'manual_upload',
        documentNumber: `GIB202600000${Math.floor(100 + Math.random() * 900)}`,
        companyName: "Kuvars Bilişim Hizmetleri A.Ş.",
        taxId: "8877665544",
        date: "2026-08-25",
        period: "2026/08",
        baseAmount: 15000,
        vatRate: 20,
        vatAmount: 3000,
        totalAmount: 18000,
        status: 'verified',
        assignedAccountCode: '770.01',
        fileName: 'kuvars_fatura.xml',
      };
      setDocuments((prev) => [newDoc, ...prev]);
      addAuditLog("Yeni e-Fatura Yüklendi", `${newDoc.documentNumber} nolu fatura sisteme eklendi ve KDV mutabakatına dahil edildi.`);
    } else if (type === 'csv') {
      addAuditLog("Excel Muavin İçe Aktarıldı", "2026/08 dönemi yevmiye ve muavin hareketleri başarıyla güncellendi.");
    } else {
      const customsDoc: DocumentRecord = {
        id: `doc-gcb-${Date.now()}`,
        documentType: 'import_customs',
        source: 'manual_upload',
        documentNumber: `26340000IM00${Math.floor(100 + Math.random() * 900)}`,
        companyName: "Muratbey Gümrük Müdürlüğü",
        taxId: "0000000000",
        date: "2026-08-28",
        period: "2026/08",
        baseAmount: 45000,
        vatRate: 20,
        vatAmount: 9000,
        totalAmount: 54000,
        status: 'verified',
        assignedAccountCode: '191.02',
        fileName: 'gumruk_giris_beyannamesi.pdf',
      };
      setDocuments((prev) => [customsDoc, ...prev]);
      addAuditLog("Gümrük Belgesi Eklendi", "GÇB ve İthalatta Ödenen KDV makbuzu sisteme işlendi.");
    }
  };

  const handleUpdateFindingStatus = (id: string, status: FindingStatus, note?: string) => {
    setFindingStatusMap((prev) => ({
      ...prev,
      [id]: { status, note },
    }));
    addAuditLog("Bulgu Durumu Güncellendi", `${id} numaralı denetim bulgusu "${status}" olarak işaretlendi.`);
  };

  const handleApproveVatReturn = () => {
    addAuditLog("GİB KDV-1 Beyannamesi Onaylandı", "Meslek mensubu tarafından beyanname ve dayanak belgeler mutabık görülerek onaylandı.");
  };

  const pendingFindingsCount = auditResult.findings.filter(f => f.status === 'pending_review').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-teal-500/30 selection:text-teal-200">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedCompany={selectedCompany}
        setSelectedCompany={setSelectedCompany}
        selectedPeriod={selectedPeriod}
        setSelectedPeriod={setSelectedPeriod}
        onRefreshData={() => addAuditLog("Veriler Eşitlendi", "Entegratör ve muhasebe kayıtları yeniden denetlendi.")}
        onOpenAiDrawer={() => setIsAiDrawerOpen(true)}
        pendingFindingsCount={pendingFindingsCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'audit' && (
          <KdvAuditModule
            documents={documents}
            accountingEntries={accountingEntries}
            currentVatReturn={currentVatReturn}
            previousVatReturn={INITIAL_PREVIOUS_VAT_RETURN}
            findings={auditResult.findings}
            scopeStats={auditResult.stats}
            auditLogs={auditLogs}
            onUploadSimulatedDoc={handleUploadSimulatedDoc}
            onUpdateFindingStatus={handleUpdateFindingStatus}
            onOpenDocViewer={(doc) => setSelectedDocForViewer(doc)}
            onOpenAiChat={() => setIsAiDrawerOpen(true)}
            onQuickFixDevredenKdv={handleQuickFixDevredenKdv}
            onVerifyUnreadableField={handleVerifyUnreadableField}
          />
        )}

        {activeTab === 'integrator' && (
          <IntegratorModule
            documents={documents}
            accountingEntries={accountingEntries}
            selectedCompany={selectedCompany}
            selectedPeriod={selectedPeriod}
            onSyncIntegrator={() => {
              addAuditLog("Entegratör Senkronizasyonu", "Özel entegratör API servisinden son e-Belgeler başarıyla çekildi.");
            }}
            onReassignAccountCode={handleReassignAccountCode}
            onOpenDocViewer={(doc) => setSelectedDocForViewer(doc)}
            onOpenAiChat={() => setIsAiDrawerOpen(true)}
          />
        )}

        {activeTab === 'ledger' && (
          <PreparationModule
            documents={documents}
            accountingEntries={accountingEntries}
            currentVatReturn={currentVatReturn}
            previousPeriodDeferredVat={previousPeriodDeferredVat}
            onPostUnaccountedInvoices={handlePostUnaccountedInvoices}
            onApproveVatReturn={handleApproveVatReturn}
            onOpenAiChat={() => setIsAiDrawerOpen(true)}
          />
        )}
      </main>

      {/* Document Inspector Modal */}
      <DocumentViewerModal
        document={selectedDocForViewer}
        onClose={() => setSelectedDocForViewer(null)}
      />

      {/* SMMM AI Chat Assistant Drawer */}
      <AiAssistantDrawer
        isOpen={isAiDrawerOpen}
        onClose={() => setIsAiDrawerOpen(false)}
        findings={auditResult.findings}
        documents={documents}
        currentVatReturn={currentVatReturn}
        selectedCompany={selectedCompany}
        selectedPeriod={selectedPeriod}
      />
    </div>
  );
}
