import React, { useState } from 'react';
import { X, Send, Bot, Sparkles, User, HelpCircle, FileText, CheckCircle2, Loader2 } from 'lucide-react';
import { AuditFinding, DocumentRecord, VatReturnForm } from '../types';

interface AiAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  findings: AuditFinding[];
  documents: DocumentRecord[];
  currentVatReturn: VatReturnForm;
  selectedCompany: string;
  selectedPeriod: string;
  onSelectFinding?: (finding: AuditFinding) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  relatedDocNo?: string;
}

export const AiAssistantDrawer: React.FC<AiAssistantDrawerProps> = ({
  isOpen,
  onClose,
  findings,
  documents,
  currentVatReturn,
  selectedCompany,
  selectedPeriod,
  onSelectFinding,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-init',
      sender: 'assistant',
      text: `Merhaba Sayın Meslektaşım. Ben Novarge-smm Asistan yapay zekâ danışmanınız. ${selectedCompany} firmasının ${selectedPeriod} dönemi denetimini tamamladım. Devreden KDV, mükerrer faturalar, tevkifat veya hesap kodu uyumsuzlukları hakkında ne öğrenmek istersiniz?`,
      timestamp: 'Şimdi',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const quickPrompts = [
    "Bu 2.500 TL devreden KDV farkı nereden kaynaklanıyor?",
    "Apple MacBook faturasını 153'ten 255'e alırsam ne değişir?",
    "Bu fark hangi faturalardan oluşuyor?",
    "İndirilecek KDV (191) ile beyanname neden uyuşmuyor?",
    "Tevkifatlı satışın KDV-2 onay durumu nedir?"
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          context: {
            companyName: selectedCompany,
            period: selectedPeriod,
            docCount: documents.length,
            salesBase: currentVatReturn.totalSalesBase,
            calculatedVat: currentVatReturn.totalCalculatedVat,
            deductibleVat: currentVatReturn.currentPeriodDeductibleVat,
            prevDeferredVat: currentVatReturn.previousDeferredVat,
            totalDiscrepancy: findings.reduce((a, b) => a + b.difference, 0),
            pendingItems: findings.filter(f => f.status === 'pending_review').length,
            findings: findings.map(f => ({
              title: f.title,
              diff: f.difference,
              source: f.sourceField,
              target: f.targetField,
              recommendation: f.recommendation,
            })),
            sampleInvoices: documents.slice(0, 8).map(d => ({
              docNo: d.documentNumber,
              company: d.companyName,
              amount: d.totalAmount,
              vat: d.vatAmount,
              assignedAccount: d.assignedAccountCode,
              conflict: d.hasAccountConflict,
            })),
          },
        }),
      });

      const data = await response.json();
      const assistantMsg: ChatMessage = {
        id: `ast-${Date.now()}`,
        sender: 'assistant',
        text: data.reply || "Yanıt alınamadı.",
        timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error) {
      console.error(error);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: "Yapay zekâ servisine bağlanırken bir aksaklık oluştu. Lütfen bağlantınızı kontrol ediniz.",
        timestamp: 'Şimdi',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col text-slate-100 animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-800/80">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-teal-500 to-emerald-500 flex items-center justify-center text-white shadow-sm shadow-teal-900/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-slate-100 flex items-center space-x-1.5">
              <span>SMMM Yapay Zekâ Asistanı</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                Gemini 3.8
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">Belge ve fark kaynak analizi</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs scrollbar-thin">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start space-x-2.5 ${
              msg.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
            }`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                msg.sender === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-emerald-600/30 border border-emerald-500/40 text-emerald-300'
              }`}
            >
              {msg.sender === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
            </div>

            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 shadow-xs ${
                msg.sender === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-none'
                  : 'bg-slate-800/90 text-slate-200 border border-slate-700/60 rounded-tl-none leading-relaxed whitespace-pre-line'
              }`}
            >
              <p>{msg.text}</p>
              <span
                className={`block text-[10px] mt-1 text-right ${
                  msg.sender === 'user' ? 'text-blue-200' : 'text-slate-500'
                }`}
              >
                {msg.timestamp}
              </span>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center space-x-2.5 text-xs text-slate-400 p-2">
            <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
            <span>Mevzuat ve fatura verileri taranıyor...</span>
          </div>
        )}
      </div>

      {/* Quick Prompts */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-900/60">
        <span className="text-[10px] text-slate-400 font-medium block mb-1.5 flex items-center space-x-1">
          <HelpCircle className="w-3 h-3 text-teal-400" />
          <span>Sık Sorulan Denetim Soruları:</span>
        </span>
        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto scrollbar-none">
          {quickPrompts.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(q)}
              className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2.5 py-1 rounded-full border border-slate-700/80 transition text-left truncate max-w-full"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="p-3 border-t border-slate-800 bg-slate-900">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center space-x-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="KDV farkı veya hesap kodu hakkında soru yazın..."
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 transition"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white p-2.5 rounded-xl transition shadow-md shadow-emerald-900/30"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
