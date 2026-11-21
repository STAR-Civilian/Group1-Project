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
  branch: "",
  job_code_or_title: "",
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
      navigate("/home");
    } catch (err) {
      setError(err.message);
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
      await saveSession(data.token);
      navigate("/home");
    } catch (err) {
      setError(err.message);
    }
  }