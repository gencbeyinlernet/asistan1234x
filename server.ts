import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Lazy Gemini AI client
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY || "";
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", app: "Novarge-smm Asistan", timestamp: new Date().toISOString() });
});

// AI Discrepancy explanation & plain Turkish tax advisor response
app.post("/api/ai/explain-discrepancy", async (req, res) => {
  try {
    const { finding, details, previousMonth, currentMonth, invoices } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        success: true,
        source: "fallback",
        explanation: `Sistem tespiti: "${finding?.title || "KDV Mutabakat Farkı"}". Kaynak tutar: ${finding?.sourceAmount || 0} TL, Karşılaştırılan tutar: ${finding?.targetAmount || 0} TL. Fark: ${finding?.diff || 0} TL. İlgili kayıtları ve muhasebe kapanış fişlerini kontrol ediniz.`
      });
    }

    const ai = getAI();
    const prompt = `Sen uzman bir Türk Serbest Muhasebeci Mali Müşavir (SMMM) ve Yeminli Mali Müşavir (YMM) KDV denetim uzmanısın.
Adın: Novarge-smm Asistan.
Aşağıdaki KDV beyannamesi ve muhasebe denetim bulgusunu incele ve muhasebeciye doğrudan, sade ve mesleki Türkçeyle açıkla:

Bulgu Başlığı: ${finding?.title || "KDV Farkı"}
Bulgu Türü: ${finding?.type || "Mutabakat"}
Kaynak Alan ve Tutar: ${finding?.sourceField || "Kaynak"} - ${finding?.sourceAmount || 0} TL
Karşılaştırılan Alan ve Tutar: ${finding?.targetField || "Hedef"} - ${finding?.targetAmount || 0} TL
Fark: ${finding?.diff || 0} TL
Önceki Dönem Verileri: ${JSON.stringify(previousMonth || {})}
Cari Dönem Verileri: ${JSON.stringify(currentMonth || {})}
İlgili Olası Faturalar/Kayıtlar: ${JSON.stringify(invoices?.slice(0, 5) || [])}
Ek Not: ${details || ""}

Yanıtında şunlara yer ver:
1. Bu farkın mevzuattaki ve fiili muhasebe sürecindeki kök nedeni nedir? (Hangi fatura/yevmiye maddesinden kaynaklanmış olabilir?)
2. Muhasebecinin hemen atması gereken 2-3 somut düzeltme/kontrol adımı.
3. KDV1 beyannamesine yansıtılırken dikkat edilecek GİB kuralı (Örn: 191/391 kapanış fişi, devreden KDV 33 nolu satır vb.).
Kısa, net ve maddeler halinde yaz.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
    });

    res.json({
      success: true,
      source: "gemini",
      explanation: response.text || "Açıklama üretilemedi.",
    });
  } catch (error: any) {
    console.error("Gemini explain error:", error);
    res.status(500).json({ error: error.message || "Açıklama alınamadı" });
  }
});

// AI Account Classification (Örn: Bilgisayar 153 mü 255 mi?)
app.post("/api/ai/classify-account", async (req, res) => {
  try {
    const { itemName, supplier, amount, vatRate, currentAccount } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        success: true,
        recommendedAccount: itemName?.toLowerCase().includes("bilgisayar") || itemName?.toLowerCase().includes("laptop") ? "255" : "153",
        warning: "Fatura içeriğindeki ürünün alım amacı kontrol edilmelidir.",
        reason: "İşletmede kullanılmak üzere alındıysa 255 Demirbaşlar, satılmak üzere alındıysa 153 Ticari Mallar seçilmelidir."
      });
    }

    const ai = getAI();
    const prompt = `Bir muhasebe denetim asistanı olarak, aşağıdaki fatura satırını analiz et:
Tedarikçi: ${supplier}
Ürün/Hizmet Açıklaması: ${itemName}
Tutar: ${amount} TL (KDV %${vatRate})
Sistemin Mevcut Eşleştirdiği Hesap: ${currentAccount}

Görev:
1. Bu işlem ticari mal (153), demirbaş (255), genel yönetim gideri (770), pazarlama gideri (760) veya direkt gider (740) hesaplarından hangisine kaydedilmeli?
2. Alışın amacına (satış için mi yoksa işletmede kullanım için mi?) göre risk veya olası yanlış eşleştirme var mı?
3. SMMM'ye net bir uyarı ve öneri cümlesi yaz.

JSON formatında yanıt ver:
{
  "recommendedAccount": "153 veya 255 veya 770 vb",
  "accountName": "Hesap Adı",
  "hasRisk": boolean,
  "warning": "Kısa net uyarı mesajı",
  "reason": "Detaylı mesleki gerekçe"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json({ success: true, ...parsed });
  } catch (error: any) {
    console.error("Gemini classify error:", error);
    res.status(500).json({ error: error.message || "Sınıflandırma hatası" });
  }
});

// AI Interactive SMMM Chat (Farkı sorgulama, "Bu fark hangi faturalardan?", mevzuat soru-cevap)
app.post("/api/ai/chat", async (req, res) => {
  try {
    const { message, context } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        reply: `Novarge-smm Asistan Çevrimdışı Mod: Sorunuzu aldım ("${message}"). Mevcut denetim verilerine göre ${context?.companyName || "işletme"} için toplam ${context?.totalDiscrepancy || "0"} TL mutabakat farkı ve ${context?.pendingItems || "0"} adet inceleme bekleyen fatura bulunmaktadır. Belge detaylarını ilgili sekmeden inceleyebilirsiniz.`
      });
    }

    const ai = getAI();
    const systemPrompt = `Sen "Novarge-smm Asistan" adlı yapay zekâ muhasebe ve KDV beyanname denetim danışmanısın.
Kullanıcı bir Serbest Muhasebeci Mali Müşavir (SMMM) veya muhasebe sorumlusudur.
Mevcut Şirket ve Dönem Bağlamı:
- Firma: ${context?.companyName || "ABC Teknoloji Ltd. Şti."}
- Dönem: ${context?.period || "2026/08"}
- Yüklenen Belge Sayısı: ${context?.docCount || 0}
- Satış Matrahı: ${context?.salesBase || 0} TL
- Hesaplanan KDV (391): ${context?.calculatedVat || 0} TL
- İndirilecek KDV (191): ${context?.deductibleVat || 0} TL
- Önceki Dönem Devreden KDV: ${context?.prevDeferredVat || 0} TL
- Tespit Edilen Farklar Listesi: ${JSON.stringify(context?.findings || [])}
- Örnek Faturalar: ${JSON.stringify(context?.sampleInvoices || [])}

Kullanıcı sana soru sorduğunda:
- Eğer "bu fark hangi faturalardan kaynaklanıyor?" diye sorarsa, bağlamdaki faturayı veya mükerrer/kayıtsız faturaları tek tek belge no, firma ve tutarla işaret et.
- Yanıtlarını doğrudan, profesyonel, samimi fakat saygılı bir SMMM meslektaşı üslubuyla Türkçe olarak ver.
- Asla uydurma mevzuat söyleme, Türkiye Vergi Usul Kanunu ve Katma Değer Vergisi Kanunu kurallarına tam sadık kal.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: message,
      config: {
        systemInstruction: systemPrompt,
      },
    });

    res.json({ reply: response.text || "Yanıt oluşturulamadı." });
  } catch (error: any) {
    console.error("Gemini chat error:", error);
    res.status(500).json({ error: error.message || "Sohbet yanıtı alınamadı" });
  }
});

// Vite middleware for dev or static files for production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Novarge-smm Asistan Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
