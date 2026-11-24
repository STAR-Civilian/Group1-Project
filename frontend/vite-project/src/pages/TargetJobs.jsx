// src/pages/TargetJobs.jsx
// Target jobs: shows the user's military job (from Experience), civilian jobs that
// match it (O*NET), a keyword search, and the jobs they've picked as targets.
//
// Backend used:
//   GET  /api/history/positions/            -> find the military job (mos_code, branch)
//   GET  /api/jobs/military-search/         -> civilian matches for that code ("career" list)
//   GET  /api/jobs/civilian-search/         -> keyword search ("occupation" list)
//   POST /api/llm/job-fit/                  -> "How do I fit?" (summary, transfers, gaps). Uses AI, so it costs tokens.
//   GET  /api/job-fits/                     -> fits already saved for this user (newest first), so we don't re-run the AI
//   GET/POST/DELETE /api/jobs/target-jobs/  -> the picked target jobs (saved on the server, so they follow the user)
//   GET  /api/jobs/occupation-details/      -> description + median salary for a list of job codes
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

// Picks that older versions of this page kept in this browser only.
// We copy them to the server once, then clear them.
function loadLocalTargets() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

// The server sends onet_code and salary_median. The page uses code and salaryMedian.
function toTarget(t) {
  return {
    id: t.id,
    code: t.onet_code,
    title: t.title,
    description: t.description,
    salaryMedian: t.salary_median,
  };
}

