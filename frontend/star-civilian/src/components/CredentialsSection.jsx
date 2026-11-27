// src/components/CredentialsSection.jsx
// Education & training on the Work experience page.
// Talks to /api/history/credentials/ (history app, CredentialViewSet).
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api";
import Modal from "./Modal";

// Same values as Credential.TYPE_CHOICES in history/models.py
const TYPES = [
  { value: "education", label: "Education", name: "Degree or program", issuer: "School" },
  { value: "training", label: "Training", name: "Course name", issuer: "School or unit" },
  { value: "certification", label: "Certification", name: "Certification name", issuer: "Issued by" },
  { value: "award", label: "Award", name: "Award name", issuer: "Awarded by" },
];
const typeInfo = (v) => TYPES.find((t) => t.value === v) || TYPES[0];

// Degree levels for the Education type. "text" is the words that go on the resume.
const LEVELS = [
  { value: "hs", label: "High school diploma or GED", text: "High school diploma or GED", askField: false },
  { value: "some", label: "Some college (no degree)", text: "Some college coursework", askField: true },
  { value: "associate", label: "Associate degree", text: "Associate degree", askField: true },
  { value: "bachelor", label: "Bachelor's degree", text: "Bachelor's degree", askField: true },
  { value: "master", label: "Master's degree", text: "Master's degree", askField: true },
  { value: "master_cert", label: "Master's certificate", text: "Master's certificate", askField: true },
  { value: "doctorate", label: "Doctorate or professional degree", text: "Doctorate or professional degree", askField: true },
  { value: "certificate", label: "Certificate or diploma", text: "Certificate", askField: true },
  { value: "other", label: "Other", text: "", askField: false },
];
const levelInfo = (v) => LEVELS.find((l) => l.value === v);

// "Bachelor's degree" + "Public Health" -> "Bachelor's degree in Public Health"
function composeName(level, field) {
  const info = levelInfo(level);
  const f = field.trim();
  return info.askField && f ? `${info.text} in ${f}` : info.text;
}

// Turns a saved name back into a level and a field when someone edits it
function splitName(name) {
  for (const l of LEVELS) {
    if (!l.text) continue;
    if (name === l.text) return { level: l.value, field: "" };
    if (name.startsWith(`${l.text} in `)) {
      return { level: l.value, field: name.slice(l.text.length + 4) };
    }
  }
  return { level: "other", field: "" };
}

