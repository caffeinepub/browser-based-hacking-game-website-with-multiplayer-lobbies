import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import { useQueryClient } from '@tanstack/react-query';
import { LogIn, LogOut, Loader2 } from 'lucide-react';

export default function LoginButton() {
  const { login, clear, loginStatus, identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  const isAuthenticated = !!identity;
  const disabled = loginStatus === 'logging-in';

  const handleAuth = async () => {
    if (isAuthenticated) {
      await clear();
      queryClient.clear();
    } else {
      try {
        await login();
      } catch (error: any) {
        console.error('Login error:', error);
        if (error.message === 'User is already authenticated') {
          await clear();
          setTimeout(() => login(), 300);
        }
      }
    }
  };

  return (
    <button
      onClick={handleAuth}
      disabled={disabled}
      className="flex items-center gap-2 px-4 py-2 terminal-border bg-card hover:bg-primary/10 transition-colors disabled:opacity-50 terminal-text text-sm font-bold"
    >
      {disabled ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          CONNECTING...
        </>
      ) : isAuthenticated ? (
        <>
          <LogOut className="w-4 h-4" />
          LOGOUT
        </>
      ) : (
        <>
          <LogIn className="w-4 h-4" />
          LOGIN
        </>
      )}
    </button>
  );
}
