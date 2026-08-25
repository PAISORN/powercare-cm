# Corrective Maintenance

This context defines the language for a power plant Corrective Maintenance web app. It keeps domain terms consistent while the product plan evolves.

## Language

**PowerCare**:
The CMMS product umbrella for maintenance operations, covering Corrective Maintenance, spare-parts management, Preventive Maintenance, and asset management as product modules.
_Avoid_: CM dashboard, repair-request website, Store-only system

**CM Dashboard**:
The authenticated operational dashboard for Corrective Maintenance, reached at `/dashboardcm`; it is the Home destination for every Role except an authorized Store Officer.
_Avoid_: `/dashboard`, generic dashboard, Store Dashboard

**Store Dashboard**:
The authenticated operational dashboard for Store work, reached at `/dashboardstore`; it is the Home destination for a Store Officer who holds Store Dashboard access.
_Avoid_: `/inventory`, CM Dashboard, stock report

**Available Module**:
A PowerCare product module that users can open and use for operational work.
_Avoid_: preview, concept module, planned feature

**Coming Soon Module**:
A PowerCare product module shown to communicate the product roadmap but not yet available for operational use.
_Avoid_: available module, disabled permission, system outage

**Public Landing Page**:
The no-login product introduction at the root route for prospective organizations evaluating PowerCare. It explains the product and provides Login, product-detail, and contact calls to action; it is not an operational requester portal.
_Avoid_: public dashboard, repair request page, Site portal

**Site Public Portal**:
A no-login operational entry point resolved from a Site-specific URL or QR code for submitting and tracking requests within that Site. It must never infer or accept another Site from requester-entered form data.
_Avoid_: product landing page, shared request portal, global public form

**Platform Announcement**:
The only public announcement type in PowerCare. Owner Admin publishes it for visitors on the Public Landing Page; it never belongs to an Organization or Site.
_Avoid_: Organization announcement, Site announcement, CM status notification

**Platform Feedback**:
A no-login suggestion submitted from the Public Landing Page and reviewed by Owner Admin. It never belongs to an Organization or Site and is separate from product contact.
_Avoid_: Organization feedback, product inquiry, support ticket, repair request

**Product Contact**:
The business contact path for a prospective organization that wants to evaluate or start using PowerCare.
_Avoid_: public feedback, repair request, Site contact field

**Soon Contact State**:
The temporary state shown when PowerCare has no official product-contact channel. Contact and onboarding calls to action must communicate `Soon` and must not route visitors to invented or Site-specific contact information.
_Avoid_: broken contact link, placeholder email, Site contact

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

**Stock Read Access**:
The baseline capability that lets every authenticated Role view Stock within its Organization and Site scope without changing inventory data.
_Avoid_: public stock access, stock management permission

**Stock Value Access**:
An Owner Admin-controlled permission for viewing Inventory Item prices, issue costs, and aggregate Stock value. Stock Read Access does not imply Stock Value Access.
_Avoid_: stock quantity access, stock management permission

**Stock Mutation Permission**:
An Owner Admin-controlled action permission for changing inventory master data, receiving stock, adjusting stock, or issuing stock. Authorization requires both the applicable action permission and an Inventory Responsibility Scope containing the affected Item Kind; neither condition grants mutation access by itself.
_Avoid_: Store Officer identity check, read-only stock access

**Store Category**:
A grouping for stores, such as Electrical Store, Mechanical Store, Instrument Store, or Tool Room.
_Avoid_: spare part category, zone, storage location

**Spare Part Category**:
A grouping for spare parts, such as Bearing, Valve, Electrical, Instrument, or Consumable.
_Avoid_: store category, zone, storage location

**Spare Part Material Group**:
A Site-scoped child grouping under exactly one Spare Part Category, used to refine spare-part and material discovery, such as Electrical → Pipe. Each spare part belongs to at most one material group, and the selected group must belong to the spare part's selected category. The Thai UI label is “กลุ่มอะไหล่/วัสดุ”.
_Avoid_: spare part name, spare part category, spare part type, unit, store category

