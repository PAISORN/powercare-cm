-- Apply before deploying application code that saves explicit Week 5 Patterns.
-- Only widen constraints; retain all plans, schedules, overrides and PM Work.
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "PmAnnualMonthlyWeek"
  DROP CONSTRAINT "PmAnnualMonthlyWeek_weekNumber_check",
  ADD CONSTRAINT "PmAnnualMonthlyWeek_weekNumber_check" CHECK ("weekNumber" BETWEEN 1 AND 5);

ALTER TABLE "PmAnnualMonthlyPattern"
  DROP CONSTRAINT "PmAnnualMonthlyPattern_weekNumber_check",
  ADD CONSTRAINT "PmAnnualMonthlyPattern_weekNumber_check" CHECK ("weekNumber" BETWEEN 1 AND 5);

COMMIT;
