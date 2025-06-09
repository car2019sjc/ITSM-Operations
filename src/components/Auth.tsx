import React, { useState, useEffect } from 'react';

interface AuthProps {
  onAuthSuccess: () => void;
}

const USERNAME_STORAGE_KEY = 'remembered_username';
const AUTH_STORAGE_KEY = 'app_auth_state';

// Credenciais fixas para garantir consistência
const VALID_USERNAME = 'OnSet-ITSM';
const VALID_PASSWORD = 'Up2025It';

export function Auth({ onAuthSuccess }: AuthProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // Verificar se existe um nome de usuário salvo
  useEffect(() => {
    const savedUsername = localStorage.getItem(USERNAME_STORAGE_KEY);
    if (savedUsername) {
      setUsername(savedUsername);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (username === VALID_USERNAME && password === VALID_PASSWORD) {
      // Salvar o nome de usuário se "Lembrar-me" estiver marcado
      if (rememberMe) {
        localStorage.setItem(USERNAME_STORAGE_KEY, username);
      } else {
        localStorage.removeItem(USERNAME_STORAGE_KEY);
      }
      onAuthSuccess();
    } else {
      setError('Credenciais inválidas');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1A1B26]">
      <div className="w-[400px] space-y-6 bg-[#1F2937] p-8 rounded-lg shadow-xl">
        <div className="flex flex-col items-center space-y-4">
          <div className="flex items-center space-x-2">
            <span className="text-[#4F9BFF] text-2xl">⚡</span>
            <h1 className="text-2xl font-semibold">
              <span className="text-[#1E3A8A] font-bold">On</span>
              <span className="text-orange-500 font-bold">Set</span>
            </h1>
          </div>
          <p className="text-orange-500 text-sm">
            Conectando Inteligência e Tecnologia
          </p>
          <h2 className="text-white text-2xl font-bold mt-2">
            IT Operations Dashboard
          </h2>
          <p className="text-gray-400 text-sm text-center">
            Sistema integrado para monitoramento e análise de incidentes e requisições de TI. Visualize métricas, tendências e indicadores-chave de performance.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div>
              <label className="text-gray-300 text-sm">Usuário</label>
              <div className="mt-1 relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                  👤
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-[#374151] border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Digite seu nome de usuário"
                />
              </div>
            </div>

            <div>
              <label className="text-gray-300 text-sm">Senha</label>
              <div className="mt-1 relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                  🔒
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-[#374151] border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Digite sua senha"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center bg-red-500/10 py-2 rounded-md">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-blue-500 focus:ring-blue-500 border-gray-600 rounded"
              />
              <label className="ml-2 text-sm text-gray-300">
                Lembrar-me
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition duration-200 ease-in-out"
          >
            Entrar
          </button>
        </form>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            © 2025 OnSet Tecnologia. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}