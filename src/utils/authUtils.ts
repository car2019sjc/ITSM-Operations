const USERNAME_STORAGE_KEY = 'remembered_username';
const SESSION_STORAGE_KEY = 'user_session';

export const clearSession = () => {
  localStorage.removeItem(SESSION_STORAGE_KEY);
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
};

export const isAuthenticated = () => {
  return (
    localStorage.getItem(SESSION_STORAGE_KEY) ||
    sessionStorage.getItem(SESSION_STORAGE_KEY)
  );
};

export const logout = () => {
  const rememberUsername = localStorage.getItem(USERNAME_STORAGE_KEY);
  
  // Limpa todas as informações de sessão
  localStorage.clear();
  sessionStorage.clear();
  
  // Se "Lembrar-me" estava ativo, mantém apenas o nome de usuário
  if (rememberUsername) {
    localStorage.setItem(USERNAME_STORAGE_KEY, rememberUsername);
  }
  
  // Recarrega a página para limpar o estado da aplicação
  window.location.reload();
}; 