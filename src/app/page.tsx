"use client";

import { Header, Terminal, ConfigPanel } from "@/components";
import { useTerminal } from "@/hooks/useTerminal";

export default function Home() {
  const { messages, isLoading, config, isConnected, updateConfig, sendMessage } = useTerminal();

  return (
    <div className="min-h-screen flex flex-col">
      <Header isConnected={isConnected} />

      <main className="flex-1 flex flex-col w-full max-w-3xl mx-auto p-6">
        <Terminal messages={messages} isLoading={isLoading} onSend={sendMessage} />
        <ConfigPanel config={config} onChange={updateConfig} defaultOpen={!config.webhookUrl} />
      </main>
    </div>
  );
}