function formatSalary(amount) {
  if (amount == null) return "Not available";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

/* ---------- what the job is + what it pays ---------- */
function JobDetails({ description, salary, loading }) {
  if (!description && salary == null) {
    return <p className="muted">{loading ? "Loading details…" : "Details not available."}</p>;
  }
  return (
    <>
      {description && <p className="muted">{description}</p>}
      <p className="tj-salary">
        Median salary: <strong>{formatSalary(salary)}</strong>
      </p>
    </>
  );
}

/* ---------- one job in a results list ---------- */
function JobRow({ job, detail, detailsLoading, added, busy, onToggle }) {
  return (
    <li className="tj-row">
      <div className="tj-row__info">
        <div className="tj-row__title">
          <span>{job.title}</span>
        </div>
        <JobDetails
          description={detail?.description}
          salary={detail?.salary_median}
          loading={detailsLoading}
        />
      </div>
      <button
        type="button"
        className={`btn btn-sm ${added ? "btn-primary" : "btn-outline"}`}
        aria-pressed={added}
        disabled={busy}
        onClick={() => onToggle(job)}
      >
        {added ? "Added" : "+ Add"}
      </button>
    </li>
  );
}

/* ---------- "How do I fit?" result ---------- */
function FitPanel({ fit }) {
  if (fit.status === "loading") {
    return <p className="muted tj-fit">Checking your fit… this takes about 20 seconds.</p>;
  }
  if (fit.status === "error" && !fit.data) return <p className="form-error tj-fit">{fit.error}</p>;
  const { summary, transfers = [], gaps = [] } = fit.data || {};
  return (
    <div className="tj-fit">
      {fit.error && <p className="form-error">{fit.error} Showing your last saved fit.</p>}
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
      <p className="tj-ai-warning" role="note">
        <strong>Written by AI.</strong> AI can make mistakes. Always double-check this fit against
        your own experience and the job description.
      </p>
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

  const [targets, setTargets] = useState([]);        // saved on the server
  const [loadingTargets, setLoadingTargets] = useState(true);
  const [busy, setBusy] = useState({});              // onet code -> true while adding/removing
  const [details, setDetails] = useState({});        // onet code -> { description, salary_median }
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [fits, setFits] = useState({});              // onet code -> { status, data, createdAt, error }
  const [openFits, setOpenFits] = useState({});      // onet code -> true when its fit panel is showing
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false); // the "Add target jobs" window
  const [tab, setTab] = useState("matches");         // matches | search

  // Esc closes the window
  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e) => e.key === "Escape" && setModalOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen]);

  // Load the picked target jobs from the server
  useEffect(() => {
    apiFetch("/api/jobs/target-jobs/")
      .then(async (list) => {
        const saved = list.map(toTarget);

        // One time: copy picks that were only kept in this browser, then clear them
        const local = loadLocalTargets();
        let allCopied = true;
        for (const pick of local) {
          if (saved.some((t) => t.code === pick.code)) continue;
          try {
            const created = await apiFetch("/api/jobs/target-jobs/", {
              method: "POST",
              body: { onet_code: pick.code, title: pick.title },
            });
            saved.push(toTarget(created));
          } catch {
            allCopied = false;
          }
        }
        if (allCopied) localStorage.removeItem(STORAGE_KEY);

        setTargets(saved);
      })
      .catch((err) => (err.status === 401 ? navigate("/") : setError(err.message)))
      .finally(() => setLoadingTargets(false));
  }, [navigate]);

  // 1. Find the military job from Experience (most recent military position with a code)
  useEffect(() => {
    apiFetch("/api/history/positions/")
      .then((list) => setMilJob(list.find((p) => p.experience_type === "military" && p.mos_code) || null))
      .catch((err) => (err.status === 401 ? navigate("/") : setError(err.message)))
      .finally(() => setLoadingMil(false));
  }, [navigate]);

  // 1b. Load fits that are already saved, so we show them instead of calling the AI again
  useEffect(() => {
    apiFetch("/api/job-fits/")
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.results || [];
        const saved = {};
        for (const f of list) {
          // The list is newest first, so keep the first fit we see for each job code
          if (f.onet_code && !saved[f.onet_code]) {
            saved[f.onet_code] = { status: "done", data: f.content, createdAt: f.created_at };
          }
        }
        setFits((prev) => ({ ...saved, ...prev }));
      })
      .catch(() => {}); // not fatal: the user can still run "How do I fit?"
  }, []);

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
        // O*NET groups careers as most_duties, some_duties, or crosswalk ("also similar",
        // which is loose). Show the first two groups. If a code has none, fall back to all.
        const careers = data.career || [];
        const strong = careers.filter(
          (c) => c.match_type === "most_duties" || c.match_type === "some_duties"
        );
        setMatches((strong.length > 0 ? strong : careers).slice(0, MAX_MATCHES));
        setMatchStatus("done");
      })
      .catch((err) => {
        setError(err.message);
        setMatchStatus("error");
      });
  }, [milJob]);

  // Get the description and salary for the jobs shown in the lists below
  useEffect(() => {
    const codes = [...new Set([...matches, ...(searchResults || [])].map((j) => j.code))].filter(
      (code) => code && !(code in details)
    );
    if (codes.length === 0) return;

    // The server answers up to 20 codes per request
    const chunks = [];
    for (let i = 0; i < codes.length; i += 20) chunks.push(codes.slice(i, i + 20));

    setDetailsLoading(true);
    Promise.all(chunks.map((c) => apiFetch(`/api/jobs/occupation-details/?codes=${c.join(",")}`)))
      .then((results) => setDetails((d) => Object.assign({}, d, ...results)))
      .catch(() => {}) // not fatal: the rows just show "Details not available."
      .finally(() => setDetailsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches, searchResults]);

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

  async function toggleTarget(job) {
    if (busy[job.code]) return;
    setBusy((b) => ({ ...b, [job.code]: true }));
    setError("");
    try {
      const existing = targets.find((t) => t.code === job.code);
      if (existing) {
        await apiFetch(`/api/jobs/target-jobs/${existing.id}/`, { method: "DELETE" });
        setTargets((list) => list.filter((t) => t.code !== job.code));
      } else {
        const created = await apiFetch("/api/jobs/target-jobs/", {
          method: "POST",
          body: { onet_code: job.code, title: job.title },
        });
        setTargets((list) => [...list, toTarget(created)]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy((b) => ({ ...b, [job.code]: false }));
    }
  }

  function toggleFit(code) {
    setOpenFits((o) => ({ ...o, [code]: !o[code] }));
  }

  async function checkFit(job) {
    const previous = fits[job.code]; // a saved fit, if there is one
    setFits((f) => ({ ...f, [job.code]: { ...previous, status: "loading", error: "" } }));
    setOpenFits((o) => ({ ...o, [job.code]: true }));
    try {
      const res = await apiFetch("/api/llm/job-fit/", {
        method: "POST",
        body: { target_job_title: job.title, onet_code: job.code },
      });
      setFits((f) => ({
        ...f,
        [job.code]: { status: "done", data: res.content, createdAt: res.created_at },
      }));
    } catch (err) {
      // If we already had a saved fit, keep showing it along with the error
      setFits((f) => ({
        ...f,
        [job.code]: previous?.data
          ? { ...previous, status: "done", error: err.message }
          : { status: "error", error: err.message },
      }));
    }
  }

  function openModal() {
    setTab(milJob ? "matches" : "search");
    setModalOpen(true);
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
          <div className="tj-targets-head">
            <h2 id="targets-h">Your target jobs ({targets.length})</h2>
            <button type="button" className="btn btn-outline btn-sm" onClick={openModal}>
              + Add target jobs
            </button>
          </div>
          {loadingTargets ? (
            <p className="muted">Loading your target jobs…</p>
          ) : targets.length === 0 ? (
            <div className="exp-empty">No target jobs yet. Use “Add target jobs” to find some.</div>
          ) : (
            <ul className="tj-target-list">
              {targets.map((t) => {
                const fit = fits[t.code];
                const hasSaved = Boolean(fit?.data);
                const isLoading = fit?.status === "loading";
                const isOpen = Boolean(openFits[t.code]);
                return (
                <li key={t.code} className="exp-card">
                  <div className="exp-card__top">
                    <div>
                      <h3>{t.title}</h3>
                      <JobDetails description={t.description} salary={t.salaryMedian} />
                      {hasSaved && fit.createdAt && (
                        <p className="muted">
                          Fit saved {new Date(fit.createdAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="exp-card__actions">
                      {hasSaved ? (
                        <>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => toggleFit(t.code)}
                            aria-expanded={isOpen}
                          >
                            {isOpen ? "Hide my fit" : "View my fit"}
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => checkFit(t)}
                            disabled={isLoading}
                            title="Re-checks using your latest experience"
                          >
                            Refresh my fit
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => checkFit(t)}
                          disabled={isLoading}
                        >
                          How do I fit?
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => toggleTarget(t)}
                        disabled={Boolean(busy[t.code])}
                        aria-label={`Remove ${t.title}`}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  {fit && (isLoading || isOpen || (fit.status === "error" && !hasSaved)) && (
                    <FitPanel fit={fit} />
                  )}
                  {hasSaved && isOpen && !isLoading && (
                    <p className="tj-refresh-hint">
                      <strong>Added new experience?</strong> Use “Refresh my fit” to update this.
                    </p>
                  )}
                </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ---------- next step, bottom right ---------- */}
        {targets.length > 0 && (
          <div className="tj-footer">
            <Link to="/resume" className="btn btn-primary tj-next">
              Next: build my resume
            </Link>
          </div>
        )}

      </main>

      {modalOpen && (
        <div className="tj-modal-overlay" onClick={() => setModalOpen(false)}>
          <div
            className="tj-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tj-modal-h"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="tj-modal__head">
              <h2 id="tj-modal-h">Add target jobs</h2>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setModalOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="tj-modal__tabs" role="tablist">
              {milJob && (
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === "matches"}
                  className={`btn btn-sm ${tab === "matches" ? "btn-primary" : "btn-outline"}`}
                  onClick={() => setTab("matches")}
                >
                  Match my military job
                </button>
              )}
              <button
                type="button"
                role="tab"
                aria-selected={tab === "search"}
                className={`btn btn-sm ${tab === "search" ? "btn-primary" : "btn-outline"}`}
                onClick={() => setTab("search")}
              >
                Search any job
              </button>
            </div>

            <div className="tj-modal__body">
              {tab === "matches" && milJob && (
                <section aria-labelledby="matches-h">
                  <h3 id="matches-h">Civilian jobs that match {milJob.mos_code}</h3>
                  {matchStatus === "loading" && <p className="muted">Finding matches…</p>}
                  {matchStatus === "done" && matches.length === 0 && (
                    <div className="exp-empty">No matches found for this code. Try “Search any job”.</div>
                  )}
                  {matches.length > 0 && (
                    <ul className="tj-rows">
                      {matches.map((job) => (
                        <JobRow
                          key={job.code}
                          job={job}
                          detail={details[job.code]}
                          detailsLoading={detailsLoading}
                          added={isTarget(job.code)}
                          busy={Boolean(busy[job.code])}
                          onToggle={toggleTarget}
                        />
                      ))}
                    </ul>
                  )}
                </section>
              )}

              {(tab === "search" || !milJob) && (
                <section aria-labelledby="search-h">
                  <h3 id="search-h">Search any job</h3>
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
                        <JobRow
                          key={job.code}
                          job={job}
                          detail={details[job.code]}
                          detailsLoading={detailsLoading}
                          added={isTarget(job.code)}
                          busy={Boolean(busy[job.code])}
                          onToggle={toggleTarget}
                        />
                      ))}
                    </ul>
                  )}
                </section>
              )}
            </div>

            <div className="tj-modal__foot">
              <span className="muted">{targets.length} selected</span>
              <button type="button" className="btn btn-primary" onClick={() => setModalOpen(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}