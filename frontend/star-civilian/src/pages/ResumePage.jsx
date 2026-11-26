// src/pages/ResumePage.jsx
// Pick a saved resume (dropdown), create a new one (window). A resume opens as a finished
// preview; "Edit resume" switches to the form, and saving goes back to the preview.
//
// Backend used:
//   GET    /api/profile/me/                 -> name + contact for the resume header
//   GET    /api/history/positions/          -> positions to include
//   POST   /api/llm/generate-resume/        -> write a new resume (saved automatically)
//   GET    /api/resumes/                    -> saved resumes (list)
//   GET    /api/resumes/:id/                -> one resume
//   PATCH  /api/resumes/:id/                -> save edits ({ content })
//   DELETE /api/resumes/:id/
//   GET    /api/jobs/target-jobs/           -> the target jobs picked on the Target jobs page


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

// Any [bracketed placeholder] left in the resume, like "[add team size]" or "[confirm]"
const hasPlaceholders = (content) => /\[[^\]]+\]/.test(JSON.stringify(content));

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

// Links show as short titles instead of long URLs
function profileLinks(p) {
  return [
    { url: p.linkedin_url, title: "LinkedIn" },
    { url: p.github_url, title: "GitHub" },
    { url: p.website_url, title: p.website_title || "Website" },
  ].filter((l) => l.url);
}

// Everything under the name: place, email, phone, then links
function ContactLine({ profile, className }) {
  if (!profile) return null;
  const parts = [
    [profile.city, profile.state].filter(Boolean).join(", "),
    profile.email,
    profile.phone,
  ].filter(Boolean);
  const links = profileLinks(profile);
  if (!parts.length && !links.length) return null;
  return (
    <p className={className}>
      {parts.join(" · ")}
      {links.map((l) => (
        <span key={l.url}>
          {" · "}
          <a href={l.url} target="_blank" rel="noreferrer">{l.title}</a>
        </span>
      ))}
    </p>
  );
}

// "Nov 24" next to the title so two resumes for the same job can be told apart
function resumeLabel(r) {
  const date = r.created_at
    ? new Date(r.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" })
    : "";
  return [r.target_job_title, date].filter(Boolean).join(" · ");
}

// Shows [bracketed] gaps highlighted so they are easy to spot
function withHighlights(text) {
  return String(text)
    .split(/(\[[^\]]+\])/g)
    .map((part, i) =>
      /^\[[^\]]+\]$/.test(part) ? <mark key={i} className="rs-ph">{part}</mark> : part
    );
}

// Messages shown while the AI writes the resume (it can take up to a minute)
const WORKING_STEPS = [
  "Reading your experience…",
  "Choosing what matters most for this job…",
  "Writing your bullet points…",
  "Checking the details…",
];

/* ---------- finished preview (what the resume will look like) ---------- */
function ResumePreview({ profile, content }) {
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ");
  return (
    <article className="rs-preview" aria-label="Resume preview">
      <div className="rs-preview__head">
        <h2 className="rs-preview__name">{name || "Your name"}</h2>
        <ContactLine profile={profile} className="rs-preview__contact" />
      </div>
      <h3>Summary</h3>
      <p>{withHighlights(content.summary)}</p>
      {content.skills.length > 0 && (
        <>
          <h3>Skills</h3>
          <p>{content.skills.join(" · ")}</p>
        </>
      )}
      {content.experience.length > 0 && (
        <>
          <h3>Experience</h3>
          {content.experience.map((j, i) => (
            <div key={i} className="rs-preview__job">
              <div className="rs-preview__job-head">
                <strong>{j.title}</strong>
                <span>{j.dates}</span>
              </div>
              <div>{j.organization}</div>
              <ul>
                {j.bullets.map((b, k) => (
                  <li key={k}>{withHighlights(b)}</li>
                ))}
              </ul>
            </div>
          ))}
        </>
      )}
      {content.education.length > 0 && (
        <>
          <h3>Education</h3>
          <ul>{content.education.map((e, i) => <li key={i}>{e}</li>)}</ul>
        </>
      )}
      {content.certifications.length > 0 && (
        <>
          <h3>Certifications</h3>
          <ul>{content.certifications.map((c, i) => <li key={i}>{c}</li>)}</ul>
        </>
      )}
    </article>
  );
}

