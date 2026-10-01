# GLOW Education Public Security Boundary

## Public-safe content
- browser/staging UI;
- MCP/OAuth host code;
- public request/response schemas;
- declassified status/result surfaces;
- integration contracts;
- generic combined-runtime interface;
- tests that prove fail-closed egress behavior.

## Protected content
The public repository must never contain:
- private Factory source;
- proprietary production logic;
- confidential prompts;
- internal evaluation rules;
- restricted evidence;
- private component packages;
- credentials/secrets;
- deployment-only private runtime modules.

## Combined deployment law

`1 DOMAIN != 1 SECURITY BOUNDARY`

Combined staging may co-locate the Public Host and an authorized protected runtime in one process, but source, authority, secrets, state and exposure stay separate.

The public host knows only a generic runtime contract supplied through `GLOW_COMBINED_RUNTIME_MODULE`.

It must not:
- hard-code private repository paths;
- embed private source;
- publish private source maps/assets;
- treat runtime injection as Factory authority;
- return `MODEL_SESSION_PRIVATE` through browser staging routes.

## Egress law
- `PUBLIC_DECLASSIFIED = USER-SAFE EGRESS`
- `MODEL_SESSION_PRIVATE = AUTHENTICATED AI WORK CONTEXT ONLY`
- unknown top-level response fields fail closed;
- combined browser path rejects private exposure;
- declassification is schema-enforced before response leaves the boundary.

## Logging
Public logs must not contain:
- secrets/tokens;
- confidential prompts;
- restricted evidence;
- private file contents;
- raw protected artifacts;
- MODEL_SESSION_PRIVATE payload bodies.

## Secrets
Secrets belong in the deployment environment only. `.env.example` contains placeholders and public variable names, never real values.

## Failure behavior
If the protected runtime is unavailable, invalid or returns unsafe output, the public host must fail closed. It must not simulate protected Factory execution or silently fall back to unverified behavior.

## Required pre-deploy checks for combined staging
- exact public Host SHA;
- exact private Factory SHA;
- public-host regression;
- combined runtime closed-loop test;
- secret scan;
- private-leak scan;
- public response allowlist test;
- MODEL_SESSION_PRIVATE negative test;
- static/public asset scan;
- manifest/component lock verification.

`COMBINED_BUILD_PASS != PRODUCTION_QUALIFIED`.
