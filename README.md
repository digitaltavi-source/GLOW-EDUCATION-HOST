# GLOW Education Host

**Public AI host, staging workspace and declassification boundary for GLOW Education.**

GLOW Education Host is the public half of a two-repository architecture:

```text
ChatGPT / browser
      |
      v
GLOW-EDUCATION-HOST (PUBLIC)
UI + MCP/OAuth + public contracts + declassified egress
      |
      +--> remote protected service
      |
      +--> combined runtime module injected only at private build/deploy time
```

## Why this repository is public

This repository is intentionally simple and inspectable. It demonstrates the public integration surface of GLOW Education without publishing protected Factory internals:

- typed public contracts;
- MCP/OAuth host integration;
- explicit `PUBLIC_DECLASSIFIED` vs `MODEL_SESSION_PRIVATE` boundaries;
- fail-closed response validation;
- one-domain combined deployment support;
- responsive staging workspace;
- automated regression, HTTP smoke and adversarial security tests.

It intentionally does **not** contain protected Factory implementation, confidential prompts, private evidence, restricted release packages, secrets or proprietary runtime internals.

## Repository branches

The repository uses only two long-lived branches:

- `main` — public operational/source-of-truth branch;
- `sandbox` — backup and bounded experiment/integration branch before promotion to `main`.

Short-lived repair or candidate branches are not retained after their commits are safely represented in `main`.

## Deployment modes

### Remote protected service

`PUBLIC HOST -> HTTPS protected service`

Use `GLOW_PROTECTED_SERVICE_URL` and `GLOW_PROTECTED_SERVICE_TOKEN`.

### Combined staging

`ONE DOMAIN -> PUBLIC HOST -> injected private runtime module in-process`

Use `GLOW_COMBINED_RUNTIME_MODULE` only in the private assembly/deployment environment. The public repository never ships the private runtime module itself.

`1 DOMAIN != 1 SECURITY BOUNDARY`.

## Staging UI

The public host ships a responsive browser workspace for staging access, mission start/status/result retrieval, and visible combined/standalone runtime state.

The UI is an adapter surface only. It does not own Factory semantics, Canon, capability qualification or release authority.

## Security laws

- `PUBLIC HOST != PROTECTED FACTORY`
- `PUBLIC ADAPTER != CANON`
- `MODEL_SESSION_PRIVATE != PUBLIC DELIVERY`
- unknown public-response fields fail closed;
- combined web mode rejects `MODEL_SESSION_PRIVATE`;
- secrets live in deployment environment variables, never source;
- private runtime identity/path is supplied only by the private assembly.

See [SECURITY_BOUNDARY.md](SECURITY_BOUNDARY.md) and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Current state

`V2_SUCCESSOR_ASSEMBLY_NODE22_CI_VERIFIED_AWAITING_LIVE_REDEPLOY`

The public Host component remains compatible with the stable one-domain MCP/OAuth topology. A new GLOW Education V2 successor combined assembly has passed Node 22 integration CI, including exact component identity, public-host regression, the governed MCP work-loop regression, NORMAL/FAILURE/ADVERSARIAL/RECOVERY testing, full HTTP acceptance, private-implementation leak scanning and secret scanning.

That new V2 successor runtime has **not yet been reverified live on the Hostinger deployment**. Earlier live evidence belongs to the prior deployed runtime identity and does not automatically transfer to the new candidate. A same-URL redeploy plus fresh `/system/identity` and controlled MCP mission acceptance is the next live gate.

This public state does not imply production qualification, independent qualification, field verification or human release authorization.

## Local development

```bash
npm install
npm run build
npm test
```

To exercise combined mode you need an authorized runtime module supplied outside this public repository.

## License / contribution

Licensing and contribution policy will be published before public beta.
