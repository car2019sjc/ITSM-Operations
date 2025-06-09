import { Router, Route, RootRoute } from '@tanstack/react-router';
import App from './App';
import { KnowledgeBase } from './apps/knowledge-base/KnowledgeBase';
import { RequestDashboard } from './apps/request-dashboard/RequestDashboard';
import { RootLayout } from './components/RootLayout';

const rootRoute = new RootRoute({
  component: RootLayout,
});

const indexRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/',
  component: App,
});

const knowledgeBaseRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/knowledge-base',
  component: KnowledgeBase,
});

const requestDashboardRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/requests',
  component: RequestDashboard,
});

const routeTree = rootRoute.addChildren([indexRoute, knowledgeBaseRoute, requestDashboardRoute]);

export const router = new Router({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}