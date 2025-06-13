import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, X } from 'lucide-react';
import { Incident } from '../types/incident';
import { normalizePriority, getIncidentState } from '../utils/incidentUtils';
import OpenAI from 'openai';

interface ChatBotProps {
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

export function ChatBot({ incidents, onClose }: ChatBotProps) {
  const [messages, setMessages] = useState<Message[]>([{
    role: 'assistant',
    content: 'Olá! Sou o assistente de análise de incidentes. Como posso ajudar você hoje? Você pode me perguntar sobre tendências, estatísticas ou detalhes específicos dos incidentes carregados.'
  }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // Prepare incident statistics
      const stats = {
        total: incidents.length,
        byPriority: incidents.reduce((acc, incident) => {
          const priority = normalizePriority(incident.Priority);
          acc[priority] = (acc[priority] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        byState: incidents.reduce((acc, incident) => {
          const state = getIncidentState(incident.State);
          acc[state] = (acc[state] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        byCategory: incidents.reduce((acc, incident) => {
          const category = incident.Category || 'Não categorizado';
          acc[category] = (acc[category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      };

      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: `Você é um assistente especializado em análise de incidentes de TI. 
            Aqui estão as estatísticas dos incidentes:
            ${JSON.stringify(stats, null, 2)}
            
            Responda de forma clara e profissional, focando em insights relevantes.
            Use os dados fornecidos para embasar suas respostas.
            Seja conciso mas informativo.`
          },
          ...messages.map(m => ({ role: m.role, content: m.content })),
          { role: "user", content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 500
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
    }
  };

  return (
    <div className="bg-[#151B2B] rounded-lg shadow-xl flex flex-col h-[600px]">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="h-6 w-6 text-indigo-400" />
          <h2 className="text-lg font-medium text-white">Assistente IA</h2>
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
              message.role === 'assistant' ? 'bg-indigo-500/10' : 'bg-[#1C2333]'
            }`}>
              {message.role === 'assistant' ? (
                <Bot className="h-5 w-5 text-indigo-400" />
              ) : (
                <User className="h-5 w-5 text-gray-400" />
              )}
            </div>
            <div
              className={`flex-1 p-4 rounded-lg ${
                message.role === 'assistant' 
                  ? 'bg-[#1C2333] text-gray-300' 
                  : 'bg-indigo-600 text-white'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10">
              <Bot className="h-5 w-5 text-indigo-400" />
            </div>
            <div className="flex-1 p-4 rounded-lg bg-[#1C2333]">
              <Loader2 className="h-5 w-5 text-indigo-400 animate-spin" />
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
            placeholder="Digite sua pergunta..."
            className="flex-1 bg-[#1C2333] border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  );
}