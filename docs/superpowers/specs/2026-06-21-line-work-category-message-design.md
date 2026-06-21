# LINE Work Category Message Design

## Goal

Show the CM work category in every LINE work notification so recipients can immediately distinguish electrical work from mechanical work.

## Message Format

Insert the category line after the status and before the machine name:

```text
[PowerCare.CM]
เลขที่: CM-2026-06-9052
สถานะ: แจ้งใหม่
ประเภทงาน: งานเครื่องกล
เครื่องจักร: cooling pump
```

## Category Labels

- `electrical` displays as `งานไฟฟ้า`.
- `mechanical` displays as `งานเครื่องกล`.
- A missing or unknown category displays as `ไม่ระบุ` so message delivery is not blocked.

## Scope

The category line is produced by the shared LINE work-message formatter, so it appears for new requests, claims, assignments, status changes, returned work, waiting-close work, closed work, and canceled work.

## Verification

- Add formatter tests for electrical, mechanical, and missing category values.
- Run the focused LINE formatter tests.
- Run the TypeScript check and the relevant LINE test suite.
