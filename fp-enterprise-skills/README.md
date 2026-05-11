# fp-enterprise-skills

The Forcepoint Enterprise AI Skills Repository. This repo is the authoritative source for Claude skills used across all Forcepoint AI execution paths (Claude-LangGraph, NMAP).

## What is a skill?

A skill is a versioned, machine-readable document that pre-loads Claude with cached schemas, query templates, and routing rules — eliminating redundant discovery calls and reducing token consumption.

## Repository structure

```
fp-enterprise-skills/
├── README.md
├── CONTRIBUTING.md
├── .github/
│   ├── workflows/
│   │   └── skill-validation.yml
│   └── CODEOWNERS
├── scripts/
│   ├── validate_template.py
│   ├── validate_manifest.py
│   ├── schema_diff.py
│   ├── generate_registry.py
│   └── update_confluence.py
└── skills/
    └── {skill-name}/
        └── v{major}.{minor}/
            ├── manifest.json
            ├── README.md
            └── {skill-name}.md
```

## Skills registry

| Skill | Version | Owner | Token Reduction | Status |
|-------|---------|-------|-----------------|--------|
| [salesforce-cdata-cache](skills/salesforce-cdata-cache/v1.0/) | 1.0 | david.burden@forcepoint.com | 85% | active |

## Getting started

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to submit a new skill or update an existing one.
