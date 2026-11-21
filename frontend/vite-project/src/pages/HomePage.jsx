// src/pages/HomePage.jsx
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/star-logo.svg";
import "../css-styling/HomePage.css";

const STEPS = [
  {
    step: "Step 1",
    title: "Enter your military job",
    text: "Look up your MOS / rating / AFSC and see the skills it maps to.",
    to: "/military-job",
  },
  {
    step: "Step 2",
    title: "Select your target job",
    text: "Browse matching civilian occupations from O*NET.",
    to: "/jobs",
  },
  {
    step: "Step 3",
    title: "Get STAR interview responses",
    text: "Turn your experience and resume into answers for behavioral interview questions.",
    to: "/star",
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  // TODO: swap for real user data once the accounts API returns it
  const firstName = localStorage.getItem("first_name") || "there";

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("first_name");
    navigate("/");
  }

  return (
    <div className="home">
      <header className="home-header">
        <nav className="home-nav" aria-label="Main">
          <Link to="/home" className="home-logo-link">
            <img src={logo} alt="STAR Civilian" className="home-logo" />
          </Link>
          <div className="home-nav__right">
            <Link to="/dashboard" className="btn btn-light">Go to dashboard</Link>
            <button type="button" className="home-user" onClick={handleLogout}>
              <span className="home-avatar" aria-hidden="true">
                {firstName.charAt(0).toUpperCase()}
              </span>
              Log out
            </button>
          </div>
        </nav>
      </header>

      <main className="home-main">
        <section className="home-hero">
          <div className="home-hero__text">
            <span className="tag">Welcome, {firstName}</span>
            <h1>Turn your military experience into a civilian career.</h1>
            <p className="muted">
              Enter your military job, pick a target civilian job, and get resume
              language and STAR interview answers written for civilian hiring managers.
            </p>
            <div className="home-hero__actions">
              <Link to="/military-job" className="btn btn-primary">Get started</Link>
              <a href="#how" className="btn btn-outline">How it works</a>
            </div>
          </div>
          {/* TODO: replace with a real image or product screenshot */}
          <div className="home-hero__art" aria-hidden="true" />
        </section>

        <section id="how" className="home-how" aria-labelledby="how-h">
          <h2 id="how-h">How it works</h2>
          <div className="home-steps">
            {STEPS.map((s) => (
              <Link key={s.step} to={s.to} className="step-card">
                <span className="tag">{s.step}</span>
                <h3>{s.title}</h3>
                <p className="muted">{s.text}</p>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <footer className="home-footer">
        <div className="home-footer__inner">
          <span>STAR Civilian · Code Platoon Group 1</span>
        </div>
      </footer>
    </div>
  );
}