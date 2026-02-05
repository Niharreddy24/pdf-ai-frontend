import React, { useState } from "react";
import { api } from "../api/client";

export default function PdfChat() {
  const [file, setFile] = useState(null);
  const [docId, setDocId] = useState("");
  const [uploading, setUploading] = useState(false);

  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]); // {role: 'user'|'ai', text, sources?}
  const [asking, setAsking] = useState(false);

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

      setDocId(res.data.doc_id);
      alert(`PDF uploaded! doc_id: ${res.data.doc_id}\nChunks stored: ${res.data.chunks}`);
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.error || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const ask = async () => {
    if (!docId) {
      alert("Upload a PDF first.");
      return;
    }
    if (!question.trim()) return;

    const userQ = question.trim();
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
        { role: "ai", text: res.data.answer, sources: res.data.sources || [] },
      ]);
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.error || "Ask failed");
    } finally {
      setAsking(false);
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

        <div style={{ marginTop: 10 }}>
          <b>doc_id:</b> {docId || "(upload a PDF)"}
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
            <p style={{ color: "#666" }}>Upload a PDF and ask something like “Summarize page 1”.</p>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} style={{ marginBottom: 14 }}>
                <div style={{ fontWeight: "bold" }}>
                  {msg.role === "user" ? "You" : "AI"}
                </div>
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
            placeholder="Ask something about the PDF..."
            style={{ flex: 1, padding: 10 }}
            onKeyDown={(e) => {
              if (e.key === "Enter") ask();
            }}
          />
          <button onClick={ask} disabled={asking} style={{ padding: "8px 14px" }}>
            {asking ? "Asking..." : "Ask"}
          </button>
        </div>
      </div>
    </div>
  );
}
