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
- `PUBLIC_DECLASSIFIED = USER-SAFE EGRESS`
- `MODEL_SESSION_PRIVATE = AUTHENTICATED CHATGPT WORK CONTEXT; NOT PUBLIC DELIVERY`
- `MODEL_SESSION_PRIVATE != PUBLIC_DECLASSIFIED`
- `HOST SUPPORT != USER AUTHORITY`
- `TOOL EXPOSED != TOOL AUTHORIZED`

## Logging
Public logs must not contain confidential prompts, restricted evidence, private file paths, credentials, backend decision traces or raw protected artifacts.

Authenticated work-package payloads may cross the MCP bridge only when explicitly classified `MODEL_SESSION_PRIVATE` and required for the current bounded Factory job. They must not be emitted as user-facing delivery or persisted into public logs/examples.

## Failure behavior
If the protected backend is unavailable, the public host must return a bounded degraded/error state. It must not simulate protected backend execution locally.
