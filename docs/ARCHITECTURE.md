# GLOW Education Host Architecture

## Public repository role

```text
Browser / ChatGPT
       |
       v
GLOW-EDUCATION-HOST  [PUBLIC]
UI / MCP / OAuth / public contracts / declassification
       |
       +-------------------------------+
       |                               |
       v                               v
REMOTE PROTECTED SERVICE        COMBINED RUNTIME MODULE
                               injected only at private
                               assembly/deploy time
```

The public host owns host adaptation and public egress. It does not own Factory semantics, private state, private evidence or qualification.

## Combined staging mode

```text
ONE PUBLIC DOMAIN / LISTENER
          |
          v
Public Host
          |
    generic runtime contract
          |
          v
Protected runtime in-process
```

The private runtime implementation is absent from this repository. The private assembly selects and verifies the implementation by exact identity.

## Trust boundaries
1. browser/public HTTP boundary;
2. MCP/OAuth authentication boundary;
3. public-host-to-runtime contract boundary;
4. declassification boundary;
5. private Factory state/authority boundary.

Co-location does not collapse these boundaries.

## Runtime interface

The combined runtime module must export `createGlowCombinedRuntime(options)`.

It returns an object exposing `execute(publicRequest)`.

The host validates the candidate response against its public schema and rejects non-`PUBLIC_DECLASSIFIED` output for browser combined mode.

## Current claim

`PUBLIC_HOST_COMBINED_STAGING_CANDIDATE`

This architecture supports combined staging but does not itself prove a particular private Factory, deployment, domain or production qualification.
