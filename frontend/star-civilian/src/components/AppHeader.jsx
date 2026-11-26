// src/components/AppHeader.jsx
// Navy top bar for pages after login. Add links to LINKS as pages get built.
import { Link, NavLink, useNavigate } from "react-router-dom";
import logo from "../assets/star-logo.svg";
import Timeline from "./Timeline";
import "../css-styling/AppHeader.css";

const LINKS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/experience", label: "Experience" },
  { to: "/jobs", label: "Target Jobs" },
  { to: "/resume", label: "Resume" },
  { to: "/star", label: "STAR Answers" },
];

export default function AppHeader() {
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("first_name");
    navigate("/");
  }

  return (
    <>
      <header className="app-header">
        <nav className="app-nav" aria-label="Main">
          <Link to="/dashboard" className="app-nav__logo">
            <img src={logo} alt="STAR Civilian" />
          </Link>

          <div className="app-nav__links">
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `app-nav__link${isActive ? " is-active" : ""}`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </div>

          <button
            type="button"
            className="app-nav__logout"
            onClick={handleLogout}
          >
            Log Out
          </button>
        </nav>
      </header>
      <Timeline />
    </>
  );
}