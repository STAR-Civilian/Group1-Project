// src/pages/StarPage.jsx
// STAR interview answers for one saved resume: generate, edit, rewrite, delete.
// Same layout as the Experience and Resume pages: full-width list, pop-up forms.
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
import Modal from "../components/Modal";
import { apiFetch } from "../api";
import "../css-styling/Experience.css"; // shared page styles (.exp ...)
import "../css-styling/StarPage.css";

const PARTS = [
  { key: "situation", label: "Situation" },
  { key: "task", label: "Task" },
  { key: "action", label: "Action" },
  { key: "result", label: "Result" },
];

// "Logistics Manager · Nov 2026" (same as the Resume page)
function resumeLabel(r) {
  const date = r.created_at
    ? new Date(r.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" })
    : "";
  return [r.target_job_title, date].filter(Boolean).join(" · ");
}

/* ---------- one answer card ---------- */
function AnswerCard({ answer, onEdit, onRewrite, onDelete }) {
  return (
    <li className="exp-card">
      <div className="exp-card__top">
        <div>
          {answer.skill && <span className="tag tag--military">{answer.skill}</span>}
          <h3>{answer.question}</h3>
        </div>
        <div className="exp-card__actions">
          <button type="button" className="btn btn-outline btn-sm" onClick={() => onEdit(answer)}>
            Edit
          </button>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => onRewrite(answer)}>
            Use My Words
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
      </div>

      <dl className="star-parts">
        {PARTS.map(({ key, label }) => (
          <div key={key} className="star-part">
            <dt>{label}</dt>
            <dd>{answer[key]}</dd>
          </div>
        ))}
      </dl>
      {answer.tip && (
        <p className="star-tip">
          <strong>Tip:</strong> {answer.tip}
        </p>
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
  const [error, setError] = useState("");

  // Pop-ups: "generate" | "edit" | "rewrite" | null
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [modalError, setModalError] = useState("");
  // generate form
  const [count, setCount] = useState(5);
  const [jobNotes, setJobNotes] = useState("");
  // edit / rewrite form
  const [target, setTarget] = useState(null); // the answer being changed
  const [draft, setDraft] = useState(null);
  const [ownWords, setOwnWords] = useState("");

  const loadingAnswers = answersFor !== resumeId;
  const currentResume = resumes.find((r) => String(r.id) === resumeId);

  const handleErr = (err) => (err.status === 401 ? navigate("/") : setError(err.message));
  const handleModalErr = (err) => (err.status === 401 ? navigate("/") : setModalError(err.message));

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

  /* ---------- pop-ups ---------- */
  function openModal(kind, answer = null) {
    setModalError("");
    setTarget(answer);
    setDraft(answer ? { ...answer } : null);
    setOwnWords("");
    setModal(kind);
  }
  function closeModal() {
    if (busy) return;
    setModal(null);
    setTarget(null);
  }

  const replaceAnswer = (updated) =>
    setAnswers((list) => list.map((a) => (a.id === updated.id ? updated : a)));

  async function handleGenerate(e) {
    e.preventDefault();
    setModalError("");
    setBusy(true);
    try {
      const data = await apiFetch(`/api/llm/resumes/${resumeId}/generate-star/`, {
        method: "POST",
        body: { count: Number(count), job_notes: jobNotes },
      });
      setAnswers((list) => [...data.answers, ...list]);
      setModal(null);
    } catch (err) {
      handleModalErr(err);
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    setModalError("");
    setBusy(true);
    try {
      const body = { question: draft.question };
      PARTS.forEach(({ key }) => (body[key] = draft[key]));
      const updated = await apiFetch(`/api/star-answers/${target.id}/`, { method: "PATCH", body });
      replaceAnswer(updated);
      setModal(null);
    } catch (err) {
      handleModalErr(err);
    } finally {
      setBusy(false);
    }
  }

  async function handleRewrite(e) {
    e.preventDefault();
    setModalError("");
    setBusy(true);
    try {
      const updated = await apiFetch(`/api/llm/star-answers/${target.id}/rewrite/`, {
        method: "POST",
        body: { answer_text: ownWords },
      });
      replaceAnswer(updated);
      setModal(null);
    } catch (err) {
      handleModalErr(err);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(a) {
    if (!window.confirm(`Delete the answer to "${a.question}"?`)) return;
    try {
      await apiFetch(`/api/star-answers/${a.id}/`, { method: "DELETE" });
      setAnswers((list) => list.filter((x) => x.id !== a.id));
    } catch (err) {
      handleErr(err);
    }
  }

  const setPart = (k) => (e) => setDraft({ ...draft, [k]: e.target.value });

  return (
    <div className="exp">
      <AppHeader />

      <main className="exp-main">
        <div className="exp-list__head star-head-row">
          <div className="exp-head">
            <h1>STAR Interview Answers</h1>
            <p className="muted">
              Example answers to behavioral questions, built from your resume. Edit them until
              they sound like you. They're examples to practice with, not scripts.
            </p>
          </div>
          {resumes.length > 0 && (
            <button type="button" className="btn btn-outline btn-sm" onClick={() => openModal("generate")}>
              + New Answers
            </button>
          )}
        </div>

        {error && !modal && <p className="form-error" role="alert">{error}</p>}

        {loading ? (
          <p className="muted">Loading…</p>
        ) : resumes.length === 0 ? (
          <div className="exp-empty exp-empty--action">
            <p>STAR answers are built from a resume, so you need one first.</p>
            <Link to="/resume" className="btn btn-primary">
              Go to step three
            </Link>
          </div>
        ) : (
          <>
            {/* ---------- pick which resume ---------- */}
            <div className="field star-picker">
              <label htmlFor="star-resume">Answers for</label>
              <select id="star-resume" value={resumeId || ""} onChange={(e) => setParams({ resume: e.target.value })}>
                {resumes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {resumeLabel(r)}
                  </option>
                ))}
              </select>
            </div>

            {/* ---------- answers ---------- */}
            <section className="exp-list" aria-labelledby="answers-h">
              <h2 id="answers-h">
              Your Answers{!loadingAnswers && answers.length > 0 ? ` (${answers.length})` : ""}
              </h2>
              {loadingAnswers ? (
                <p className="muted">Loading…</p>
              ) : answers.length === 0 ? (
                <div className="exp-empty exp-empty--action">
                  <p>No answers yet for this resume.</p>
                  <button type="button" className="btn btn-primary" onClick={() => openModal("generate")}>
                    Get Your First Answers
                  </button>
                </div>
              ) : (
                <ul>
                  {answers.map((a) => (
                    <AnswerCard
                      key={a.id}
                      answer={a}
                      onEdit={(ans) => openModal("edit", ans)}
                      onRewrite={(ans) => openModal("rewrite", ans)}
                      onDelete={handleDelete}
                    />
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>

      {/* ---------- generate pop-up ---------- */}
      {modal === "generate" && (
        <Modal
          title={busy ? "Writing your answers" : "New answers"}
          titleId="gen-h"
          onClose={closeModal}
          onSubmit={handleGenerate}
          busy={busy}
          footer={
            <>
              <button className="btn btn-outline" type="button" onClick={closeModal} disabled={busy}>
                Cancel
              </button>
              <button className="btn btn-primary" type="submit" disabled={busy || !resumeId}>
                {busy ? "Writing…" : "Generate answers"}
              </button>
            </>
          }
        >
          {busy ? (
            <div className="star-working" role="status" aria-live="polite">
              <div className="star-spinner" aria-hidden="true" />
              <p className="star-working__title">
                We're writing answers{currentResume ? ` for ${currentResume.target_job_title}` : ""}.
              </p>
              <p className="muted">This can take up to a minute. Please keep this window open.</p>
            </div>
          ) : (
            <>
              {modalError && <p className="form-error" role="alert">{modalError}</p>}
              <p className="muted star-note">
                For: <strong>{currentResume ? resumeLabel(currentResume) : ""}</strong>
              </p>
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
                <label htmlFor="star-notes">Notes about the job</label>
                <textarea
                  id="star-notes"
                  rows={4}
                  value={jobNotes}
                  onChange={(e) => setJobNotes(e.target.value)}
                  placeholder="Optional: paste key lines from the job posting"
                />
              </div>
              <p className="muted star-note">New answers are added. The ones you already have are kept.</p>
            </>
          )}
        </Modal>
      )}

      {/* ---------- edit pop-up ---------- */}
      {modal === "edit" && draft && (
        <Modal
          title="Edit answer"
          titleId="edit-h"
          onClose={closeModal}
          onSubmit={handleSaveEdit}
          busy={busy}
          footer={
            <>
              <button className="btn btn-outline" type="button" onClick={closeModal} disabled={busy}>
                Cancel
              </button>
              <button className="btn btn-primary" type="submit" disabled={busy}>
                {busy ? "Saving…" : "Save changes"}
              </button>
            </>
          }
        >
          {modalError && <p className="form-error" role="alert">{modalError}</p>}
          <div className="field">
            <label htmlFor="edit-q">Question</label>
            <input id="edit-q" value={draft.question} onChange={setPart("question")} required />
          </div>
          {PARTS.map(({ key, label }) => (
            <div key={key} className="field">
              <label htmlFor={`edit-${key}`}>{label}</label>
              <textarea id={`edit-${key}`} rows={3} value={draft[key]} onChange={setPart(key)} />
            </div>
          ))}
        </Modal>
      )}

      {/* ---------- "use my words" pop-up ---------- */}
      {modal === "rewrite" && target && (
        <Modal
          title={busy ? "Rewriting your answer" : "Use my words"}
          titleId="rewrite-h"
          onClose={closeModal}
          onSubmit={handleRewrite}
          busy={busy}
          footer={
            <>
              <button className="btn btn-outline" type="button" onClick={closeModal} disabled={busy}>
                Cancel
              </button>
              <button className="btn btn-primary" type="submit" disabled={busy}>
                {busy ? "Rewriting…" : "Rewrite in STAR"}
              </button>
            </>
          }
        >
          {modalError && <p className="form-error" role="alert">{modalError}</p>}
          <p className="star-question">{target.question}</p>
          <div className="field">
            <label htmlFor="own-words">Your answer, in your own words</label>
            <textarea
              id="own-words"
              rows={7}
              maxLength={3000}
              value={ownWords}
              onChange={(e) => setOwnWords(e.target.value)}
              placeholder="Tell the story however it comes out. We'll shape it into STAR."
              required
              disabled={busy}
            />
                        <p className="muted">
              Don't enter personal or confidential information, such as phone numbers, addresses,
              ID numbers, or classified or controlled military information. What you type here is
              sent to an AI service to help rewrite your answer.
            </p>
          </div>
          <p className="muted star-note">This replaces the current Situation, Task, Action and Result.</p>
        </Modal>
      )}
    </div>
  );
}
