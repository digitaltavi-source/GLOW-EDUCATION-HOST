# ChatGPT Host Profile

Status: `CANDIDATE / NOT YET LIVE`

This directory defines the ChatGPT-facing MCP profile for GLOW Education.

## Operating model

```text
USER
  -> ChatGPT reasoning
  -> GLOW MCP tools
  -> Protected Gateway
  -> Factory Control
  -> KIT A/H1 -> KIT B/H2 -> KIT C/H3
       <-> Capability System
```

ChatGPT is the reasoning/intelligence host. The protected backend does not need a second LLM API on the primary path.

## Tool loop

1. `glow_start_learning_mission`
2. `glow_get_factory_work`
3. ChatGPT performs only the bounded returned job
4. `glow_submit_factory_work`
5. Repeat 2-4 until an exact approval gate is returned
6. `glow_approve_factory_stage`
7. Continue through H1/H2/H3
8. `glow_get_delivery`

## Exposure classes

- `MODEL_SESSION_PRIVATE`: work packages needed by ChatGPT reasoning; not public delivery.
- `PUBLIC_DECLASSIFIED`: status, approval preview and final delivery safe for user-facing presentation.

## Adapter responsibilities

- authenticated MCP/tool transport;
- translate user/ChatGPT calls into the host request contract;
- preserve work tokens and mission IDs exactly;
- enforce expected exposure class per tool;
- return bounded failure/degraded states.

## Non-responsibilities

This adapter must not:
- own Factory flow;
- reconstruct Kit or Capability semantics;
- approve on behalf of the user;
- mutate Canon/qualification/release state;
- expose private release identities or restricted evidence as public output;
- simulate protected backend success locally.

## First validation target

A live ChatGPT end-to-end vertical slice using the previously failed real Education mission after the protected service is deployed and connected.

`HOST BUILD PASS != CHATGPT HOST COMPATIBILITY VERIFIED != REAL SOW PASS`.
