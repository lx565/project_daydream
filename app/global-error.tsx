"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global error]", error);
  }, [error]);

  return (
    <html lang="zh">
      <body
        style={{
          background: "#F5F0E6",
          color: "#2C1A10",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "serif",
          padding: "1rem",
          margin: 0,
        }}
      >
        <div style={{ textAlign: "center", maxWidth: "28rem" }}>
          <p style={{ fontSize: "2rem" }}>🌫️</p>
          <h1 style={{ fontSize: "1.125rem", fontWeight: 700 }}>出了點小狀況</h1>
          <p style={{ fontSize: "0.875rem", color: "#5a4636", lineHeight: 1.7 }}>
            頁面遇到了意外錯誤，請稍後重試。
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: "1rem",
              borderRadius: "9999px",
              border: "1px solid rgba(184,134,11,0.4)",
              background: "rgba(184,134,11,0.08)",
              color: "#b8860b",
              padding: "0.5rem 1.25rem",
              fontSize: "0.875rem",
              cursor: "pointer",
            }}
          >
            重試
          </button>
        </div>
      </body>
    </html>
  );
}
