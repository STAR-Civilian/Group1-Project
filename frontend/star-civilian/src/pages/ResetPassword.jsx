import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "../api";                          // shared helper: adds the server address and turns errors into err.message
import logo from "../assets/star-logo.svg";
import "../css-styling/AuthPage.css";

export default function ResetPassword() {
    // uid and token come from the URL: /reset-password/:uid/:token
    const { uid, token } = useParams();

    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [message, setMessage] = useState("");             // success text
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");

        // Check the two boxes match before bothering the server
        if (password !== confirm) {
            setError("The two passwords do not match.");
            return;
        }

        setSaving(true);
        try {
            // Field names must match the backend: uid, token, new_password
            const data = await apiFetch("/api/password-reset/confirm/", {
                method: "POST",
                body: { uid, token, new_password: password },
            });
            setMessage(data.detail); // "Password updated. You can log in now."
        } catch (err) {
            // Examples: "This reset link is invalid or has expired",
            // or the password rules ("This password is too common.")
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="auth">
            <section className="auth-brand" aria-label="About STAR Civilian">
                <img src={logo} alt="STAR Civilian" className="auth-logo" />
            </section>

            <main className="auth-main">
                <form className="auth-card" onSubmit={handleSubmit} aria-labelledby="rp-h">
                    <div className="auth-card__head">
                        <h2 id="rp-h">Choose a new password</h2>
                        <p>Pick a password you have not used before.</p>
                    </div>

                    {message ? (
                        // Success: hide the form fields and point to sign in
                        <>
                            <p role="status">{message}</p>
                            <div className="auth-links">
                                <Link to="/">Go to sign in</Link>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="field">
                                <label htmlFor="rp-password">New password</label>
                                <input id="rp-password" type="password" name="password"
                                    value={password} onChange={(e) => setPassword(e.target.value)}
                                    required />
                            </div>
                            <div className="field">
                                <label htmlFor="rp-confirm">Confirm new password</label>
                                <input id="rp-confirm" type="password" name="confirm"
                                    value={confirm} onChange={(e) => setConfirm(e.target.value)}
                                    required />
                            </div>

                            {error && <p className="auth-error" role="alert">{error}</p>}

                            <button className="auth-submit" type="submit" disabled={saving}>
                                {saving ? "SAVING..." : "SAVE NEW PASSWORD"}
                            </button>

                            <div className="auth-links">
                                <Link to="/forgot-password">Need a new link?</Link>
                                <Link to="/">Back to sign in</Link>
                            </div>
                        </>
                    )}
                </form>
            </main>
        </div>
    );
}