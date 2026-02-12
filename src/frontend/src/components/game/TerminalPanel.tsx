import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Terminal, Send, ChevronRight } from 'lucide-react';
import type { Challenge } from '../../backend';
import type { CommandOutput } from '../../hooks/useQueries';

interface TerminalLine {
  type: 'system' | 'user' | 'success' | 'error' | 'info';
  text: string;
}

interface TerminalPanelProps {
  challenge: Challenge;
  onCommandProcess: (command: string) => Promise<CommandOutput>;
  isProcessing?: boolean;
  disabled?: boolean;
}

const AVAILABLE_COMMANDS = [
  'help',
  'scan',
  'connect',
  'decode',
  'exploit',
  'grep',
  'ls',
  'cat',
  'pwd',
];

export default function TerminalPanel({ challenge, onCommandProcess, isProcessing, disabled }: TerminalPanelProps) {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState<TerminalLine[]>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const [context, setContext] = useState<string>('~');
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setOutput([
      { type: 'system', text: '═══════════════════════════════════════════════════════' },
      { type: 'system', text: `  CHALLENGE: ${challenge.name}` },
      { type: 'system', text: '═══════════════════════════════════════════════════════' },
      { type: 'info', text: '' },
      { type: 'info', text: challenge.description },
      { type: 'info', text: '' },
      { type: 'system', text: '⚠️  NOTICE: This is a SIMULATED environment.' },
      { type: 'system', text: '   No real systems are accessed or harmed.' },
      { type: 'info', text: '' },
      { type: 'info', text: 'Type "help" to see available commands.' },
      { type: 'info', text: '' },
    ]);
    setCommandHistory([]);
    setHistoryIndex(-1);
    setContext('~');
  }, [challenge]);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  useEffect(() => {
    if (input.trim()) {
      const matches = AVAILABLE_COMMANDS.filter(cmd => 
        cmd.startsWith(input.trim().toLowerCase())
      );
      setSuggestions(matches);
      setShowSuggestions(matches.length > 0);
      setSelectedSuggestion(0);
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
    }
  }, [input]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput('');
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (suggestions.length > 0) {
        setInput(suggestions[selectedSuggestion]);
        setShowSuggestions(false);
      }
    } else if (e.key === 'ArrowRight' && showSuggestions) {
      e.preventDefault();
      setSelectedSuggestion((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing || disabled) return;

    const userInput = input.trim();
    setOutput(prev => [...prev, { type: 'user', text: `${context} > ${userInput}` }]);
    setInput('');
    setShowSuggestions(false);
    
    // Add to history
    setCommandHistory(prev => [...prev, userInput]);
    setHistoryIndex(-1);

    try {
      const result = await onCommandProcess(userInput);
      
      // Convert result lines to TerminalLine format
      const resultLines: TerminalLine[] = result.lines.map(line => ({
        type: line.type as TerminalLine['type'],
        text: line.text,
      }));
      
      setOutput(prev => [...prev, ...resultLines]);
      
      if (result.context) {
        setContext(result.context);
      }

      if (result.solved) {
        setOutput(prev => [
          ...prev,
          { type: 'info', text: '' },
          { type: 'success', text: '╔═══════════════════════════════════════════════════╗' },
          { type: 'success', text: '║                                                   ║' },
          { type: 'success', text: '║          🎉 CHALLENGE COMPLETE! 🎉               ║' },
          { type: 'success', text: '║                                                   ║' },
          { type: 'success', text: '╚═══════════════════════════════════════════════════╝' },
        ]);
      }
    } catch (error) {
      setOutput(prev => [
        ...prev,
        { type: 'error', text: 'ERROR: Command processing failed.' },
      ]);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  return (
    <div className="terminal-border bg-card p-6 space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-primary/30">
        <Terminal className="w-5 h-5 text-primary terminal-glow" />
        <h3 className="text-lg font-bold text-primary terminal-text">
          TERMINAL_INTERFACE_v2.0
        </h3>
        <div className="ml-auto flex gap-2">
          <div className="w-3 h-3 rounded-full bg-destructive"></div>
          <div className="w-3 h-3 rounded-full bg-secondary"></div>
          <div className="w-3 h-3 rounded-full bg-primary"></div>
        </div>
      </div>

      <div
        ref={outputRef}
        className="bg-background p-4 h-96 overflow-y-auto font-mono text-sm space-y-1 terminal-text"
      >
        {output.map((line, index) => (
          <div
            key={index}
            className={
              line.type === 'system' ? 'text-primary/70 font-bold' :
              line.type === 'user' ? 'text-foreground font-bold' :
              line.type === 'success' ? 'text-primary terminal-glow' :
              line.type === 'error' ? 'text-destructive' :
              'text-muted-foreground'
            }
          >
            {line.text}
          </div>
        ))}
        {isProcessing && (
          <div className="text-primary terminal-glow flex items-center gap-2">
            <span className="animate-pulse">Processing</span>
            <span className="animate-blink">_</span>
          </div>
        )}
      </div>

      <div className="relative">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="flex-1 flex items-center bg-background border-2 border-primary/50 focus-within:border-primary relative">
            <span className="px-3 text-primary terminal-text font-bold flex items-center gap-1">
              <ChevronRight className="w-4 h-4" />
              {context}
            </span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type command... (↑↓ for history, Tab for autocomplete)"
              disabled={isProcessing || disabled}
              className="flex-1 px-2 py-3 bg-transparent outline-none terminal-text text-primary placeholder:text-muted-foreground/50 disabled:opacity-50"
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isProcessing || disabled}
            className="px-6 py-3 terminal-border bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 terminal-text font-bold flex items-center gap-2 transition-all"
          >
            <Send className="w-4 h-4" />
            EXECUTE
          </button>
        </form>

        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-background border-2 border-primary/50 z-10 terminal-border">
            <div className="p-2 text-xs text-muted-foreground terminal-text border-b border-primary/30">
              Suggestions (Tab to complete, → to cycle):
            </div>
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion}
                onClick={() => handleSuggestionClick(suggestion)}
                className={`w-full text-left px-4 py-2 terminal-text font-mono transition-colors ${
                  index === selectedSuggestion
                    ? 'bg-primary/20 text-primary'
                    : 'text-foreground hover:bg-primary/10'
                }`}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground terminal-text">
        <div className="flex items-center gap-4">
          <span>↑↓ History</span>
          <span>Tab Autocomplete</span>
          <span>Esc Close suggestions</span>
        </div>
        {disabled && (
          <span className="text-secondary">Waiting for match completion...</span>
        )}
      </div>
    </div>
  );
}
