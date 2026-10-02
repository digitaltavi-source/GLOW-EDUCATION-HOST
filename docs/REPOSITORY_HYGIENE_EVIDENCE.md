# Repository Hygiene Evidence — 2026-10-02

## Policy
This repository uses exactly three persistent branch roles:
- main: current promoted version.
- sandbox: the only experimentation/integration branch.
- version-backup: exactly one immediate predecessor for rollback.

Temporary branches are not durable products. After work is accepted, preserve evidence here, promote to main, reset sandbox to main, rotate version-backup to the prior main, and remove obsolete temporary branches.

## Promotion evidence
Promoted SHA: d848a8f54d1b315d48288193b72034d3c358d390
Immediate predecessor retained for rollback: b2008d7f5123eb5facf3457ea277aeb71dc43be6

GitHub Actions evidence for promoted SHA:
- host-ci run 36950787818 — SUCCESS
- host-ci run 36953374391 — SUCCESS
- PR validation run 36953377650 — SUCCESS

Lineage evidence:
- candidate/combined-staging-host-v0.2.0 and candidate/chatgpt-host-v0.1.0 were identical at d848a8f54d1b315d48288193b72034d3c358d390 before cleanup.
- repair/mcp-json-limit-2026-09-26 was identical to predecessor b2008d7f5123eb5facf3457ea277aeb71dc43be6.
- Promotion to main was a non-forced fast-forward.

## Hygiene rule
Normal lifecycle:
sandbox -> CI/regression/evidence -> main
prior main -> version-backup
then sandbox is synchronized to main and temporary branches are deleted.

Do not create durable candidate/repair branches. If a temporary branch is unavoidable, it must be deleted after its evidence is captured and its accepted changes are integrated.
