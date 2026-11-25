// src/pages/StarPage.jsx
// STAR interview answers for one saved resume: generate, edit, rewrite, delete.
//
// Backend used:
//   GET    /api/resumes/                          -> saved resumes (picker)
//   GET    /api/resumes/:id/star-answers/         -> answers for one resume
//   POST   /api/llm/resumes/:id/generate-star/    -> add new answers ({ count, job_notes })
//   PATCH  /api/star-answers/:id/                 -> save edits
//   POST   /api/llm/star-answers/:id/rewrite/     -> turn the vet's own words into STAR ({ answer_text })
//   DELETE /api/star-answers/:id/
// The resume page links here with /star?resume=5.
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import { apiFetch } from "../api";
import "../css-styling/Experience.css"; // shared page styles (.exp ...)
import "../css-styling/StarPage.css";

const PARTS = [
  { key: "situation", label: "Situation" },
  { key: "task", label: "Task" },
  { key: "action", label: "Action" },
  { key: "result", label: "Result" },
];

/* ---------- one answer card ---------- */
function AnswerCard({ answer, onSaved, onDelete, onError }) {
  const [mode, setMode] = useState("view"); // "view" | "edit" | "rewrite"
  const [draft, setDraft] = useState(answer);
  const [ownWords, setOwnWords] = useState("");
  const [busy, setBusy] = useState(false);

  function startEdit() {
    setDraft(answer);
    setMode("edit");
  }

  async function saveEdit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const body = { question: draft.question };
      PARTS.forEach(({ key }) => (body[key] = draft[key]));
      const updated = await apiFetch(`/api/star-answers/${answer.id}/`, { method: "PATCH", body });
      onSaved(updated);
      setMode("view");
    } catch (err) {
      onError(err);
    } finally {
      setBusy(false);
    }
  }

  async function rewrite(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const updated = await apiFetch(`/api/llm/star-answers/${answer.id}/rewrite/`, {
        method: "POST",
        body: { answer_text: ownWords },
      });
      onSaved(updated);
      setOwnWords("");
      setMode("view");
    } catch (err) {
      onError(err);
    } finally {
      setBusy(false);
    }
  }

  const set = (k) => (e) => setDraft({ ...draft, [k]: e.target.value });

  return (
    <li className={`exp-card star-card${mode !== "view" ? " is-editing" : ""}`}>
      <div className="exp-card__top">
        <div>
          {answer.skill && <span className="tag tag--military">{answer.skill}</span>}
          <h3>{answer.question}</h3>
        </div>
        {mode === "view" && (
          <div className="exp-card__actions">
            <button type="button" className="btn btn-outline btn-sm" onClick={startEdit}>
              Edit
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setMode("rewrite")}>
              Use my words
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => onDelete(answer)}
              aria-label={`Delete answer to: ${answer.question}`}
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {mode === "view" && (
        <>
          <dl className="star-parts">
            {PARTS.map(({ key, label }) => (
              <div key={key} className="star-part">
                <dt>{label}</dt>
                <dd>{answer[key]}</dd>
              </div>
            ))}
          </dl>
          {answer.tip && <p className="star-tip"><strong>Tip:</strong> {answer.tip}</p>}
        </>
      )}

      {mode === "edit" && (
        <form className="star-edit" onSubmit={saveEdit}>
          <div className="field">
            <label htmlFor={`q-${answer.id}`}>Question</label>
            <input id={`q-${answer.id}`} value={draft.question} onChange={set("question")} required />
          </div>
          {PARTS.map(({ key, label }) => (
            <div key={key} className="field">
              <label htmlFor={`${key}-${answer.id}`}>{label}</label>
              <textarea id={`${key}-${answer.id}`} rows={3} value={draft[key]} onChange={set(key)} />
            </div>
          ))}
          <div className="exp-form__actions">
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save changes"}
            </button>
            <button className="btn btn-outline" type="button" onClick={() => setMode("view")}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {mode === "rewrite" && (
        <form className="star-edit" onSubmit={rewrite}>
          <div className="field">
            <label htmlFor={`own-${answer.id}`}>Your answer, in your own words</label>
            <textarea
              id={`own-${answer.id}`}
              rows={5}
              maxLength={3000}
              value={ownWords}
              onChange={(e) => setOwnWords(e.target.value)}
              placeholder="Tell the story however it comes out. We'll shape it into STAR."
              required
            />
          </div>
          <p className="muted star-note">This replaces the current Situation, Task, Action and Result.</p>
          <div className="exp-form__actions">
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? "Rewriting…" : "Rewrite in STAR"}
            </button>
            <button className="btn btn-outline" type="button" onClick={() => setMode("view")}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </li>
  );
}

/* ---------- page ---------- */
export default function StarPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const resumeId = params.get("resume");

  const [resumes, setResumes] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [answersFor, setAnswersFor] = useState(null); // which resume the answers belong to
  const [count, setCount] = useState(5);
  const [jobNotes, setJobNotes] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const loadingAnswers = answersFor !== resumeId;

  const handleErr = (err) => (err.status === 401 ? navigate("/") : setError(err.message));

  // Load saved resumes; open the newest one if none is in the URL
  useEffect(() => {
    apiFetch("/api/resumes/")
      .then((list) => {
        setResumes(list);
        if (!resumeId && list.length) setParams({ resume: String(list[0].id) }, { replace: true });
      })
      .catch(handleErr)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load answers for the chosen resume
  useEffect(() => {
    if (!resumeId) return;
    apiFetch(`/api/resumes/${resumeId}/star-answers/`)
      .then(setAnswers)
      .catch(handleErr)
      .finally(() => setAnswersFor(resumeId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeId]);

  async function handleGenerate(e) {
    e.preventDefault();
    setError("");
    setGenerating(true);
    try {
      const data = await apiFetch(`/api/llm/resumes/${resumeId}/generate-star/`, {
        method: "POST",
        body: { count: Number(count), job_notes: jobNotes },
      });
      setAnswers([...data.answers, ...answers]);
    } catch (err) {
      handleErr(err);
    } finally {
      setGenerating(false);
    }
  }

  const replaceAnswer = (updated) =>
    setAnswers(answers.map((a) => (a.id === updated.id ? updated : a)));

  async function handleDelete(a) {
    if (!window.confirm(`Delete the answer to "${a.question}"?`)) return;
    try {
      await apiFetch(`/api/star-answers/${a.id}/`, { method: "DELETE" });
      setAnswers(answers.filter((x) => x.id !== a.id));
    } catch (err) {
      handleErr(err);
    }
  }

  return (
    <div className="exp">
      <AppHeader />

      <main className="exp-main">
        <div className="exp-head">
          <h1>STAR interview answers</h1>
          <p className="muted">
            Example answers to behavioral questions, built from your resume. Edit them until
            they sound like you. They're examples to practice with, not scripts.
          </p>
        </div>

        {error && <p className="form-error" role="alert">{error}</p>}

        {loading ? (
          <p className="muted">Loading…</p>
        ) : resumes.length === 0 ? (
          <div className="exp-empty">
            You need a resume first. <Link to="/resume">Generate one</Link>, then come back here.
          </div>
        ) : (
          <div className="exp-layout">
            {/* ---------- left: pick resume + generate ---------- */}
            <form className="exp-form star-side" onSubmit={handleGenerate} aria-labelledby="gen-h">
              <h2 id="gen-h">Get example answers</h2>

              <div className="field">
                <label htmlFor="star-resume">Resume</label>
                <select
                  id="star-resume"
                  value={resumeId || ""}
                  onChange={(e) => setParams({ resume: e.target.value })}
                >
                  {resumes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.target_job_title} ({new Date(r.created_at).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="star-count">How many questions</label>
                <input
                  id="star-count"
                  type="number"
                  min={1}
                  max={10}
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                />
              </div>

              <div className="field">
                <label htmlFor="star-notes">Notes about the job (optional)</label>
                <textarea
                  id="star-notes"
                  rows={3}
                  value={jobNotes}
                  onChange={(e) => setJobNotes(e.target.value)}
                  placeholder="Paste key lines from the job posting"
                />
              </div>

              <div className="exp-form__actions">
                <button className="btn btn-primary" type="submit" disabled={generating || !resumeId}>
                  {generating ? "Writing answers…" : "Generate answers"}
                </button>
              </div>
              <p className="muted star-note">New answers are added. Your edited ones are kept.</p>
            </form>

            {/* ---------- right: answers ---------- */}
            <section className="exp-list" aria-labelledby="answers-h">
              <h2 id="answers-h">Your answers</h2>
              {loadingAnswers ? (
                <p className="muted">Loading…</p>
              ) : answers.length === 0 ? (
                <div className="exp-empty">No answers yet. Generate some with the form.</div>
              ) : (
                <ul>
                  {answers.map((a) => (
                    <AnswerCard
                      key={a.id}
                      answer={a}
                      onSaved={replaceAnswer}
                      onDelete={handleDelete}
                      onError={handleErr}
                    />
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}