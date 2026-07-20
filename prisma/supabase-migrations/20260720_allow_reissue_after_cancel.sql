-- Issue line numbers describe the selected Store/Type/Category/Zone/Item.
-- They are reference codes, not unique transaction identifiers. The parent
-- SparePartIssue.number remains unique for each request.
DROP INDEX IF EXISTS "SparePartIssueItem_lineNumber_key";
