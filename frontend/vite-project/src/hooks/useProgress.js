// src/hooks/useProgress.js
// Which of the 4 steps the logged-in user has finished.
// Refreshes on every page change, when the tab gets focus, and after any
// save/delete (api.js and the Target jobs page fire "progress-changed").
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { apiFetch } from "../api";

export const PROGRESS_EVENT = "progress-changed";

function targetCount() {
  try {
    return JSON.parse(localStorage.getItem("targetJobs") || "[]").length;
  } catch {
    return 0;
  }
}

async function loadProgress() {
  const [positions, resumes] = await Promise.all([
    apiFetch("/api/history/positions/"),
    apiFetch("/api/resumes/"),
  ]);
  // Stop at the first resume that has answers
  let hasStar = false;
  for (const r of resumes) {
    const answers = await apiFetch(`/api/resumes/${r.id}/star-answers/`);
    if (answers.length) {
      hasStar = true;
      break;
    }
  }
  return {
    experience: positions.length > 0,
    jobs: targetCount() > 0,
    resume: resumes.length > 0,
    star: hasStar,
  };
}

export default function useProgress() {
  const { pathname } = useLocation();
  const [progress, setProgress] = useState(null);
  const [tick, setTick] = useState(0);

  // Re-check after saves and when the user comes back to the tab
  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    window.addEventListener(PROGRESS_EVENT, bump);
    window.addEventListener("focus", bump);
    return () => {
      window.removeEventListener(PROGRESS_EVENT, bump);
      window.removeEventListener("focus", bump);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadProgress()
      .then((p) => !cancelled && setProgress(p))
      .catch(() => {}); // the page itself shows errors and handles 401
    return () => {
      cancelled = true;
    };
  }, [pathname, tick]);

  return progress;
}