import { Clock, GitBranch } from 'lucide-react';
import { updates } from '../content/updates';
import { APP_VERSION } from '../constants/appVersion';

export default function UpdatesPage() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <GitBranch className="w-8 h-8 text-primary terminal-glow" />
          <h1 className="text-4xl md:text-5xl font-bold text-primary terminal-glow terminal-text">
            UPDATES_LOG
          </h1>
        </div>
        <p className="text-lg text-muted-foreground terminal-text">
          {'>'} CURRENT_VERSION: <span className="text-secondary font-bold">{APP_VERSION}</span>
        </p>
        <p className="text-muted-foreground terminal-text">
          Track all improvements, features, and changes to HACK_MANIA. This is a simulated game environment.
        </p>
      </section>

      {/* Updates List */}
      <section className="space-y-6">
        {updates.map((update, index) => (
          <article
            key={update.version}
            className="terminal-border bg-card p-6 space-y-4 hover:bg-card/80 transition-colors"
          >
            {/* Update Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-primary/20">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold text-primary terminal-text">
                  {update.version}
                </h2>
                <h3 className="text-lg text-secondary terminal-text">
                  {update.title}
                </h3>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground terminal-text text-sm">
                <Clock className="w-4 h-4" />
                <time dateTime={update.date}>
                  {new Date(update.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </time>
              </div>
            </div>

            {/* Changes List */}
            <ul className="space-y-2">
              {update.changes.map((change, changeIndex) => (
                <li
                  key={changeIndex}
                  className="flex items-start gap-3 text-muted-foreground terminal-text"
                >
                  <span className="text-primary mt-1 flex-shrink-0">{'>'}</span>
                  <span>{change}</span>
                </li>
              ))}
            </ul>

            {/* Version Badge */}
            {index === 0 && (
              <div className="pt-2">
                <span className="inline-block px-3 py-1 text-xs font-bold terminal-border bg-primary/20 text-primary terminal-text">
                  LATEST
                </span>
              </div>
            )}
          </article>
        ))}
      </section>

      {/* Footer Note */}
      <section className="terminal-border bg-card/50 p-4">
        <p className="text-center text-muted-foreground terminal-text text-sm">
          <span className="text-primary">{'>'} NOTE:</span> All updates are tracked in the frontend. 
          Check back regularly for new features and improvements.
        </p>
      </section>
    </div>
  );
}
