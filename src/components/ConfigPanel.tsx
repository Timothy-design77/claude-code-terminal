"use client";

import { useState } from "react";
import type { Config } from "@/lib/types";

interface ConfigPanelProps {
  config: Config;
  onChange: (updates: Partial<Config>) => void;
  defaultOpen?: boolean;
}

export function ConfigPanel({ config, onChange, defaultOpen = false }: ConfigPanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="mt-4 bg-terminal-surface border border-terminal-border rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-terminal-elevated border-b border-terminal-border hover:bg-terminal-border/30 transition-colors"
      >
        <h3 className="text-sm font-medium text-terminal-muted">⚙️ n8n Configuration</h3>
        <span
          className={`text-terminal-dim text-xs transition-transform ${isOpen ? "rotate-180" : ""}`}
        >
          ▼
        </span>
      </button>

      {isOpen && (
        <div className="p-4 space-y-4">
          <Field
            label="n8n Webhook URL"
            value={config.webhookUrl}
            onChange={(v) => onChange({ webhookUrl: v })}
            placeholder="https://your-n8n.app/webhook/claude"
          />
          <Field
            label="API Key (optional)"
            value={config.apiKey}
            onChange={(v) => onChange({ apiKey: v })}
            placeholder="For webhook authentication"
            type="password"
          />
        </div>
      )}
    </div>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "password";
}

function Field({ label, value, onChange, placeholder, type = "text" }: FieldProps) {
  return (
    <label className="block">
      <span className="text-xs text-terminal-muted mb-1.5 block">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 bg-terminal-bg border border-terminal-border rounded-lg font-mono text-sm outline-none focus:border-terminal-accent transition-colors placeholder:text-terminal-dim"
      />
    </label>
  );
}
