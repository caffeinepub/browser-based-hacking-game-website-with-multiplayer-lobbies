import { ReactNode } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Terminal, Trophy, Home, GitBranch } from 'lucide-react';
import LoginButton from '../auth/LoginButton';
import ProfileSetupModal from '../auth/ProfileSetupModal';
import { APP_VERSION } from '../../constants/appVersion';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background crt-effect scanline">
      <ProfileSetupModal />
      
      <header className="border-b-2 border-primary/30 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate({ to: '/' })}
              className="flex items-center gap-3 group"
            >
              <Terminal className="w-8 h-8 text-primary terminal-glow" />
              <div className="text-left">
                <h1 className="text-2xl font-bold text-primary terminal-glow terminal-text">
                  HACK_MANIA
                </h1>
                <p className="text-xs text-muted-foreground terminal-text">
                  [SIMULATION MODE]
                </p>
              </div>
            </button>

            <nav className="hidden md:flex items-center gap-6">
              <Link
                to="/"
                className="flex items-center gap-2 text-sm hover:text-primary transition-colors terminal-text"
              >
                <Home className="w-4 h-4" />
                HOME
              </Link>
              <Link
                to="/leaderboard"
                className="flex items-center gap-2 text-sm hover:text-primary transition-colors terminal-text"
              >
                <Trophy className="w-4 h-4" />
                LEADERBOARD
              </Link>
              <Link
                to="/updates"
                className="flex items-center gap-2 text-sm hover:text-primary transition-colors terminal-text"
              >
                <GitBranch className="w-4 h-4" />
                UPDATES
              </Link>
            </nav>

            <LoginButton />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {children}
      </main>

      <footer className="border-t-2 border-primary/30 bg-card/50 backdrop-blur-sm mt-16">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground terminal-text">
            <p>
              © {new Date().getFullYear()} HACK_MANIA {APP_VERSION}. This is a simulated game - no real hacking involved.
            </p>
            <p>
              Built with love using{' '}
              <a
                href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                caffeine.ai
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
