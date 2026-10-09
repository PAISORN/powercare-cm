---
status: accepted
---

# Snapshot the PM Check Sheet when PM Work is created

Each PM Work stores the resolved Default and Custom Check Items when the work is created, alongside its existing Asset snapshot. This keeps planned execution deterministic and prevents later Technical Field Template or Asset-specific Check Sheet changes from rewriting an existing or completed worksheet; older PM Work without a snapshot falls back to the live Check Sheet until its first persisted worksheet snapshot is created.
