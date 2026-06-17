"use client";

import { useCallback, useRef, useState } from "react";

export default function Home() {
  const [original, setOriginal] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const originalFileRef = useRef<File | null>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    originalFileRef.current = file;
    const url = URL.createObjectURL(file);
    setOriginal(url);
    setResult(null);
    setError(null);
  }, []);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const item = Array.from(e.clipboardData.items).find((i) =>
        i.type.startsWith("image/")
      );
      if (item) handleFile(item.getAsFile()!);
    },
    [handleFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const applyMosaicEffect = (imageSrc: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to load image"));
      img.onload = () => {
        const size = 1024;
        const tileSize = 9;    // smaller tiles = more detailed, more mosaic-like
        const grout = 1.5;     // thin grout
        const step = tileSize + grout;

        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d")!;

        // Draw source image to sample colors from
        ctx.drawImage(img, 0, 0, size, size);
        const src = ctx.getImageData(0, 0, size, size);

        // Warm grout background
        ctx.fillStyle = "#d4c9b8";
        ctx.fillRect(0, 0, size, size);

        for (let y = 0; y < size; y += step) {
          for (let x = 0; x < size; x += step) {
            // Sample center pixel color of this tile (faster, looks fine at small size)
            const cx = Math.min(Math.round(x + tileSize / 2), size - 1);
            const cy = Math.min(Math.round(y + tileSize / 2), size - 1);
            const i = (cy * size + cx) * 4;
            let r = src.data[i];
            let g = src.data[i + 1];
            let b = src.data[i + 2];

            // Subtle brightness variation per tile for depth/texture
            const v = (Math.random() - 0.5) * 18;
            r = Math.min(255, Math.max(0, r + v));
            g = Math.min(255, Math.max(0, g + v));
            b = Math.min(255, Math.max(0, b + v));

            // Slight random size variation per tile (organic feel)
            const shrink = Math.random() * 1.2;
            const tw = tileSize - shrink;
            const th = tileSize - shrink;
            const ox = shrink / 2;
            const oy = shrink / 2;

            // Slight random rotation per tile
            const angle = (Math.random() - 0.5) * 0.18;
            const cx2 = x + ox + tw / 2;
            const cy2 = y + oy + th / 2;

            ctx.save();
            ctx.translate(cx2, cy2);
            ctx.rotate(angle);
            ctx.fillStyle = `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;

            // Rounded rect centered at origin
            const rx = -tw / 2;
            const ry = -th / 2;
            const radius = 1.5;
            ctx.beginPath();
            ctx.moveTo(rx + radius, ry);
            ctx.lineTo(rx + tw - radius, ry);
            ctx.quadraticCurveTo(rx + tw, ry, rx + tw, ry + radius);
            ctx.lineTo(rx + tw, ry + th - radius);
            ctx.quadraticCurveTo(rx + tw, ry + th, rx + tw - radius, ry + th);
            ctx.lineTo(rx + radius, ry + th);
            ctx.quadraticCurveTo(rx, ry + th, rx, ry + th - radius);
            ctx.lineTo(rx, ry + radius);
            ctx.quadraticCurveTo(rx, ry, rx + radius, ry);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }
        }

        resolve(canvas.toDataURL("image/png"));
      };
      img.src = imageSrc;
    });
  };

  const generate = async () => {
    if (!originalFileRef.current) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("image", originalFileRef.current);
      const res = await fetch("/api/mosaicify", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      const src = data.b64 ? `data:image/png;base64,${data.b64}` : data.url;
      setResult(src);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    if (!result) return;
    const a = document.createElement("a");
    a.href = result;
    a.download = "mosaic-avatar.png";
    a.click();
  };

  const reset = () => {
    setOriginal(null);
    setResult(null);
    setError(null);
    originalFileRef.current = null;
  };

  return (
    <main
      className="min-h-screen"
      style={{ background: "#f9f8f6", fontFamily: "'DM Sans', system-ui, sans-serif" }}
      onPaste={handlePaste}
    >
      {/* Header */}
      <header
        style={{
          borderBottom: "1px solid #e8e6e2",
          background: "#ffffff",
          padding: "0 32px",
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mosaic-logo.png" alt="Mosaic" style={{ height: 32, width: "auto" }} />
          <span
            style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontWeight: 600,
              fontSize: 18,
              color: "#1f1f1f",
              letterSpacing: "-0.01em",
            }}
          >
            Mosaic
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: "#7086ad",
              background: "#e4e7eb",
              borderRadius: 9999,
              padding: "2px 8px",
              letterSpacing: "0.06em",
              textTransform: "uppercase" as const,
              marginLeft: 4,
            }}
          >
            Avatar
          </span>
        </div>
      </header>

      {/* Hero */}
      <section style={{ textAlign: "center", padding: "64px 24px 48px" }}>
        <p
          style={{
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "0.1em",
            textTransform: "uppercase" as const,
            color: "#2075bc",
            marginBottom: 16,
          }}
        >
          Powered by Mosaic AI
        </p>
        <h1
          style={{
            fontFamily: "'Fraunces', Georgia, serif",
            fontWeight: 700,
            fontSize: "clamp(32px, 5vw, 52px)",
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            color: "#1f1f1f",
            margin: "0 auto 16px",
            maxWidth: 600,
          }}
        >
          Turn your photo into<br />
          <em style={{ fontStyle: "italic", color: "#2075bc" }}>mosaic art</em>
        </h1>
        <p style={{ fontSize: 16, color: "#5a5a5e", maxWidth: 440, margin: "0 auto" }}>
          Paste or upload any portrait and watch it become a tiled mosaic — your likeness preserved, pixel by pixel.
        </p>
      </section>

      {/* Main card */}
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "0 24px 80px" }}>
        {!original ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${dragging ? "#2075bc" : "#d7dce4"}`,
              borderRadius: 16,
              background: dragging ? "#e8eef1" : "#ffffff",
              padding: "72px 32px",
              textAlign: "center",
              cursor: "pointer",
              transition: "all 150ms ease",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 12,
                background: "#e8eef1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 16V8M8 12l4-4 4 4" stroke="#2075bc" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="3" y="3" width="18" height="18" rx="4" stroke="#2075bc" strokeWidth="1.5" strokeDasharray="3 2" />
              </svg>
            </div>
            <p style={{ fontWeight: 500, fontSize: 15, color: "#1f1f1f", marginBottom: 6 }}>
              Drop your photo here
            </p>
            <p style={{ fontSize: 13, color: "#8e8e92" }}>
              or <span style={{ color: "#2075bc", textDecoration: "underline" }}>browse</span> · or press{" "}
              <kbd style={{ background: "#f0eeea", border: "1px solid #e8e6e2", borderRadius: 4, padding: "1px 5px", fontSize: 12 }}>⌘V</kbd> to paste
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>
        ) : (
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: result ? "1fr 1fr" : "1fr",
                gap: 16,
                marginBottom: 20,
              }}
            >
              {/* Original */}
              <div style={{ background: "#ffffff", borderRadius: 12, border: "1px solid #e8e6e2", overflow: "hidden" }}>
                <div style={{ padding: "10px 16px", borderBottom: "1px solid #e8e6e2", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: "#8e8e92", textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>Original</span>
                  <button
                    onClick={reset}
                    style={{ fontSize: 12, color: "#8e8e92", background: "none", border: "none", cursor: "pointer" }}
                  >
                    Change photo
                  </button>
                </div>
                <img src={original} alt="Original" style={{ width: "100%", display: "block", aspectRatio: "1/1", objectFit: "cover" }} />
              </div>

              {/* Result */}
              {result && (
                <div style={{ background: "#ffffff", borderRadius: 12, border: "1px solid #e8e6e2", overflow: "hidden" }}>
                  <div style={{ padding: "10px 16px", borderBottom: "1px solid #e8e6e2", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: "#2075bc", textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>Mosaic</span>
                    <button
                      onClick={download}
                      style={{ fontSize: 12, color: "#2075bc", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}
                    >
                      ↓ Download
                    </button>
                  </div>
                  <img src={result} alt="Mosaic result" style={{ width: "100%", display: "block", aspectRatio: "1/1", objectFit: "cover" }} />
                </div>
              )}
            </div>

            {error && (
              <div style={{ background: "#f8e7e5", border: "1px solid #f6c3c2", borderRadius: 8, padding: "12px 16px", marginBottom: 16, fontSize: 13, color: "#ac1f25" }}>
                {error}
              </div>
            )}

            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              {!result && (
                <button
                  onClick={generate}
                  disabled={loading}
                  style={{
                    background: loading ? "#c3d7e8" : "#2075bc",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: 8,
                    padding: "12px 32px",
                    fontSize: 15,
                    fontWeight: 500,
                    cursor: loading ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontFamily: "'DM Sans', sans-serif",
                    transition: "background 150ms",
                  }}
                >
                  {loading ? <><Spinner /> Mosaicifying…</> : "Generate Mosaic"}
                </button>
              )}
              {result && (
                <>
                  <button
                    onClick={download}
                    style={{
                      background: "#2075bc",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: 8,
                      padding: "12px 32px",
                      fontSize: 15,
                      fontWeight: 500,
                      cursor: "pointer",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    Download PNG
                  </button>
                  <button
                    onClick={() => { setResult(null); generate(); }}
                    style={{
                      background: "#ffffff",
                      color: "#2075bc",
                      border: "1px solid #c3d7e8",
                      borderRadius: 8,
                      padding: "12px 24px",
                      fontSize: 15,
                      fontWeight: 500,
                      cursor: "pointer",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    Regenerate
                  </button>
                  <button
                    onClick={reset}
                    style={{
                      background: "#ffffff",
                      color: "#5a5a5e",
                      border: "1px solid #e8e6e2",
                      borderRadius: 8,
                      padding: "12px 24px",
                      fontSize: 15,
                      fontWeight: 500,
                      cursor: "pointer",
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    New photo
                  </button>
                </>
              )}
            </div>

            {loading && (
              <p style={{ textAlign: "center", fontSize: 13, color: "#8e8e92", marginTop: 12 }}>
                This takes about 20–30 seconds…
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #e8e6e2", padding: "24px 32px", textAlign: "center" }}>
        <p style={{ fontSize: 12, color: "#8e8e92" }}>
          Made with Mosaic AI · Your photos are never stored
        </p>
      </footer>
    </main>
  );
}

function MosaicLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect x="2" y="2" width="11" height="11" rx="2.5" fill="#2075bc" />
      <rect x="15" y="2" width="11" height="11" rx="2.5" fill="#8ec640" />
      <rect x="2" y="15" width="11" height="11" rx="2.5" fill="#f8951d" />
      <rect x="15" y="15" width="11" height="11" rx="2.5" fill="#5a5daa" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      width="16" height="16" viewBox="0 0 16 16" fill="none"
      style={{ animation: "spin 0.8s linear infinite" }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="8" cy="8" r="6" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
      <path d="M8 2a6 6 0 0 1 6 6" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
