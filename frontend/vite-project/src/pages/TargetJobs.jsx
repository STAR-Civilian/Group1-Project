// src/pages/TargetJobs.jsx
// Target jobs: shows the user's military job (from Experience), civilian jobs that
// match it (O*NET), a keyword search, and the jobs they've picked as targets.
//
// Backend used:
//   GET  /api/history/positions/            -> find the military job (mos_code, branch)
//   GET  /api/jobs/military-search/         -> civilian matches for that code ("career" list)
//   GET  /api/jobs/civilian-search/         -> keyword search ("occupation" list)
//   POST /api/llm/job-fit/                  -> "How do I fit?" (summary, transfers, gaps)
// There's no backend list of target jobs yet, so picks are kept in localStorage.
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import { apiFetch } from "../api";
import "../css-styling/Experience.css"; // shared page styles (.exp ...)
import "../css-styling/TargetJobs.css";

const STORAGE_KEY = "targetJobs";
const MAX_MATCHES = 20;

const BRANCH_LABELS = {
  army: "Army",
  navy: "Navy",
  air_force: "Air Force",
  marine_corps: "Marine Corps",
  coast_guard: "Coast Guard",
  space_force: "Space Force",
};

function loadTargets() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

/* ---------- one job in a results list ---------- */
function JobRow({ job, added, onToggle }) {
  const extra = [job.preparation_needed, job.pay_grade].filter(Boolean).join(" · ");
  return (
    <li className="tj-row">
      <div className="tj-row__info">
        <div className="tj-row__title">
          <span>{job.title}</span>
          {job.tags?.bright_outlook && <span className="tag tag--bright">Bright outlook</span>}
        </div>
        <p className="muted">
          {job.code}
          {extra && ` · ${extra}`}
        </p>
      </div>
      <button
        type="button"
        className={`btn btn-sm ${added ? "btn-primary" : "btn-outline"}`}
        aria-pressed={added}
        onClick={() => onToggle(job)}
      >
        {added ? "Added" : "+ Add"}
      </button>
    </li>
  );
}

