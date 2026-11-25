// src/pages/Experience.jsx
// Work experience: list of saved positions + a form with a Military / Civilian toggle.
// Talks to /api/history/positions/ (history app, PositionViewSet).
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import CredentialsSection from "../components/CredentialsSection";
import MilitaryJobCodeField from "../components/MilitaryJobCodeField";
import Modal from "../components/Modal";
import { apiFetch } from "../api";
import "../css-styling/Experience.css";

// Same values as BRANCH_CHOICES in history/models.py
const BRANCHES = [
  { value: "army", label: "Army" },
  { value: "navy", label: "Navy" },
  { value: "air_force", label: "Air Force" },
  { value: "marine_corps", label: "Marine Corps" },
  { value: "coast_guard", label: "Coast Guard" },
  { value: "space_force", label: "Space Force" },
];

// Every field the Position model accepts
const EMPTY_FORM = {
  experience_type: "military",
  title: "",
  start_date: "",
  end_date: "",
  duties: "",
  achievements: "",
  // military only
  branch: "",
  rank: "",
  mos_code: "",
  unit: "",
  // civilian only
  employer: "",
  location: "",
};
const DRAFT_KEY = "positionDraft";
const MILITARY_ONLY = ["branch", "rank", "mos_code", "unit"];
const CIVILIAN_ONLY = ["employer", "location"];

const branchLabel = (v) => BRANCHES.find((b) => b.value === v)?.label || v;

// "2021-06-15" -> "Jun 2021"
function formatDate(d) {
  if (!d) return "Present";
  const [y, m] = d.split("-");
  return new Date(y, m - 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

// Newest first, like the backend's ordering
const sortPositions = (list) =>
  [...list].sort((a, b) => b.start_date.localeCompare(a.start_date));

/* ---------- small form pieces ---------- */
function Field({ id, label, ...props }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} name={id} {...props} />
    </div>
  );
}

function TextArea({ id, label, ...props }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <textarea id={id} name={id} {...props} />
    </div>
  );
}

// A half-typed new position, saved as they type
function loadDraft() {
  try {
    return { ...EMPTY_FORM, ...JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}") };
  } catch {
    return EMPTY_FORM;
  }
}

