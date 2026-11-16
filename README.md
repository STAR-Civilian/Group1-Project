# [App Name]
**Live site:** [https://your-domain.com] *(TBD)*
**Project board:** https://github.com/Veteran-Transition/Group1-Project/
![CI](https://github.com/Veteran-Transition/Group1-Project/actions/workflows/[ci].yml/badge.svg)



## The problem
Veterans leaving the military often struggle to explain their experience in civilian terms. Military job titles (MOS codes), acronyms, and duties don't map clearly to civilian roles, so strong candidates get overlooked.

Behavioral interviews make it harder: hiring managers expect STAR-method answers (Situation, Task, Action, Result), and many vets don't know how to turn their service into those stories.



## Our solution
[App Name] helps veterans translate their military experience into civilian interview answers:

- Add your branch and MOS (from a built-in MOS database).
- Pick the type of civilian job(s) you're interested in (powered by O*NET).
- Upload your military resume. Text is extracted automatically via 3rd party API.
- Get an AI-generated translation of your resume into civilian language.
- Get STAR-method example answers to common behavioral interview questions, based on your own resume and experiences.
- Exploring a career change? Pick a job outside your MOS field and get answers tailored to that path through our LLM chatbot.

⚠️ [App Name] is a prep tool. It is not affiliated with or endorsed by the DoD or VA. AI-generated answers are examples to edit, not scripts to memorize.



## MVP
✅ **Must have**
- [ ] Sign up / log in
- [ ] MOS database
- [ ] Resume upload + text extraction
- [ ] O*NET integration (civilian job types)
- [ ] LLM: translate resume into STAR-method interview answers

🎯 **Should have**
- [ ] Joint Services Transcript (JST) — API, or PDF upload + PDF reader
- [ ] Search form (branch, MOS, civilian job interests, etc.)
- [ ] Career-change path (vets targeting jobs outside their MOS field)
- [ ] Suggested document checklist (what users should upload)

💡 **Could have**
- [ ] Local job listings

👎 **Won't have (this version)**
- Mock interviews



## Team
  Name         |   Feature owned (end-to-end)   |   GitHub
---------------|--------------------------------|----------------------
Alana Karp     |   [feature]                    |   @Karp-636
Liz Burk       |   [feature]                    |   @IzzyVIII
Steph Asauskas |   [feature]                    |   @activedutymodel
Su Gardner     |   [feature]                    |   @SuGardner18

*Feature ideas to split: auth + profile/MOS · O\*NET job search · resume upload + text · LLM STAR answers*



## Contributions
*(Be specific — models, endpoints, pages, bugs fixed. You should be able to cite this in interviews.)*

- **Alana Karp** — [...]
- **Liz Burk** — [...]
- **Steph Asauskas** — [example: built X model + endpoints, Y page, set up Z, fixed W]
- **Su Gardner** — [...]



## Screenshots
*(Add once pages exist. Save images in `docs/`. A demo GIF also works.)*

![Demo](docs/demo.gif)

| Log In | Create Account |
|---|---|
| ![Log In](docs/01-login.png) | ![Create Account](docs/02-signup.png) |

| Profile (Branch + MOS) | Job Search |
|---|---|
| ![Profile](docs/03-profile.png) | ![Job Search](docs/04-job-search.png) |

| Resume Upload | STAR Answers |
|---|---|
| ![Resume Upload](docs/05-resume.png) | ![STAR Answers](docs/06-star-answers.png) |



## Tech stack
  Layer        |	                        Tools
---------------|-----------------------------------------------------------
Frontend	     |   React (Vite), [UI library]
Backend	       |   Django REST Framework, [auth method]
Database	     |   PostgreSQL
APIs           |	 O*NET Web Services, [LLM provider], [JST — TBD]
Text extraction|   [PDF reader / OCR — TBD]
Containers	   |   Docker, Docker Compose
CI             |   GitHub Actions (runs on every PR)
Deployment	   |   AWS EC2, [web server, HTTPS]



## Third-party APIs
- **O*NET Web Services** — civilian occupation data and military-to-civilian job matching. [Which endpoint/file uses it]
- **[LLM provider]** — translates resume text and generates STAR-method answers. [Which endpoint/file uses it]
- **[PDF reader / OCR]** — pulls text from uploaded resumes (and JST PDFs). [Which file]
- **JST** *(should have)* — [API or PDF upload — decide]



## Data model *(draft — adjust as we build)*
User ──> Resume ──> StarAnswer
User ──> TargetJob
User ──> MOS (via profile)

- A User has one military profile (branch + MOS)
- A User has many Resumes
- A User has many TargetJobs (civilian roles they're interested in)
- A Resume has many StarAnswers (one per behavioral question)

![Database schema](docs/schema.png)


Entity Relationship Diagram (ERD)

  Model      |                          Key fields
-------------|------------------------------------------------------------------
MOS          |  branch, code, title, description
Profile      |  user (FK), branch, mos (FK), career_change (bool)
Resume       |  user (FK), file, extracted_text, translated_text, uploaded_at
TargetJob    |  user (FK), onet_code, title
StarAnswer   |  resume (FK), target_job (FK), question, situation, task, action, result

Full CRUD resources: Resume, TargetJob, StarAnswer *(2 required)*.



## Project structure
```text
.                            |   project root
├── backend/                 |   Django project ([project_name])
│   ├── accounts_app/        |   sign-up, login, auth
│   ├── mos_app/             |   MOS database + profile
│   ├── jobs_app/            |   O*NET search + target jobs
│   ├── resumes_app/         |   uploads + text extraction
│   ├── star_app/            |   LLM translation + STAR answers
│   ├── Dockerfile           |
│   └── requirements.txt     |
├── frontend/                |   React app (Vite)
│   ├── src/                 |   pages, components, api/client.js
│   ├── Dockerfile           |
│   └── nginx.conf           |
├── docs/                    |   screenshots + schema.png
├── sample-resumes/          |   fictional test resumes
├── docker-compose.yml       |   local dev (db, backend, frontend)
├── docker-compose.prod.yml  |   production
└── .env.example             |   every required environment variable
```



## Getting started
Prerequisites:
- Docker + Docker Compose
- Git
- Optional, for full functionality:
  * O*NET Web Services account
  * [LLM provider] API key


1. Clone the repo
Run in your terminal, wherever you keep projects:

```bash
git clone https://github.com/Veteran-Transition/Group1-Project.git
cd Group1-Project
```

2. Set up environment variables
Run in the project root:

```bash
cp .env.example .env
```

Open .env and fill in the values. .env.example lists and explains every variable. The main groups:

   Group	     |                            Examples
-----------------|------------------------------------------------------------------
App	             |   DEBUG, SECRET_KEY, ALLOWED_HOSTS
Frontend / CORS	 |   CORS_ALLOWED_ORIGINS, VITE_API_URL
Database	       |   DB_HOST, DB_PORT, plus name/user/password
O*NET	           |   username / API key
LLM	             |   API key, model name

Never commit .env. Only .env.example belongs in git.


3. Start the app
Run in the project root:

```bash
docker compose up --build
```

Open http://localhost:5173


4. (Optional) Create an admin user
Run in the project root:

```bash
docker compose exec backend python manage.py createsuperuser
```

5. Try it out
Sign up, add your branch and MOS, pick a target job, upload a resume from sample-resumes/, and generate STAR answers.



## Team workflow
- Branch from `main`: `feature/<short-name>` or `fix/<short-name>`
- Never push straight to `main` (branch protection is on)
- Every PR: link its issue (`Closes #12`), at least 1 approval, CI must pass
- Keep PRs small and single-purpose
- Disclose materially AI-generated code in the PR description
- Daily standup: [time] — update the board during standup
- Weekly 15-min retro: what worked, what didn't, one change
- [Who owns `settings.py` in week 1]



## Running tests
[Number] backend tests cover [areas].

Run in the project root:
```bash
docker compose exec backend python manage.py test
```



## Deployment
[Where it runs, e.g. AWS EC2 (Ubuntu) behind an Elastic IP.] $10 AWS budget alert is set.

Who can deploy: [at least 2 names]

Request path:
```text
Browser → [web server] → [frontend container]
                            ├── serves React build
                            └── proxies /api/ → Django
```

Redeploy:
1. [Build + push step]
2. [Pull + restart step on server]



## Security notes
- Every API query is scoped to the logged-in user.
- Resumes are served only to their owner through an authenticated endpoint.
- Resume text sent to the LLM: [note what's sent and any PII stripping].
- [Other protections]



## Upcoming features
- Local job listings
- [Stretch goal]



## AI disclosure
AI tools were used during development, as allowed by the Code Platoon project rules. Materially AI-assisted code is disclosed in commit messages and pull request descriptions.



## About
Built by Steph Asauskas, Alana Karp, Su Gardner, and Liz Burk as the group project requirement for the Code Platoon Full-Stack Software Engineering program.
