# ITSM Operations Dashboard

## 🚀 Visão Geral

Dashboard avançado para monitoramento e análise de operações de TI (ITSM - IT Service Management). Sistema desenvolvido pela **OnSet Tecnologia** com foco em **Sustentação de TI**.

### ✨ Principais Funcionalidades

- **Dashboard de Incidentes**: Análise completa de incidentes com métricas em tempo real
- **Dashboard de Requests**: Gerenciamento e análise de solicitações de serviço
- **Dashboard Executivo**: Indicadores estratégicos e visão gerencial
- **Análises por IA**: Análise inteligente de dados com OpenAI
- **SLA Tracking**: Monitoramento de acordos de nível de serviço
- **Relatórios Avançados**: Múltiplas modalidades de análise e relatórios

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Gráficos**: Recharts
- **Estilização**: Tailwind CSS
- **Ícones**: Lucide React
- **Datas**: date-fns
- **IA**: OpenAI API Integration

## 📦 Instalação

### Pré-requisitos
- Node.js 18+
- npm ou yarn

### Passos

1. Clone o repositório:
```bash
git clone https://github.com/car2019sjc/ITSM-Operations.git
cd ITSM-Operations
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
# Copie o arquivo de exemplo
cp .env.example .env

# Configure suas variáveis no arquivo .env
VITE_APP_ENV=development
VITE_APP_TITLE="ITSM - Sustentação de TI"
```

4. Execute o projeto:
```bash
# Desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview da build
npm run preview
```

## 🎯 Funcionalidades Detalhadas

### Dashboard Principal (Incidentes)
- ✅ Métricas em tempo real
- ✅ Análise por prioridade (P1, P2, P3, P4)
- ✅ Monitoramento de SLA
- ✅ Análise por categoria e localização
- ✅ Histórico e tendências
- ✅ Alertas de incidentes críticos

### Dashboard de Requests
- ✅ Análise de solicitações de serviço
- ✅ Métricas de performance
- ✅ Tendências mensais e quinzenais
- ✅ Análise por usuário e localização
- ✅ Taxa de conclusão e SLA

### Dashboard Executivo
- ✅ Indicadores estratégicos
- ✅ Comparativo de volumes
- ✅ Análise de localidades
- ✅ Variações mensais
- ✅ Relatórios gerenciais

### Análises Avançadas
- ✅ **IA Integrada**: Análise automática de padrões
- ✅ **Análise de Strings**: Identificação de problemas recorrentes
- ✅ **Análise Preditiva**: Previsões baseadas em histórico
- ✅ **Análise de Causa Raiz**: Identificação de causas principais

## ⚙️ Configurações de SLA

### Incidentes (em horas)
- **P1 (Crítico)**: 1 hora
- **P2 (Alto)**: 4 horas
- **P3 (Médio)**: 12 horas
- **P4 (Baixo)**: 24 horas

### Requests (em dias)
- **Alta Prioridade**: 3 dias
- **Média Prioridade**: 6 dias
- **Baixa Prioridade**: 7 dias

## 🎨 Interface

- **Design Responsivo**: Adaptável para desktop, tablet e mobile
- **Tema Escuro**: Interface moderna e profissional
- **Gráficos Interativos**: Visualizações dinâmicas com Recharts
- **Componentes Reutilizáveis**: Arquitetura modular

## 📊 Tipos de Análise

1. **Análise por Categoria**: Software, Hardware, Rede, etc.
2. **Análise por Localização**: Distribuição geográfica
3. **Análise por Usuário**: Top usuários e analistas
4. **Análise Temporal**: Tendências e sazonalidade
5. **Análise de SLA**: Compliance e performance
6. **Análise Preditiva**: Previsões e alertas

## 🔐 Autenticação

Sistema de autenticação integrado com diferentes níveis de acesso:
- **Usuário**: Visualização de dashboards
- **Analista**: Acesso a análises detalhadas
- **Gestor**: Dashboards executivos e relatórios

## 🚀 Deploy

### Desenvolvimento
```bash
npm run dev
```

### Produção
```bash
npm run build
npm run preview
```

### Docker (Opcional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 4173
CMD ["npm", "run", "preview"]
```

## 📝 Estrutura do Projeto

```
src/
├── components/          # Componentes React
│   ├── dashboards/     # Dashboards principais
│   ├── modals/         # Modais e overlays
│   ├── charts/         # Componentes de gráficos
│   └── ui/            # Componentes de UI
├── types/              # Definições TypeScript
├── utils/              # Utilitários e helpers
├── services/           # Serviços e APIs
├── config/             # Configurações
└── constants.ts        # Constantes do sistema
```

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto é propriedade da **OnSet Tecnologia**. Todos os direitos reservados.

## 📞 Suporte

Para suporte e dúvidas, entre em contato com a equipe de desenvolvimento da OnSet Tecnologia.

---

**© 2025 OnSet Tecnologia. Todos os direitos reservados.**

*Conectando Inteligência e Tecnologia*