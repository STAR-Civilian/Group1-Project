// src/pages/ResumePage.jsx
// Generate a resume for a target job, then edit, save, print or delete it.
//
// Backend used:
//   GET    /api/profile/me/                 -> name + contact for the resume header
//   GET    /api/history/positions/          -> positions to include
//   POST   /api/llm/generate-resume/        -> write a new resume (saved automatically)
//   GET    /api/resumes/                    -> saved resumes (list)
//   GET    /api/resumes/:id/                -> one resume
//   PATCH  /api/resumes/:id/                -> save edits ({ content })
//   DELETE /api/resumes/:id/
// Target jobs come from the Target jobs page (localStorage "targetJobs").


import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import { apiFetch } from "../api";
import "../css-styling/Experience.css"; // shared page styles (.exp ...)
import "../css-styling/ResumePage.css";


/* ---------- helpers ---------- */
// ["a", "b"] <-> "a\nb"  (lists are edited as one item per line)
const toLines = (arr = []) => arr.join("\n");
const fromLines = (text) =>
  text
    .split("\n")
    .map((s) => s.replace(/^\s*[•\-*]\s*/, "").trim())
    .filter(Boolean);

function loadTargets() {
  try {
    return JSON.parse(localStorage.getItem("targetJobs") || "[]");
  } catch {
    return [];
  }
}

// Saved content -> what the form edits
function toDraft(content = {}) {
  return {
    summary: content.summary || "",
    skills: toLines(content.skills),
    education: toLines(content.education),
    certifications: toLines(content.certifications),
    experience: (content.experience || []).map((j) => ({
      title: j.title || "",
      organization: j.organization || "",
      dates: j.dates || "",
      bullets: toLines(j.bullets),
    })),
    questions: content.questions_for_vet || [],
  };
}

// What the form edits -> saved content (same shape the backend validates)
function fromDraft(d) {
  return {
    summary: d.summary.trim(),
    skills: fromLines(d.skills),
    education: fromLines(d.education),
    certifications: fromLines(d.certifications),
    experience: d.experience.map((j) => ({
      title: j.title.trim(),
      organization: j.organization.trim(),
      dates: j.dates.trim(),
      bullets: fromLines(j.bullets),
    })),
    questions_for_vet: d.questions,
  };
}

const EMPTY_JOB = { title: "", organization: "", dates: "", bullets: "" };

/* ---------- printable version (only shows when printing) ---------- */
function PrintableResume({ profile, content }) {
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ");
  const place = [profile?.city, profile?.state].filter(Boolean).join(", ");
  const contact = [place, profile?.email, profile?.phone].filter(Boolean).join(" · ");
  return (
    <div className="rs-print">
      <h1>{name}</h1>
      {contact && <p className="rs-print__contact">{contact}</p>}
      <h2>Summary</h2>
      <p>{content.summary}</p>
      {content.skills.length > 0 && (
        <>
          <h2>Skills</h2>
          <p>{content.skills.join(" · ")}</p>
        </>
      )}
      {content.experience.length > 0 && (
        <>
          <h2>Experience</h2>
          {content.experience.map((j, i) => (
            <div key={i} className="rs-print__job">
              <div className="rs-print__job-head">
                <strong>{j.title}</strong>
                <span>{j.dates}</span>
              </div>
              <div>{j.organization}</div>
              <ul>
                {j.bullets.map((b, k) => (
                  <li key={k}>{b}</li>
                ))}
              </ul>
            </div>
          ))}
        </>
      )}
      {content.education.length > 0 && (
        <>
          <h2>Education</h2>
          <ul>{content.education.map((e, i) => <li key={i}>{e}</li>)}</ul>
        </>
      )}
      {content.certifications.length > 0 && (
        <>
          <h2>Certifications</h2>
          <ul>{content.certifications.map((c, i) => <li key={i}>{c}</li>)}</ul>
        </>
      )}
    </div>
  );
}

