# Corrective Maintenance

This context defines the language for a power plant Corrective Maintenance web app. It keeps domain terms consistent while the product plan evolves.

## Language

**Corrective Maintenance (CM)**:
Maintenance work created after a problem, failure, or abnormal condition is reported and needs corrective action.
_Avoid_: PM, preventive maintenance, planned maintenance

**Repair Request**:
A report submitted by any requester to describe a problem that needs CM attention. A requester does not need a system role to submit one.
_Avoid_: ticket, incident, case

**CM Work**:
A trackable maintenance item created from a repair request and managed until completion.
_Avoid_: task, job, work order

**CM Work Number**:
A unique human-readable identifier for CM work, formatted by year, month, and monthly sequence.
_Avoid_: ticket number, case number

**Claimed CM Work**:
CM work accepted by a Technician or Engineer in the same category so it can be worked on. Users outside the category may view the work but cannot claim it.
_Avoid_: assigned work, picked task

**Waiting-to-Claim CM Work**:
CM work that is available for a Technician or Engineer in the same category to claim, including work released back after a previous claim.
_Avoid_: new request, unassigned task

**Released CM Work**:
CM work returned to the claim queue by the current claimant because they cannot continue or claimed it by mistake.
_Avoid_: canceled work, rejected work

**Requester**:
A person who submits a repair request without needing to log in or hold a role in the system.
_Avoid_: guest user, customer

**Public Tracking**:
A no-login status lookup for a requester using a CM work number, showing only basic non-internal CM work information.
_Avoid_: public dashboard, guest dashboard

**Report Export**:
A filtered data export of CM work lists for reporting, available to Admins and Engineers.
_Avoid_: completion document, printed form

**Admin**:
A role that can create, edit, deactivate, and manage CM data from the back office.
_Avoid_: superuser, owner

**Engineer**:
A role responsible for reviewing, claiming, updating, canceling, and closing CM work within its maintenance discipline.
_Avoid_: technician, staff

**Technician**:
A role responsible for performing CM work and providing a stored signature for completion documents.
_Avoid_: operator, mechanic, staff

**Signature**:
A stored image uploaded to a Technician or Engineer profile and used on printable CM completion documents.
_Avoid_: approval stamp, initials

**User Profile**:
A role-bound user record that stores identity details and a signature for roles that appear on CM completion documents.
_Avoid_: account page, personal settings

**Zone**:
A plant area or operational location used to classify repair requests and CM work.
_Avoid_: area, location, site

**Machine**:
The equipment or asset name related to a repair request or CM work.
_Avoid_: device, asset, equipment

**Category**:
A maintenance discipline used to classify repair requests and CM work, initially Electrical or Mechanical.
_Avoid_: type, department

**Role Category Assignment**:
The maintenance category attached to an Engineer or Technician role, defining which CM work they can claim, update, review, close, or cancel.
_Avoid_: separate electrical role, separate mechanical role

**Closed CM Work**:
CM work that has been completed and is ready for a printable completion document.
_Avoid_: finished task, done job

**Engineer Review**:
The step where an Engineer checks the Technician's completion details before closing CM work.
_Avoid_: approval, inspection

**Returned CM Work**:
CM work sent back by an Engineer because the Technician's completion details need correction or more information.
_Avoid_: rejected work, failed job

**Overdue CM Work**:
CM work that has stayed in a status longer than the configured threshold for that status group.
_Avoid_: late task, delayed job

**SLA Setting**:
An admin-managed threshold that defines when CM work becomes overdue for claim, work execution, or engineer review.
_Avoid_: due date setting, deadline rule

**Canceled CM Work**:
CM work that will not continue because it is invalid, duplicated, unnecessary, or otherwise rejected by an authorized role.
_Avoid_: deleted work, removed request

**Audit Trail**:
A history of important changes to CM work, especially changes made after closing, including who changed it and when.
_Avoid_: log, edit history
