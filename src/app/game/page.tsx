"use client";

import { useEffect, useRef } from "react";

export default function GamePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<any>(null);

  useEffect(() => {
    // Set viewport meta for mobile — prevent pinch-zoom on the page itself
    let metaViewport = document.querySelector(
      'meta[name="viewport"]'
    ) as HTMLMetaElement | null;
    const originalContent = metaViewport?.content;

    if (metaViewport) {
      metaViewport.content =
        "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no";
    } else {
      metaViewport = document.createElement("meta");
      metaViewport.name = "viewport";
      metaViewport.content =
        "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no";
      document.head.appendChild(metaViewport);
    }

    return () => {
      // Restore original viewport on unmount
      if (metaViewport && originalContent !== undefined) {
        metaViewport.content = originalContent;
      }
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function startGame() {
      if (!containerRef.current || gameRef.current) return;

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
        height: "100dvh", // dvh respects mobile browser chrome
        overflow: "hidden",
        background: "#050510",
        cursor: "crosshair",
        touchAction: "none", // Prevent browser gestures
        WebkitUserSelect: "none",
        userSelect: "none",
        WebkitTouchCallout: "none",
        position: "fixed",
        top: 0,
        left: 0,
      } as React.CSSProperties}
    />
  );
}
