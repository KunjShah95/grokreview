import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "GrokReview - AI code review that reads your whole repo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#101013",
          padding: "72px",
          color: "#fafafa",
          fontFamily: "sans-serif",
        }}
      >
        {/* radial accent */}
        <div
          style={{
            position: "absolute",
            top: -160,
            left: 120,
            width: 520,
            height: 520,
            borderRadius: 520,
            background: "rgba(79,70,229,0.35)",
            filter: "blur(120px)",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "#4f46e5",
              fontSize: 30,
              fontWeight: 700,
            }}
          >
            {"</>"}
          </div>
          <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: -0.5 }}>GrokReview</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 68,
              fontWeight: 600,
              lineHeight: 1.08,
              letterSpacing: -1.5,
            }}
          >
            <span>Every pull request gets a</span>
            <span style={{ color: "#a5b4fc" }}>senior review.</span>
          </div>
          <div style={{ display: "flex", fontSize: 28, color: "rgba(250,250,250,0.6)", maxWidth: 820 }}>
            Full codebase context on every PR. Bring your own model. No lock-in.
          </div>
        </div>

        <div style={{ display: "flex", gap: 28, fontSize: 22, color: "rgba(250,250,250,0.55)" }}>
          <span>Groq</span>
          <span>Mistral</span>
          <span>OpenRouter</span>
          <span>HuggingFace</span>
          <span>Ollama</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
