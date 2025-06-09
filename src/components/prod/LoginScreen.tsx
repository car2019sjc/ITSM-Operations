import React, { useState } from 'react';
import { User, Lock } from 'lucide-react';

const AUTH_KEY = 'app_auth_state';

export function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');

  const validUsername = import.meta.env.VITE_AUTH_USERNAME;
  const validPassword = import.meta.env.VITE_AUTH_PASSWORD;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[LOGIN] Usuário digitado:', username);
    console.log('[LOGIN] Senha digitada:', password);
    console.log('[LOGIN] Usuário esperado:', validUsername);
    console.log('[LOGIN] Senha esperada:', validPassword);
    if (username === validUsername && password === validPassword) {
      if (rememberMe) {
        localStorage.setItem(AUTH_KEY, 'true');
      }
      setError('');
      console.log('[LOGIN] Login bem-sucedido!');
      onLogin();
    } else {
      setError('Credenciais inválidas');
      console.log('[LOGIN] Falha no login: credenciais inválidas');
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1120] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-[#151B2B] rounded-lg shadow-xl p-8 flex flex-col items-center">
          <div className="flex flex-col items-center mb-2">
            <span className="text-3xl mb-1" style={{lineHeight: 1}}>⚡</span>
            <span className="text-2xl font-bold">
              <span className="text-[#1e40af]">On</span><span className="text-orange-500">Set</span>
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white text-center mb-1">Painel de Operações de TI</h1>
          <p className="text-orange-500 text-center text-sm mb-1">Conectando Inteligência e Tecnologia</p>
          <p className="text-gray-300 text-center text-sm mb-6">
            Plataforma com IA nativa para monitorar e analisar incidentes de TI em tempo real, gerar dashboards interativos, identificar padrões automaticamente e realizar análises de causa-raiz acionáveis.
          </p>
          <form onSubmit={handleSubmit} className="w-full space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-500 text-center mb-2">{error}</div>
            )}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-400 mb-1">Usuário</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[#0B1120] border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Digite seu nome de usuário"
                  autoComplete="username"
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-400 mb-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[#0B1120] border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Digite sua senha"
                  autoComplete="current-password"
                />
              </div>
            </div>
            <div className="flex items-center mb-2">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-300">Lembrar-me</label>
            </div>
            <button
              type="submit"
              className="w-full bg-blue-700 hover:bg-blue-800 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Entrar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}