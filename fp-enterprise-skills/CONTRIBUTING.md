# Contributing to fp-enterprise-skills

## How to author a skill

A skill lives at `skills/{skill-name}/v{major}.{minor}/` and must contain three files:

| File | Purpose |
|------|---------|
| `manifest.json` | Machine-readable metadata — triggers, owner, token efficiency, versioning |
| `README.md` | Human-readable summary of what the skill covers and what is deferred to a future version |
| `{skill-name}.md` | The full machine-readable skill content Claude reads at runtime |

Use the manifest schema defined in `skills/salesforce-cdata-cache/v1.0/manifest.json` as your template. All fields are required unless marked optional.

The skill content file (`.md`) must include:
- Purpose statement
- Connection reference (catalog, schema, fully qualified format)
- Cached object schemas (only the columns the skill actually uses)
- Cached picklist values
- Query templates for the most common operations
- Routing rules (when to use cached data vs. when to call discovery tools)

## How to open a Skill-Submission PR

1. Branch from `main` using the naming convention: `skill/{skill-name}/v{version}`
   ```
   git checkout -b skill/jira-connector/v1.0
   ```
2. Add your three files under `skills/{skill-name}/v{major}.{minor}/`
3. Open a pull request against `main`
4. Apply the label `Skill-Submission`
5. Fill in the PR description:
   - What data source / system does this skill cover?
   - What discovery calls does it eliminate?
   - Measured or estimated token reduction vs. baseline
   - Link to any supporting ADD section or design doc

The CI pipeline will run automatically and validate:
- Required files are present
- `manifest.json` passes schema validation
- No secrets or PII are embedded in the skill content
- For updates: no breaking schema changes without a MAJOR version bump

## Review SLA

Per ADD Section 2.7.3, all skill submissions receive a technical and security review within **3 business days**.

If no review response after 3 business days: escalate to the Architecture Review Team lead directly in the PR thread.

## Escalation path

Architecture Review Team → Jim Costigan (AI Program Manager) → Mathew Steele

## Versioning policy

| Bump | When to use |
|------|-------------|
| `MAJOR` | Breaking schema changes — cached columns removed or renamed |
| `MINOR` | New query templates, new cached objects, or routing rule additions |
| `PATCH` | Documentation-only updates (README, comments, formatting) |

MAJOR bumps require a new directory (`v2.0/`) alongside the old one. The old version stays in the repo and its `manifest.json` `status` field is updated to `deprecated`.

MINOR and PATCH bumps replace the files in place. Update the `version` field in `manifest.json` accordingly.

## Deprecation

A skill should be deprecated when its `deprecation_criteria` (defined in `manifest.json`) are met, or when it has had no activity for 12 months. Open a PR that sets `"status": "deprecated"` in the manifest and adds a `deprecated_date` field.
