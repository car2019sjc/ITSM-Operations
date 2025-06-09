import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, X, Search, AlertTriangle, CheckCircle2, Clock, FileText } from 'lucide-react';
import { Incident } from '../types/incident';
import OpenAI from 'openai';

interface RCAChatProps {
  incidents: Incident[];
  onClose?: () => void;
}

interface Message {
  role: 'assistant' | 'user';
  content: string;
}

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

export function RCAChat({ incidents, onClose }: RCAChatProps) {
  const [messages, setMessages] = useState<Message[]>([{
    role: 'assistant',
    content: 'Olá! Sou o especialista em Análise de Causa Raiz (RCA). Descreva o problema que você está enfrentando ou forneça o número de um incidente para que eu possa ajudar a identificar as causas principais e recomendar soluções.'
  }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const results = incidents.filter(incident => {
      const searchFields = [
        incident.Number?.toLowerCase() || '',
        incident.ShortDescription?.toLowerCase() || '',
        incident.Category?.toLowerCase() || '',
        incident.Subcategory?.toLowerCase() || '',
        incident.AssignmentGroup?.toLowerCase() || ''
      ];

      return searchFields.some(field => field.includes(query));
    });

    setSearchResults(results.slice(0, 5)); // Limit to 5 results
  };

  useEffect(() => {
    handleSearch();
  }, [searchQuery]);

  const handleIncidentSelect = (incident: Incident) => {
    setSelectedIncident(incident);
    setSearchQuery('');
    setSearchResults([]);
    
    // Automatically add a message about the selected incident
    setInput(`Analise a causa raiz do incidente ${incident.Number}: ${incident.ShortDescription}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // Prepare context from selected incident or general incidents data
      let context = '';
      if (selectedIncident) {
        context = `
          Informações do incidente:
          Número: ${selectedIncident.Number}
          Descrição: ${selectedIncident.ShortDescription}
          Categoria: ${selectedIncident.Category || 'Não especificada'}
          Subcategoria: ${selectedIncident.Subcategory || 'Não especificada'}
          Prioridade: ${selectedIncident.Priority || 'Não especificada'}
          Estado: ${selectedIncident.State || 'Não especificado'}
          Grupo: ${selectedIncident.AssignmentGroup || 'Não especificado'}
          Usuário: ${selectedIncident.Caller || 'Não especificado'}
          Comentários: ${selectedIncident.CommentsAndWorkNotes || 'Não disponíveis'}
        `;
      } else {
        // Provide general statistics about incidents
        const categories = Array.from(new Set(incidents.map(i => i.Category))).filter(Boolean);
        const subcategories = Array.from(new Set(incidents.map(i => i.Subcategory))).filter(Boolean);
        
        context = `
          Estatísticas gerais:
          Total de incidentes: ${incidents.length}
          Categorias principais: ${categories.slice(0, 5).join(', ')}
          Subcategorias principais: ${subcategories.slice(0, 5).join(', ')}
        `;
      }

      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: `Você é um especialista em Análise de Causa Raiz (RCA). Seu papel é analisar problemas reais descritos na base de dados de chamados, especificamente usando os seguintes campos:

Shortdescription (descrição curta exata do incidente)

Assignment group (localidade ou grupo de suporte específico onde o problema ocorre com maior frequência)

Você não deve criar cenários hipotéticos nem pedir informações adicionais. Utilize apenas as informações fornecidas.

Sua resposta deve seguir exatamente este formato direto e objetivo:

Problema identificado: (problema exato descrito em Shortdescription)

Localidade mais afetada: (Assignment group)

Causas Prováveis (máximo 3): (causas específicas e diretamente relacionadas à descrição e localidade)

Recomendações Imediatas: (ações práticas e imediatas para resolver o problema, considerando a localidade)

Estratégias Preventivas: (ações específicas para evitar recorrências desse tipo de problema na localidade indicada)

Contexto sobre os incidentes:
${context}`
          },
          ...messages.map(m => ({ role: m.role, content: m.content })),
          { role: "user", content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });

      const response = completion.choices[0]?.message?.content || 'Desculpe, não consegui processar sua pergunta.';
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro ao processar sua pergunta. Por favor, tente novamente.'
      }]);
    } finally {
      setIsLoading(false);
      setSelectedIncident(null);
    }
  };

  return (
    <div className="bg-[#151B2B] rounded-lg shadow-xl flex flex-col h-[600px]">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="h-6 w-6 text-green-400" />
          <h2 className="text-lg font-medium text-white">Análise de Causa Raiz (RCA)</h2>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#1C2333] rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-400 hover:text-white" />
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="p-4 border-b border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar incidente por número ou descrição..."
            className="w-full pl-10 pr-4 py-2 bg-[#0B1120] border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          {searchResults.length > 0 && (
            <div className="absolute z-10 mt-2 w-full bg-[#1C2333] rounded-lg shadow-xl border border-gray-700 max-h-[300px] overflow-y-auto">
              {searchResults.map(incident => (
                <button
                  key={incident.Number}
                  className="w-full p-3 hover:bg-[#151B2B] text-left border-b border-gray-700 last:border-0"
                  onClick={() => handleIncidentSelect(incident)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">{incident.Number}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      incident.State?.toLowerCase().includes('closed') ? 'bg-green-500/20 text-green-400' :
                      incident.State?.toLowerCase().includes('progress') ? 'bg-blue-500/20 text-blue-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {incident.State}
                    </span>
                  </div>
                  <p className="text-gray-300 mt-1 text-sm">{incident.ShortDescription}</p>
                </button>
              ))}
            </div>
          )}
        </div>
        {selectedIncident && (
          <div className="mt-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-green-400" />
                <span className="text-green-400 font-medium">Incidente selecionado: {selectedIncident.Number}</span>
              </div>
              <button
                onClick={() => setSelectedIncident(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-gray-300 mt-1 text-sm">{selectedIncident.ShortDescription}</p>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex items-start gap-3 ${
              message.role === 'assistant' ? 'text-left' : 'flex-row-reverse'
            }`}
          >
            <div className={`p-2 rounded-lg ${
              message.role === 'assistant' ? 'bg-green-500/10' : 'bg-[#1C2333]'
            }`}>
              {message.role === 'assistant' ? (
                <Bot className="h-5 w-5 text-green-400" />
              ) : (
                <User className="h-5 w-5 text-gray-400" />
              )}
            </div>
            <div
              className={`flex-1 p-4 rounded-lg ${
                message.role === 'assistant' 
                  ? 'bg-[#1C2333] text-gray-300' 
                  : 'bg-green-600 text-white'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Bot className="h-5 w-5 text-green-400" />
            </div>
            <div className="flex-1 p-4 rounded-lg bg-[#1C2333]">
              <Loader2 className="h-5 w-5 text-green-400 animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Descreva o problema ou forneça detalhes para análise..."
            className="flex-1 bg-[#1C2333] border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  );
}