**Inventory Item Kind**:
The business kind of a stock-controlled item: Spare Part, Chemical, or Oil. All three kinds share the same Store stock, receive, issue, movement, approval, CM-reference lifecycle, and item details without separate Lot, manufacture-date, expiry-date, or manufacturer tracking; the kind distinguishes how users discover and report the item.
_Avoid_: separate chemical store system, separate oil issue system, spare part category

**Inventory Responsibility Scope**:
The set of Inventory Item Kinds a Store Officer is authorized to mutate within a Site. It does not restrict Stock Read Access; a Store Officer may hold one or more kinds and may temporarily cover another kind without changing Role.
_Avoid_: Lab Role, Chemical Role, Store Category, CM Category

**Inventory Approval Scope**:
The set of Inventory Item Kinds an Engineer may approve for Store Issue within a Site when the Engineer also holds the approval action permission. A Store Issue is available to every active Engineer satisfying both conditions, and the first completed decision records the acting Engineer without exposing approver selection to the requester.
_Avoid_: selected approver, Lab Engineer Role, CM Category, requester-selected Engineer

**Inventory Scope Migration Default**:
When Inventory Responsibility Scope and Inventory Approval Scope are introduced, every existing active Store Officer receives all existing Item Kinds and every existing active Engineer who already has the approve-store-issue action permission receives all existing Item Kinds. This preserves current access; an authorized Admin may narrow each user's scope afterward. Newly created users receive only the explicitly assigned scopes and do not inherit this migration default.
_Avoid_: silently removing existing access, automatic all-kind access for new users

**Single-Kind Store Issue**:
A Store Issue contains one or more issue lines, but every line in the request belongs to exactly one Inventory Item Kind. Spare Parts, Chemicals, and Oils cannot be combined in the same Store Issue. Existing requests already satisfy this rule, so scope migration does not split or rewrite historical or pending requests.
_Avoid_: mixed-kind Store Issue, migration-time request splitting

**Store Officer Scope Requirement**:
Every active Store Officer must have at least one Inventory Responsibility Scope. User creation and permission editing must reject any state that would leave an active Store Officer with no responsible Item Kind; additional kinds may be assigned or removed later within the applicable Admin authority.
_Avoid_: active Store Officer with empty responsibility scope, implicit responsibility

**Engineer Approval Scope Requirement**:
An active Engineer with the approve-store-issue action permission must have at least one Inventory Approval Scope. Enabling that permission or editing its scopes must reject an empty approval scope. An Engineer without the approval action permission may have no Approval Scope and receives no actionable approval work.
_Avoid_: approval permission with empty scope, scope-only approval authority

**Approval-Issue Separation**:
The user who approves a Store Issue must not issue stock for that same request, even when the user holds both applicable action permissions and both Item Kind scopes. Holding both capabilities permits coverage on different requests, not performing both control stages on one request.
_Avoid_: self-approved stock issue, same-user approval and issue

**Store Issue Three-Party Separation**:
The requester, approver, and stock issuer for one Store Issue must be three different users. A requester who also holds approval or issue capabilities may use them only on requests created by another user, subject to all applicable action permissions and Item Kind scopes.
_Avoid_: approving own request, issuing own request, two-party completion

**Inventory Permission Toggle**:
Inventory action permissions and Item Kind scopes are configured with direct on/off switches using the same interaction pattern as the existing Day/Night control. Changing a switch must not open or require a reason field.
_Avoid_: reason modal, free-text justification, multi-step permission dialog

**Permission Change History**:
Do not introduce a separate permission-change audit log or require permission-change reasons. The existing History page remains the system's history surface; permission and scope controls stay as direct switches without an additional logging workflow.
_Avoid_: duplicate permission history, permission-change reason form, new audit screen

