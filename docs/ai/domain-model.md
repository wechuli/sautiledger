# Domain Model

This document summarizes the core entities AI agents should use when designing code, schemas, API routes, and UI state.

## Submission

An individual raw concern from a citizen or organizer.

Key fields:

- `id`
- `anonymousTrackingCode`
- `submitterHash`
- `originalText`
- `normalizedText`
- `detectedLanguage`
- `locationId`
- `issueCategoryId`
- `urgency`
- `mandateClusterId`
- `submissionHash`
- `processingStatus`
- `createdAt`

Notes:

- Preserve original text internally.
- Avoid storing direct identity unless required for a deliberate feature.
- Do not expose raw individual submissions publicly by default.

## Mandate Cluster / Community Mandate

An anonymized cluster of related submissions representing a shared community priority.

Key fields:

- `id`
- `title`
- `summary`
- `formalMandateText`
- `issueCategoryId`
- `locationScope`
- `responsibleAuthorityId`
- `urgency`
- `status`
- `submissionCount`
- `evidenceStrength`
- `firstReportedAt`
- `lastActivityAt`
- `createdAt`
- `updatedAt`

Statuses:

- `new`
- `under_review`
- `acknowledged`
- `in_progress`
- `resolved`
- `disputed`
- `escalated`

## Authority

The office, institution, or government level likely responsible for a mandate.

Key fields:

- `id`
- `name`
- `level`
- `jurisdiction`
- `description`
- `contactEmail`
- `verified`

Initial levels:

- `national`
- `county`
- `constituency`
- `ward`

## Institution Response

A public response by a responsible authority or institution user.

Key fields:

- `id`
- `mandateClusterId`
- `authorityId`
- `responderUserId`
- `responseText`
- `statusUpdate`
- `expectedResolutionDate`
- `createdAt`

Response types:

- Acknowledgement.
- Request for more information.
- Action timeline.
- Progress update.
- Resolution report.
- Dispute with explanation.

## Status History

Timeline of mandate state changes.

Key fields:

- `id`
- `mandateClusterId`
- `oldStatus`
- `newStatus`
- `changedBy`
- `note`
- `createdAt`

## Issue Category

Initial categories:

- Water
- Roads
- Health
- Education
- Security
- Land
- Sanitation
- Markets
- Aid distribution
- Public finance
- Resource exploitation
- Other

## Location

Initial Kenya-focused location model:

- `id`
- `country`
- `county`
- `constituency`
- `subCounty`
- `ward`

Design note:

The MVP can use explicit Kenya fields. Future expansion should move toward configurable administrative hierarchies.

## Evidence Attachment

Optional file submitted as supporting evidence.

Key fields:

- `id`
- `submissionId`
- `storageKey`
- `mediaType`
- `metadataStripped`
- `safetyReviewStatus`
- `createdAt`

Safety note:

Warn users before upload. Strip metadata. Avoid public display until reviewed.

## Audit Hash

A proof that a submission existed at a point in time without revealing the submitter.

Key fields:

- `id`
- `submissionId`
- `hash`
- `algorithm`
- `createdAt`

## User

Authenticated users for admin and institution workflows.

Roles:

- `public`
- `institution`
- `admin`
- `moderator`

MVP auth can be simple, but role checks should be explicit.
