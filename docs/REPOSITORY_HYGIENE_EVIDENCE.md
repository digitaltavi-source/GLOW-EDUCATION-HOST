# Repository Hygiene Evidence — 2026-10-02

## Policy
This PUBLIC HOST repository uses exactly two persistent branch roles:
- main: current deployable Public Host baseline.
- sandbox: the only experimentation/integration branch.

There is no durable version-backup branch for GLOW-EDUCATION-HOST. Rollback is provided by Git history, release/deployment evidence, and the private Factory's governed component lock.

Temporary candidate/repair/backup branches are not durable products and must be retired after their accepted changes and evidence are preserved.

## Current baseline
Current deployment branch: main.

The repository previously carried candidate/repair branches and a temporary version-backup branch during hygiene work. Those refs are obsolete once GitHub default branch is moved to main and deletion is performed.

## Lifecycle
sandbox -> CI/regression/evidence -> main
then sandbox is synchronized to main and temporary branches are deleted.

Do not create durable candidate/repair/version-backup branches in this PUBLIC HOST repository.
