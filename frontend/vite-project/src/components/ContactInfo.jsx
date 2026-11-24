// src/components/ContactInfo.jsx
// Edit the contact details shown at the top of the resume.
// Saves with PUT /api/profile/me/ (same profile the sign-up form creates).
import { useState } from "react";
import { apiFetch } from "../api";

const FIELDS = [
  "first_name", "last_name", "phone", "city", "state",
  "linkedin_url", "github_url", "website_url",
];

const toForm = (p) => Object.fromEntries(FIELDS.map((f) => [f, p?.[f] || ""]));

export default function ContactInfo({ profile, onSaved, onError }) {
  const [form, setForm] = useState(() => toForm(profile));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const onChange = (e) => {
    setMsg("");
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      // branch and job aren't edited here, so send back what's already saved
      const body = {
        ...form,
        branch: profile?.branch || "",
        job_code_or_title: profile?.job_code_or_title || "",
      };
      const updated = await apiFetch("/api/profile/me/", { method: "PUT", body });
      setForm(toForm(updated));
      onSaved(updated);
      setMsg("Saved.");
    } catch (err) {
      onError(err);
    } finally {
      setSaving(false);
    }
  }

  const input = (name, label, props = {}) => (
    <div className="field">
      <label htmlFor={`ci-${name}`}>{label}</label>
      <input id={`ci-${name}`} name={name} value={form[name]} onChange={onChange} {...props} />
    </div>
  );

  return (
    <details className="exp-form rs-contact">
      <summary>
        <h2>Contact info</h2>
        <span className="muted">Shown at the top of your resume</span>
      </summary>

      <form onSubmit={handleSave} className="rs-contact__form">
        <div className="field-row">
          {input("first_name", "Legal first name", { required: true, autoComplete: "given-name" })}
          {input("last_name", "Legal last name", { required: true, autoComplete: "family-name" })}
        </div>
        <div className="field">
          <label htmlFor="ci-email">Email</label>
          <input id="ci-email" value={profile?.email || ""} readOnly aria-describedby="ci-email-note" />
          <p id="ci-email-note" className="muted rs-hint">This is your login email.</p>
        </div>
        {input("phone", "Phone (optional)", { type: "tel", autoComplete: "tel" })}
        <div className="field-row">
          {input("city", "City", { required: true, autoComplete: "address-level2" })}
          {input("state", "State", { required: true, maxLength: 2, placeholder: "CA" })}
        </div>
        {input("linkedin_url", "LinkedIn URL (optional)", { inputMode: "url", placeholder: "linkedin.com/in/yourname" })}
        {input("github_url", "GitHub URL (optional)", { inputMode: "url", placeholder: "github.com/yourname" })}
        {input("website_url", "Website (optional)", { inputMode: "url", placeholder: "yourname.com" })}

        <div className="exp-form__actions">
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save contact info"}
          </button>
          {msg && <span className="rs-saved-msg" role="status">{msg}</span>}
        </div>
      </form>
    </details>
  );
}