**Immediate Inventory Authorization Change**:
Changes to an inventory action permission or Item Kind scope take effect immediately for pending work that has not yet been acted on. Removed work disappears from that user's actionable lists and remains available to other eligible users. The coverage guard rejects removing or disabling the last eligible approver or issuer while matching pending Store Issues exist.
_Avoid_: permission snapshot per request, delayed revocation, orphaned pending issue

**Lab Store Officer Preset**:
A Lab user is created with the existing Store Officer Role, Chemical as the sole Inventory Responsibility Scope, and the Store action permissions needed to manage Chemical master data, receive Chemical stock, adjust Chemical stock, and issue Chemical stock. The user retains read-only visibility of Spare Part and Oil stock and receives no Store Issue approval capability by default.
_Avoid_: Lab Role, chemical-only visibility, chemical approval bundled with issuing

**Chemical Approver Engineer**:
A Chemical approver remains an ordinary Engineer with all existing Engineer and CM responsibilities. Chemical Store Issue approval is added independently through the approve-store-issue action permission and Chemical Inventory Approval Scope. CM Category continues to classify maintenance disciplines only and does not grant, restrict, or represent inventory approval authority.
_Avoid_: Chemical Engineer Role, using CM Category as inventory permission, removing normal Engineer duties

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

**Store Issue Workflow**:
The fixed three-stage lifecycle Create Issue → Approve Issue → Issue Stock. Owner Admin controls which Roles and Users may perform each stage, but permissions do not change, remove, reorder, or add workflow stages.
_Avoid_: configurable approval chain, direct stock deduction, role-named approval stage

**Store Issue Separation of Duties**:
The control that prevents a User from approving an Issue they created. An approver may also issue Stock when separately permitted; Owner Admin may bypass the separation only as an Emergency Override with a recorded reason and Audit Trail.
_Avoid_: self-approval, silent Owner bypass, mandatory three-person workflow

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
A Site-defined plant system, area, or operational location used consistently to classify Assets, repair requests, and CM Work.
_Avoid_: PM Group, Asset System, Site, maintenance Category

**PM Group**:
A Site-defined, reusable collection of Assets selected independently from their Zones for Preventive Maintenance planning. Its PM Group Code is Site-unique and becomes immutable after first use, while its name remains editable; one Asset may belong to multiple PM Groups but appears at most once within the same group.
_Avoid_: Zone, Asset Family, maintenance Category

**PM Schedule Conflict**:
A review notice that the same Asset has been included through multiple PM Groups in one PM Plan. Confirmation produces only one PM Work for that Asset while preserving every source PM Group.
_Avoid_: duplicate PM Work, automatic PM Group removal, CM conflict

**PM Group Member**:
A registered, active Asset selected directly into a PM Group without PM interpreting its Parent or Child relationship. Operating states such as Under Repair, Standby, or Temporarily Out of Service do not prevent selection; a later-retired Asset remains on confirmed work with a warning rather than disappearing automatically.
_Avoid_: inherited Child coverage, free-text machine, Zone membership

**Inactive PM Group**:
A PM Group closed to new planning while its historical plans and captured identity remain available. An unused PM Group may be deleted; a used group is deactivated and may later be reactivated.
_Avoid_: deleted PM history, selectable planning group, canceled PM Plan

**Empty PM Group**:
An active PM Group saved without Asset members for future preparation. It creates no PM Work and cannot by itself support plan confirmation; when combined with non-empty groups it is skipped with a warning.
_Avoid_: invalid PM Group, placeholder Asset, empty confirmed work

**PM Work**:
A Preventive Maintenance record for a selected Asset on a planned occurrence. When completed, it becomes part of that Asset's PM history; detailed checklists and discipline-specific data are outside the current scope.
_Avoid_: PM Group, inherited Parent or Child work, CM Work

**PM Work Status**:
The lifecycle state of PM Work: Planned, In Progress, Completed, or Canceled. Cancellation requires a reason, and a Daily PM Plan is complete when every PM Work is either Completed or Canceled.
_Avoid_: CM Work status, manually closed PM Plan, checklist result

