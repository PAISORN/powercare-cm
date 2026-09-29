---
status: accepted
---

# Use relational targets for Annual PM Setup

Annual PM Schedule and Weekly Pattern records reference exactly one Asset System or Zone through explicit nullable foreign keys, with database and service constraints enforcing the Plan's PM By, Site ownership, and daily uniqueness. We rejected a generic `target_type` plus `target_id` pair because it cannot provide database-level referential integrity and could retain missing or cross-Site targets; the trade-off is two nullable target columns and provider-specific check constraints.