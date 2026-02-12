import { useState, useEffect } from 'react';
import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import { useGetCallerUserProfile, useSaveCallerUserProfile } from '../../hooks/useQueries';
import { Terminal } from 'lucide-react';

export default function ProfileSetupModal() {
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity;
  const { data: userProfile, isLoading: profileLoading, isFetched } = useGetCallerUserProfile();
  const saveProfile = useSaveCallerUserProfile();
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showProfileSetup = isAuthenticated && !profileLoading && isFetched && userProfile === null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await saveProfile.mutateAsync({
        name: name.trim(),
        gamesPlayed: BigInt(0),
        totalScore: BigInt(0),
      });
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!showProfileSetup) return null;

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="terminal-border bg-card p-8 max-w-md w-full space-y-6">
        <div className="flex items-center gap-3 justify-center">
          <Terminal className="w-8 h-8 text-primary terminal-glow" />
          <h2 className="text-2xl font-bold text-primary terminal-glow terminal-text">
            INITIALIZE_USER
          </h2>
        </div>

        <div className="space-y-2 text-center">
          <p className="text-muted-foreground terminal-text text-sm">
            {'>'} AUTHENTICATION SUCCESSFUL
          </p>
          <p className="text-foreground terminal-text">
            Enter your hacker alias to continue:
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ENTER_NAME..."
              maxLength={20}
              className="w-full px-4 py-3 bg-background border-2 border-primary/50 focus:border-primary outline-none terminal-text text-primary placeholder:text-muted-foreground"
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={!name.trim() || isSubmitting}
            className="w-full px-6 py-3 terminal-border bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed terminal-text font-bold transition-colors"
          >
            {isSubmitting ? 'INITIALIZING...' : 'CONFIRM_IDENTITY'}
          </button>
        </form>
      </div>
    </div>
  );
}
