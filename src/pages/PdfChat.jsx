import React, { useMemo, useState } from "react";
import { api } from "../api/client";

export default function PdfChat() {
  const [file, setFile] = useState(null);
  const [docId, setDocId] = useState("");
  const [uploading, setUploading] = useState(false);

  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]); // {role: 'user'|'ai', text, sources?}
  const [asking, setAsking] = useState(false);

  const canAsk = useMemo(() => !!docId && !asking, [docId, asking]);

  const uploadPdf = async () => {
    if (!file) {
      alert("Please select a PDF first.");
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);

      const res = await api.post("/pdf/upload/", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const newDocId = res?.data?.doc_id || "";
      setDocId(newDocId);

      alert(
        `PDF uploaded!\n` +
          `doc_id: ${newDocId}\n` +
          `Chunks stored: ${res?.data?.chunks ?? "N/A"}`
      );
    } catch (err) {
      console.error("Upload error:", err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        err?.message ||
        "Upload failed";
      alert(msg);
    } finally {
      setUploading(false);
    }
  };

  const ask = async () => {
    const userQ = question.trim();
    if (!docId) {
      alert("Upload a PDF first.");
      return;
    }
    if (!userQ) return;

    setMessages((m) => [...m, { role: "user", text: userQ }]);
    setQuestion("");
    setAsking(true);

    try {
      const res = await api.post("/pdf/ask/", {
        doc_id: docId,
        question: userQ,
      });

      setMessages((m) => [
        ...m,
        {
          role: "ai",
          text: res?.data?.answer ?? "(No answer returned)",
          sources: res?.data?.sources || [],
        },
      ]);
    } catch (err) {
      console.error("Ask error:", err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        err?.message ||
        "Ask failed";

      // Show error as an AI message too (helps debugging)
      setMessages((m) => [...m, { role: "ai", text: `❌ ${msg}`, sources: [] }]);
      alert(msg);
    } finally {
      setAsking(false);
    }
  };

  const copyDocId = async () => {
    if (!docId) return;
    try {
      await navigator.clipboard.writeText(docId);
      alert("doc_id copied!");
    } catch {
      // fallback
      alert(docId);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: "30px auto", padding: 16, fontFamily: "Arial" }}>
      <h2>Chat with PDF (React + Django)</h2>

      <div style={{ border: "1px solid #ddd", padding: 16, borderRadius: 8, marginBottom: 16 }}>
        <h3>1) Upload PDF</h3>
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <button
          onClick={uploadPdf}
          disabled={uploading}
          style={{ marginLeft: 12, padding: "8px 12px" }}
        >
          {uploading ? "Uploading..." : "Upload"}
        </button>

        <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
          <div>
            <b>doc_id:</b> {docId || "(upload a PDF)"}
          </div>
          <button
            onClick={copyDocId}
            disabled={!docId}
            style={{ padding: "6px 10px", opacity: docId ? 1 : 0.5 }}
          >
            Copy
          </button>
        </div>
      </div>

      <div style={{ border: "1px solid #ddd", padding: 16, borderRadius: 8 }}>
        <h3>2) Ask questions</h3>

        <div
          style={{
            height: 380,
            overflowY: "auto",
            border: "1px solid #eee",
            padding: 12,
            borderRadius: 8,
            marginBottom: 12,
            background: "#fafafa",
          }}
        >
          {messages.length === 0 ? (
            <p style={{ color: "#666" }}>
              Upload a PDF and ask something like “Summarize page 1”.
            </p>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} style={{ marginBottom: 14 }}>
                <div style={{ fontWeight: "bold" }}>{msg.role === "user" ? "You" : "AI"}</div>
                <div style={{ whiteSpace: "pre-wrap" }}>{msg.text}</div>

                {msg.role === "ai" && msg.sources?.length > 0 && (
                  <div style={{ marginTop: 8, fontSize: 13, color: "#444" }}>
                    <b>Sources:</b>
                    <ul>
                      {msg.sources.map((s, i) => (
                        <li key={i}>
                          Page {s.page}: {s.snippet}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={!docId ? "Upload a PDF first..." : "Ask something about the PDF..."}
            style={{ flex: 1, padding: 10 }}
            disabled={!docId || asking}
            onKeyDown={(e) => {
              if (e.key === "Enter") ask();
            }}
          />
          <button
            onClick={ask}
            disabled={!canAsk}
            style={{ padding: "8px 14px", opacity: canAsk ? 1 : 0.6 }}
          >
            {asking ? "Asking..." : "Ask"}
          </button>
        </div>
      </div>
    </div>
  );
}
