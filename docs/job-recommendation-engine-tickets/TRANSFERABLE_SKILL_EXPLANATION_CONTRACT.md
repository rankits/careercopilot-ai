# Transferable Skill Explanation Contract

Ticket: `JRE-SKILL-004`

## Scope

Transferable skill matches must be explained explicitly and must not read like exact or related matches.

## Message Policy

When a transferable skill is the only coverage for a requested skill, the deterministic reason message uses this shape:

`Transferable skill <available> can help with <requested>, but it is lower confidence than an exact <required|preferred>-skill match`

When multiple skills are covered and at least one is transferable, the message states that the covered set includes lower-confidence transferable signals.

## Evidence Policy

Transferable evidence uses the stable format:

`transferable: <available> covers <requested>`

Preferred-skill transferable evidence uses:

`transferable: <available> supports <requested>`

## Current Limitations

This remains deterministic text generated from the curated skill graph. It does not include LLM prose or long-form coaching language.
