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

**Store Officer**:
A role responsible for controlling spare-part stock, receiving stock, and issuing approved spare parts for CM work or direct site use.
_Avoid_: warehouse admin, stock user, engineer, site admin

**Spare Part Issue**:
A request to take one or more spare parts from site stock, either for CM work or direct site use. Stock is reduced only when a Store Officer issues the approved spare parts.
_Avoid_: purchase request, stock adjustment, material order

**Public Spare Part Issue Request**:
A no-login spare-part issue request submitted through a site-specific link or QR code. It is allowed only when Owner Admin enables public issue requests for that site and still requires Engineer and Store Officer review before stock is reduced.
_Avoid_: public stock issue, anonymous stock out, direct store access

**Public Issue Contact Field**:
An optional requester contact field for public spare-part issue requests. Owner Admin controls whether each site requires or hides this field.
_Avoid_: mandatory phone number, user account, requester role

**Site Store Issue QR**:
A site-specific QR code that opens the public spare-part issue request page for that site.
_Avoid_: spare part QR, CM request QR, tracking QR

**Store Tracking**:
A public status lookup for a spare-part issue number, showing issue status, requested spare parts, issued quantities, and latest remarks without exposing internal store controls.
_Avoid_: CM tracking, stock report, store dashboard

**Spare Part QR**:
A QR code printed on an individual spare part label that contains the spare part code for scanner lookup.
_Avoid_: site issue QR, full spare-part record, stock movement QR

**Spare Part Issue Number**:
A unique human-readable identifier for a spare-part issue, used to track issue status similarly to a CM work number. It follows `SI-{SITE_CODE}-{YYYY}-{MM}-{RUNNING}`, such as `SI-RTB-2026-07-0001`.
_Avoid_: receipt number, stock movement ID, request database ID

**Spare Part Issue Line Code**:
A human-readable reference printed for each issued spare-part line. It follows `{STORE_CODE}-{SITE_CODE}-{TYPE_CODE}-{CATEGORY_CODE}-{ZONE_CODE}-{ITEM_CODE}`, such as `SP01-RTB-630101-EI-02-FUSE001`. It uses the Zone selected for that issue and has no trailing running number.
_Avoid_: spare part issue number, spare part code, database line ID

**Direct Spare Part Issue**:
A spare-part issue that is not linked to CM work and must include an issue type and a short reason for audit clarity.
_Avoid_: manual stock out, free issue, untracked issue

**Issue Public**:
A Site-scoped public spare-part issue flow for requesters who do not have a PowerCare.CM account. Each Site has its own public URL and QR code. The requester must provide a full name and department, can select CM-referenced or direct issue, and can find spare parts by filters, manual code, or mobile barcode scanning. The server derives Organization and Site scope from the public Site code; public form input must never be allowed to override that scope.
_Avoid_: shared cross-site issue form, guest account, unrestricted stock access

**Spare Part Receive**:
A Store Officer action that adds spare parts into site stock and records the receive document, supplier, quantities, prices, and receiver.
_Avoid_: purchase order, approval request, stock adjustment

**Stock Adjustment**:
A reasoned correction that increases or decreases site stock after a receive, issue, count, or data-entry error. It preserves stock history instead of silently editing past stock movements.
_Avoid_: edit stock, delete receive, hidden correction

**CM-Referenced Spare Part Issue**:
A spare-part issue created by entering a CM work number and linking the issue to CM work in the same site. CM work search must only reveal CM work inside the current site.
_Avoid_: direct issue, cross-site issue, loose CM reference

**Spare Part Code**:
A human-readable identifier printed on spare-part QR labels and used to look up spare-part details in the system. It includes the three-letter site code, such as `SP-RTB-00001`, to prevent collisions between sites.
_Avoid_: database ID, QR payload, barcode text

**Store**:
A named stock-holding place inside a site, such as Main Store, Electrical Store, or Mechanical Store.
_Avoid_: site, zone, spare part category

**Issue Store Selection**:
The rule for choosing which store supplies a spare-part issue. The system selects the store automatically when only one store has stock, and asks the requester to choose when multiple stores have stock.
_Avoid_: fixed default store, store officer only selection

**Available Stock Check**:
The rule that prevents a spare-part issue request from being submitted when the requested quantity is greater than the currently available site stock.
_Avoid_: negative stock request, over-issue request, approval-first stock check

**Store Category**:
A grouping for stores, such as Electrical Store, Mechanical Store, Instrument Store, or Tool Room.
_Avoid_: spare part category, zone, storage location

**Spare Part Category**:
A grouping for spare parts, such as Bearing, Valve, Electrical, Instrument, or Consumable.
_Avoid_: store category, zone, storage location

**Applicable Zone**:
A plant zone where a spare part is commonly used. One spare part can have multiple applicable zones.
_Avoid_: spare part category, store, storage location

**Item Code**:
An optional accounting or ERP item identifier stored on a spare part for finance and purchasing reference.
_Avoid_: spare part code, QR code, CM work number

**Latest Unit Price**:
The most recent known unit price stored on a spare part and used for first-phase stock value and issue value reporting.
_Avoid_: weighted average cost, FIFO cost, accounting valuation

**Spare Part Sequence**:
A site-level running number used to generate spare part codes. Each site owns its own sequence, so `SP-RTB-00001` and `SP-PTT-00001` can both exist.
_Avoid_: global spare-part sequence, organization-wide sequence

**Not Enough Stock**:
The outcome when a Store Officer rejects an approved spare-part issue because the requested quantity is not available in site stock.
_Avoid_: canceled issue, deleted issue, failed approval

**Partial Issue**:
The outcome when a Store Officer issues only part of the approved spare-part quantity because the full quantity is not available.
_Avoid_: quantity edit, silent reduction, full rejection

**Spare Part Issue Status**:
The lifecycle status of a spare-part issue: Draft, Waiting Engineer Approval, Returned for Edit, Engineer Approved, Waiting Store Issue, Partially Issued, Issued, Rejected, Not Enough Stock, or Canceled.
_Avoid_: CM work status, stock movement status, approval flag

**Spare Part Issue Document**:
A printable record produced only after a spare-part issue is fully issued. It records the requester, Engineer approval, Store Officer issue, requested, approved, and actually issued quantities, plus the unit price and issue value captured for that issue. Historical document values do not change when the spare part's latest price changes later. The three accountable parties are the Requester, approving Engineer, and issuing Store Officer; Supervisor, Department Manager, and Receiver are not part of the current issue workflow.
_Avoid_: purchase request, blank material request form, CM completion document

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