/* ---------- printable version (only shows when printing) ---------- */
function PrintableResume({ profile, content }) {
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ");
  return (
    <div className="rs-print">
      {/* The empty header/footer rows repeat on every printed page: they are the top and bottom margins */}
      <table className="rs-print__table">
        <thead>
          <tr><td><div className="rs-print__gap" /></td></tr>
        </thead>
        <tfoot>
          <tr><td><div className="rs-print__gap" /></td></tr>
        </tfoot>
        <tbody>
          <tr>
            <td className="rs-print__body">
              <h1>{name}</h1>
              <ContactLine profile={profile} className="rs-print__contact" />
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
            </td>
          </tr>
        </tbody>
      </table>
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
  const [targets, setTargets] = useState([]); // saved on the server
  const [loading, setLoading] = useState(true);

  // "New resume" window
  const [modalOpen, setModalOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [jobChoice, setJobChoice] = useState("other");
  const [customTitle, setCustomTitle] = useState("");
  const [jobNotes, setJobNotes] = useState("");
  const [extra, setExtra] = useState("");
  const [posIds, setPosIds] = useState([]);
  const [generating, setGenerating] = useState(false);

  // editor
  const [resume, setResume] = useState(null);
  const [draft, setDraft] = useState(null);
  const [editing, setEditing] = useState(false); // false = finished preview, true = the form
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [workStep, setWorkStep] = useState(0);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  // The PDF's file name comes from the page title while printing
  useEffect(() => {
    if (!resume) return;
    const previous = document.title;
    const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ");
    document.title = name ? `${name} - Resume` : "Resume";
    return () => {
      document.title = previous;
    };
  }, [resume, profile]);

  // Warn before closing the tab with unsaved edits
  useEffect(() => {
    if (!dirty) return;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // While the resume is being written, move through the progress messages
  useEffect(() => {
    if (!generating) {
      setWorkStep(0);
      return;
    }
    const timer = setInterval(
      () => setWorkStep((n) => Math.min(n + 1, WORKING_STEPS.length - 1)),
      7000
    );
    return () => clearInterval(timer);
  }, [generating]);

  // Esc closes the window (not while a resume is being written)
  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape" && !generating) {
        setModalOpen(false);
        setError("");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen, generating]);

  const handleErr = (err) => (err.status === 401 ? navigate("/") : setError(err.message));

  // Load profile, positions and saved resumes
  useEffect(() => {
    Promise.all([
      apiFetch("/api/profile/me/"),
      apiFetch("/api/history/positions/"),
      apiFetch("/api/resumes/"),
      apiFetch("/api/jobs/target-jobs/"),
    ])
      .then(([prof, pos, list, targetList]) => {
        const picked = targetList.map((t) => ({ code: t.onet_code, title: t.title }));
        setTargets(picked);
        setJobChoice(picked[0]?.code || "other");
        setProfile(prof);
        setPositions(pos);
        setPosIds(pos.map((p) => p.id)); // include all by default
        setResumes(list);
        // Nothing open yet: open the newest resume
        if (!openId && list.length > 0) {
          setParams({ id: String(list[0].id) }, { replace: true });
        }
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
    setEditing(false);
    setMsg("");
    setError("");
  }

  function selectResume(id) {
    if (String(id) === openId) return;
    if (dirty && !window.confirm("You have unsaved changes. Leave this resume anyway?")) return;
    setParams({ id: String(id) });
  }

  /* ---------- new resume window ---------- */
  function openModal() {
    if (dirty && !window.confirm("You have unsaved changes. Create a new resume anyway?")) return;
    setError("");
    setModalOpen(true);
  }
  function closeModal() {
    if (generating) return;
    setModalOpen(false);
    setError("");
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
      setModalOpen(false);
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
      window.scrollTo({ top: 0, behavior: "smooth" });
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
      const rest = resumes.filter((r) => r.id !== resume.id);
      setResumes(rest);
      setResume(null);
      setDraft(null);
      setDirty(false);
      setParams(rest.length > 0 ? { id: String(rest[0].id) } : {});
    } catch (err) {
      handleErr(err);
    }
  }

  function handlePrint() {
    if (
      hasPlaceholders(fromDraft(draft)) &&
      !window.confirm(
        "Your resume still has [bracketed] items to fill in. Print anyway?"
      )
    ) {
      return;
    }
    window.print();
  }

  function startEditing() {
    setMsg("");
    setEditing(true);
  }

  function cancelEditing() {
    if (dirty && !window.confirm("Discard your changes?")) return;
    setDraft(toDraft(resume.content));
    setDirty(false);
    setEditing(false);
  }

  const togglePos = (id) =>
    setPosIds(posIds.includes(id) ? posIds.filter((x) => x !== id) : [...posIds, id]);
  const showing = draft && resume && String(resume.id) === openId;
  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ");
  const genTitle = targets.find((t) => t.code === jobChoice)?.title || customTitle.trim();
  const currentContent = draft ? fromDraft(draft) : null;
  const tipPlaceholders = currentContent ? hasPlaceholders(currentContent) : false;
  const showTips = !!draft && (draft.questions.length > 0 || tipPlaceholders);

  return (
    <div className="exp rs">
      <AppHeader />

      <main className="exp-main">
        <div className="rs-head-row">
          <div className="exp-head">
            <h1>Your resume</h1>
            <p className="muted">
              One resume for each target job. Edit anything you want. Your name and contact info
              come from your <Link to="/dashboard">profile</Link>.
            </p>
          </div>
          {resumes.length > 0 && (
            <button type="button" className="btn btn-outline btn-sm" onClick={openModal}>
              + New resume
            </button>
          )}
        </div>

        {error && !modalOpen && <p className="form-error" role="alert">{error}</p>}

        {/* ---------- saved resumes: pick one ---------- */}
        {resumes.length > 0 && (
          <div className="rs-picker">
            <div className="field rs-picker__field">
              <label htmlFor="rs-pick">Your saved resumes</label>
              <select id="rs-pick" value={openId || ""} onChange={(e) => selectResume(e.target.value)}>
                {resumes.map((r) => (
                  <option key={r.id} value={r.id}>{resumeLabel(r)}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {!loading && resumes.length === 0 && (
          <div className="exp-empty exp-empty--action">
            <p>You don't have a resume yet. Create one for a target job.</p>
            <button type="button" className="btn btn-primary" onClick={openModal}>
              Generate your first resume
            </button>
          </div>
        )}

        <div className="exp-layout">
          {/* ---------- editor ---------- */}
          <section className="rs-editor" aria-label="Resume editor">
            {!showing ? (
              loading || resumes.length > 0 ? <p className="muted">Loading…</p> : null
            ) : (
              <>
                <div className={`rs-grid${showTips ? " has-tips" : ""}`}>
                  <div className="rs-grid__main">
                    {editing ? (
                      <div className="rs-paper">
                        <div className="rs-paper__head">
                          <h2>{fullName || "Your name"}</h2>
                          <ContactLine profile={profile} className="muted rs-contact-line" />
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
                    ) : (
                      <>
                        <ResumePreview profile={profile} content={currentContent} />
                      </>
                    )}
                  </div>

                  {showTips && (
                    <aside className="rs-tips" aria-label="Tips for this resume">
                      {draft.questions.length > 0 && (
                        <div className="rs-tips__block">
                          <h2>Make it stronger</h2>
                          <p>
                            Answering these in <strong>Edit resume</strong> adds detail a hiring manager
                            will look for.
                          </p>
                          <ul>
                            {draft.questions.map((q, i) => <li key={i}>{q}</li>)}
                          </ul>
                        </div>
                      )}
                      {tipPlaceholders && (
                        <div className="rs-tips__block">
                          <h2>Fill in the gaps</h2>
                          <p>
                            Items in <mark className="rs-ph">[yellow brackets]</mark> need your input.
                            {editing
                              ? " Replace each one with your details."
                              : " Choose Edit resume to fill them in."}
                          </p>
                        </div>
                      )}
                    </aside>
                  )}
                </div>

                {/* ---------- actions: stay at the bottom of the screen while you scroll ---------- */}
                <div className="rs-actions">
                  {editing ? (
                    <>
                      <div className="rs-actions__left">
                        <span className={`rs-status${dirty ? " is-dirty" : ""}`} role="status">
                          {dirty ? "Unsaved changes" : ""}
                        </span>
                        <button type="button" className="rs-linkbtn" onClick={cancelEditing}>
                          Cancel
                        </button>
                      </div>
                      <div className="rs-actions__right">
                        <button
                          className={`btn btn-sm ${dirty ? "btn-primary" : "btn-outline"}`}
                          type="button"
                          onClick={handleSave}
                          disabled={!dirty || saving}
                        >
                          {saving ? "Saving…" : "Save changes"}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="rs-actions__left">
                        <span className={`rs-status${msg ? " is-saved" : ""}`} role="status">
                          {msg ? `✓ ${msg}` : ""}
                        </span>
                        <button type="button" className="rs-delete" onClick={handleDelete}>
                          Delete this resume
                        </button>
                      </div>
                      <div className="rs-actions__right">
                        <button className="btn btn-outline btn-sm" type="button" onClick={startEditing}>
                          Edit resume
                        </button>
                        <button className="btn btn-outline btn-sm" type="button" onClick={handlePrint}>
                          Print / PDF
                        </button>
                        <Link to={`/star?resume=${resume.id}`} className="btn btn-primary btn-sm">
                          Next: STAR answers
                        </Link>
                      </div>
                    </>
                  )}
                </div>

                <PrintableResume profile={profile} content={fromDraft(draft)} />
              </>
            )}
          </section>
        </div>
      </main>

      {/* ---------- "New resume" window ---------- */}
      {modalOpen && (
        <div
          className="rs-modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <form
            className="rs-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="gen-h"
            onSubmit={handleGenerate}
          >
            <div className="rs-modal__head">
              <h2 id="gen-h">{generating ? "Writing your resume" : "New resume"}</h2>
              {!generating && (
                <button type="button" className="btn btn-outline btn-sm" onClick={closeModal}>
                  Close
                </button>
              )}
            </div>

            {generating ? (
              <div className="rs-working" role="status" aria-live="polite">
                <div className="rs-spinner" aria-hidden="true" />
                <p className="rs-working__title">
                  We're writing your resume{genTitle ? ` for ${genTitle}` : ""}.
                </p>
                <p className="rs-working__step">{WORKING_STEPS[workStep]}</p>
                <p className="muted rs-working__note">
                  This can take up to a minute. Please keep this window open.
                </p>
              </div>
            ) : (
              <div className="rs-modal__body">
                {error && <p className="form-error" role="alert">{error}</p>}

                <div className="field">
                  <label htmlFor="rs-job">Target job</label>
                  <select
                    id="rs-job"
                    autoFocus
                    value={jobChoice}
                    onChange={(e) => setJobChoice(e.target.value)}
                    disabled={generating}
                  >
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
                      disabled={generating}
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
                        <input
                          type="checkbox"
                          checked={posIds.includes(p.id)}
                          onChange={() => togglePos(p.id)}
                          disabled={generating}
                        />
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

                {showDetails ? (
                  <>
                    <div className="field">
                      <label htmlFor="rs-notes">Notes about the job (optional)</label>
                      <textarea
                        id="rs-notes"
                        rows={3}
                        value={jobNotes}
                        onChange={(e) => setJobNotes(e.target.value)}
                        placeholder="Paste key lines from a job posting"
                        disabled={generating}
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
                        disabled={generating}
                      />
                    </div>
                  </>
                ) : (
                  <button type="button" className="rs-more" onClick={() => setShowDetails(true)}>
                    Add details about the job (optional)
                  </button>
                )}
              </div>
            )}

            {!generating && (
              <div className="rs-modal__foot">
                <button type="button" className="btn btn-outline" onClick={closeModal}>
                  Cancel
                </button>
                <button className="btn btn-primary" type="submit" disabled={positions.length === 0}>
                  Generate resume
                </button>
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
