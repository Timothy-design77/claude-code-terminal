"use client";

import { useEffect, useRef } from "react";

export default function GamePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<any>(null);

  useEffect(() => {
    let mounted = true;

    async function startGame() {
      if (!containerRef.current || gameRef.current) return;

      // Dynamic import to avoid SSR issues with PixiJS
      const { Game } = await import("@/game/engine/Game");
      if (!mounted) return;

      const game = new Game();
      gameRef.current = game;
      await game.init(containerRef.current!);
    }

    startGame();

    return () => {
      mounted = false;
      if (gameRef.current) {
        gameRef.current.destroy();
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "#050510",
        cursor: "crosshair",
      }}
    />
  );
}
