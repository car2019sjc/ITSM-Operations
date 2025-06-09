interface Environment {
  isProduction: boolean;
  isDevelopment: boolean;
  appTitle: string;
}

const environment: Environment = {
  isProduction: import.meta.env.VITE_APP_ENV === 'production',
  isDevelopment: import.meta.env.VITE_APP_ENV === 'development',
  appTitle: import.meta.env.VITE_APP_TITLE as string
};

export default environment;