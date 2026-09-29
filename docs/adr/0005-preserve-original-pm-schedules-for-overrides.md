---
status: accepted
---

# Preserve original Annual PM schedules for overrides

Annual PM overrides create linked exception records instead of overwriting or deleting their source schedules, so moves, cancellations, and No-PM decisions retain the planned value and the effective value for audit. Calendar queries project the effective result, while History can reconstruct both sides; the additional rows and linkage are accepted to prevent loss of planning evidence and avoid a redundant `is_override` flag drifting from the schedule source.