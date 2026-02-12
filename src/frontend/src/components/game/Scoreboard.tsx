import { Users } from 'lucide-react';
import type { LobbyView } from '../../backend';

interface ScoreboardProps {
  lobby: LobbyView;
}

export default function Scoreboard({ lobby }: ScoreboardProps) {
  return (
    <div className="terminal-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-primary" />
        <h3 className="text-sm font-bold text-primary terminal-text">
          PLAYERS
        </h3>
      </div>

      <div className="space-y-2">
        {lobby.players.map((player) => (
          <div
            key={player.toString()}
            className="flex items-center justify-between p-2 bg-background/50 text-xs terminal-text"
          >
            <span className="truncate flex-1">
              {player.toString().slice(0, 6)}...{player.toString().slice(-4)}
            </span>
            {player.toString() === lobby.host.toString() && (
              <span className="text-secondary">[HOST]</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
