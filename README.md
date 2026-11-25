# STAR Civilian
**Live site:** https://100-57-237-178.sslip.io
**Repo:** https://github.com/STAR-Civilian/Group1-Project



## The problem
Veterans leaving the military often struggle to explain their experience in civilian terms. Military job titles (MOS codes/rates), acronyms, and duties don't map clearly to civilian roles, so strong candidates get overlooked.

Behavioral interviews make it harder: hiring managers expect STAR-method answers (Situation, Task, Action, Result), and many vets don't know how to turn their service into those stories.



## Our solution
STAR Civilian helps veterans translate their military experience into civilian resumes and interview answers, in 4 steps:

1. **Experience:** add your work history, military and civilian, one position at a time (duties + achievements), plus education, training, and certifications.
2. **Target jobs:** search civilian jobs that match your military job, or any career you're interested in (powered by O*NET). Save the ones you want, with job descriptions and salary info.
3. **Resume:** generate a civilian-language resume for one of your target jobs (powered by Claude). Edit it, add your contact info and links, and print or save it as a PDF.
4. **STAR answers:** get example answers to behavioral interview questions, built from your resume. Edit them, or write your own story and have it reshaped into STAR format.

A **dashboard** and a **progress timeline** at the top of every page show what's done and what to do next. Everything is saved, so you never re-enter your history.

⚠️ STAR Civilian is an independent capstone prototype. It is not affiliated with or endorsed by the U.S. Department of Veterans Affairs or the Department of Defense. AI-generated answers are examples to edit, not scripts to memorize.



## MVP
**Must have**
- [✅] Sign up / log in
- [✅] Military job (MOS) lookup
- [✅] O*NET integration (civilian job types)
- [✅] LLM: translate experience into a civilian resume and STAR-method interview answers
- [✅] Search form (branch, military job, civilian job interests)

**Should have**
- [✅] Career-change path (vets targeting jobs outside their military field)
- [✅] Dashboard + progress timeline
- [ ] Joint Services Transcript (JST) import

**Could have**
- [ ] Local job listings
- [ ] Resume upload + text extraction *(moved out of the MVP)*

**Won't have (this version)**
- Mock interviews
- Suggested document checklist



## Team
  Name         |   Features owned (end-to-end)                                  |   GitHub
---------------|----------------------------------------------------------------|----------------------
Alana Karp     |   Group lead · jobs app, O*NET API · testing                   |   @Karp-636
Liz Burk       |   accounts app (auth + profile), config · testing              |   @IzzyVIII
Steph Asauskas |   history app · frontend pages, timeline, dashboard · README, WORKFLOW |   @activedutymodel
Su Gardner     |   LLM app, resumes app, saved target jobs · AWS deployment     |   @SuGardner18



## Contributions
- **Alana Karp:** led the team and kept everyone on schedule. Built the `jobs` app: the O*NET client (`jobs/onet.py`), plus civilian search, military search, and skills-based job match endpoints. Tested the full app end to end.
- **Liz Burk:** built the `accounts` app: sign-up and login with DRF token auth, the `Profile` model, `GET/PUT /api/profile/me/`, password rules, and name/city/phone validators. Set up Postgres and Django settings (required `SECRET_KEY`, `DEBUG` off by default). Tested the full app end to end.
- **Steph Asauskas:** built the `history` app (`Position` and `Credential` models, serializers, CRUD endpoints, 16 tests). Built the frontend pages: login/sign up, Experience (work + education), Target jobs, Resume, STAR answers, and Dashboard. Built the progress timeline, the resume contact info section (optional phone, LinkedIn, GitHub, website), and the disclaimer footer. Wrote the README and WORKFLOW docs.
- **Su Gardner:** built the `llm` app (Claude client with mock mode, prompts, and validators for resumes, STAR answers, rewrites, and job fit) and the `resumes` app (`Resume`, `StarAnswer`, `JobFit` CRUD). Added saved target jobs with descriptions and salary. Deployed the app to AWS EC2 with Docker, Nginx, and Caddy (automatic HTTPS).



## Screenshots
*(To-do: add images to `docs/`.)*

| Log In | Dashboard |
|---|---|
| ![Log In](docs/01-login.png) | ![Dashboard](docs/02-dashboard.png) |

| Experience | Target Jobs |
|---|---|
| ![Experience](docs/03-experience.png) | ![Target Jobs](docs/04-target-jobs.png) |

| Resume | STAR Answers |
|---|---|
| ![Resume](docs/05-resume.png) | ![STAR Answers](docs/06-star-answers.png) |



## Tech stack
  Layer        |   Tools
---------------|-----------------------------------------------------------
Frontend       |   React 19 (Vite), React Router
Backend        |   Django + Django REST Framework, token auth, Gunicorn
Database       |   PostgreSQL 16
APIs           |   O*NET Web Services, Anthropic Claude
Containers     |   Docker, Docker Compose
Deployment     |   AWS EC2, Caddy (HTTPS), Nginx



## Third-party APIs
- **O*NET Web Services:** civilian occupation data, military-to-civilian job matching, job descriptions, and salary. Used in `jobs/onet.py`, `jobs/details.py`, and `jobs/views.py`.
- **Anthropic Claude:** writes the resume, STAR answers, STAR rewrites, and job-fit notes. Used in `llm/client.py` and `llm/views.py`. Set `USE_MOCK_LLM=true` to use saved sample replies instead (no API key needed).

Includes information from O*NET Web Services. O*NET® is a trademark of USDOL/ETA.



