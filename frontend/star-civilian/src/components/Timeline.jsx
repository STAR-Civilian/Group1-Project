// src/components/Timeline.jsx
// Progress timeline under the header on every logged-in page.
// Shows progress only. Steps are not clickable; the top tabs do the navigating.
// Updates by itself (see hooks/useProgress.js).
import { useLocation } from "react-router-dom";
import useProgress from "../hooks/useProgress";
import "../css-styling/Timeline.css";

const timelineSteps = [
  { key: "experience", label: "Experience", to: "/experience" },
  { key: "jobs", label: "Target Jobs", to: "/jobs" },
  { key: "resume", label: "Resume", to: "/resume" },
  { key: "star", label: "STAR Answers", to: "/star" },
];

export default function Timeline() {
  const progress = useProgress();
  const { pathname } = useLocation();
  // The first unfinished step is "next"
  const nextKey = progress && timelineSteps.find((s) => !progress[s.key])?.key;

  return (
    <nav className="timeline" aria-label="Your progress">
      <ol className="timeline__list">
        {timelineSteps.map((step, index) => {
          const done = progress?.[step.key];
          const status = done ? "done" : step.key === nextKey ? "next" : "todo";
          // The step for the page the person is on right now
          const isCurrent = pathname === step.to || pathname.startsWith(step.to + "/");
          return (
            <li
              key={step.key}
              className={`timeline__step is-${status}${isCurrent ? " is-current" : ""}`}
            >
              <span
                className="timeline__link"
                aria-current={isCurrent ? "step" : undefined}
              >
                <span className="timeline__dot" aria-hidden="true">
                  {done ? "✓" : index + 1}
                </span>
                <span className="timeline__label">{step.label}</span>
                <span className="sr-only">
                  {isCurrent ? " (you are here)" : ""}
                  {done ? " (done)" : status === "next" ? " (next step)" : ""}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}