/**
 * Changelog/Updates content for the Updates page
 * Edit this file to add new updates without changing backend code
 */

export interface UpdateEntry {
  version: string;
  date: string;
  title: string;
  changes: string[];
}

export const updates: UpdateEntry[] = [
  {
    version: 'v2.1.0',
    date: '2026-02-12',
    title: 'Updates Page & Version Tracking',
    changes: [
      'Added dedicated Updates/Changelog page for tracking game improvements',
      'Implemented centralized version constant across the application',
      'Enhanced navigation with quick access to update history',
      'Improved version visibility in UI components',
    ],
  },
  {
    version: 'v2.0.0',
    date: '2026-02-10',
    title: 'Terminal Command Processing',
    changes: [
      'Introduced multi-step command processing flow for more immersive gameplay',
      'Added command history navigation with up/down arrow keys',
      'Implemented autocomplete suggestions with Tab key support',
      'Enhanced terminal output with contextual multi-line responses',
      'Updated scoring system to reward efficiency (fewer commands = higher score)',
    ],
  },
  {
    version: 'v1.5.0',
    date: '2026-02-05',
    title: 'Multiplayer Enhancements',
    changes: [
      'Improved lobby system with real-time player roster updates',
      'Added shareable lobby codes for easier multiplayer sessions',
      'Enhanced match synchronization with polling-based state management',
      'Fixed navigation flow between lobby, match, and results screens',
    ],
  },
  {
    version: 'v1.0.0',
    date: '2026-02-01',
    title: 'Initial Release',
    changes: [
      'Launched HACK_MANIA with retro terminal aesthetic',
      'Implemented solo and multiplayer game modes',
      'Created global leaderboard and match history tracking',
      'Integrated Internet Identity authentication',
      'Deployed on Internet Computer blockchain',
    ],
  },
];
