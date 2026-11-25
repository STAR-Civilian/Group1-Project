// src/components/ProfileCard.jsx
// The user's profile on the Dashboard: view it, or edit it in place.
// The Resume page reads the same profile for its header (name, contact, links).
// Saves with PUT /api/profile/me/.
import { useState } from "react";
import { apiFetch } from "../api";

// Same values as BRANCH_CHOICE in accounts/models.py
const BRANCHES = [
  { value: "army", label: "Army" },
  { value: "navy", label: "Navy" },
  { value: "air_force", label: "Air Force" },
  { value: "marine_corps", label: "Marine Corps" },
  { value: "space_force", label: "Space Force" },
  { value: "coast_guard", label: "Coast Guard" },
];
const branchLabel = (v) => BRANCHES.find((b) => b.value === v)?.label || "";

const FIELDS = [
  "first_name", "last_name", "phone", "city", "state", "branch",
  "job_code_or_title", "linkedin_url", "github_url", "website_url",
];
const toForm = (p) => Object.fromEntries(FIELDS.map((f) => [f, p?.[f] || ""]));

// "https://www.linkedin.com/in/me/" -> "linkedin.com/in/me"
const shortUrl = (url) => url.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");

export default function ProfileCard({ profile, onSaved, onError }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(() => toForm(profile));
  const [saving, setSaving] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  function startEdit() {
    setForm(toForm(profile));
    setEditing(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await apiFetch("/api/profile/me/", { method: "PUT", body: form });
      localStorage.setItem("first_name", updated.first_name); // for "Hi, ___"
      onSaved(updated);
      setEditing(false);
    } catch (err) {
      onError(err);
    } finally {
      setSaving(false);
    }
  }

  const input = (name, label, props = {}) => (
    <div className="field">
      <label htmlFor={`pf-${name}`}>{label}</label>
      <input id={`pf-${name}`} name={name} value={form[name]} onChange={onChange} {...props} />
    </div>
  );

  /* ---------- view ---------- */
  if (!editing) {
    const name = [profile.first_name, profile.last_name].filter(Boolean).join(" ");
    const place = [profile.city, profile.state].filter(Boolean).join(", ");
    const service = [branchLabel(profile.branch), profile.job_code_or_title].filter(Boolean).join(" · ");
    const links = [profile.linkedin_url, profile.github_url, profile.website_url].filter(Boolean);

    return (
      <div className="exp-card db-profile">
        <div className="exp-card__top">
          <div>
            <h3>{name}</h3>
            {service && <p className="muted">{service}</p>}
          </div>
          <div className="exp-card__actions">
            <button type="button" className="btn btn-outline btn-sm" onClick={startEdit}>
              Edit
            </button>
          </div>
        </div>

        <dl className="db-profile__info">
          <div><dt>Email</dt><dd>{profile.email}</dd></div>
          <div><dt>Phone</dt><dd>{profile.phone || <span className="muted">Not added</span>}</dd></div>
          <div><dt>Location</dt><dd>{place}</dd></div>
          <div>
            <dt>Links</dt>
            <dd>
              {links.length ? (
                links.map((url) => (
                  <a key={url} href={url} target="_blank" rel="noreferrer">{shortUrl(url)}</a>
                ))
              ) : (
                <span className="muted">Add LinkedIn, GitHub or a website</span>
              )}
            </dd>
          </div>
        </dl>
        <p className="muted db-profile__note">Your name, contact info and links go at the top of your resume.</p>
      </div>
    );
  }

  /* ---------- edit ---------- */
  return (
    <form className="exp-form db-profile-form" onSubmit={handleSave} aria-label="Edit profile">
      <div className="field-row">
        {input("first_name", "Legal first name", { required: true, autoComplete: "given-name" })}
        {input("last_name", "Legal last name", { required: true, autoComplete: "family-name" })}
      </div>
      <div className="field">
        <label htmlFor="pf-email">Email</label>
        <input id="pf-email" value={profile.email || ""} readOnly aria-describedby="pf-email-note" />
        <p id="pf-email-note" className="muted db-profile__note">This is your login email.</p>
      </div>
      {input("phone", "Phone (optional)", { type: "tel", autoComplete: "tel" })}
      <div className="field-row">
        {input("city", "City", { required: true, autoComplete: "address-level2" })}
        {input("state", "State", { required: true, maxLength: 2, placeholder: "CA" })}
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="pf-branch">Branch (optional)</label>
          <select id="pf-branch" name="branch" value={form.branch} onChange={onChange}>
            <option value="">None</option>
            {BRANCHES.map((b) => (
              <option key={b.value} value={b.value}>{b.label}</option>
            ))}
          </select>
        </div>
        {input("job_code_or_title", "Military job (optional)", { placeholder: "e.g. 0411 or Maintenance Mgmt" })}
      </div>
      {input("linkedin_url", "LinkedIn URL (optional)", { inputMode: "url", placeholder: "linkedin.com/in/yourname" })}
      {input("github_url", "GitHub URL (optional)", { inputMode: "url", placeholder: "github.com/yourname" })}
      {input("website_url", "Website (optional)", { inputMode: "url", placeholder: "yourname.com" })}

      <div className="exp-form__actions">
        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save profile"}
        </button>
        <button className="btn btn-outline" type="button" onClick={() => setEditing(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
