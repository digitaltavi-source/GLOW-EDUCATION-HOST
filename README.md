# GLOW Education

**Học, dạy, luyện tập và sáng tạo cùng AI.**  
**Learn, teach, practice and create with AI.**

GLOW Education is an early-access AI learning interface designed to connect supported AI hosts to a protected education service.

## Trạng thái / Status

`EARLY ACCESS / HOST-INTEGRATION CANDIDATE`

This public repository contains only declassified host-side interfaces, contracts and examples.

It does **not** contain protected backend implementation, private production logic, internal evaluation rules, confidential prompts, private release packages, or restricted evidence.

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

The ChatGPT host has two explicit response classes:

- `PUBLIC_DECLASSIFIED` — user-safe status, approval preview and final delivery;
- `MODEL_SESSION_PRIVATE` — bounded work packages visible to the authenticated ChatGPT reasoning session only.

`MODEL_SESSION_PRIVATE != PUBLIC DELIVERY`.

Private work-package content must not be presented as final/public Factory output, logged as public content, cached into public examples, or copied into this repository as protected backend truth.

Protected implementation details, private release identities, credentials and restricted evidence must never be embedded in the public source repository.

## License / contribution

Licensing and contribution policy will be published before public beta.
