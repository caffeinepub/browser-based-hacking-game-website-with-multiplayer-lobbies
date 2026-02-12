import { createRouter, createRoute, createRootRoute, RouterProvider, Outlet } from '@tanstack/react-router';
import { ThemeProvider } from 'next-themes';
import AppLayout from './components/layout/AppLayout';
import HomePage from './pages/HomePage';
import SoloGamePage from './pages/SoloGamePage';
import LobbyPage from './pages/LobbyPage';
import MatchPage from './pages/MatchPage';
import ResultsPage from './pages/ResultsPage';
import LeaderboardPage from './pages/LeaderboardPage';
import UpdatesPage from './pages/UpdatesPage';

const rootRoute = createRootRoute({
  component: () => (
    <AppLayout>
      <Outlet />
    </AppLayout>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
});

const soloRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/solo',
  component: SoloGamePage,
});

const lobbyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/lobby/$lobbyId',
  component: LobbyPage,
});

const matchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/match/$lobbyId',
  component: MatchPage,
});

const resultsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/results',
  component: ResultsPage,
});

const leaderboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/leaderboard',
  component: LeaderboardPage,
});

const updatesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/updates',
  component: UpdatesPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  soloRoute,
  lobbyRoute,
  matchRoute,
  resultsRoute,
  leaderboardRoute,
  updatesRoute,
]);

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}
