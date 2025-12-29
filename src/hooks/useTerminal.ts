"use client";

import { useState, useCallback, useEffect } from "react";
import type { Message, Config } from "@/lib/types";

const STORAGE_KEYS = {
  webhookUrl: "claude-terminal-webhook",
  apiKey: "claude-terminal-apikey",
};

export function useTerminal() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "system",
      content: "Welcome to Claude Terminal. Configure your n8n webhook URL below to get started.",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState<Config>({ webhookUrl: "", apiKey: "" });

  // Load config from localStorage on mount
  useEffect(() => {
    const stored = {
      webhookUrl: localStorage.getItem(STORAGE_KEYS.webhookUrl) || "",
      apiKey: localStorage.getItem(STORAGE_KEYS.apiKey) || "",
    };
    setConfig(stored);
  }, []);

  const updateConfig = useCallback((updates: Partial<Config>) => {
    setConfig((prev) => {
      const next = { ...prev, ...updates };
      if (updates.webhookUrl !== undefined) {
        localStorage.setItem(STORAGE_KEYS.webhookUrl, updates.webhookUrl);
      }
      if (updates.apiKey !== undefined) {
        localStorage.setItem(STORAGE_KEYS.apiKey, updates.apiKey);
      }
      return next;
    });
  }, []);

  const addMessage = useCallback((role: Message["role"], content: string) => {
    const message: Message = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      role,
      content,
    };
    setMessages((prev) => [...prev, message]);
    return message;
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      if (!config.webhookUrl) {
        addMessage("error", "Please configure your n8n webhook URL first.");
        return;
      }

      addMessage("user", content);
      setIsLoading(true);

      try {
        const headers: HeadersInit = { "Content-Type": "application/json" };
        if (config.apiKey) {
          headers["Authorization"] = `Bearer ${config.apiKey}`;
        }

        const history = messages
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({ role: m.role, content: m.content }));

        const res = await fetch(config.webhookUrl, {
          method: "POST",
          headers,
          body: JSON.stringify({ message: content, history }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        const reply = data.response || data.message || data.content || JSON.stringify(data);
        addMessage("assistant", reply);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        addMessage("error", `Error: ${errorMsg}. Check your webhook URL and n8n workflow.`);
      } finally {
        setIsLoading(false);
      }
    },
    [config, messages, isLoading, addMessage]
  );

  const isConnected = Boolean(config.webhookUrl);

  return {
    messages,
    isLoading,
    config,
    isConnected,
    updateConfig,
    sendMessage,
  };
}
