# GLOW Education Public Security Boundary

## Public-safe content
- host request/response schemas
- user-facing documentation
- examples
- bounded error/status vocabulary
- adapter code limited to declassified transport behavior

## Protected content
Private backend implementation, proprietary production methods, internal evaluation rules, confidential prompts, restricted evidence, credentials and private release assets must never be copied into this repository.

## Core laws
- `PUBLIC HOST != PROTECTED BACKEND`
- `PUBLIC ADAPTER != SOURCE OF TRUTH`
- `ANYTHING RETURNED TO PUBLIC HOST = DECLASSIFIED`
- `HOST SUPPORT != USER AUTHORITY`
- `TOOL EXPOSED != TOOL AUTHORIZED`

## Logging
Public logs must not contain confidential prompts, restricted evidence, private file paths, credentials, backend decision traces or raw protected artifacts.

## Failure behavior
If the protected backend is unavailable, the public host must return a bounded degraded/error state. It must not simulate protected backend execution locally.
