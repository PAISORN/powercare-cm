# Keep announcements at platform scope only

PowerCare uses one public announcement type owned by Owner Admin and shown on the Public Landing Page. Organization-scoped announcements and their existing records are removed from Development and Production because retaining two scopes creates ambiguous ownership and risks exposing tenant-specific notices on the global product page; removal must run through a reviewed migration with a backup and pre-delete record count, never an ad hoc Production command. Restoring Organization announcements later would require a new explicit design decision.