/* ---------- "How do I fit?" result ---------- */
function FitPanel({ fit }) {
  if (fit.status === "loading") return <p className="muted tj-fit">Checking your fit…</p>;
  if (fit.status === "error") return <p className="form-error tj-fit">{fit.error}</p>;
  const { summary, transfers = [], gaps = [] } = fit.data || {};
  return (
    <div className="tj-fit">
      {summary && <p>{summary}</p>}
      {transfers.length > 0 && (
        <>
          <h4>What transfers</h4>
          <ul>
            {transfers.map((t, i) => (
              <li key={i}>
                <strong>{t.skill}</strong>: {t.why}
                {t.from_experience && <span className="muted"> ({t.from_experience})</span>}
              </li>
            ))}
          </ul>
        </>
      )}
      {gaps.length > 0 && (
        <>
          <h4>What to work on</h4>
          <ul>
            {gaps.map((g, i) => (
              <li key={i}>
                {g.item} <span className="muted">{g.how_to_close}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default function TargetJobs() {
  const navigate = useNavigate();

  const [milJob, setMilJob] = useState(null);       // a military Position from Experience
  const [loadingMil, setLoadingMil] = useState(true);
  const [matches, setMatches] = useState([]);
  const [matchTitle, setMatchTitle] = useState("");
  const [matchStatus, setMatchStatus] = useState("idle"); // idle | loading | done | error

  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);

  const [targets, setTargets] = useState(loadTargets);
  const [fits, setFits] = useState({});              // onet code -> { status, data, error }
  const [error, setError] = useState("");

  // Keep picks between visits
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(targets));
  }, [targets]);

  // 1. Find the military job from Experience (most recent military position with a code)
  useEffect(() => {
    apiFetch("/api/history/positions/")
      .then((list) => setMilJob(list.find((p) => p.experience_type === "military" && p.mos_code) || null))
      .catch((err) => (err.status === 401 ? navigate("/") : setError(err.message)))
      .finally(() => setLoadingMil(false));
  }, [navigate]);

  // 2. Get civilian jobs that match it
  useEffect(() => {
    if (!milJob) return;
    setMatchStatus("loading");
    const params = new URLSearchParams({ keyword: milJob.mos_code });
    if (milJob.branch) params.set("branch", milJob.branch);
    apiFetch(`/api/jobs/military-search/?${params}`)
      .then((data) => {
        const mil = data.military_match || [];
        setMatchTitle((mil.find((m) => m.active) || mil[0])?.title || "");
        setMatches((data.career || []).slice(0, MAX_MATCHES));
        setMatchStatus("done");
      })
      .catch((err) => {
        setError(err.message);
        setMatchStatus("error");
      });
  }, [milJob]);

  async function handleSearch(e) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setError("");
    try {
      const data = await apiFetch(`/api/jobs/civilian-search/?keyword=${encodeURIComponent(q)}`);
      setSearchResults((data.occupation || []).slice(0, MAX_MATCHES));
    } catch (err) {
      setError(err.message);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  const isTarget = (code) => targets.some((t) => t.code === code);

  function toggleTarget(job) {
    setTargets(
      isTarget(job.code)
        ? targets.filter((t) => t.code !== job.code)
        : [...targets, { code: job.code, title: job.title }]
    );
  }

  async function checkFit(job) {
    setFits((f) => ({ ...f, [job.code]: { status: "loading" } }));
    try {
      const res = await apiFetch("/api/llm/job-fit/", {
        method: "POST",
        body: { target_job_title: job.title, onet_code: job.code },
      });
      setFits((f) => ({ ...f, [job.code]: { status: "done", data: res.content } }));
    } catch (err) {
      setFits((f) => ({ ...f, [job.code]: { status: "error", error: err.message } }));
    }
  }

  return (
    <div className="exp tj">
      <AppHeader />

      <main className="exp-main">
        <div className="exp-head">
          <h1>Target jobs</h1>
          <p className="muted">
            Pick the civilian jobs you want. Your resume and STAR answers are tailored to these.
          </p>
        </div>

        {error && <p className="form-error" role="alert">{error}</p>}

        {/* ---------- military job ---------- */}
        <section className="tj-mil" aria-labelledby="mil-h">
          {loadingMil ? (
            <p className="muted">Loading your military job…</p>
          ) : milJob ? (
            <>
              <div>
                <span className="tj-label" id="mil-h">YOUR MILITARY JOB</span>
                <h2>
                  {milJob.mos_code} · {matchTitle || milJob.title}
                </h2>
                <p className="muted">
                  {[BRANCH_LABELS[milJob.branch], milJob.rank, milJob.unit].filter(Boolean).join(" · ")}
                </p>
              </div>
              <Link to="/experience" className="btn btn-outline btn-sm">Edit</Link>
            </>
          ) : (
            <>
              <div>
                <span className="tj-label" id="mil-h">YOUR MILITARY JOB</span>
                <h2>Not added yet</h2>
                <p className="muted">
                  Add a military position with your job code on the Experience page to see matching jobs.
                </p>
              </div>
              <Link to="/experience" className="btn btn-primary">Go to Experience</Link>
            </>
          )}
        </section>

        {/* ---------- picked target jobs ---------- */}
        <section className="tj-targets" aria-labelledby="targets-h">
          <h2 id="targets-h">Your target jobs ({targets.length})</h2>
          {targets.length === 0 ? (
            <div className="exp-empty">No target jobs yet. Add some from the lists below.</div>
          ) : (
            <ul className="tj-target-list">
              {targets.map((t) => (
                <li key={t.code} className="exp-card">
                  <div className="exp-card__top">
                    <div>
                      <h3>{t.title}</h3>
                      <p className="muted">{t.code}</p>
                    </div>
                    <div className="exp-card__actions">
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => checkFit(t)}
                        disabled={fits[t.code]?.status === "loading"}
                      >
                        How do I fit?
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => toggleTarget(t)}
                        aria-label={`Remove ${t.title}`}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  {fits[t.code] && <FitPanel fit={fits[t.code]} />}
                </li>
              ))}
            </ul>
          )}
          {targets.length > 0 && (
            <Link to="/resume" className="btn btn-primary tj-next">
              Next: build my resume
            </Link>
          )}
        </section>

        {/* ---------- matches for the military job ---------- */}
        {milJob && (
          <section className="tj-results" aria-labelledby="matches-h">
            <h2 id="matches-h">Civilian jobs that match {milJob.mos_code}</h2>
            {matchStatus === "loading" && <p className="muted">Finding matches…</p>}
            {matchStatus === "done" && matches.length === 0 && (
              <div className="exp-empty">No matches found for this code. Try a keyword search below.</div>
            )}
            {matches.length > 0 && (
              <ul className="tj-rows">
                {matches.map((job) => (
                  <JobRow key={job.code} job={job} added={isTarget(job.code)} onToggle={toggleTarget} />
                ))}
              </ul>
            )}
          </section>
        )}

        {/* ---------- keyword search ---------- */}
        <section className="tj-results" aria-labelledby="search-h">
          <h2 id="search-h">Search any job</h2>
          <form className="tj-search" role="search" onSubmit={handleSearch}>
            <div className="field">
              <label htmlFor="tj-q">Job title or keyword</label>
              <input
                id="tj-q"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. logistics, project manager"
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={searching}>
              {searching ? "Searching…" : "Search"}
            </button>
          </form>
          {searchResults && searchResults.length === 0 && !searching && (
            <div className="exp-empty">No jobs found. Try a different keyword.</div>
          )}
          {searchResults && searchResults.length > 0 && (
            <ul className="tj-rows">
              {searchResults.map((job) => (
                <JobRow key={job.code} job={job} added={isTarget(job.code)} onToggle={toggleTarget} />
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}