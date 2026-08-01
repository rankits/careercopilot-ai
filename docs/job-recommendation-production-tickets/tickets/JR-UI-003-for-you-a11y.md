# JR-UI-003 — For You action accessibility

Implemented on `JobCard` For You usage:

- Dismiss / Not relevant buttons expose `aria-label` with job title context
- Match pill uses `aria-label="{n} percent match"`
- Save toggle retains `aria-pressed` + descriptive label
- Decorative icons marked `aria-hidden` where redundant

Actions stop propagation so keyboard activation does not trigger card navigation.
