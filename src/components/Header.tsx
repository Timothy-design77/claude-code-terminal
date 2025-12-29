interface HeaderProps {
  isConnected: boolean;
}

export function Header({ isConnected }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-terminal-border bg-terminal-surface">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-terminal-accent to-green-600 flex items-center justify-center font-mono font-semibold text-sm text-terminal-bg">
          C
        </div>
        <span className="font-medium text-lg tracking-tight">Claude Terminal</span>
      </div>
      <div className="flex items-center gap-2 text-sm text-terminal-muted">
        <span
          className={`w-2 h-2 rounded-full transition-all ${
            isConnected
              ? "bg-terminal-accent shadow-[0_0_8px_theme(colors.terminal.accent)]"
              : "bg-terminal-dim"
          }`}
        />
        <span>{isConnected ? "Ready" : "Disconnected"}</span>
      </div>
    </header>
  );
}
