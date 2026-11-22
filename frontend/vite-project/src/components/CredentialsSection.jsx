// src/components/CredentialsSection.jsx
// Education & training on the Work experience page.
// Talks to /api/history/credentials/ (history app, CredentialViewSet).
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api";

// Same values as Credential.TYPE_CHOICES in history/models.py
const TYPES = [
  { value: "education", label: "Education", name: "Degree or program", issuer: "School" },
  { value: "training", label: "Training", name: "Course name", issuer: "School or unit" },
  { value: "certification", label: "Certification", name: "Certification name", issuer: "Issued by" },
  { value: "award", label: "Award", name: "Award name", issuer: "Awarded by" },
];
const typeInfo = (v) => TYPES.find((t) => t.value === v) || TYPES[0];

const EMPTY_FORM = {
  credential_type: "education",
  name: "",
  issuer: "",
  date_earned: "",
  description: "",
};

// "2021-06-15" -> "Jun 2021"
function formatDate(d) {
  if (!d) return "";
  const [y, m] = d.split("-");
  return new Date(y, m - 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export default function CredentialsSection() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const info = typeInfo(form.credential_type);

  useEffect(() => {
    apiFetch("/api/history/credentials/")
      .then(setItems)
      .catch((err) => (err.status === 401 ? navigate("/") : setError(err.message)))
      .finally(() => setLoading(false));
  }, [navigate]);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError("");
  }

  function startEdit(c) {
    setForm({
      credential_type: c.credential_type,
      name: c.name,
      issuer: c.issuer || "",
      date_earned: c.date_earned || "",
      description: c.description || "",
    });
    setEditingId(c.id);
    setError("");
  }

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const payload = { ...form, date_earned: form.date_earned || null };
    try {
      if (editingId) {
        const updated = await apiFetch(`/api/history/credentials/${editingId}/`, {
          method: "PUT",
          body: payload,
        });
        setItems(items.map((c) => (c.id === editingId ? updated : c)));
      } else {
        const created = await apiFetch("/api/history/credentials/", {
          method: "POST",
          body: payload,
        });
        setItems([created, ...items]);
      }
      resetForm();
    } catch (err) {
      if (err.status === 401) navigate("/");
      else setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(c) {
    if (!window.confirm(`Delete "${c.name}"?`)) return;
    try {
      await apiFetch(`/api/history/credentials/${c.id}/`, { method: "DELETE" });
      setItems(items.filter((x) => x.id !== c.id));
      if (editingId === c.id) resetForm();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="exp-section" aria-labelledby="edu-h">
      <div className="exp-head">
        <h2 id="edu-h">Education &amp; training</h2>
        <p className="muted">Degrees, military courses, certifications and awards.</p>
      </div>

      <div className="exp-layout">
        {/* ---------- saved items ---------- */}
        <div className="exp-list">
          {loading ? (
            <p className="muted">Loading…</p>
          ) : items.length === 0 ? (
            <div className="exp-empty">Nothing added yet. Use the form to add your first one.</div>
          ) : (
            <ul>
              {items.map((c) => (
                <li key={c.id} className={`exp-card${editingId === c.id ? " is-editing" : ""}`}>
                  <div className="exp-card__top">
                    <div>
                      <span className={`tag tag--${c.credential_type}`}>
                        {typeInfo(c.credential_type).label}
                      </span>
                      <h3>{c.name}</h3>
                      {(c.issuer || c.date_earned) && (
                        <p className="muted">
                          {[c.issuer, formatDate(c.date_earned)].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                    <div className="exp-card__actions">
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => startEdit(c)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => handleDelete(c)}
                        aria-label={`Delete ${c.name}`}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  {c.description && <p className="exp-card__duties">{c.description}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ---------- add / edit form ---------- */}
        <form className="exp-form" onSubmit={handleSave} aria-labelledby="edu-form-h">
          <h2 id="edu-form-h">{editingId ? "Edit item" : "Add education or training"}</h2>

          <div className="field">
            <label htmlFor="credential_type">Type</label>
            <select id="credential_type" name="credential_type" value={form.credential_type} onChange={onChange}>
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="cred-name">{info.name}</label>
            <input id="cred-name" name="name" value={form.name} onChange={onChange} required />
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="cred-issuer">{info.issuer}</label>
              <input id="cred-issuer" name="issuer" value={form.issuer} onChange={onChange} />
            </div>
            <div className="field">
              <label htmlFor="cred-date">Date earned</label>
              <input id="cred-date" name="date_earned" type="date" value={form.date_earned} onChange={onChange} />
            </div>
          </div>

          <div className="field">
            <label htmlFor="cred-desc">Description</label>
            <textarea
              id="cred-desc"
              name="description"
              rows={3}
              placeholder="What it covered, or why it matters"
              value={form.description}
              onChange={onChange}
            />
          </div>

          {error && <p className="form-error" role="alert">{error}</p>}

          <div className="exp-form__actions">
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? "Saving…" : editingId ? "Save changes" : "Save"}
            </button>
            {editingId && (
              <button className="btn btn-outline" type="button" onClick={resetForm}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}