const EMPTY_FORM = {
  credential_type: "education",
  level: "",
  field: "",
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
  const [modalOpen, setModalOpen] = useState(false); // the add / edit pop-up
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [schools, setSchools] = useState([]); // school suggestions while typing
  const [listOpen, setListOpen] = useState(false);
  const [active, setActive] = useState(-1); // highlighted suggestion

  const info = typeInfo(form.credential_type);
  // Suggestions only make sense for schools, not for certifications or awards
  const wantsSchools = form.credential_type === "education" || form.credential_type === "training";
  const isEdu = form.credential_type === "education";
  const level = levelInfo(form.level);

  useEffect(() => {
    apiFetch("/api/history/credentials/")
      .then(setItems)
      .catch((err) => (err.status === 401 ? navigate("/") : setError(err.message)))
      .finally(() => setLoading(false));
  }, [navigate]);

  // Look up school names a moment after the veteran stops typing.
  // If anything goes wrong we simply show no suggestions; they can still type any name.
  useEffect(() => {
    const q = form.issuer.trim();
    if (!wantsSchools || q.length < 3 || q.includes(",")) {
      setSchools([]);
      return undefined;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      apiFetch(`/api/jobs/school-search/?q=${encodeURIComponent(q)}`)
        .then((list) => {
          if (!cancelled) setSchools(Array.isArray(list) ? list : []);
        })
        .catch(() => {
          if (!cancelled) setSchools([]);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [form.issuer, wantsSchools]);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError("");
  }

  /* ---------- pop-up ---------- */
  function openAdd() {
    resetForm();
    setModalOpen(true);
  }
  function closeModal() {
    setModalOpen(false);
    resetForm();
  }

  function startEdit(c) {
    const parts = c.credential_type === "education" ? splitName(c.name) : { level: "", field: "" };
    setForm({
      credential_type: c.credential_type,
      level: parts.level,
      field: parts.field,
      name: c.name,
      issuer: c.issuer || "",
      date_earned: (c.date_earned || "").slice(0, 7), // "2021-06-15" -> "2021-06"
      description: c.description || "",
    });
    setEditingId(c.id);
    setError("");
    setModalOpen(true);
  }

  function pickSchool(s) {
    setForm((f) => ({ ...f, issuer: s.label }));
    setSchools([]);
    setListOpen(false);
    setActive(-1);
  }

  function onSchoolKey(e) {
    if (!listOpen || schools.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % schools.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? schools.length - 1 : i - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      pickSchool(schools[active]);
    } else if (e.key === "Escape") {
      e.preventDefault(); // close just the list, not the pop-up
      setListOpen(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    // level and field only exist to build the name, so they are not sent to the server
    const { level: lv, field, ...rest } = form;
    const name = isEdu && lv && lv !== "other" ? composeName(lv, field) : form.name;
    // The month picker gives "2021-06"; the server stores a full date, so use the 1st
    const payload = { ...rest, name, date_earned: form.date_earned ? `${form.date_earned}-01` : null };
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
      setModalOpen(false);
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
    <section id="education" className="exp-section" aria-labelledby="edu-h">
      <div className="exp-head exp-list__head">
        <div>
          <h2 id="edu-h">Education &amp; Training</h2>
          <p className="muted">Degrees, military courses, certifications and awards.</p>
        </div>
        <button id="add-edu-btn" type="button" className="btn btn-outline btn-sm" onClick={openAdd}>
          + Add Education or Training
        </button>
      </div>

      {error && !modalOpen && <p className="form-error" role="alert">{error}</p>}

      {/* ---------- saved items ---------- */}
      <div className="exp-list">
        {loading ? (
          <p className="muted">Loading…</p>
        ) : items.length === 0 ? (
          <div className="exp-empty exp-empty--action">
            <p>Nothing added yet.</p>
            <button type="button" className="btn btn-primary" onClick={openAdd}>
              Add education or training
            </button>
          </div>
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

      {/* ---------- add / edit pop-up ---------- */}
      {modalOpen && (
        <Modal
          title={editingId ? "Edit item" : "Add education or training"}
          titleId="edu-form-h"
          onClose={closeModal}
          onSubmit={handleSave}
          busy={saving}
          footer={
            <>
              <button className="btn btn-outline" type="button" onClick={closeModal} disabled={saving}>
                Cancel
              </button>
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? "Saving…" : editingId ? "Save changes" : "Save"}
              </button>
            </>
          }
        >

          <div className="field">
            <label htmlFor="credential_type">Type</label>
            <select id="credential_type" name="credential_type" value={form.credential_type} onChange={onChange}>
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {isEdu ? (
            <>
              <div className="field">
                <label htmlFor="cred-level">{info.name}</label>
                <select id="cred-level" name="level" value={form.level} onChange={onChange} required>
                  <option value="">Select…</option>
                  {LEVELS.map((l) => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
              </div>
              {level && level.askField && (
                <div className="field">
                  <label htmlFor="cred-field">Field of study</label>
                  <input
                    id="cred-field"
                    name="field"
                    placeholder="Example: Public Health"
                    value={form.field}
                    onChange={onChange}
                  />
                </div>
              )}
              {form.level === "other" && (
                <div className="field">
                  <label htmlFor="cred-name">Program name</label>
                  <input id="cred-name" name="name" value={form.name} onChange={onChange} required />
                </div>
              )}
            </>
          ) : (
            <div className="field">
              <label htmlFor="cred-name">{info.name}</label>
              <input id="cred-name" name="name" value={form.name} onChange={onChange} required />
            </div>
          )}

          <div className="field-row">
            <div className="field">
              <label htmlFor="cred-issuer">{info.issuer}</label>
              <div className="sc-combo">
                <input
                  id="cred-issuer"
                  name="issuer"
                  value={form.issuer}
                  onChange={(e) => {
                    onChange(e);
                    setListOpen(true);
                    setActive(-1);
                  }}
                  onFocus={() => setListOpen(true)}
                  onBlur={() => setListOpen(false)}
                  onKeyDown={onSchoolKey}
                  autoComplete="off"
                  role={wantsSchools ? "combobox" : undefined}
                  aria-expanded={wantsSchools ? listOpen && schools.length > 0 : undefined}
                  aria-controls={wantsSchools ? "school-list" : undefined}
                  aria-autocomplete={wantsSchools ? "list" : undefined}
                />
                {wantsSchools && listOpen && schools.length > 0 && (
                  <ul id="school-list" className="sc-list" role="listbox">
                    {schools.map((sc, i) => (
                      <li
                        key={sc.id}
                        role="option"
                        aria-selected={i === active}
                        className={`sc-opt${i === active ? " is-active" : ""}`}
                        onMouseDown={(e) => {
                          e.preventDefault(); // keep the field focused so the click registers
                          pickSchool(sc);
                        }}
                        onMouseEnter={() => setActive(i)}
                      >
                        <span className="sc-opt__name">{sc.name}</span>
                        <span className="sc-opt__place">
                          {[sc.city, sc.state].filter(Boolean).join(", ")}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <div className="field">
              <label htmlFor="cred-date">Date earned</label>
              <input id="cred-date" name="date_earned" type="month" placeholder="YYYY-MM" value={form.date_earned} onChange={onChange} />
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
        </Modal>
      )}
    </section>
  );
}