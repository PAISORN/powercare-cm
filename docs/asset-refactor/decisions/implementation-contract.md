# Implementation contract

The user approved implementation from the source pack. Earlier interviews do not override the pack except explicit approvals: System and Area/Zone are separate; MAIN_ASSET may be a real equipment set or independent machine; set types (Pump Set) differ from equipment types (Pump).

Steam Turbine is listed both as equipment and prohibited System text. Use semantic resolution: actual Steam Turbine equipment type is valid; process-system categories must not be equipment types. Instrument is never a root System. Unknown instrument parents stay unresolved NEED_PARENT_REVIEW; no fabricated parent.

Use Plant for Site, AssetSystem for System and Zone/zoneId for Area. Existing family/class metadata is optional on new Assets. Asset Codes supplied by the source Asset files are the authoritative new codes and are imported exactly after uniqueness validation. Missing or duplicate source codes remain unresolved in dry-run output; the application must not invent replacements. The proposed Site-Type sequence is not implemented. IDs and history references are preserved.

AssetSystem: id, plantId, code, nameTh, nameEn?, active, sortOrder, createdAt, updatedAt. Asset: systemId?, assetLevel (MAIN_ASSET/SUB_ASSET/PART), discipline?, tagKks?, registrationCode?, keySpecification?, metadataJson?, migrationStatus (NEED_REVIEW default). AssetType: defaultLevel?, discipline?. Migration establishes compatibility; normal application saves require complete validated relationships. Existing rows are not automatically claimed READY.
