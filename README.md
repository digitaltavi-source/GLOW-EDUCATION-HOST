# GLOW Education

**Học, dạy, luyện tập và sáng tạo cùng AI.**  
**Learn, teach, practice and create with AI.**

GLOW Education is an early-access AI learning interface designed to connect supported AI hosts to a protected education production service without exposing private factory internals.

## Trạng thái / Status

`EARLY ACCESS / HOST-INTEGRATION CANDIDATE`

This public repository contains only declassified host-side interfaces, contracts and examples.

It does **not** contain:
- private capability systems;
- internal production kits;
- proprietary routing or evaluation logic;
- internal prompts, thresholds or evidence;
- private release packages.

## Mục tiêu / Goal

One public learning interface, multiple AI hosts:

`ChatGPT -> GLOW Education Host -> protected service`

Future host adapters may include Gemini and Claude after the first ChatGPT vertical slice is validated.

## Current scope

- public request/response contracts;
- public security/declassification boundary;
- ChatGPT host profile;
- host-neutral integration documentation.

A live production service is not yet claimed by this repository.

## Security principle

Anything returned through the public host boundary is treated as **declassified**.

Private factory implementation details must never be embedded in this repository, client bundles, examples or logs.

## License / contribution

Licensing and contribution policy will be published before public beta.
