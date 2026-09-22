# GLOW Education Public Security Boundary

## Public-safe content
- host request/response schemas
- user-facing documentation
- examples
- bounded error/status vocabulary
- adapter code that does not embed private factory semantics

## Private-only content
The following must never be copied into this repository:
- Capability System internals
- KIT A / KIT B / KIT C internals
- Integration internals
- Complete Factory Bundle
- internal evaluators, thresholds, prompts, routing logic
- non-declassified evidence
- private release assets

## Core laws
- `PUBLIC HOST != PRIVATE FACTORY`
- `ADAPTER != CANON`
- `ANYTHING RETURNED TO PUBLIC HOST = DECLASSIFIED`
- `HOST SUPPORT != USER AUTHORITY`
- `TOOL EXPOSED != TOOL AUTHORIZED`

## Logging
Public logs must not contain private prompts, internal evidence, capability routing decisions, private file paths, secrets, or raw private artifacts.

## Failure behavior
If the protected backend is unavailable, the public host must return a bounded degraded/error state. It must not simulate private capability execution locally.
