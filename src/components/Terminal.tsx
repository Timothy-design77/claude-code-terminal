"use client";

import { useRef, useEffect, useState, KeyboardEvent } from "react";
import type { Message } from "@/lib/types";

interface TerminalProps {
  messages: Message[];
  isLoading: boolean;
  onSend: (content: string) => void;
}

const roleStyles: Record<Message["role"], string> = {
  user: "text-terminal-accent before:content-['❯_'] before:opacity-70",
  assistant: "text-terminal-text pl-4 border-l-2 border-terminal-border ml-1",
  system: "text-terminal-dim italic",
  error: "text-terminal-error",
};

export function Terminal({ messages, isLoading, onSend }: TerminalProps) {
  const [input, setInput] = useState("");
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSubmit = () => {
    if (input.trim() && !isLoading) {
      onSend(input.trim());
      setInput("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-terminal-surface border border-terminal-border rounded-xl overflow-hidden">
      {/* Window chrome */}
      <div className="flex items-center gap-2 px-4 py-3 bg-terminal-elevated border-b border-terminal-border">
        <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
        <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
        <div className="w-3 h-3 rounded-full bg-[#28c840]" />
        <span className="ml-3 font-mono text-xs text-terminal-dim">claude@n8n ~</span>
      </div>

      {/* Output */}
      <div ref={outputRef} className="flex-1 p-4 overflow-y-auto font-mono text-sm leading-relaxed">
        {messages.map((msg) => (
          <div key={msg.id} className={`mb-4 animate-fade-in ${roleStyles[msg.role]}`}>
            {msg.content}
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-1 py-2">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-1.5 h-1.5 bg-terminal-accent rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.16}s` }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-terminal-border bg-terminal-elevated">
        <div className="flex items-center gap-3 px-4 py-3 bg-terminal-bg border border-terminal-border rounded-lg focus-within:border-terminal-accent transition-colors">
          <span className="text-terminal-accent font-mono font-medium">❯</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1 bg-transparent outline-none font-mono text-sm placeholder:text-terminal-dim disabled:opacity-50"
          />
          <button
            onClick={handleSubmit}
            disabled={isLoading || !input.trim()}
            className="px-4 py-1.5 bg-terminal-accent text-terminal-bg font-medium text-sm rounded-md hover:bg-green-600 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
