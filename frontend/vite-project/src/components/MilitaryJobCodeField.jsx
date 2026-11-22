// src/components/MilitaryJobCodeField.jsx
// Job code input that checks the code against O*NET (via our backend)
// when the user leaves the field.
import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
const LOOKUP_URL = "https://www.mynextmove.org/vets/";

// O*NET only returns `military_match` when the keyword exactly matches a
// military code or title. (`career` is always returned, so we ignore it.)
function getMatches(data) {
  return data?.military_match ?? data?.military_matches?.match ?? [];
}

export default function MilitaryJobCodeField({
  value,
  onChange,
  branch = "",               // e.g. "marine_corps"; same codes O*NET uses
  id = "job-code",
  name = "job_code_or_title",
}) {
  // "idle" | "checking" | "ok" | "outdated" | "invalid"
  const [status, setStatus] = useState("idle");
  const [match, setMatch] = useState(null);

  // Branch changed: the old result no longer applies
  useEffect(() => {
    setStatus("idle");
    setMatch(null);
  }, [branch]);

  async function checkCode() {
    const code = value.trim();
    if (!code) return setStatus("idle");
    setStatus("checking");
    try {
      const params = new URLSearchParams({ keyword: code });
      if (branch) params.set("branch", branch);
      // jobs routes require login, so send the token when we have one
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/api/jobs/military-search/?${params}`, {
        headers: token ? { Authorization: `Token ${token}` } : {},
      });
      if (!res.ok) return setStatus("idle"); // lookup down; don't block the user
      const matches = getMatches(await res.json());
      const active = matches.find((m) => m.active);
      if (active) {
        setMatch(active);
        setStatus("ok");
      } else if (matches.length) {
        setMatch(matches[0]);
        setStatus("outdated");
      } else {
        setMatch(null);
        setStatus("invalid");
      }
    } catch {
      setStatus("idle");
    }
  }

  const lookupLink = (
    <a href={LOOKUP_URL} target="_blank" rel="noreferrer">
      My Next Move for Veterans
    </a>
  );

  let note;
  if (status === "checking") {
    note = <p id={`${id}-note`} className="field-note">Checking code…</p>;
  } else if (status === "ok") {
    note = (
      <p id={`${id}-note`} className="field-note field-note--ok">
        Found: {match.title}
      </p>
    );
  } else if (status === "outdated") {
    note = (
      <p id={`${id}-note`} className="field-note field-note--warn" role="alert">
        {match.code} ({match.title}) is no longer an active code. Use your job&apos;s
        current code. You can look it up at {lookupLink}.
      </p>
    );
  } else if (status === "invalid") {
    note = (
      <p id={`${id}-note`} className="field-note field-note--warn" role="alert">
        We couldn&apos;t find that code{branch ? " for this branch" : ""}. Job codes get
        renumbered over time, so check your current code. You can look it up at {lookupLink}.
      </p>
    );
  } else {
    note = <p id={`${id}-note`} className="field-note">Use your most recent code.</p>;
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
          aria-invalid={status === "invalid" || status === "outdated"}
          required
        />
      </div>
      {note}
    </div>
  );
}