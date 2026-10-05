---
status: accepted
---

# Add Monthly Pattern as a third Annual PM Schedule Mode

Annual PM Setup adds Monthly Pattern beside Manual Calendar and Weekly Pattern instead of replacing or combining with either mode. Each Assignment places one System or Zone/Area target on the first through fifth occurrence of a selected weekday in a month, allowing the system to generate exact dated Schedules for the existing Daily PM release flow without treating a visual calendar row as a business week.

## Considered Options

- Replacing Weekly Pattern was rejected because it would change existing Plans and their established weekly or alternating-week behavior.
- Mixing Weekly and Monthly generators in one Plan was rejected because two baselines could create conflicting Schedule ownership.
- A week-only Assignment without a weekday was rejected because Annual PM release requires an exact Schedule date.
- Calendar-row Week 1–5 was rejected because rows can cross month boundaries and do not represent stable monthly occurrences.
- Carry Forward was excluded because a Week 1–4 baseline has no Week 5 source Assignment to move.

## Consequences

Generation is a previewed, atomic synchronization of editable Pattern Schedules; month-specific ADD, REPLACE, CANCEL, and MOVE Overrides preserve their source and released work remains immutable. Week 5 defaults to creating no Schedule and may Repeat the Week 1 baseline or use a month-specific Custom Assignment. Existing Manual and Weekly Plans are never converted automatically, current-year generation starts at the Plan's Effective Start Date, and a changed baseline must be regenerated before activation.
