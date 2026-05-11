#!/usr/bin/env python3
"""
Scans all manifest.json files under /skills/ and produces a Confluence-ready
markdown table of the skills registry.
"""
import json
import os
import sys
from datetime import date


def find_manifests(skills_root: str) -> list[tuple[str, dict]]:
    manifests = []
    for skill_name in sorted(os.listdir(skills_root)):
        skill_path = os.path.join(skills_root, skill_name)
        if not os.path.isdir(skill_path):
            continue
        for version_dir in sorted(os.listdir(skill_path), reverse=True):
            manifest_path = os.path.join(skill_path, version_dir, "manifest.json")
            if os.path.exists(manifest_path):
                with open(manifest_path) as fh:
                    try:
                        manifests.append((manifest_path, json.load(fh)))
                    except json.JSONDecodeError:
                        print(
                            f"WARNING: skipping invalid JSON at {manifest_path}",
                            file=sys.stderr,
                        )
                break  # Only latest version per skill
    return manifests


def generate_registry(skills_root: str) -> str:
    manifests = find_manifests(skills_root)

    lines = [
        f"# FP Enterprise Skills Registry",
        f"",
        f"_Auto-generated from [fp-enterprise-skills](https://github.com/forcepoint/fp-enterprise-skills) — last updated {date.today()}_",
        f"",
        f"| Skill | Version | Owner | Baseline Tokens | Skill Tokens | Reduction | Execution Paths | Status |",
        f"|-------|---------|-------|-----------------|--------------|-----------|-----------------|--------|",
    ]

    for path, m in manifests:
        te = m.get("token_efficiency", {})
        row = (
            f"| {m.get('name', '?')} "
            f"| {m.get('version', '?')} "
            f"| {m.get('owner', '?')} "
            f"| {te.get('baseline_tokens', '?'):,} "
            f"| {te.get('skill_tokens', '?'):,} "
            f"| {te.get('reduction_percent', '?')}% "
            f"| {', '.join(m.get('execution_paths', []))} "
            f"| {m.get('status', '?')} |"
        )
        lines.append(row)

    lines += [
        "",
        "## Skill details",
        "",
    ]

    for path, m in manifests:
        lines += [
            f"### {m.get('name')} v{m.get('version')}",
            "",
            f"**Description:** {m.get('description', '')}",
            "",
            f"**Triggers:** {', '.join(m.get('triggers', []))}",
            "",
            f"**Owner:** {m.get('owner', '')}",
            "",
            f"**Contributed:** {m.get('contributed_date', '')}",
            "",
            f"**Review cadence:** {m.get('maintenance', {}).get('review_cadence', '')}",
            "",
            f"**Deprecation criteria:** {m.get('maintenance', {}).get('deprecation_criteria', '')}",
            "",
        ]

    return "\n".join(lines)


if __name__ == "__main__":
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    skills_root = os.path.join(repo_root, "skills")
    print(generate_registry(skills_root))
