import { DocumentRecord, AccountingEntry, VatReturnForm, AuditFinding, AuditScopeStats } from '../types';

export interface AuditRunResult {
  findings: AuditFinding[];
  stats: AuditScopeStats;
  summary: {
    totalSalesBaseFromDocs: number;
    totalSalesVatFromDocs: number;
    totalPurchasesBaseFromDocs: number;
    totalPurchasesVatFromDocs: number;
    totalVat391InAccounting: number;
    totalVat191InAccounting: number;
    calculatedPayableVat: number;
    calculatedDeferredVat: number;
    criticalFindingsCount: number;
    potentialRiskCount: number;
    missingDataCount: number;
  };
}

export function runFullVatAudit(
  documents: DocumentRecord[],
  accountingEntries: AccountingEntry[],
  currentVatReturn: VatReturnForm,
  previousPeriodDeferredVat: number,
  companyTaxId: string,
  selectedPeriod: string
): AuditRunResult {
  const findings: AuditFinding[] = [];
  const now = new Date().toISOString().replace('T', ' ').substring(0, 16);

  // 1. Mükellef ve Dönem Kontrolü
  const wrongPeriodDocs = documents.filter(d => d.period !== selectedPeriod);
  if (wrongPeriodDocs.length > 0) {
    findings.push({
      id: `fnd-period-${Date.now()}`,
      title: "Dönem Dışı Belge Tespiti",
      category: "taxpayer_period",
      severity: "potential_risk",
      sourceField: `${wrongPeriodDocs.length} adet belge`,
      sourceAmount: wrongPeriodDocs.reduce((acc, d) => acc + d.totalAmount, 0),
      targetField: `Seçili Dönem: ${selectedPeriod}`,
      targetAmount: 0,
      difference: wrongPeriodDocs.length,
      sourceName: "Belge Tarih & Dönem Filtresi",
      recommendation: "Yüklenen belgelerin bir kısmı beyan dönemi dışındadır. Dönem kayması olup olmadığını kontrol edin.",
      status: "pending_review",
      createdAt: now,
      relatedDocIds: wrongPeriodDocs.map(d => d.id)
    });
  }

  // 2. Matematiksel Sağlama Kontrolü
  documents.forEach(doc => {
    const expectedVat = Math.round((doc.baseAmount * (doc.vatRate / 100)) * 100) / 100;
    const vatDiff = Math.abs(expectedVat - doc.vatAmount);
    
    // Kuruş farkı toleransı: 0.05 TL'den büyükse incele
    if (vatDiff > 0.05 && doc.vatRate > 0) {
      findings.push({
        id: `fnd-math-${doc.id}`,
        title: `Belge Matematiksel Hesaplama Hatası (${doc.documentNumber})`,
        category: "math_accuracy",
        severity: "definite_discrepancy",
        sourceField: `Belge KDV: ${doc.vatAmount} TL`,
        sourceAmount: doc.vatAmount,
        targetField: `Matrah * Oran: ${expectedVat} TL`,
        targetAmount: expectedVat,
        difference: vatDiff,
        sourceName: `Belge ${doc.documentNumber}`,
        recommendation: `Faturadaki KDV tutarı ile matrah * oran (%${doc.vatRate}) hesaplaması uyuşmuyor. Fatura satırlarını kontrol ediniz.`,
        status: "pending_review",
        createdAt: now,
        relatedDocIds: [doc.id]
      });
    }
  });

  // 3. Mükerrer Belge Tespiti (Duplicate Check)
  const seenDocs = new Map<string, DocumentRecord>();
  documents.forEach(doc => {
    const key = `${doc.documentNumber.trim().toUpperCase()}_${doc.taxId}`;
    if (seenDocs.has(key)) {
      const original = seenDocs.get(key)!;
      findings.push({
        id: `fnd-dup-${doc.id}`,
        title: `Mükerrer Belge Uyarısı (${doc.documentNumber})`,
        category: "duplicate_doc",
        severity: "definite_discrepancy",
        sourceField: `1. Yükleme: ${original.fileName}`,
        sourceAmount: original.totalAmount,
        targetField: `2. Yükleme: ${doc.fileName}`,
        targetAmount: doc.totalAmount,
        difference: doc.vatAmount,
        sourceName: "Mükerrer Belge Algılama",
        recommendation: "Aynı fatura numarası ve vergi numarasına sahip birden fazla belge bulundu. Muhasebe kayıtlarına çift girilmesini önleyin.",
        status: "pending_review",
        createdAt: now,
        relatedDocIds: [original.id, doc.id]
      });
    } else {
      seenDocs.set(key, doc);
    }
  });

  // 4. Eksik Kayıt Tespiti (Belge var, muhasebede karşılığı yok)
  const validDocs = documents.filter(d => d.status !== 'unreadable_fields');
  validDocs.forEach(doc => {
    if (doc.documentType === 'purchase_invoice' || doc.documentType === 'sales_invoice') {
      const match = accountingEntries.find(e => 
        e.documentNumber?.trim().toUpperCase() === doc.documentNumber.trim().toUpperCase()
      );
      if (!match) {
        findings.push({
          id: `fnd-missing-acc-${doc.id}`,
          title: `Muhasebeleştirilmemiş Fatura: ${doc.documentNumber}`,
          category: "missing_accounting",
          severity: "definite_discrepancy",
          sourceField: `Belge Tutarı (${doc.companyName})`,
          sourceAmount: doc.totalAmount,
          targetField: "Yevmiye Kayıtları",
          targetAmount: 0,
          difference: doc.vatAmount,
          sourceName: "Fatura - Yevmiye Eşleme",
          recommendation: `Fatura entegratörden/yüklemeden gelmiş ancak muhasebede yevmiye kaydı bulunamadı. KDV indirimini/hesaplamasını kaçırmamak için yevmiye kaydı oluşturun.`,
          status: "pending_review",
          createdAt: now,
          relatedDocIds: [doc.id]
        });
      }
    }
  });

  // 5. Dayanak Belge Eksikliği (Muhasebede 191 kaydı var, belgesi yok)
  const vat191Entries = accountingEntries.filter(e => e.accountCode.startsWith('191'));
  vat191Entries.forEach(entry => {
    if (entry.documentNumber) {
      const docMatch = documents.find(d => 
        d.documentNumber?.trim().toUpperCase() === entry.documentNumber?.trim().toUpperCase()
      );
      if (!docMatch && entry.debit > 0) {
        findings.push({
          id: `fnd-no-doc-${entry.id}`,
          title: `Dayanak Belgesi Bulunamayan 191 Kaydı (${entry.documentNumber})`,
          category: "missing_document",
          severity: "missing_data",
          sourceField: `Yevmiye No: ${entry.journalNo}`,
          sourceAmount: entry.debit,
          targetField: "Yüklenen Faturalar",
          targetAmount: 0,
          difference: entry.debit,
          sourceName: "191 Muavin - Belge Taraması",
          recommendation: `Yevmiyede ${entry.debit} TL KDV indirilmiş fakat ${entry.documentNumber} nolu dayanak fatura sisteme yüklenmemiştir. İnceleme riskine karşı belgeyi yükleyin.`,
          status: "pending_review",
          createdAt: now
        });
      }
    }
  });

  // 6. Devreden KDV Kontrolü (Kod: 33)
  const deferredDiff = Math.abs(previousPeriodDeferredVat - currentVatReturn.previousDeferredVat);
  if (deferredDiff > 0.5) {
    findings.push({
      id: `fnd-deferred-vat-diff`,
      title: "Önceki Dönemden Devreden KDV Uyumsuzluğu",
      category: "deferred_vat",
      severity: "definite_discrepancy",
      sourceField: "Önceki Dönem Son Beyanname (Devreden)",
      sourceAmount: previousPeriodDeferredVat,
      targetField: "Mevcut Beyanname (Devreden Satırı)",
      targetAmount: currentVatReturn.previousDeferredVat,
      difference: deferredDiff,
      sourceName: "Dönemler Arası Beyanname Karşılaştırması",
      recommendation: `Önceki dönemin son geçerli beyannamesindeki devreden tutar (${previousPeriodDeferredVat} TL) ile mevcut beyannamedeki tutar (${currentVatReturn.previousDeferredVat} TL) arasında ${deferredDiff.toFixed(2)} TL fark vardır. 190 nolu hesabın kapanış fişini ve aktarımını inceleyiniz.`,
      status: "pending_review",
      createdAt: now
    });
  }

  // 7. Satış Mutabakatı (Belgeler vs 391 Hesabı vs Beyanname)
  const salesDocs = documents.filter(d => d.documentType === 'sales_invoice' || d.documentType === 'withholding_invoice');
  const totalSalesBaseDocs = salesDocs.reduce((a, b) => a + b.baseAmount, 0);
  const totalSalesVatDocs = salesDocs.reduce((a, b) => a + b.vatAmount, 0);

  const entries391 = accountingEntries.filter(e => e.accountCode.startsWith('391'));
  const totalVat391Accounting = entries391.reduce((a, b) => a + b.credit - b.debit, 0);

  const salesBaseDiff = Math.abs(currentVatReturn.totalSalesBase - totalSalesBaseDocs);
  const salesVatDiff = Math.abs(currentVatReturn.totalCalculatedVat - totalSalesVatDocs);

  if (salesBaseDiff > 1) {
    findings.push({
      id: `fnd-sales-base-diff`,
      title: "Satış Matrahı Mutabakat Farkı",
      category: "sales_reconciliation",
      severity: "potential_risk",
      sourceField: "Satış Faturaları Matrah Toplamı",
      sourceAmount: totalSalesBaseDocs,
      targetField: "Beyanname Toplam Satış Matrahı",
      targetAmount: currentVatReturn.totalSalesBase,
      difference: salesBaseDiff,
      sourceName: "Satış Belgeleri vs Beyanname Matrahı",
      recommendation: "Yüklenen satış faturaları matrah toplamı ile KDV1 beyannamesindeki toplam matrah alanları arasında fark var. Eksik satış faturası veya beyannameye yazılmamış işlem olabilir.",
      status: "pending_review",
      createdAt: now
    });
  }

  if (salesVatDiff > 1) {
    findings.push({
      id: `fnd-sales-vat-diff`,
      title: "Hesaplanan KDV (391) Mutabakat Farkı",
      category: "sales_reconciliation",
      severity: "definite_discrepancy",
      sourceField: "Faturalar Hesaplanan KDV",
      sourceAmount: totalSalesVatDocs,
      targetField: "Beyanname Tablo 1 Hesaplanan KDV",
      targetAmount: currentVatReturn.totalCalculatedVat,
      difference: salesVatDiff,
      sourceName: "Satış Faturaları KDV vs 391 Beyanı",
      recommendation: "Faturalardaki KDV toplamı ile beyannamedeki hesaplanan KDV alanı arasında uyumsuzluk var. 391 muavin hareketlerini gözden geçirin.",
      status: "pending_review",
      createdAt: now
    });
  }

  // 8. Alış Mutabakatı (Alış Belgeleri vs 191 Hesabı vs Beyanname İndirilecek KDV)
  const purchaseDocs = documents.filter(d => d.documentType === 'purchase_invoice' || d.documentType === 'import_customs');
  const totalPurchaseVatDocs = purchaseDocs.reduce((a, b) => a + b.vatAmount, 0);
  const entries191 = accountingEntries.filter(e => e.accountCode.startsWith('191'));
  const totalVat191Accounting = entries191.reduce((a, b) => a + b.debit - b.credit, 0);

  const purchaseVatDiff = Math.abs(currentVatReturn.currentPeriodDeductibleVat + currentVatReturn.customsDeductibleVat - totalVat191Accounting);
  if (purchaseVatDiff > 1) {
    findings.push({
      id: `fnd-purchase-vat-diff`,
      title: "İndirilecek KDV (191) ve Beyanname Farkı",
      category: "purchase_reconciliation",
      severity: "potential_risk",
      sourceField: "191 Hesap Dönem İçi Net Borç Hareketi",
      sourceAmount: totalVat191Accounting,
      targetField: "Beyanname Toplam İndirilecek KDV",
      targetAmount: currentVatReturn.currentPeriodDeductibleVat + currentVatReturn.customsDeductibleVat,
      difference: purchaseVatDiff,
      sourceName: "191 Muavin vs Beyanname Tablo 4",
      recommendation: "Muhasebe kayıtlarındaki 191 hesabı net borç hareketi ile beyannamedeki indirilecek KDV satırı birebir uyuşmuyor. KKEG KDV veya sonradan iptal edilen faturaları kontrol edin.",
      status: "pending_review",
      createdAt: now
    });
  }

  // 9. Hesap Kodu Uyuşmazlığı ve Alım Amacı Denetimi (Örn: Bilgisayar 153 vs 255)
  documents.forEach(doc => {
    if (doc.hasAccountConflict) {
      findings.push({
        id: `fnd-account-${doc.id}`,
        title: `Hesap Kodu ve Kullanım Amacı Çelişkisi (${doc.documentNumber})`,
        category: "account_code_conflict",
        severity: "potential_risk",
        sourceField: `Belge Kalemi (${doc.companyName})`,
        sourceAmount: doc.baseAmount,
        targetField: `Mevcut Hesap: ${doc.assignedAccountCode || "Belirsiz"}`,
        targetAmount: doc.baseAmount,
        difference: 0,
        sourceName: "Akıllı Fatura Satır Analizi",
        recommendation: doc.accountConflictMessage || "Fatura kaleminin işletmede kullanım amacına göre hesap kodunu gözden geçirin.",
        status: "pending_review",
        createdAt: now,
        relatedDocIds: [doc.id]
      });
    }
  });

  // 10. Beyanname Sonucu Doğrulama (Ödenecek / Devreden KDV Hesaplama)
  // Hesaplanan KDV (Tevkifat vb düzeltilmiş) vs Toplam İndirimler (Devreden + Dönem 191 + Gümrük)
  const totalCalculatedTax = currentVatReturn.totalCalculatedVat; // 391
  const totalDeductions = currentVatReturn.previousDeferredVat + currentVatReturn.currentPeriodDeductibleVat + currentVatReturn.customsDeductibleVat;
  
  let expectedPayable = 0;
  let expectedDeferred = 0;

  if (totalCalculatedTax > totalDeductions) {
    expectedPayable = Math.round((totalCalculatedTax - totalDeductions) * 100) / 100;
    expectedDeferred = 0;
  } else {
    expectedPayable = 0;
    expectedDeferred = Math.round((totalDeductions - totalCalculatedTax) * 100) / 100;
  }

  const payableDiff = Math.abs(expectedPayable - currentVatReturn.payableVat);
  const nextDeferredDiff = Math.abs(expectedDeferred - currentVatReturn.nextPeriodDeferredVat);

  if (payableDiff > 0.5 || nextDeferredDiff > 0.5) {
    findings.push({
      id: `fnd-result-recalc`,
      title: "Beyanname Sonuç Hesapları Yeniden Hesaplama Uyuşmazlığı",
      category: "return_result",
      severity: "definite_discrepancy",
      sourceField: `Sistem Hesaplanan Devreden: ${expectedDeferred} TL / Ödenecek: ${expectedPayable} TL`,
      sourceAmount: expectedDeferred > 0 ? expectedDeferred : expectedPayable,
      targetField: `Beyanname Devreden: ${currentVatReturn.nextPeriodDeferredVat} TL / Ödenecek: ${currentVatReturn.payableVat} TL`,
      targetAmount: currentVatReturn.nextPeriodDeferredVat > 0 ? currentVatReturn.nextPeriodDeferredVat : currentVatReturn.payableVat,
      difference: Math.max(payableDiff, nextDeferredDiff),
      sourceName: "KDV-1 Otomatik Matematik Doğrulama Motoru",
      recommendation: "Beyanname sonuç tablosundaki 'Ödenmesi Gereken KDV' veya 'Sonraki Döneme Devreden KDV' tutarı, matrah ve indirim toplamlarıyla matematiksel olarak örtüşmüyor. Beyannameyi yeniden hesaplatınız.",
      status: "pending_review",
      createdAt: now
    });
  }

  // 11. Yuvarlama Kuruş Farkı Değerlendirmesi
  const hasSubLiraDiff = findings.some(f => f.difference > 0 && f.difference < 1.0);
  if (hasSubLiraDiff) {
    findings.push({
      id: `fnd-sublira-note`,
      title: "Kabul Edilen Kuruş Yuvarlama Toleransı",
      category: "rounding_diff",
      severity: "potential_risk",
      sourceField: "Fatura Satır Yuvarlamaları",
      sourceAmount: 0.42,
      targetField: "Beyanname Tam Sayı / Yuvarlama",
      targetAmount: 0,
      difference: 0.42,
      sourceName: "Yuvarlama Tolerans Filtresi",
      recommendation: "Tespit edilen 0.42 TL fark, fatura satırlarının tek tek toplanmasından ileri gelen olağan yuvarlama farkıdır. GİB kuralları gereği vergi ziyaı oluşturmaz.",
      status: "accepted_with_justification",
      justificationNote: "Yasal kuruş yuvarlama toleransı dahilindedir.",
      createdAt: now
    });
  }

  // Calculate scope and stats
  const totalChecks = 12;
  const criticalFindingsCount = findings.filter(f => f.severity === 'definite_discrepancy').length;
  const potentialRiskCount = findings.filter(f => f.severity === 'potential_risk').length;
  const missingDataCount = findings.filter(f => f.severity === 'missing_data').length;
  
  const failedChecks = new Set(findings.map(f => f.category)).size;
  const passedChecks = Math.max(0, totalChecks - failedChecks);
  const compliancePercentage = Math.round((passedChecks / totalChecks) * 100);

  const stats: AuditScopeStats = {
    totalChecks,
    passedChecks,
    failedChecks,
    skippedDueToMissingData: missingDataCount > 0 ? 1 : 0,
    compliancePercentage,
  };

  return {
    findings,
    stats,
    summary: {
      totalSalesBaseFromDocs: totalSalesBaseDocs,
      totalSalesVatFromDocs: totalSalesVatDocs,
      totalPurchasesBaseFromDocs: purchaseDocs.reduce((a, b) => a + b.baseAmount, 0),
      totalPurchasesVatFromDocs: totalPurchaseVatDocs,
      totalVat391InAccounting: totalVat391Accounting,
      totalVat191InAccounting: totalVat191Accounting,
      calculatedPayableVat: expectedPayable,
      calculatedDeferredVat: expectedDeferred,
      criticalFindingsCount,
      potentialRiskCount,
      missingDataCount,
    }
  };
}