**Overdue PM Work**:
A Planned or In Progress PM Work whose plan date has passed without completion or cancellation. Overdue is a derived warning, not a lifecycle transition; the work remains actionable and retains both its planned date and actual activity times.
_Avoid_: automatic cancellation, automatic reschedule, separate work status

**PM Result**:
The completion outcome of PM Work, recorded as Normal or Abnormal together with the completing User and completion time. An Abnormal result requires a note; attachments, checklists, measurements, and discipline-specific fields are outside the initial scope.
_Avoid_: PM Work Status, CM diagnosis, inspection checklist

**PM Result Correction**:
An audited correction to completed PM data by an authorized Owner Admin, Organization Admin, or Site Admin within scope. It requires a reason and preserves the old and new values; the completed Asset and owning PM Plan cannot be replaced.
_Avoid_: performer self-edit after completion, silent history rewrite, moving completed work

**PM-originated CM Work**:
A CM Work explicitly created from an Abnormal PM Result by an authorized User, prefilled with the Asset and abnormality note and linked back to its PM Work. An Abnormal result does not create CM Work automatically.
_Avoid_: automatic CM creation, unlinked repair request, PM Work

**Asset PM Record**:
The Asset-centered PM view containing upcoming Planned, In Progress, and Overdue work separately from Completed and Canceled history, including results, performers, notes, and any linked PM-originated CM Work.
_Avoid_: PM calendar, CM history, completed-only Asset view

**PM Read Access**:
The baseline capability for every authenticated Role to view PM plans and work within its Site scope without changing PM data.
_Avoid_: public PM access, PM management permission, cross-Site access

**PM Group Management Permission**:
The action permission for creating, editing, deactivating, and changing Asset membership of PM Groups within the User's authorized scope. Owner Admin holds it across all Sites, Organization Admin across its Organization, and Site Admin within its Site.
_Avoid_: PM Plan management, Asset management permission, Zone management

**PM Plan Management Permission**:
The action permission for creating, editing, confirming, and canceling PM Plans and editing their PM Works within the User's authorized scope. Owner Admin holds it across all Sites, Organization Admin across its Organization, and Site Admin within its Site.
_Avoid_: PM Group management, PM execution, CM management

**PM Permission Authority**:
Owner Admin authority to enable or disable PM permissions for Roles or individual Users in addition to Owner Admin's own cross-Site PM management access.
_Avoid_: Site-scoped permission administration, PM Execution Permission, implicit Role expansion

**PM Execution Permission**:
The action permission for starting PM Work and recording its result. Engineer and Technician hold it by default; Owner Admin, Organization Admin, and Site Admin require an explicit override to act as PM performers.
_Avoid_: PM planning, CM closing permission, PM Read Access

**PM Work Assignment**:
The optional designation of one lead performer and multiple collaborators before work begins. Every assignee must hold PM Execution Permission in the same Site; an unassigned PM Work may be claimed, and the User who completes it is recorded separately from the team.
_Avoid_: mandatory pre-assignment, cross-Site claim, unrestricted result editing

**PM Plan**:
A Preventive Maintenance commitment placed on one calendar date for one Site and containing one or more PM Groups. Each selected Asset produces its own PM Work under the plan; the initial planning scope has no start or end time.
_Avoid_: CM Work, live PM Group membership, maintenance calendar event

**Daily PM Plan**:
The sole PM Plan for one Site on one calendar date. Additional PM Groups for that date are added to the same plan rather than creating parallel plans.
_Avoid_: one plan per PM Group, timed calendar event, cross-Site plan

**PM Plan Number**:
A permanent human-readable reference formatted as `PMP-{SITE_CODE}-{CREATION_DATE}-{PLAN_SEQUENCE}`. It does not change when the planned date moves; the current planned date is read from plan data rather than inferred from the number.
_Avoid_: mutable date-based identifier, database ID, PM Work Number

**PM Work Number**:
A permanent human-readable reference formatted as `PM-{SITE_CODE}-{CREATION_DATE}-{PLAN_SEQUENCE}-{WORK_SEQUENCE}`, identifying one Asset's PM Work within its PM Plan.
_Avoid_: PM Plan Number, Asset Code, mutable planned-date identifier

