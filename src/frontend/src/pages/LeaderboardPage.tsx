import { useGetLeaderboard, useGetRecentMatches } from '../hooks/useQueries';
import { Trophy, Clock, Loader2, AlertCircle } from 'lucide-react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';

export default function LeaderboardPage() {
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity;
  
  const { data: leaderboard, isLoading: leaderboardLoading } = useGetLeaderboard();
  const { data: recentMatches, isLoading: matchesLoading } = useGetRecentMatches();

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold text-primary terminal-glow terminal-text">
          GLOBAL_LEADERBOARD
        </h1>
        <p className="text-muted-foreground terminal-text">
          {'>'} TOP_HACKERS_WORLDWIDE
        </p>
      </div>

      {!isAuthenticated && (
        <div className="terminal-border bg-card/50 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-bold terminal-text text-secondary">
              AUTHENTICATION_REQUIRED
            </p>
            <p className="text-sm text-muted-foreground terminal-text">
              Login to record your scores on the leaderboard. You can still view rankings without logging in.
            </p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Leaderboard */}
        <div className="terminal-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-primary terminal-glow" />
            <h2 className="text-2xl font-bold text-primary terminal-text">
              TOP_PLAYERS
            </h2>
          </div>

          {leaderboardLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary animate-spin terminal-glow" />
            </div>
          ) : !leaderboard || leaderboard.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground terminal-text text-sm">
                No entries yet. Be the first to play!
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((entry, index) => (
                <div
                  key={entry.player.toString()}
                  className="flex items-center gap-3 p-3 bg-background/50 hover:bg-background transition-colors"
                >
                  <span className={`text-2xl font-bold terminal-text ${
                    index === 0 ? 'text-primary' :
                    index === 1 ? 'text-secondary' :
                    index === 2 ? 'text-accent' :
                    'text-muted-foreground'
                  }`}>
                    #{index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm terminal-text truncate">
                      {entry.player.toString().slice(0, 12)}...{entry.player.toString().slice(-6)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary terminal-text">
                      {entry.totalScore.toString()}
                    </p>
                    <p className="text-xs text-muted-foreground terminal-text">
                      {entry.wins.toString()} wins
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Matches */}
        <div className="terminal-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-6 h-6 text-secondary terminal-glow" />
            <h2 className="text-2xl font-bold text-secondary terminal-text">
              RECENT_MATCHES
            </h2>
          </div>

          {matchesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-secondary animate-spin terminal-glow" />
            </div>
          ) : !recentMatches || recentMatches.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground terminal-text text-sm">
                No recent matches found.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentMatches.map((match) => (
                <div
                  key={match.matchId.toString()}
                  className="p-3 bg-background/50 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground terminal-text">
                      MATCH #{match.matchId.toString()}
                    </span>
                    <span className="text-xs text-accent terminal-text">
                      {match.mode.toUpperCase()}
                    </span>
                  </div>
                  {match.winner && (
                    <div className="text-sm terminal-text">
                      <span className="text-muted-foreground">WINNER: </span>
                      <span className="text-primary">
                        {match.winner.toString().slice(0, 8)}...
                      </span>
                    </div>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    {match.scores.map(([player, score]) => (
                      <span
                        key={player.toString()}
                        className="text-xs terminal-text bg-background px-2 py-1"
                      >
                        {score.toString()} pts
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
