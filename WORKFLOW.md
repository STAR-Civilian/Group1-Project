# Git Workflow

Our rules: **never commit to `main`**, one branch per task, every change goes through a pull request (PR) with 1 approval and green CI.

Replace anything in `<angle brackets>` with your own value (and drop the brackets).

---

## 0. One-time setup (do once)

```bash
git config --global user.name "<Your Name>"
git config --global user.email "<your-github-email>"

git clone https://github.com/Veteran-Transition/Group1-Project.git
cd Group1-Project
cp .env.example .env        # then fill in values — never commit .env
```

---

## 1. Start a new task

Always start from a fresh copy of `main`.

```bash
git checkout main
git pull origin main
git checkout -b feature/<short-name>     # e.g. feature/resume-model
```

Branch names: `feature/<thing>` for new work, `fix/<thing>` for bug fixes. Lowercase, dashes, no spaces.

---

## 2. Save your work (repeat often)

```bash
git status                          # see what changed
git add .                           # stage specific files
git commit -m "Add Resume model"    # short, starts with a verb
```

Good messages: `Add resume upload endpoint`, `Fix MOS search filter`, `Style login page`.
Bad messages: `stuff`, `fixed it`, `asdf`.

---

## 3. Push your branch to GitHub

```bash
git push -u origin feature/<short-name>    # first push only
git push                                   # every push after that
```

---

## 4. Keep your branch up to date with `main`

Do this before opening a PR, and any time a teammate's PR gets merged.

```bash
git checkout main
git pull origin main
git checkout feature/<short-name>
git merge main
git push
```

If Git says **CONFLICT**, see section 8.

---

## 5. Open a pull request

1. Go to the repo on GitHub → **Compare & pull request**.
2. Base: `main` ← Compare: `feature/<short-name>`.
3. Title: what the PR does (`Add resume upload endpoint`).
4. Description:
   ```
   Closes #<issue-number>

   What changed:
   - ...

   How to test:
   - ...

   AI disclosure: <none / what was AI-assisted>
   ```
5. Request a reviewer. Wait for CI to pass ✅.

Keep PRs small: one feature or fix each.

---

## 6. Review a teammate's PR

```bash
git fetch origin
git checkout <their-branch-name>
docker compose up --build      # run it and try it
```

Then on GitHub: **Files changed** → leave comments → **Review changes** → Approve or Request changes.

When you're done, go back to your own work:

```bash
git checkout feature/<your-branch>
```

---

## 7. After your PR is merged

```bash
git checkout main
git pull origin main
git branch -d feature/<short-name>     # delete your local branch
```

Click **Delete branch** on the merged PR page on GitHub. Then start your next task at section 1.

---

## 8. Fixing a merge conflict

Git marks the conflict inside the file:

```text
your version
the version from main
```

1. Open each conflicted file (`git status` lists them).
2. Keep the right code, delete the `<<<<<<<`, `=======`, `>>>>>>>` lines.
3. Then:
   ```bash
   git add <fixed-file>
   git commit -m "Merge main into feature/<short-name>"
   git push
   ```

Not sure which version to keep? **Ask the person who wrote the other code.** Don't guess.

---

## 9. Django migrations (avoid team conflicts)

- Only make migrations for **your own app**.
- Pull `main` right before running `makemigrations`.
- Commit the migration file in the same PR as the model change.

```bash
docker compose exec backend python manage.py makemigrations <your_app>
docker compose exec backend python manage.py migrate
```

---

## 10. "Oops" fixes

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

## Daily flow (quick version)

```bash
git checkout main && git pull origin main      # 1. fresh main
git checkout -b feature/<name>                 # 2. new branch
git add <files> && git commit -m "<message>"   # 3. save
git push -u origin feature/<name>              # 4. push
                                               # 5. open PR on GitHub → review → merge
git checkout main && git pull origin main      # 6. back to fresh main
```