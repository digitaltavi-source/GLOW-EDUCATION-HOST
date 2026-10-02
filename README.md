# GLOW Education Host

**Public AI host, staging workspace and declassification boundary for GLOW Education.**

GLOW Education Host is the shareable/public half of a two-repository architecture:

```text
AI host / browser
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

This repository is designed to be inspectable and shareable as a portfolio-quality integration project. It demonstrates:

- typed public contracts;
- MCP/OAuth host integration;
- explicit `PUBLIC_DECLASSIFIED` vs `MODEL_SESSION_PRIVATE` boundaries;
- fail-closed response validation;
- one-domain combined deployment support without publishing protected Factory source;
- responsive staging workspace;
- automated regression and adversarial security tests.

It intentionally does **not** contain protected Factory implementation, confidential prompts, private evidence, restricted release packages, secrets or proprietary runtime internals.

## Deployment modes

### Remote protected service

`PUBLIC HOST -> HTTPS protected service`

Use `GLOW_PROTECTED_SERVICE_URL` and `GLOW_PROTECTED_SERVICE_TOKEN`.

### Combined staging

`ONE DOMAIN -> PUBLIC HOST -> injected private runtime module in-process`

Use `GLOW_COMBINED_RUNTIME_MODULE` only in the private assembly/deployment environment. The public repository never ships the private runtime module itself.

`1 DOMAIN != 1 SECURITY BOUNDARY`.

## Staging UI

The public host ships a responsive browser workspace for:

- staging access;
- Start Mission;
- mission status;
- result retrieval;
- visible combined/standalone runtime state.

The UI is an adapter surface only. It does not own Factory semantics or qualification state.

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

`LIVE_DEMO_HOST_VERIFIED_NOT_PRODUCTION`

The darkgrey Hostinger deployment has passed live combined-host and ChatGPT MCP work-loop acceptance for supervised demos. The browser surface remains a PUBLIC_DECLASSIFIED preview adapter; the full governed Factory work loop is exercised through the ChatGPT plugin/MCP path. This does not imply production qualification, independent qualification, reproduction across restart, or field verification.

## Local development

```bash
npm install
npm run build
npm test
```

To exercise combined mode you need an authorized runtime module supplied outside this public repository.

## License / contribution

Licensing and contribution policy will be published before public beta.
