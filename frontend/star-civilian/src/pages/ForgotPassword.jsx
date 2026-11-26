import { useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api";                                  // shared helper: adds the server address and turns errors into err.message
import logo from "../assets/star-logo.svg";
import "../css-styling/AuthPage.css";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");                         // what the person typed
    const [message, setMessage] = useState("");                     // success text from the backend
    const [error, setError] = useState("");                         // error text to show in red
    const [sending, setSending] = useState(false);                  // disables the button while waiting

    async function handleSubmit(e) {
        e.preventDefault();                                         // stop the browser from reloading the page
        setError("");
        setMessage("");
        setSending(true);
        try {
            const data = await apiFetch("/api/password-reset/", {
                method: "POST",
                body: { email },
            });
            // Same message whether or not the email has an account (on purpose)
            setMessage(data.detail);
        } catch (err) {
            setError(err.message);
        } finally {
            setSending(false);
        }
    }

    return (
        <div className="auth">
            <section className="auth-brand" aria-label="About STAR Civilian">
                <img src={logo} alt="STAR Civilian" className="auth-logo" />
            </section>

            <main className="auth-main">
                <form className="auth-card" onSubmit={handleSubmit} aria-labelledby="fp-h">
                    <div className="auth-card__head">
                        <h2 id="fp-h">Forgot your password?</h2>
                        <p>Enter your email and we will send you a link to choose a new one.</p>
                    </div>

                    <div className="field">
                        <label htmlFor="fp-email">Email</label>
                        <input id="fp-email" type="email" name="email"
                            placeholder="you@example.com" value={email}
                            onChange={(e) => setEmail(e.target.value)} required />
                    </div>

                    {error && <p className="auth-error" role="alert">{error}</p>}
                    {message && <p role="status">{message}</p>}

                    <button className="auth-submit" type="submit" disabled={sending}>
                        {sending ? "SENDING..." : "SEND RESET LINK"}
                    </button>

                    <div className="auth-links">
                        <Link to="/">Back to sign in</Link>
                    </div>
                </form>
            </main>
        </div>
    );
}