export default function ResumePage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const openId = params.get("id");

  const [profile, setProfile] = useState(null);
  const [positions, setPositions] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [targets] = useState(loadTargets);
  const [loading, setLoading] = useState(true);

  // generate form
  const [jobChoice, setJobChoice] = useState(() => loadTargets()[0]?.code || "other");
  const [customTitle, setCustomTitle] = useState("");
  const [jobNotes, setJobNotes] = useState("");
  const [extra, setExtra] = useState("");
  const [posIds, setPosIds] = useState([]);
  const [generating, setGenerating] = useState(false);

  // editor
  const [resume, setResume] = useState(null);
  const [draft, setDraft] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const handleErr = (err) => (err.status === 401 ? navigate("/") : setError(err.message));

  // Load profile, positions and saved resumes
  useEffect(() => {
    Promise.all([
      apiFetch("/api/profile/me/"),
      apiFetch("/api/history/positions/"),
      apiFetch("/api/resumes/"),
    ])
      .then(([prof, pos, list]) => {
        setProfile(prof);
        setPositions(pos);
        setPosIds(pos.map((p) => p.id)); // include all by default
        setResumes(list);
      })
      .catch(handleErr)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Open the resume in the URL (?id=5)
  useEffect(() => {
    if (!openId) return;
    apiFetch(`/api/resumes/${openId}/`)
      .then(openResume)
      .catch(handleErr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId]);

  function openResume(r) {
    setResume(r);
    setDraft(toDraft(r.content));
    setDirty(false);
    setMsg("");
    setError("");
  }

  function selectResume(id) {
    if (dirty && !window.confirm("You have unsaved changes. Leave this resume anyway?")) return;
    setParams({ id: String(id) });
  }

  /* ---------- generate ---------- */
  async function handleGenerate(e) {
    e.preventDefault();
    setError("");
    const target = targets.find((t) => t.code === jobChoice);
    const title = target ? target.title : customTitle.trim();
    if (!title) {
      setError("Choose a target job or type a job title.");
      return;
    }
    if (positions.length && posIds.length === 0) {
      setError("Include at least one position.");
      return;
    }
    setGenerating(true);
    try {
      const body = {
        target_job_title: title,
        onet_code: target ? target.code : "",
        job_notes: jobNotes,
        extra_details: extra,
      };
      if (posIds.length !== positions.length) body.position_ids = posIds;
      const created = await apiFetch("/api/llm/generate-resume/", { method: "POST", body });
      setResumes([created, ...resumes]);
      setParams({ id: String(created.id) });
    } catch (err) {
      handleErr(err);
    } finally {
      setGenerating(false);
    }
  }

  /* ---------- edit ---------- */
  function setField(key, value) {
    setDraft({ ...draft, [key]: value });
    setDirty(true);
    setMsg("");
  }
  function setJob(i, key, value) {
    setField(
      "experience",
      draft.experience.map((j, k) => (k === i ? { ...j, [key]: value } : j))
    );
  }
  const addJob = () => setField("experience", [...draft.experience, { ...EMPTY_JOB }]);
  const removeJob = (i) => setField("experience", draft.experience.filter((_, k) => k !== i));

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const updated = await apiFetch(`/api/resumes/${resume.id}/`, {
        method: "PATCH",
        body: { content: fromDraft(draft) },
      });
      openResume(updated);
      setMsg("Saved");
    } catch (err) {
      handleErr(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete the resume for "${resume.target_job_title}"?`)) return;
    try {
      await apiFetch(`/api/resumes/${resume.id}/`, { method: "DELETE" });
      setResumes(resumes.filter((r) => r.id !== resume.id));
      setParams({});
    } catch (err) {
      handleErr(err);
    }
  }

  const togglePos = (id) =>
    setPosIds(posIds.includes(id) ? posIds.filter((x) => x !== id) : [...posIds, id]);

  // Only show the editor for the resume named in the URL
  const showing = draft && resume && String(resume.id) === openId;

  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ");
  const contact = [
    [profile?.city, profile?.state].filter(Boolean).join(", "),
    profile?.email,
    profile?.phone,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="exp rs">
      <AppHeader />

      <main className="exp-main">
        <div className="exp-head">
          <h1>Your resume</h1>
          <p className="muted">
            Generate a resume for one of your target jobs, then edit anything you want.
          </p>
        </div>

        {error && <p className="form-error" role="alert">{error}</p>}

        <div className="exp-layout">
          {/* ---------- left: generate + saved list ---------- */}
          <aside className="rs-side">
            <form className="exp-form" onSubmit={handleGenerate} aria-labelledby="gen-h">
              <h2 id="gen-h">Generate a resume</h2>

              <div className="field">
                <label htmlFor="rs-job">Target job</label>
                <select id="rs-job" value={jobChoice} onChange={(e) => setJobChoice(e.target.value)}>
                  {targets.map((t) => (
                    <option key={t.code} value={t.code}>{t.title}</option>
                  ))}
                  <option value="other">Other (type a title)</option>
                </select>
              </div>
              {jobChoice === "other" && (
                <div className="field">
                  <label htmlFor="rs-title">Job title</label>
                  <input
                    id="rs-title"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="e.g. Project Manager"
                  />
                </div>
              )}
              {targets.length === 0 && (
                <p className="muted rs-hint">
                  Tip: pick jobs on <Link to="/jobs">Target jobs</Link> to choose them here.
                </p>
              )}

              {positions.length > 0 ? (
                <fieldset className="rs-positions">
                  <legend>Include these positions</legend>
                  {positions.map((p) => (
                    <label key={p.id} className="check">
                      <input type="checkbox" checked={posIds.includes(p.id)} onChange={() => togglePos(p.id)} />
                      {p.title}
                    </label>
                  ))}
                </fieldset>
              ) : (
                !loading && (
                  <p className="muted rs-hint">
                    Add at least one position on <Link to="/experience">Experience</Link> first.
                  </p>
                )
              )}

              <div className="field">
                <label htmlFor="rs-notes">Notes about the job (optional)</label>
                <textarea
                  id="rs-notes"
                  rows={3}
                  value={jobNotes}
                  onChange={(e) => setJobNotes(e.target.value)}
                  placeholder="Paste key lines from a job posting"
                />
              </div>
              <div className="field">
                <label htmlFor="rs-extra">Anything else to include (optional)</label>
                <textarea
                  id="rs-extra"
                  rows={3}
                  maxLength={3000}
                  value={extra}
                  onChange={(e) => setExtra(e.target.value)}
                  placeholder="Volunteer work, tools you know, clearance…"
                />
              </div>

              <button className="btn btn-primary" type="submit" disabled={generating || positions.length === 0}>
                {generating ? "Writing your resume…" : "Generate resume"}
              </button>
            </form>

            <section className="rs-saved" aria-labelledby="saved-h">
              <h2 id="saved-h">Saved resumes</h2>
              {loading ? (
                <p className="muted">Loading…</p>
              ) : resumes.length === 0 ? (
                <p className="muted">None yet.</p>
              ) : (
                <ul>
                  {resumes.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        className={`rs-saved__item${String(r.id) === openId ? " is-active" : ""}`}
                        onClick={() => selectResume(r.id)}
                      >
                        {r.target_job_title}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </aside>

          {/* ---------- right: editor ---------- */}
          <section className="rs-editor" aria-label="Resume editor">
            {!showing ? (
              <div className="exp-empty">
                Generate a resume, or open a saved one, to see it here.
              </div>
            ) : (
              <>
                <div className="rs-toolbar">
                  <h2>{resume.target_job_title}</h2>
                  <div className="rs-toolbar__actions">
                    {msg && <span className="rs-saved-msg" role="status">{msg}</span>}
                    <button className="btn btn-primary btn-sm" type="button" onClick={handleSave} disabled={!dirty || saving}>
                      {saving ? "Saving…" : "Save changes"}
                    </button>
                    <button className="btn btn-outline btn-sm" type="button" onClick={() => window.print()}>
                      Print / PDF
                    </button>
                    <button className="btn btn-outline btn-sm" type="button" onClick={handleDelete}>
                      Delete
                    </button>
                  </div>
                </div>

                {draft.questions.length > 0 && (
                  <div className="rs-questions">
                    <h3>Make it stronger</h3>
                    <ul>
                      {draft.questions.map((q, i) => <li key={i}>{q}</li>)}
                    </ul>
                  </div>
                )}

                <div className="rs-paper">
                  <div className="rs-paper__head">
                    <h2>{fullName || "Your name"}</h2>
                    {contact && <p className="muted">{contact}</p>}
                  </div>

                  <div className="field">
                    <label htmlFor="ed-summary">Summary</label>
                    <textarea id="ed-summary" rows={4} value={draft.summary} onChange={(e) => setField("summary", e.target.value)} />
                  </div>

                  <div className="field">
                    <label htmlFor="ed-skills">Skills (one per line)</label>
                    <textarea id="ed-skills" rows={5} value={draft.skills} onChange={(e) => setField("skills", e.target.value)} />
                  </div>

                  <div className="rs-section-head">
                    <h3>Experience</h3>
                    <button type="button" className="btn btn-outline btn-sm" onClick={addJob}>+ Add job</button>
                  </div>
                  {draft.experience.map((j, i) => (
                    <div key={i} className="rs-job">
                      <div className="field-row">
                        <div className="field">
                          <label htmlFor={`job-title-${i}`}>Title</label>
                          <input id={`job-title-${i}`} value={j.title} onChange={(e) => setJob(i, "title", e.target.value)} />
                        </div>
                        <div className="field">
                          <label htmlFor={`job-org-${i}`}>Organization</label>
                          <input id={`job-org-${i}`} value={j.organization} onChange={(e) => setJob(i, "organization", e.target.value)} />
                        </div>
                        <div className="field rs-dates">
                          <label htmlFor={`job-dates-${i}`}>Dates</label>
                          <input id={`job-dates-${i}`} value={j.dates} onChange={(e) => setJob(i, "dates", e.target.value)} />
                        </div>
                      </div>
                      <div className="field">
                        <label htmlFor={`job-bullets-${i}`}>Bullets (one per line)</label>
                        <textarea id={`job-bullets-${i}`} rows={4} value={j.bullets} onChange={(e) => setJob(i, "bullets", e.target.value)} />
                      </div>
                      <button type="button" className="btn btn-outline btn-sm rs-remove" onClick={() => removeJob(i)}>
                        Remove job
                      </button>
                    </div>
                  ))}

                  <div className="field">
                    <label htmlFor="ed-edu">Education (one per line)</label>
                    <textarea id="ed-edu" rows={3} value={draft.education} onChange={(e) => setField("education", e.target.value)} />
                  </div>

                  <div className="field">
                    <label htmlFor="ed-certs">Certifications (one per line)</label>
                    <textarea id="ed-certs" rows={3} value={draft.certifications} onChange={(e) => setField("certifications", e.target.value)} />
                  </div>
                </div>

                <Link to={`/star?resume=${resume.id}`} className="btn btn-primary rs-next">
                  Next: STAR answers
                </Link>

                <PrintableResume profile={profile} content={fromDraft(draft)} />
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}