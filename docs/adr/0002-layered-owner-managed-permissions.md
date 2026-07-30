# Use layered Owner-managed permissions with a fixed Store workflow

PowerCare uses system Role defaults, Organization Role overrides, and User overrides in that precedence order, while data scope remains independently enforced. Store Issue keeps the fixed Create → Approve → Issue lifecycle and separation of duties; Owner Admin chooses which Roles and Users may perform each action rather than changing the workflow itself, preserving auditability without forcing every Organization to use identical staffing.