**Manual PM Planning**:
The initial planning mode in which an authorized User explicitly selects a calendar date and one or more PM Groups. Recurring schedules and automatically generated future plans are outside the initial scope.
_Avoid_: recurring PM template, automatic future plan, condition-based scheduling

**Backdated PM Plan**:
A PM Plan entered for a past calendar date solely by an authorized Owner Admin or Organization Admin to recover omitted records. It requires a reason and Audit History; ordinary PM planning begins on the current or a future date.
_Avoid_: routine retrospective planning, Site Admin backdating, silent history insertion

**Draft PM Plan**:
An editable PM Plan whose PM Groups and prospective Assets may still change. It creates no PM Work until an authorized user confirms it.
_Avoid_: confirmed work, active PM Work, completed PM history

**Confirmed PM Plan**:
A PM Plan whose Asset membership has been fixed and expanded into one PM Work per selected Asset. Its snapshotted PM Groups are not edited afterward; authorized additions are individual, audited Assets, while removals are represented by canceling unstarted PM Work.
_Avoid_: editable draft, live PM Group membership, calendar placeholder

**PM Plan Reschedule**:
An audited change of a PM Plan's calendar date. Draft plans may move freely; a Confirmed PM Plan may move only while every PM Work remains Planned, and a plan with started work must instead preserve its date and use explicit cancellation and replanning.
_Avoid_: silent date change, moving in-progress PM Work, automatic replanning

**Canceled PM Plan**:
A Confirmed PM Plan withdrawn with a required reason only while all of its PM Works remain Planned. Once any work starts or completes, the plan is preserved and only unperformed PM Works may be canceled individually.
_Avoid_: deleted confirmed plan, canceled completed work, partial-history removal

**PM Asset Snapshot**:
The fixed set of Assets captured from the selected PM Groups when a PM Plan is confirmed. Later PM Group membership changes do not silently alter the plan; adding another Asset to the confirmed plan is an explicit, audited action.
_Avoid_: live Asset query, current PM Group membership, automatic plan rewrite

**Machine**:
The equipment or asset name related to a repair request or CM work.
_Avoid_: device, asset, equipment

**Asset**:
A uniquely coded maintainable item registered within one Site and available for future CM and PM linkage. An Asset may represent either a complete machine set or an independently maintained component.
_Avoid_: free-text machine name, inventory item, spare part

**Parent Asset**:
An Asset representing a complete machine set that may stand alone when its components have not been registered, such as a Boiler Feed Pump set.
_Avoid_: asset group, code-only container, folder

**Child Asset**:
An independently maintained component registered beneath one Parent Asset, such as the Pump or Motor in a Boiler Feed Pump set.
_Avoid_: spare part, technical field, asset attachment

**Asset Code**:
A unique, permanent human-readable identifier composed from the Site, Asset Family, optional Child Asset component, and a system-generated sequence. Zone classifies the Asset's system or location but never forms part of this code.
_Avoid_: serial number, QR payload, location code

**Site Code Segment**:
The normalized Site Code used as the first Asset Code segment, such as `RTB`. Changing a Site Code changes the prefix used for subsequently registered Assets and requires a controlled Asset Recode for existing records.
_Avoid_: Organization code, Zone code, user-entered Asset prefix

**Asset Sequence**:
A system-generated running number owned by one Parent Asset prefix within a Site. Every Child Asset inherits its Parent Asset sequence, so `BFP-002`, `BFP-PMP-002`, and `BFP-MOT-002` identify one machine set.
_Avoid_: organization-wide sequence, independently generated Child sequence, user-entered running number

**Asset Recode**:
A restricted, audited correction that replaces an Asset Code while preserving the same Asset identity, QR destination, and maintenance history. Normal edits, System renaming, and Zone changes never recode an Asset.
_Avoid_: editing the code field, creating a replacement Asset, changing code on relocation

