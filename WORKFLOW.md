# Git Workflow

## Rules
1. **NEVER COMMIT TO 'MAIN'**
2. One branch per task
3. Every change goes through a PR with 1 approval

Replace anything in `<angle brackets>` with your own value (and drop the brackets).

---

## Daily flow (quick version)

```bash
git checkout main && git pull origin main      # 1. fresh main
git checkout -b feature/task                   # 2. new branch
git add . && git commit -m ""                  # 3. save
git push -u origin feature/<name>              # 4. push
                                               # 5. open PR on GitHub → review → merge
git checkout main && git pull origin main      # 6. back to fresh main
```

---

## One-time setup
```bash
git config --global user.name "<Your Name>"
git config --global user.email "<your-github-email>"

git clone https://github.com/Veteran-Transition/Group1-Project.git
cd Group1-Project
cp .env.example .env                # then fill in values
```

---

## 01. Start a new task
```bash
git checkout main
git pull origin main
git checkout -b feature/task        # e.g. feature/resume-model
```

Branch names: `feature/task` for new work
              `fix/task` for bug fixes

---

## 02. Save your work (repeat often)
```bash
git status                          # see what changed
git add .                           # stage files
git commit -m "Add Resume model"    # short, present-tense
```

Good messages: `Add resume upload endpoint`, `Fix MOS search filter`, `Style login page`.

---

## 03. Push your branch
```bash
git push -u origin feature/task     # first push ONLY
git push                            # every push after that
```

---

## 04. Keep your branch up to date with `main`
Do this BEFORE opening a PR, and any time a teammate's PR gets merged.

```bash
git checkout main
git pull origin main
git checkout feature/task
git merge main
git push
```
If Git says **CONFLICT**, see section 8.

---

## 05. Open PR
1. Go to the repo on GitHub → **Compare & pull request**.
2. Base: `main` ← Compare: `feature/task`.
3. Request a reviewer.

---

## 06. Review teammate's PR
On GitHub: **Files changed** → leave comments → **Review changes** → Approve or Request changes.

When you're done, go back to your own work:
```bash
git checkout <your-branch>
```

---

## 07. AFTER your PR is merged
```bash
git checkout main
git pull origin main
git branch -d feature/task     # delete your local branch
```

Click **Delete branch** on the merged PR page on GitHub. Then start your next task at section 1.

---

## 08. Fixing a merge conflict
Git marks the conflict inside the file:

```text
your version
the version from main
```

1. Open each conflicted file (`git status` lists them).
2. Keep the right code, delete `<<<<<<<`, `=======`, `>>>>>>>` lines.
3. Then:
   ```bash
   git add .
   git commit -m "Merge main into feature/<short-name>"
   git push
   ```

---

## 09. Django migrations (avoid team conflicts)
- Only make migrations for **your OWN app**.
- Pull `main` right BEFORE running `makemigrations`.
- Commit the migration file in the same PR as the model change.

```bash
docker compose exec backend python manage.py makemigrations <your_app>
docker compose exec backend python manage.py migrate
```

---

## 10. Fixes
| Problem | Fix |
| --- | --- |
| I have changes but need to switch branches | `git stash` → switch → come back → `git stash pop` |
| Undo my last commit (not pushed yet), keep the changes | `git reset --soft HEAD~1` |
| Throw away changes to one file | `git restore <file>` |
| I committed to `main` by accident (not pushed) | `git branch feature/<name>` → `git reset --hard origin/main` → `git checkout feature/<name>` |
| I pushed to the wrong branch / something looks broken | Stop. Post in the team channel before trying more commands |
| I committed `.env` or a secret | Tell the team **right away**. Run `git rm --cached .env`, commit, and rotate (replace) the leaked keys |

**Never** use `git push --force` on `main` or on someone else's branch.

---

## 11. Backend commands (Django)

Run these from the project root (`Group1-Project/`) with the venv active:

```bash
source venv/bin/activate
```

> `runserver` keeps its terminal busy. Run the other commands in a second terminal.

### First-time setup (once)

```bash
cd backend/star_civilian
python manage.py migrate
python manage.py createsuperuser
```

### Every work session

```bash
cd backend/star_civilian
docker compose up -d db
python manage.py runserver
```

### After every `git pull`

Teammates may have added migrations.

```bash
cd backend/star_civilian
python manage.py migrate
```

### When you change a model

Replace `<app_name>` with the app you changed (e.g. `history`).

```bash
cd backend/star_civilian
python manage.py makemigrations <app_name>
python manage.py migrate
```

### Before you commit or open a PR

```bash
cd backend/star_civilian
python manage.py check
python manage.py test <app_name>
```