# ChatGPT Host Profile

Status: `CANDIDATE / NOT YET LIVE`

This directory defines the public-safe ChatGPT-facing profile for GLOW Education.

## Responsibilities
- translate ChatGPT/user input into the public host request contract;
- call the protected service;
- return only declassified output;
- preserve bounded error/degraded states.

## Non-responsibilities
This adapter must not:
- reconstruct protected backend behavior;
- expose confidential prompts or restricted evidence;
- decide private release or qualification state;
- bypass backend authorization.

## Required runtime configuration
A future runtime implementation must receive protected endpoint configuration and credentials through secure deployment configuration, never committed source.

## First validation target
The first end-to-end validation target is a previously failed real Education mission, executed through the ChatGPT host path after the protected service is available.