export default function Experience() {
  const navigate = useNavigate();
  const [positions, setPositions] = useState([]);
  const [form, setForm] = useState(loadDraft);
  const [modalOpen, setModalOpen] = useState(false); // the add / edit pop-up
  const [editingId, setEditingId] = useState(null);
  const [current, setCurrent] = useState(false); // "I currently work here"
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isMilitary = form.experience_type === "military";

  // Only drafts of NEW positions are kept (not edits of saved ones)
  useEffect(() => {
    if (!editingId) localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
  }, [form, editingId]);

  // Load saved positions
  useEffect(() => {
    apiFetch("/api/history/positions/")
      .then(setPositions)
      .catch((err) => (err.status === 401 ? navigate("/") : setError(err.message)))
      .finally(() => setLoading(false));
  }, [navigate]);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const setType = (type) => setForm({ ...form, experience_type: type });

  // Scroll to Education & training and put focus on its "+ Add" button
  function goToEducation() {
    document.getElementById("education")?.scrollIntoView({ behavior: "smooth" });
    document.getElementById("add-edu-btn")?.focus({ preventScroll: true });
  }

  /* ---------- pop-up ---------- */
  function openAdd() {
    if (editingId) {
      setEditingId(null);
      setForm(loadDraft());
      setCurrent(false);
    }
    setError("");
    setModalOpen(true);
  }

  // Closing keeps a new-position draft, but drops unsaved edits to a saved one
  function closeModal() {
    setModalOpen(false);
    setError("");
    if (editingId) {
      setEditingId(null);
      setForm(loadDraft());
      setCurrent(false);
    }
  }

  function resetForm() {
    localStorage.removeItem(DRAFT_KEY);
    setForm(EMPTY_FORM);
    setEditingId(null);
    setCurrent(false);
    setError("");
  }

  function startEdit(p) {
    const next = { ...EMPTY_FORM };
    Object.keys(EMPTY_FORM).forEach((k) => (next[k] = p[k] ?? ""));
    setForm(next);
    setEditingId(p.id);
    setCurrent(!p.end_date);
    setError("");
    setModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    setSaving(true);

    // Send every field; blank out the ones that don't apply to this type
    const payload = { ...form };
    payload.end_date = current || !form.end_date ? null : form.end_date;
    (isMilitary ? CIVILIAN_ONLY : MILITARY_ONLY).forEach((k) => (payload[k] = ""));

    try {
      if (editingId) {
        const updated = await apiFetch(`/api/history/positions/${editingId}/`, {
          method: "PUT",
          body: payload,
        });
        setPositions(sortPositions(positions.map((p) => (p.id === editingId ? updated : p))));
      } else {
        const created = await apiFetch("/api/history/positions/", {
          method: "POST",
          body: payload,
        });
        setPositions(sortPositions([created, ...positions]));
      }
      resetForm();
      setModalOpen(false);
    } catch (err) {
      if (err.status === 401) navigate("/");
      else setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(p) {
    if (!window.confirm(`Delete "${p.title}"?`)) return;
    try {
      await apiFetch(`/api/history/positions/${p.id}/`, { method: "DELETE" });
      setPositions(positions.filter((x) => x.id !== p.id));
      if (editingId === p.id) resetForm();
    } catch (err) {
      setError(err.message);
    }
  }

  function details(p) {
    const parts =
      p.experience_type === "military"
        ? [branchLabel(p.branch), p.rank, p.mos_code, p.unit]
        : [p.employer, p.location];
    return parts.filter(Boolean).join(" · ");
  }

  return (
    <div className="exp">
      <AppHeader />

      <main className="exp-main">
        <div className="exp-head">
          <h1>Work experience</h1>
          <p className="muted">
            Add the jobs you've held, military or civilian. We use them to build your
            resume and STAR interview answers.
          </p>
        </div>

        {error && !modalOpen && <p className="form-error" role="alert">{error}</p>}

        {/* ---------- saved positions ---------- */}
        <section className="exp-list" aria-labelledby="saved-h">
          <div className="exp-list__head">
            <h2 id="saved-h">Your positions</h2>
            <button type="button" className="btn btn-outline btn-sm" onClick={openAdd}>
              + Add position
            </button>
          </div>

          {loading ? (
            <p className="muted">Loading…</p>
          ) : positions.length === 0 ? (
            <div className="exp-empty">
              <p>No positions yet.</p>
              <button type="button" className="btn btn-primary" onClick={openAdd}>
                Add your first position
              </button>
            </div>
          ) : (
            <ul>
              {positions.map((p) => (
                <li key={p.id} className={`exp-card${editingId === p.id ? " is-editing" : ""}`}>
                  <div className="exp-card__top">
                    <div>
                      <span className={`tag tag--${p.experience_type}`}>
                        {p.experience_type === "military" ? "Military" : "Civilian"}
                      </span>
                      <h3>{p.title}</h3>
                      {details(p) && <p className="muted">{details(p)}</p>}
                      <p className="muted">
                        {formatDate(p.start_date)} – {formatDate(p.end_date)}
                      </p>
                    </div>
                    <div className="exp-card__actions">
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => startEdit(p)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => handleDelete(p)}
                        aria-label={`Delete ${p.title}`}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  {p.duties && <p className="exp-card__duties">{p.duties}</p>}
                </li>
              ))}
            </ul>
          )}

          {/* once they have a job saved, point them to the next section */}
          {!loading && positions.length > 0 && (
            <button type="button" className="btn btn-primary exp-list__next" onClick={goToEducation}>
              Next: Education &amp; training ↓
            </button>
          )}
        </section>

        <CredentialsSection />
      </main>

      {/* ---------- add / edit pop-up ---------- */}
      {modalOpen && (
        <Modal
          title={editingId ? "Edit position" : "Add a position"}
          titleId="form-h"
          onClose={closeModal}
          onSubmit={handleSave}
          busy={saving}
          footer={
            <>
              <button className="btn btn-outline" type="button" onClick={closeModal} disabled={saving}>
                Cancel
              </button>
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? "Saving…" : editingId ? "Save changes" : "Save position"}
              </button>
            </>
          }
        >

        <div className="toggle" role="group" aria-label="Experience type">
          {["military", "civilian"].map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={form.experience_type === t}
              className={`toggle__btn${form.experience_type === t ? " is-active" : ""}`}
              onClick={() => setType(t)}
            >
              {t === "military" ? "Military" : "Civilian"}
            </button>
          ))}
        </div>

        <Field
          id="title"
          label={isMilitary ? "Billet / position" : "Job title"}
          value={form.title}
          onChange={onChange}
          required
        />

        {isMilitary ? (
          <>
            <div className="field-row">
              <div className="field">
                <label htmlFor="branch">Branch</label>
                <select id="branch" name="branch" value={form.branch} onChange={onChange} required>
                  <option value="">Select branch</option>
                  {BRANCHES.map((b) => (
                    <option key={b.value} value={b.value}>{b.label}</option>
                  ))}
                </select>
              </div>
              <Field
                id="rank"
                label="Rank"
                placeholder="e.g. Sergeant (E-5)"
                value={form.rank}
                onChange={onChange}
              />
            </div>

            <MilitaryJobCodeField
              id="mos_code"
              name="mos_code"
              value={form.mos_code}
              onChange={onChange}
              branch={form.branch}
            />

            <Field id="unit" label="Unit" value={form.unit} onChange={onChange} />
          </>
        ) : (
          <div className="field-row">
            <Field id="employer" label="Employer" value={form.employer} onChange={onChange} required />
            <Field
              id="location"
              label="Location"
              placeholder="City, ST"
              value={form.location}
              onChange={onChange}
            />
          </div>
        )}

        <div className="field-row">
          <Field
            id="start_date"
            label="Start date"
            type="date"
            value={form.start_date}
            onChange={onChange}
            required
          />
          <Field
            id="end_date"
            label="End date"
            type="date"
            value={current ? "" : form.end_date}
            onChange={onChange}
            disabled={current}
          />
        </div>

        <label className="check">
          <input type="checkbox" checked={current} onChange={(e) => setCurrent(e.target.checked)} />
          {isMilitary ? "I currently serve in this role" : "I currently work here"}
        </label>

        <TextArea
          id="duties"
          label="Duties"
          rows={4}
          placeholder="What you were responsible for"
          value={form.duties}
          onChange={onChange}
        />
        <TextArea
          id="achievements"
          label="Achievements"
          rows={3}
          placeholder="Results, awards, etc. (numbers you can point to)"
          value={form.achievements}
          onChange={onChange}
        />

          {error && <p className="form-error" role="alert">{error}</p>}
        </Modal>
      )}
    </div>
  );
}