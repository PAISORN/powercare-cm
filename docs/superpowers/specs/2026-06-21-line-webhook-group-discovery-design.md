# LINE Webhook Group Discovery Design

## Goal

Add a secure LINE Messaging API webhook that discovers LINE groups and lets an Admin explicitly add a discovered group as a PowerCare.CM notification destination. Discovery must never enable notifications automatically.

## Scope

- Add `POST /api/line/webhook` for LINE webhook events.
- Verify every request with `X-Line-Signature` and `LINE_CHANNEL_SECRET`.
- Record group discoveries separately from active LINE destinations.
- Show discovered groups on `/admin/line`.
- Let Admin copy a discovered group into the existing destination form, then choose Category and enabled events before saving.
- Add development migration, tests, and environment documentation.
- Do not deploy or modify Production data.

## Architecture

### Webhook Route

`app/api/line/webhook/route.ts` receives the raw request body. It verifies the HMAC-SHA256 signature before parsing JSON. Invalid or missing signatures return `401`. Valid LINE verification requests and supported events return `200` quickly.

The route accepts events whose source type is `group` and whose `groupId` is present. Unsupported event types or non-group sources are acknowledged without being stored.

### Signature Verification

A pure helper in `modules/line/line-webhook.ts` computes an HMAC-SHA256 digest over the exact raw body using `LINE_CHANNEL_SECRET`, encodes it as Base64, and compares it with `X-Line-Signature` using a timing-safe comparison.

The route must never log the channel secret, access token, request signature, or full webhook payload.

### Group Discovery

Add a `LineGroupDiscovery` model with:

- `id`
- unique `groupId`
- optional `displayName`
- `firstSeenAt`
- `lastSeenAt`
- optional `eventType`
- optional `addedDestinationId`

Repeated events for the same group update `lastSeenAt`, the latest event type, and the display name when available. They do not create duplicate rows.

The service may request the LINE group summary with the existing channel access token to obtain the group name. Failure to retrieve the name must not fail the webhook; the UI falls back to a masked Group ID.

### Admin Workflow

`/admin/line` gains a **Discovered LINE groups** section visible only to Admin:

- Group name or masked Group ID
- First seen and last seen time in Bangkok time
- Latest event type
- State: not added or already added
- `Add group` action for groups not yet added

The action does not activate notifications directly. It pre-fills the existing destination form with the Group ID and discovered name. Admin must still select Category, enabled events, and active state, then save through the existing audited destination service.

After a destination is created, the discovery is linked to that destination and cannot produce a second destination accidentally.

## Data Flow

1. Official Account joins a LINE test group.
2. A member sends a message in the group.
3. LINE sends a signed POST request to `/api/line/webhook`.
4. PowerCare.CM verifies the signature against the raw body.
5. PowerCare.CM upserts the discovered Group ID.
6. Admin opens `/admin/line` and chooses `Add group`.
7. Admin selects Category and notification events, then saves.
8. Existing LINE delivery routing sends only events enabled for that destination.

## Environment

Add the following server-only variables to environment examples:

```env
LINE_CHANNEL_ACCESS_TOKEN=""
LINE_CHANNEL_SECRET=""
```

Neither value may use a `NEXT_PUBLIC_` prefix. Local testing requires an HTTPS tunnel because LINE cannot call `localhost`. Production testing uses the deployed HTTPS route only after explicit deployment approval.

## Error Handling

- Missing secret: return `503` without processing events.
- Missing or invalid signature: return `401`.
- Invalid JSON after valid signature: return `400`.
- Unsupported or empty event list: return `200`.
- Group-summary API failure: store the Group ID without a name and return `200`.
- Database failure: return `500` so LINE may retry.

## Testing

- Unit tests for correct, incorrect, and malformed signatures.
- Unit tests for extracting unique group discoveries from webhook payloads.
- Service tests for idempotent upsert behavior.
- Route tests for `200`, `400`, `401`, and `503` responses.
- Admin source/UI tests for discovered-group display and pre-fill action.
- Full TypeScript, test suite, and production build verification.

## Out Of Scope

- Reading or storing LINE chat message contents.
- Replying to user messages.
- Automatically enabling newly discovered groups.
- Deploying to Vercel or configuring the Production LINE channel.
