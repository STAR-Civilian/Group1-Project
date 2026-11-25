// src/components/Timeline.jsx
// Progress timeline under the header on every logged-in page.
// Updates by itself (see hooks/useProgress.js).
import { NavLink } from "react-router-dom";
import useProgress from "../hooks/useProgress";
import "../css-styling/Timeline.css";

const timelineSteps = [
  { key: "experience", label: "Experience", to: "/experience" },
  { key: "jobs", label: "Target jobs", to: "/jobs" },
  { key: "resume", label: "Resume", to: "/resume" },
  { key: "star", label: "STAR answers", to: "/star" },
];

export default function Timeline() {
  const progress = useProgress();
  // The first unfinished step is "next"
  const nextKey = progress && timelineSteps.find((s) => !progress[s.key])?.key;

  return (
    <nav className="timeline" aria-label="Your progress">
      <ol className="timeline__list">
        {timelineSteps.map((step, index) => {
          const done = progress?.[step.key];
          const status = done ? "done" : step.key === nextKey ? "next" : "todo";
          return (
            <li key={step.key} className={`timeline__step is-${status}`}>
              <NavLink to={step.to} className="timeline__link">
                <span className="timeline__dot" aria-hidden="true">
                  {done ? "✓" : index + 1}
                </span>
                <span className="timeline__label">{step.label}</span>
                <span className="sr-only">
                  {done ? " (done)" : status === "next" ? " (next step)" : ""}
                </span>
              </NavLink>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}