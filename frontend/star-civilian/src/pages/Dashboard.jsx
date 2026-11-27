// src/pages/Dashboard.jsx
// Progress at a glance: what's done, what's next, and quick links to saved resumes.
//
// Backend used:
//   GET /api/history/positions/
//   GET /api/history/credentials/
//   GET /api/resumes/
//   GET /api/resumes/:id/star-answers/   (one call per resume, to count answers)
//   GET /api/jobs/target-jobs/           (the jobs picked on the Target jobs page)
//   GET /api/profile/me/                 (profile card; edited in ProfileCard.jsx)
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import ProfileCard from "../components/ProfileCard";
import { apiFetch } from "../api";
import "../css-styling/Experience.css"; // shared page styles (.exp ...)
import "../css-styling/Dashboard.css";

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

// Group resumes by target job (the O*NET code, or the title when there is no code).
// Newest first inside each group, and groups with the newest resume come first.
function groupResumes(resumes) {
  const groups = new Map();
  for (const r of resumes) {
    const key = r.onet_code || r.target_job_title;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  return [...groups.values()]
    .map((list) =>
      [...list].sort(
        (a, b) => new Date(b.updated_at) - new Date(a.updated_at) || b.id - a.id
      )
    )
    .sort((a, b) => new Date(b[0].updated_at) - new Date(a[0].updated_at));
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null); // { positions, credentials, resumes, targets, starCounts }
  const [openGroups, setOpenGroups] = useState({}); // which target jobs show their earlier versions
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      apiFetch("/api/history/positions/"),
      apiFetch("/api/history/credentials/"),
      apiFetch("/api/resumes/"),
      apiFetch("/api/jobs/target-jobs/"),
      apiFetch("/api/profile/me/"),
    ])
      .then(async ([positions, credentials, resumes, targets, me]) => {
        setProfile(me);
        const lists = await Promise.all(
          resumes.map((r) => apiFetch(`/api/resumes/${r.id}/star-answers/`))
        );
        const starCounts = Object.fromEntries(resumes.map((r, i) => [r.id, lists[i].length]));
        setData({ positions, credentials, resumes, targets, starCounts });
      })
      .catch((err) => (err.status === 401 ? navigate("/") : setError(err.message)));
  }, [navigate]);

  if (error) {
    return (
      <div className="exp">
        <AppHeader />
        <main className="exp-main">
          <p className="form-error" role="alert">{error}</p>
        </main>
      </div>
    );
  }

  const handleErr = (err) => (err.status === 401 ? navigate("/") : setError(err.message));
  const firstName = profile?.first_name || localStorage.getItem("first_name") || "there";

  const totalStar = data ? Object.values(data.starCounts).reduce((a, b) => a + b, 0) : 0;

  const steps = data
    ? [
      {
        title: "Experience",
        done: data.positions.length > 0,
        detail: `${plural(data.positions.length, "position")} · ${plural(
          data.credentials.length,
          "credential"
        )}`,
        to: "/experience",
        cta: "Add experience",
      },
      {
        title: "Target jobs",
        done: data.targets.length > 0,
        detail: plural(data.targets.length, "job") + " picked",
        to: "/jobs",
        cta: "Pick target jobs",
      },
      {
        title: "Resume",
        done: data.resumes.length > 0,
        detail: plural(data.resumes.length, "resume") + " saved",
        to: "/resume",
        cta: "Generate a resume",
      },
      {
        title: "STAR answers",
        done: totalStar > 0,
        detail: plural(totalStar, "answer") + " ready",
        to: "/star",
        cta: "Get STAR answers",
      },
    ]
    : [];

  const next = steps.find((s) => !s.done);

  return (
    <div className="exp db">
      <AppHeader />

      <main className="exp-main">
        <div className="exp-head">
          <h1>Hi, {firstName}</h1>
          <p className="muted">Here's where you are and what to do next.</p>
        </div>

        {!data ? (
          <p className="muted">Loading…</p>
        ) : (
          <>
            {/* ---------- next step ---------- */}
            <section className="db-next" aria-labelledby="next-h">
              {next ? (
                <>
                  <div>
                    <p className="db-next__label" id="next-h">Next step</p>
                    <h2>{next.cta}</h2>
                  </div>
                  <Link to={next.to} className="btn btn-light">Go</Link>
                </>
              ) : (
                <div>
                  <p className="db-next__label" id="next-h">All steps done</p>
                  <h2>Practice your STAR answers out loud before the interview.</h2>
                </div>
              )}
            </section>

            {/* ---------- profile ---------- */}
            {profile && (
              <section aria-labelledby="profile-h">
                <div className="db-section-head">
                  <h2 id="profile-h">Your Profile</h2>
                </div>
                <ProfileCard profile={profile} onSaved={setProfile} onError={handleErr} />
              </section>
            )}

            {/* ---------- saved resumes ---------- */}
            <section aria-labelledby="res-h">
              <div className="db-section-head">
                <h2 id="res-h">Your Resumes</h2>
              </div>
              {data.resumes.length === 0 ? (
                <div className="exp-empty">
                  {data.positions.length === 0 ? (
                    <>No resumes yet. <Link to="/experience">Begin step one.</Link></>
                  ) : data.targets.length === 0 ? (
                    <>No resumes yet. <Link to="/jobs">Continue to step two.</Link></>
                  ) : (
                    <>No resumes yet. <Link to="/resume">Continue to step three.</Link></>
                  )}
                </div>
              ) : (
                                               <ul className="db-resumes">
                  {groupResumes(data.resumes).map((versions) => {
                    const latest = versions[0];
                    const older = versions.slice(1);
                    const key = latest.onet_code || latest.target_job_title;
                    const open = !!openGroups[key];
                    return (
                      <li key={key} className="exp-card rg-group">
                        <div className="rg-top">
                          <div>
                            <h3>{latest.target_job_title}</h3>
                            <p className="muted">
                              Updated {new Date(latest.updated_at).toLocaleDateString()} ·{" "}
                              {plural(data.starCounts[latest.id] || 0, "STAR answer")}
                              {older.length > 0 && ` · ${plural(versions.length, "version")}`}
                            </p>
                          </div>
                          <div className="exp-card__actions">
                            <Link to={`/resume?id=${latest.id}`} className="btn btn-outline btn-sm">
                              Resume
                            </Link>
                            <Link to={`/star?resume=${latest.id}`} className="btn btn-outline btn-sm">
                              STAR answers
                            </Link>
                          </div>
                        </div>
                        {older.length > 0 && (
                          <button
                            type="button"
                            className="rg-toggle"
                            aria-expanded={open}
                            onClick={() =>
                              setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }))
                            }
                          >
                            <span aria-hidden="true">{open ? "▴" : "▾"}</span>
                            {open ? "Hide" : "Show"} {plural(older.length, "earlier version")}
                          </button>
                        )}
                        {open &&
                          older.map((r, i) => (
                            <div key={r.id} className="rg-row">
                              <div>
                                <span className="rg-name">Version {versions.length - 1 - i}</span>
                                <span className="muted">
                                  {" "}
                                  · {new Date(r.updated_at).toLocaleDateString()} ·{" "}
                                  {plural(data.starCounts[r.id] || 0, "STAR answer")}
                                </span>
                              </div>
                              <div className="exp-card__actions">
                                <Link to={`/resume?id=${r.id}`} className="btn btn-outline btn-sm">
                                  Resume
                                </Link>
                                <Link to={`/star?resume=${r.id}`} className="btn btn-outline btn-sm">
                                  STAR answers
                                </Link>
                              </div>
                            </div>
                          ))}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}