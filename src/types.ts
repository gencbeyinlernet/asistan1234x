export type DocumentType = 
  | 'sales_invoice' 
  | 'purchase_invoice' 
  | 'withholding_invoice' 
  | 'export_invoice' 
  | 'import_customs' 
  | 'return_invoice' 
  | 'accounting_csv' 
  | 'vat_return' 
  | 'previous_vat_return';

export interface InvoiceItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  baseAmount: number;
  vatRate: number; // 1, 10, 20
  vatAmount: number;
  totalAmount: number;
  withholdingRate?: string; // e.g. "5/10", "7/10", "9/10"
  withholdingVat?: number;
  declaredAccountCode?: string; // e.g. "153", "255", "770"
  recommendedAccountCode?: string;
  accountAnalysisNote?: string;
}

export interface DocumentRecord {
  id: string;
  documentType: DocumentType;
  fileName: string;
  documentNumber: string;
  date: string; // YYYY-MM-DD
  period: string; // YYYY/MM
  companyName: string;
  taxId: string; // VKN or TCKN
  baseAmount: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  withholdingCode?: string;
  withholdingVat?: number;
  exemptionCode?: string; // e.g. "301" Mal İhracatı
  exemptionAmount?: number;
  isCancelled?: boolean;
  isReturned?: boolean;
  status: 'verified' | 'unreadable_fields' | 'pending_verification';
  unreadableFields?: string[];
  matchedJournalId?: string;
  source: 'e-fatura_xml' | 'e-arsiv_pdf' | 'scanned_image' | 'integrator_sync' | 'manual_upload';
  assignedAccountCode?: string;
  integratorAutoRule?: string;
  hasAccountConflict?: boolean;
  accountConflictMessage?: string;
}

export interface AccountingEntry {
  id: string;
  date: string;
  journalNo: string;
  accountCode: string; // 191.01, 391.20, 153.01, 600.20, etc.
  accountName: string;
  debit: number; // Borç
  credit: number; // Alacak
  description: string;
  documentNumber?: string;
  taxId?: string;
  period: string;
  hasMatchedDocument: boolean;
  matchedDocumentId?: string;
  isManualEntry: boolean;
}

export interface VatReturnForm {
  period: string;
  taxId: string;
  companyName: string;
  taxOffice: string;
  version: string;
  // Tablo 1: Matrah ve Hesaplanan KDV (391)
  salesBase20: number;
  salesVat20: number;
  salesBase10: number;
  salesVat10: number;
  salesBase1: number;
  salesVat1: number;
  totalSalesBase: number;
  totalCalculatedVat: number; // 391 Toplamı
  
  // Tablo 2: Tevkifat Uygulanan İşlemler
  withholdingBase: number;
  withholdingCalculatedVat: number;
  withholdingDeductedVat: number; // Alıcı tarafından tevkif edilen
  
  // Tablo 3: İstisnalar
  exportExemptionBase: number; // 301 Mal İhracatı
  otherExemptionsBase: number;
  
  // Tablo 4: İndirimler (191)
  previousDeferredVat: number; // Önceki dönemden devreden (Kod: 33)
  currentPeriodDeductibleVat: number; // Bu döneme ait indirilecek KDV (Kod: 34 / 191)
  customsDeductibleVat: number; // İthalde ödenen KDV
  totalDeductions: number; // Toplam İndirimler
  
  // Tablo 5: Sonuç
  payableVat: number; // Ödenmesi Gereken KDV (Kod: 41)
  nextPeriodDeferredVat: number; // Sonraki Döneme Devreden KDV (Kod: 33)
  refundClaimVat: number; // İadesi Gereken KDV
  
  submissionStatus: 'draft' | 'checked' | 'approved_by_smmm' | 'sent_to_gib';
  approvalDate?: string;
  approver?: string;
}

export type FindingSeverity = 'definite_discrepancy' | 'potential_risk' | 'missing_data';
export type FindingStatus = 'pending_review' | 'corrected' | 'accepted_with_justification';

export interface AuditFinding {
  id: string;
  title: string;
  category: 
    | 'taxpayer_period' 
    | 'math_accuracy' 
    | 'rate_compliance' 
    | 'duplicate_doc' 
    | 'missing_accounting' 
    | 'missing_document' 
    | 'sales_reconciliation' 
    | 'purchase_reconciliation' 
    | 'deferred_vat' 
    | 'return_result' 
    | 'cancellation_return' 
    | 'rounding_diff'
    | 'account_code_conflict'
    | 'withholding_kdv2'
    | 'customs_import';
  severity: FindingSeverity;
  sourceField: string;
  sourceAmount: number;
  targetField: string;
  targetAmount: number;
  difference: number;
  sourceName: string;
  recommendation: string;
  status: FindingStatus;
  justificationNote?: string;
  relatedDocIds?: string[];
  isAiAnalyzed?: boolean;
  aiExplanation?: string;
  createdAt: string;
}

export interface AuditScopeStats {
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  skippedDueToMissingData: number;
  compliancePercentage: number;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  action: string;
  details: string;
  findingId?: string;
}

export interface TrialBalanceItem {
  accountCode: string;
  accountName: string;
  totalDebit: number;
  totalCredit: number;
  balanceDebit: number;
  balanceCredit: number;
  category: 'asset' | 'liability' | 'equity' | 'income' | 'expense';
}
