// src/pages/AuthPage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/star-logo.svg";
import "../css-styling/AuthPage.css";

// Backend base URL comes from vite-project/.env (VITE_API_URL=http://localhost:8000)
const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
const LOGIN_URL = `${API}/api/login/`;
const SIGNUP_URL = `${API}/api/signup/`;
const PROFILE_URL = `${API}/api/profile/me/`;

// value = what the backend stores (accounts/models.py BRANCH_CHOICE)
const BRANCHES = [
    { value: "army", label: "Army" },
    { value: "navy", label: "Navy" },
    { value: "air_force", label: "Air Force" },
    { value: "marine_corps", label: "Marine Corps" },
    { value: "coast_guard", label: "Coast Guard" },
    { value: "space_force", label: "Space Force" },
];

// Must match REQUIRED_FIELDS in accounts/views.py
const EMPTY_SIGNUP = {
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    city: "",
    state: "",
    password: "",
};

/* ---------- small icons for the left panel ---------- */
function Icon({ children }) {
    return (
        <span className="feature-icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {children}
            </svg>
        </span>
    );
}
const SearchIcon = () => (
    <Icon><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></Icon>
);
const DocIcon = () => (
    <Icon><path d="M14 3H6v18h12V7z" /><path d="M14 3v4h4M9 13h6M9 17h6" /></Icon>
);
const ChatIcon = () => (
    <Icon><path d="M4 5h16v11H9l-5 4z" /></Icon>
);

/* ---------- floating-label field ---------- */
function Field({ id, label, ...inputProps }) {
    return (
        <div className="field">
            <label htmlFor={id}>{label}</label>
            <input id={id} {...inputProps} />
        </div>
    );
}

// Turns the backend's {"detail": ...} into one readable message
function errorText(detail) {
    if (!detail) return "Something went wrong. Try again.";
    if (typeof detail === "string") return detail;
    return Object.entries(detail)
        .map(([field, msgs]) => `${field}: ${[].concat(msgs).join(" ")}`)
        .join(" · ");
}

async function postJson(url, body) {
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(errorText(data.detail));
    return data;
}

// Login/signup only return a token, so fetch the profile for the first name
async function saveSession(token) {
    localStorage.setItem("token", token);
    try {
        const res = await fetch(PROFILE_URL, {
            headers: { Authorization: `Token ${token}` },
        });
        if (res.ok) {
            const profile = await res.json();
            localStorage.setItem("first_name", profile.first_name);
        }
    } catch {
        // name is optional; ignore
    }
}

export default function AuthPage({ initialMode = "login" }) {
    const navigate = useNavigate();
    const [mode, setMode] = useState(initialMode); // "login" | "signup"
    const [login, setLogin] = useState({ email: "", password: "" });
    const [signup, setSignup] = useState(EMPTY_SIGNUP);
    const [error, setError] = useState("");

    const switchMode = (next) => {
        setError("");
        setMode(next);
    };

    const onLoginChange = (e) =>
        setLogin({ ...login, [e.target.name]: e.target.value });
    const onSignupChange = (e) =>
        setSignup({ ...signup, [e.target.name]: e.target.value });

    async function handleLogin(e) {
        e.preventDefault();
        setError("");
        try {
            const data = await postJson(LOGIN_URL, login);
            await saveSession(data.token);
            navigate("/dashboard");
        } catch (err) {
            setError(err.message);
        }
    }

    async function handleSignup(e) {
        e.preventDefault();
        setError("");

        try {
            const data = await postJson(SIGNUP_URL, signup);
            await saveSession(data.token);
            navigate("/dashboard");
        } catch (err) {
            setError(err.message);
        }
    }


    return (
        <div className="auth">
            {/* Left: brand panel */}
            <section className="auth-brand" aria-label="About STAR Civilian">
                <img src={logo} alt="STAR Civilian" className="auth-logo" />

                <div className="auth-pitch">
                    <h1>Turn your service into your next career.</h1>
                    <ul>
                        <li><SearchIcon />Match your experience to civilian jobs</li>
                        <li><DocIcon />Get a resume written for the job you want</li>
                        <li><ChatIcon />Practice interview answers with the STAR method</li>
                    </ul>
                </div>

                <p className="auth-footnote">
                    STAR stands for Situation, Task, Action, Result: the way interviewers
                    expect you to tell a story.
                </p>
            </section>

            {/* Right: form card */}
            <main className="auth-main">
                {mode === "login" ? (
                    <form className="auth-card" onSubmit={handleLogin} aria-labelledby="login-h">
                        <div className="auth-card__head">
                            <h2 id="login-h">Welcome back</h2>
                            <p>Sign in to continue your resume and interview practice.</p>
                        </div>

                        <Field id="li-email" label="Email" name="email" type="email"
                            placeholder="you@example.com" value={login.email}
                            onChange={onLoginChange} required />
                        <Field id="li-password" label="Password" name="password" type="password"
                            value={login.password} onChange={onLoginChange} required />

                        {error && <p className="auth-error" role="alert">{error}</p>}

                        <button className="auth-submit" type="submit">SIGN IN</button>

                        <div className="auth-links">
                            <a href="/forgot-password">Forgot password?</a>
                            <span>
                                New to STAR Civilian?{" "}
                                <button type="button" className="link-btn" onClick={() => switchMode("signup")}>
                                    Create an account
                                </button>
                            </span>
                        </div>
                    </form>
                ) : (
                    <form className="auth-card" onSubmit={handleSignup} aria-labelledby="signup-h">
                        <div className="auth-card__head">
                            <h2 id="signup-h">Create your account</h2>
                            <p>Start building your resume and interview answers.</p>
                        </div>

                        <div className="field-row">
                            <Field id="su-first" label="Legal first name" name="first_name"
                                value={signup.first_name} onChange={onSignupChange} required />
                            <Field id="su-last" label="Legal last name" name="last_name"
                                value={signup.last_name} onChange={onSignupChange} required />
                        </div>

                        <Field id="su-email" label="Email" name="email" type="email"
                            value={signup.email} onChange={onSignupChange} required />

                        <Field id="su-phone" label="Phone (optional)" name="phone" type="tel"
                            value={signup.phone} onChange={onSignupChange} />

                        <div className="field-row">
                            <Field id="su-city" label="City" name="city"
                                value={signup.city} onChange={onSignupChange} required />
                            <Field id="su-state" label="State" name="state" maxLength={2}
                                placeholder="CA" value={signup.state} onChange={onSignupChange} required />
                        </div>

                        <div className="field">
                            <label htmlFor="su-branch">Branch</label>
                            <select id="su-branch" name="branch" value={signup.branch}
                                onChange={onSignupChange}>
                                <option value="">Select branch</option>
                                {BRANCHES.map((b) => (
                                    <option key={b.value} value={b.value}>{b.label}</option>
                                ))}
                            </select>
                        </div>

                        <Field id="su-password" label="Password" name="password" type="password"
                            value={signup.password} onChange={onSignupChange} required />

                        {error && <p className="auth-error" role="alert">{error}</p>}

                        <button className="auth-submit" type="submit">CREATE ACCOUNT</button>

                        <p className="auth-links">
                            Already have an account?{" "}
                            <button type="button" className="link-btn" onClick={() => switchMode("login")}>
                                Sign in
                            </button>
                        </p>
                    </form>
                )}
            </main>
        </div>
    );
}