**Asset Type Template**:
A Site-defined set of standard technical fields for one Asset Type, including each field's data type, unit, and whether a value is required.
_Avoid_: fixed machine table, document template, maintenance checklist

**Asset Custom Field**:
A technical field added for one Asset when its Asset Type Template does not cover a machine-specific attribute. It remains outside standard cross-Asset reporting until incorporated into the template.
_Avoid_: template field, free-form note, document metadata

**Retired Technical Field**:
A previously used technical field closed to new entry while its historical Asset values remain preserved. A field with stored values is retired rather than deleted.
_Avoid_: deleted field, hidden data, active template field

**Incomplete Asset Data**:
The non-blocking state of an existing Asset that has no value for a newly required template field. The Asset remains usable while clearly indicating that its technical record needs completion.
_Avoid_: inactive Asset, invalid Asset, maintenance lock

**Asset Class**:
A broad Site-defined grouping for managing different kinds of Assets, such as Heavy Machinery, Vehicle, Measuring Instrument, Tool, or Other.
_Avoid_: maintenance Category, Asset Type, technical template

**Asset Type**:
A technical kind of Asset, such as Pump, Motor, Transformer, or VFD, that owns a Type Code and an Asset Type Template.
_Avoid_: Asset Class, maintenance Category, machine name

**Asset Family**:
A reusable Site-defined machine family identified by a Site-unique short code and bilingual names, such as `BFP` for Boiler Feed Pump. It may be assigned to a Zone, and multiple Parent Assets may be registered from the same Asset Family.
_Avoid_: individual Asset, Asset Type, free-text machine name

**Component Code**:
A code that distinguishes multiple Child Assets of the same Asset Type within one Parent Asset, such as `PMP1` and `PMP2`. Component Codes share the Asset Type Template and inherit the Parent Asset sequence.
_Avoid_: Asset Type, independently generated sequence, spare-part position

**Asset Operating Status**:
The current lifecycle condition of an Asset: In Service, Under Repair, Standby, Temporarily Out of Service, or Retired. Retired Assets remain available for maintenance history and documents.
_Avoid_: CM Work status, registration cancellation, deletion

**Canceled Asset Registration**:
An audited invalidation of an Asset record created in error, with a required reason and preserved history. An Asset with maintenance history is Retired rather than canceled.
_Avoid_: retired Asset, deleted Asset, inactive status

**Asset Criticality**:
A shared four-level assessment of an Asset's operational impact: Critical, High, Medium, or Low. Sites may clarify assessment criteria but do not create additional levels.
_Avoid_: CM priority, custom Site scale, Asset Operating Status

**Parent Asset Status Summary**:
A derived warning that reports Child Asset operating conditions without changing the Parent Asset's own status. An authorized user decides whether a Child condition makes the complete machine set unavailable.
_Avoid_: automatic Parent status, rolled-up status overwrite, CM status

**QR Public Asset Profile**:
A read-only, no-login Asset view opened from the machine QR code. Each Site defines default visible fields, an Asset may override them, and maintenance exposure is limited to approved summary dates rather than work details.
_Avoid_: authenticated Asset record, public CM history, QR-embedded machine data

**Public Latest Maintenance Summary**:
The most recent completed CM and PM information permitted on a QR Public Asset Profile. Site permissions and Asset overrides independently control the date, title, and outcome for CM and PM while internal causes, procedures, people, media, materials, and costs remain private.
_Avoid_: maintenance history, open work status, public work-order detail

**Asset Document**:
A versioned file attached to an Asset under a standard or Site-defined document category. Documents are internal by default and may be exposed on the QR Public Asset Profile only by an explicit per-document decision.
_Avoid_: CM attachment, unversioned replacement file, publicly visible category

**Canceled Asset Document**:
An Asset Document withdrawn with a reason while its file history and Audit Trail remain preserved.
_Avoid_: deleted file, latest revision, hidden attachment

