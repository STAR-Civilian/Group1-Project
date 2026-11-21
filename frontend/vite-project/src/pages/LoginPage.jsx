// src/pages/LoginPage.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./LoginPage.css";

// TODO: point these at your backend routes
const LOGIN_URL = "/api/login/";
const SIGNUP_URL = "/api/signup/";
const BRANCHES = [
  "Army",
  "Navy",
  "Air Force",
  "Marine Corps",
  "Coast Guard",
  "Space Force",
];

function StarIcon() {
  return (
    <svg
      aria-hidden="true"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    >
      <path d="M12 2l3 7h7l-5.5 4.5L18.5 21 12 16.5 5.5 21l2-7.5L2 9h7z" />
    </svg>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();

  const [login, setLogin] = useState({ email: "", password: "" });
  const [signup, setSignup] = useState({
    first_name: "",
    last_name: "",
    email: "",
    branch: "",
    password: "",
  });
  const [loginError, setLoginError] = useState("");
  const [signupError, setSignupError] = useState("");

  const handleLoginChange = (e) =>
    setLogin({ ...login, [e.target.name]: e.target.value });

  const handleSignupChange = (e) =>
    setSignup({ ...signup, [e.target.name]: e.target.value });

  async function postJson(url, body) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Request failed");
    return res.json();
  }

  async function handleLogin(e) {
    e.preventDefault();
    setLoginError("");
    try {
      const data = await postJson(LOGIN_URL, login);
      if (data.token) localStorage.setItem("token", data.token);
      navigate("/dashboard");
    } catch {
      setLoginError("Email or password is incorrect.");
    }
  }

  async function handleSignup(e) {
    e.preventDefault();
    setSignupError("");
    if (!signup.branch) {
      setSignupError("Please select a branch.");
      return;
    }
    try {
      const data = await postJson(SIGNUP_URL, signup);
      if (data.token) localStorage.setItem("token", data.token);
      navigate("/dashboard");
    } catch {
      setSignupError("Could not create account. Try again.");
    }
  }

  return (
    <div className="auth-page">
      <header className="auth-header">
        <div className="auth-header__inner">
          <Link to="/" className="brand">
            <StarIcon />
            Star Civilian
          </Link>
        </div>
      </header>

      <main className="auth-main">
        {/* Log in */}
        <form
          className="card auth-form"
          aria-labelledby="login-heading"
          onSubmit={handleLogin}
        >
          <h1 id="login-heading">Log in</h1>

          <div>
            <label className="label" htmlFor="login-email">Email</label>
            <input
              className="input"
              id="login-email"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={login.email}
              onChange={handleLoginChange}
              required
            />
          </div>

          <div>
            <label className="label" htmlFor="login-password">Password</label>
            <input
              className="input"
              id="login-password"
              name="password"
              type="password"
              value={login.password}
              onChange={handleLoginChange}
              required
            />
          </div>

          {loginError && <p className="form-error" role="alert">{loginError}</p>}

          <button className="btn btn-primary" type="submit">Log in</button>
          <Link to="/forgot-password" className="small-link">
            Forgot password?
          </Link>
        </form>

        {/* Sign up */}
        <form
          className="card auth-form"
          aria-labelledby="signup-heading"
          onSubmit={handleSignup}
        >
          <h2 id="signup-heading">Create an account</h2>

          <div className="row">
            <div>
              <label className="label" htmlFor="su-first">First name</label>
              <input
                className="input"
                id="su-first"
                name="first_name"
                value={signup.first_name}
                onChange={handleSignupChange}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="su-last">Last name</label>
              <input
                className="input"
                id="su-last"
                name="last_name"
                value={signup.last_name}
                onChange={handleSignupChange}
                required
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="su-email">Email</label>
            <input
              className="input"
              id="su-email"
              name="email"
              type="email"
              value={signup.email}
              onChange={handleSignupChange}
              required
            />
          </div>

          <div>
            <label className="label" htmlFor="su-branch">Branch</label>
            <select
              className="input"
              id="su-branch"
              name="branch"
              value={signup.branch}
              onChange={handleSignupChange}
            >
              <option value="">Select branch</option>
              {BRANCHES.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="su-password">Password</label>
            <input
              className="input"
              id="su-password"
              name="password"
              type="password"
              value={signup.password}
              onChange={handleSignupChange}
              required
            />
          </div>

          {signupError && <p className="form-error" role="alert">{signupError}</p>}

          <button className="btn btn-primary" type="submit">Sign up</button>
        </form>
      </main>
    </div>
  );
}