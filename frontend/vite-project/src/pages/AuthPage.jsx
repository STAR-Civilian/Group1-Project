// src/pages/AuthPage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/star-logo.svg";
import "../css-styling/AuthPage.css";


// TODO: point these at your backend routes
const LOGIN_URL = "/api/users/login/";
const SIGNUP_URL = "/api/users/signup/";

const BRANCHES = [
  "Army",
  "Navy",
  "Air Force",
  "Marine Corps",
  "Coast Guard",
  "Space Force",
];

const EMPTY_SIGNUP = {
  first_name: "",
  last_name: "",
  email: "",
  branch: "",
  military_job_code: "",
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

async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Request failed");
  return res.json();
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
      if (data.token) localStorage.setItem("token", data.token);
      if (data.first_name) localStorage.setItem("first_name", data.first_name);
      navigate("/home");
    } catch {
      setError("Email or password is incorrect.");
    }
  }

  async function handleSignup(e) {
    e.preventDefault();
    setError("");
    if (!signup.branch) {
      setError("Please select a branch.");
      return;
    }
    try {
      const data = await postJson(SIGNUP_URL, signup);
      if (data.token) localStorage.setItem("token", data.token);
      if (data.first_name) localStorage.setItem("first_name", data.first_name);
      navigate("/home");
    } catch {
      setError("Could not create account. Try again.");
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
              <Field id="su-first" label="First name" name="first_name"
                value={signup.first_name} onChange={onSignupChange} required />
              <Field id="su-last" label="Last name" name="last_name"
                value={signup.last_name} onChange={onSignupChange} required />
            </div>

            <Field id="su-email" label="Email" name="email" type="email"
              value={signup.email} onChange={onSignupChange} required />

            <div className="field">
              <label htmlFor="su-branch">Branch</label>
              <select id="su-branch" name="branch" value={signup.branch}
                onChange={onSignupChange}>
                <option value="">Select branch</option>
                {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            <Field id="su-job" label="Military job code (MOS / rating / AFSC)"
              name="military_job_code" placeholder="e.g. 0311"
              value={signup.military_job_code} onChange={onSignupChange} required />

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