**Unlinked CM Work**:
A CM Work identified by a free-text machine name because no suitable Asset was selected. It remains valid and may be linked to an Asset later by an authorized user.
_Avoid_: invalid CM Work, legacy Asset, deleted machine

**CM Asset Snapshot**:
The Asset code and name captured on CM Work when it is created, alongside the permanent Asset link. The snapshot preserves the work's historical wording when the Asset is later renamed or recoded.
_Avoid_: current Asset master data, free-text-only machine, duplicate Asset

**Asset Read Access**:
The baseline capability that lets an authenticated User view Assets within their Organization and Site scope without changing Asset data.
_Avoid_: public QR access, Asset management permission, cross-Site access

**Asset Mutation Permission**:
An Owner Admin-controlled capability separated by responsibility: Asset records, Asset masters, documents, QR public exposure, recoding, or registration cancellation. Permission to edit ordinary Asset data never implies the higher-risk capabilities.
_Avoid_: single Asset admin permission, role-name check, Asset Read Access

**Asset Maintenance History**:
The Asset detail view of linked maintenance records, separated into CM Work and completed or planned PM activity while preserving their distinct workflows.
_Avoid_: combined work status, free-text repair log, public maintenance summary

**Asset Draft**:
An incomplete Asset registration saved before a permanent Asset Code and sequence are issued. Documents and maintenance history become available only after registration is completed.
_Avoid_: active Asset, reserved Asset Code, canceled registration

**Asset Hierarchy View**:
The Asset register view that groups each Parent Asset with its Child Assets while preserving a separate flat list for search, filters, and bulk work.
_Avoid_: Asset Family list, organization chart, location hierarchy

**Asset Import Preview**:
A validation stage that shows proposed Parent and Child Asset rows and row-level errors before an Excel import creates any registered Assets. Permanent codes and sequences remain system-issued.
_Avoid_: direct spreadsheet write, user-supplied permanent code, partial hidden failure

**Duplicate Asset Serial Warning**:
A non-blocking Organization-wide warning raised when a normalized Serial Number matches another Asset. An authorized user may continue only with a reason recorded in the Audit Trail.
_Avoid_: Asset Code uniqueness, automatic merge, silent duplicate

**Category**:
A maintenance discipline used to classify repair requests and CM work, initially Electrical or Mechanical.
_Avoid_: type, department

**Role Category Assignment**:
The maintenance category attached to an Engineer or Technician role, defining which CM work they can claim, update, review, close, or cancel.
_Avoid_: separate electrical role, separate mechanical role

**Role Permission Default**:
The Owner Admin-managed permission set inherited by every User holding a Role. It defines the normal capabilities of the Role without determining Organization, Site, Category, or workflow scope.
_Avoid_: hard-coded role capability, user-specific permission

**Organization Role Permission Override**:
An Owner Admin-managed Allow or Deny decision that adapts one Role Permission Default for Users in one Organization. It takes precedence over the system Role Permission Default but remains subordinate to a User Permission Override.
_Avoid_: global role template, user-specific permission, Site scope

**User Permission Override**:
An Owner Admin-managed Allow or Deny decision for one User that takes precedence over the Organization Role Permission Override and system Role Permission Default; no override means the User follows inherited decisions. Owner Admin retains protected recovery capabilities that cannot be denied.
_Avoid_: second role, Site Admin checkbox, duplicated role

**Permission Control Center**:
The single Owner Admin workspace for managing Organization Role Permission Overrides and User Permission Overrides, organized into Role Permissions and User Permissions views with searchable permission groups and Audit History.
_Avoid_: Site Admin Permissions page, scattered permission settings, role editor

**Closed CM Work**:
CM work that has been completed and is ready for a printable completion document.
_Avoid_: finished task, done job

**CM Completion Inventory Usage**:
The organized list of Inventory Items actually issued from Store for one CM Work, shown as a conditional supporting table in the existing CM completion document. It records issued quantities only and excludes rejected, canceled, unissued, or zero-quantity lines.
_Avoid_: requested quantity, technician-entered spare-parts note, separate completion document

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
