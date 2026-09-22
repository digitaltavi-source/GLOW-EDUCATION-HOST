# ChatGPT Host Profile

Status: `CANDIDATE / NOT YET LIVE`

This directory defines the public-safe ChatGPT-facing profile for GLOW Education.

## Responsibilities
- translate ChatGPT/user input into the public host request contract;
- call the protected gateway;
- return only declassified output;
- preserve bounded error/degraded states.

## Non-responsibilities
This adapter must not:
- contain Capability/KIT logic;
- reconstruct private factory behavior;
- expose private prompts/evidence;
- decide release/qualification state;
- bypass gateway authorization.

## Required runtime configuration
A future runtime implementation must receive protected endpoint configuration and credentials through secure deployment configuration, never committed source.

## First validation target
The first end-to-end validation target is the previously failed real Education SOW, executed through the ChatGPT host path after the protected gateway is available.
