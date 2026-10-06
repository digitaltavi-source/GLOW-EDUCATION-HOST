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

`PUBLIC_HOST_SOURCE_CONTRACT_READY`

This repository publishes the stable public adapter contract and staging surface for GLOW Education. The V2 successor Factory is integrated and qualified separately inside the protected Factory assembly; exact assembly identity, deployment state and live acceptance are intentionally **not** owned by this public repository.

For any exact claim about what is currently assembled or deployed, the authority is the protected Factory component lock/evidence together with the live `/system/identity` endpoint. Updating this public README must never manufacture or transfer a live/qualification claim.

The next integration gate is therefore: bind the exact current Public Host SHA inside the protected Factory assembly, rerun combined Node 22 CI, then perform a same-URL Hostinger redeploy and fresh live identity + controlled MCP acceptance.

This public source state does not imply production qualification, independent qualification, field verification or human release authorization.

## Local development

```bash
npm install
npm run build
npm test
```

To exercise combined mode you need an authorized runtime module supplied outside this public repository.

## License / contribution

Licensing and contribution policy will be published before public beta.
