// src/components/MilitaryJobCodeField.jsx
import { useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

// O*NET's response shape can vary; treat "any non-empty list" as a match.
function hasMatches(data) {
  if (!data || typeof data !== "object") return false;
  return Object.values(data).some((v) =>
    Array.isArray(v) ? v.length > 0 : v && typeof v === "object" && hasMatches(v)
  );
}

export default function MilitaryJobCodeField({ value, onChange, id = "job-code", name = "job_code_or_title" }) {
  const [status, setStatus] = useState("idle"); // "idle" | "checking" | "ok" | "invalid"

  async function checkCode() {
    const code = value.trim();
    if (!code) return setStatus("idle");
    setStatus("checking");
    try {
      const res = await fetch(
        `${API}/api/jobs/military-search/?keyword=${encodeURIComponent(code)}`
      );
      const data = await res.json();
      setStatus(res.ok && hasMatches(data) ? "ok" : "invalid");
    } catch {
      setStatus("idle"); // lookup is down; don't block the user
    }
  }

  return (
    <div className="field-wrap">
      <div className="field">
        <label htmlFor={id}>Military job code (MOS / rating / AFSC)</label>
        <input
          id={id}
          name={name}
          placeholder="e.g. 0311"
          value={value}
          onChange={(e) => {
            setStatus("idle");
            onChange(e);
          }}
          onBlur={checkCode}
          aria-describedby={`${id}-note`}
          aria-invalid={status === "invalid"}
          required
        />
      </div>

      {status === "invalid" ? (
        <p id={`${id}-note`} className="field-note field-note--warn" role="alert">
          We couldn't find that code. Job codes get renumbered over time, so check
          your branch's current code for your job. You can look it up at{" "}
          <a href="https://www.mynextmove.org/vets/" target="_blank" rel="noreferrer">
            My Next Move for Veterans
          </a>.
        </p>
      ) : (
        <p id={`${id}-note`} className="field-note">
          {status === "checking" ? "Checking code…" : "Use your most recent code."}
        </p>
      )}
    </div>
  );
}