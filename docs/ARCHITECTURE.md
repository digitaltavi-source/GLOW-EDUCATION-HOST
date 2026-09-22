# Public Host Architecture

```text
ChatGPT
  |
  v
GLOW Education Host
  |
  v
Protected Service Boundary
  |
  v
Private Backend
```

The public host owns only host adaptation and declassified transport.

It does not own:
- private production flow;
- backend decision logic;
- private release state;
- qualification state;
- internal assurance decisions.

Current host target: ChatGPT.

Future adapters may target Gemini and Claude after the ChatGPT vertical slice is verified.
