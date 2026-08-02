# Recommendation Accessibility Contract

Ticket: `JRE-UI-004`

## Navigation

- For You mode navigation uses `role="tablist"`, `role="tab"`, and `role="tabpanel"`.
- Active tabs expose `aria-selected="true"` and `tabIndex=0`.
- Inactive tabs expose `aria-selected="false"` and `tabIndex=-1`.
- Arrow Left/Up moves to the previous tab.
- Arrow Right/Down moves to the next tab.
- Home moves to the first tab and End moves to the last tab.

## Recommendation Lists

- Virtualized recommendation lists expose `role="list"`.
- Mounted rows expose `role="listitem"`.
- Mounted rows expose `aria-posinset` and `aria-setsize` so screen readers can announce position in the full result set.

## Recommendation Cards

- Job opening is keyboard reachable through the job-title button.
- The card root is no longer exposed as a nested interactive link container.
- Match score labels announce the percent and match subtitle when present.
- Apply, save, dismiss, not-relevant, and details controls have job-specific accessible names.
- Details controls expose expanded/collapsed state and control a named details region.

## Manual Checklist

- Keyboard-only users can reach tabs, result cards, card details, feedback actions, save, apply, and pagination.
- Screen-reader users hear tab state, list position, match score, and job-specific action names.
- No fake score or hidden recommendation action is added as part of the accessibility pass.

## Verification

- `ForYouPage` tests cover arrow-key tab navigation and roving tab index.
- `JobCard` tests cover the dedicated title open control and details state.
- `VirtualizedJobList` tests cover list/listitem semantics and set-size metadata.
- Frontend typecheck and touched-file lint pass.