## Data model
```text
User ──> Profile                         (one)
User ──> Position, Credential            (many: work history, education + training)
User ──> TargetJob ──> Occupation        (many: saved civilian jobs)
User ──> Resume ──> StarAnswer           (many)
User ──> JobFit
```

  Model      |  App       |  Key fields
-------------|------------|----------------------------------------------------------------
Profile      |  accounts  |  user, first/last name, phone (optional), city, state, branch, linkedin/github/website URLs (optional)
Position     |  history   |  user, experience_type (military/civilian), title, dates, duties, achievements, branch, rank, mos_code, employer
Credential   |  history   |  user, credential_type, name, issuer, date_earned, description
Occupation   |  jobs      |  onet_code, title, description
TargetJob    |  jobs      |  user, occupation
Resume       |  resumes   |  user, target_job_title, onet_code, mos_code, content (JSON)
StarAnswer   |  resumes   |  resume, question, skill, situation, task, action, result, tip
JobFit       |  resumes   |  user, target_job_title, onet_code, content (JSON: summary, transfers, gaps)

Full CRUD: Position, Credential, TargetJob, Resume, StarAnswer.



## Project structure
```text
.
├── backend/
│   ├── star_civilian/
│   │   ├── accounts/        sign-up, login, profile
│   │   ├── history/         work history, education + training
│   │   ├── jobs/            O*NET search, military job lookup, target jobs
│   │   ├── llm/             Claude prompts: resume, STAR answers, job fit
│   │   ├── resumes/         saved resumes, STAR answers, job fits
│   │   └── config/          Django settings + URLs
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/star-civilian/   React app (pages, components, hooks, css-styling)
├── nginx/                   serves the React build, proxies /api/ to Django
├── caddy/                   HTTPS in production
├── docs/                    screenshots for the README
├── docker-compose.yml       local dev
├── docker-compose.prod.yml  production
├── setup.sh / stop.sh       start / stop local Docker
├── WORKFLOW.md              team git workflow
└── .env.example             every environment variable
```



## Getting started
**Prerequisites:** Docker + Docker Compose and Git. Optional: an O*NET Web Services key and an Anthropic API key (mock mode works without one).

1. **Clone the repo**
```bash
git clone https://github.com/STAR-Civilian/Group1-Project.git
cd Group1-Project
```

2. **Set up environment variables**
```bash
cp .env.example .env
```
Open `.env` and fill in the values:

  Group          |   Variables
-----------------|------------------------------------------------------------------
App              |   SECRET_KEY (required), DEBUG, ALLOWED_HOSTS
Frontend / CORS  |   CORS_ALLOWED_ORIGINS
Database         |   DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
O*NET            |   ONET_API_KEY
LLM              |   USE_MOCK_LLM, ANTHROPIC_API_KEY, LLM_MODEL

Never commit `.env`. Only `.env.example` belongs in git.

3. **Start the backend** (Postgres + Django in Docker)
```bash
./setup.sh
```
This builds the containers and runs migrations. The API runs at http://localhost:8000. Stop it with `./stop.sh`.

4. **Start the frontend** (in a second terminal)
```bash
cd frontend/star-civilian
npm install
npm run dev
```
Open http://localhost:5173.

5. **(Optional) Create an admin user**
```bash
docker compose exec backend python manage.py createsuperuser
```

6. **Try it out:** sign up, add a position on Experience, pick a target job, generate a resume, then get STAR answers.



## Team workflow
See [WORKFLOW.md](WORKFLOW.md) for the full commands.
- Branch from `main`: `feature/<short-name>` or `fix/<short-name>`
- Never push straight to `main`
- Every PR: at least 1 approval
- Keep PRs small and single-purpose
- Disclose materially AI-generated code in the PR description
- After pulling, run `python manage.py migrate`



## Running tests
20 backend tests cover the `history` app (positions + credentials CRUD, owner-only access) and the `accounts` profile (optional phone, resume links).

```bash
docker compose exec backend python manage.py test
```



## Deployment
Runs on AWS EC2 with Docker Compose (`docker-compose.prod.yml`).

Request path:
```text
Browser ──HTTPS──> Caddy ──> Nginx (web container)
                               ├── serves the React build
                               └── proxies /api/ and /admin/ ──> Django + Gunicorn (api container) ──> Postgres (db container)
```

Redeploy *(Su to confirm)*:
1. Build and push the images: `docker compose -f docker-compose.prod.yml build && docker compose -f docker-compose.prod.yml push`
2. On the server: `docker compose -f docker-compose.prod.yml pull && docker compose -f docker-compose.prod.yml up -d`, then run `migrate` in the `api` container.



## Security notes
- Every API route requires login (DRF token auth), and every query is scoped to the logged-in user.
- Passwords are checked against Django's password rules.
- Only work history, education, and target job details are sent to the LLM. Name, email, phone, and address are added to the resume afterward and never sent.
- Secrets live in `.env`, and the app won't start without a `SECRET_KEY`. `DEBUG` is off by default.
- Production uses HTTPS (Caddy), and the API port is only open to the server itself.



## Upcoming features
- Joint Services Transcript (JST) import
- Local job listings
- Resume upload + text extraction



## AI disclosure
AI tools were used during development, as allowed by the Code Platoon project rules. Materially AI-assisted code is disclosed in commit messages and pull request descriptions.



## About
Built by Steph Asauskas, Alana Karp, Su Gardner, and Liz Burk as the group project for the Code Platoon Full-Stack Software Engineering program.