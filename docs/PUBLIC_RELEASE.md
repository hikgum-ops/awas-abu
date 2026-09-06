# Publishing the public repository

The local `public-release` branch is the publication branch. It contains the
same reviewed files as `main` in a single root commit with a generic contributor
identity, so the private development author email is not copied into GitHub.

Do not push the local `main` branch to the new public repository. It retains the
private development history for local continuity.

## Create and publish

Sign in to GitHub CLI, replace `<owner>` with the intended account or
organization, then run:

```powershell
gh auth login
gh repo create <owner>/awas-abu --public --source . --remote origin
git push -u origin public-release:main
```

These commands create an external public repository. Review the target account
and repository name before running them. If an `origin` remote already exists,
inspect it instead of replacing it blindly.

## GitHub settings after the first push

1. Add a concise description and the `indonesia`, `volcano`, `public-safety`,
   and `cloudflare-workers` topics.
2. Enable private vulnerability reporting and secret scanning where available.
3. Protect `main`: require the `check` status, require pull requests, and block
   force pushes and deletion.
4. Keep all deployment and messaging values in Sites or GitHub Secrets. Never
   paste them into an issue, Actions log, or committed file.
5. Update the security contact in `SECURITY.md` when a public private-contact
   channel has been chosen.

Publishing the code does not change the access policy of the existing hosted
site and does not deploy forks. Each fork must use a Sites project it owns and
configure its own secrets and D1 database.

## Before announcing the project

Confirm that GitHub Actions passes, the repository license is detected as MIT,
and the public commit contains no earlier parent:

```powershell
git log --max-count=1 --format="%H%n%an <%ae>%nparents: %P" public-release
git diff --exit-code main public-release
```

Also complete the live acceptance checks in the main README. A green repository
build does not prove database connectivity or WhatsApp delivery.
