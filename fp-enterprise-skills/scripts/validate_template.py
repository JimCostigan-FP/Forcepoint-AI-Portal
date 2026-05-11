#!/usr/bin/env python3
"""
Checks that a skill directory contains the required files and that manifest.json
has all mandatory top-level fields.
"""
import json
import os
import sys

REQUIRED_FILES = {"manifest.json", "README.md"}
REQUIRED_MANIFEST_FIELDS = {
    "name", "version", "description", "triggers", "owner",
    "contributed_date", "token_efficiency", "connection",
    "execution_paths", "maintenance", "status"
}
REQUIRED_TOKEN_EFFICIENCY_FIELDS = {"baseline_tokens", "skill_tokens", "reduction_percent"}
REQUIRED_CONNECTION_FIELDS = {"catalog", "schema"}
REQUIRED_MAINTENANCE_FIELDS = {"review_cadence", "deprecation_criteria", "skill_owner"}


def validate(skill_dir: str) -> list[str]:
    errors = []

    if not os.path.isdir(skill_dir):
        return [f"Directory not found: {skill_dir}"]

    present = set(os.listdir(skill_dir))

    for f in REQUIRED_FILES:
        if f not in present:
            errors.append(f"Missing required file: {f}")

    manifest_path = os.path.join(skill_dir, "manifest.json")
    if not os.path.exists(manifest_path):
        return errors  # already reported above

    with open(manifest_path) as fh:
        try:
            manifest = json.load(fh)
        except json.JSONDecodeError as e:
            return errors + [f"manifest.json is not valid JSON: {e}"]

    for field in REQUIRED_MANIFEST_FIELDS:
        if field not in manifest:
            errors.append(f"manifest.json missing required field: '{field}'")

    for field in REQUIRED_TOKEN_EFFICIENCY_FIELDS:
        if field not in manifest.get("token_efficiency", {}):
            errors.append(f"manifest.json token_efficiency missing: '{field}'")

    for field in REQUIRED_CONNECTION_FIELDS:
        if field not in manifest.get("connection", {}):
            errors.append(f"manifest.json connection missing: '{field}'")

    for field in REQUIRED_MAINTENANCE_FIELDS:
        if field not in manifest.get("maintenance", {}):
            errors.append(f"manifest.json maintenance missing: '{field}'")

    skill_name = manifest.get("name", "")
    skill_content_file = f"{skill_name}.md"
    if skill_name and skill_content_file not in present:
        errors.append(f"Missing skill content file: {skill_content_file}")

    return errors


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: validate_template.py <skill_dir>")
        sys.exit(1)

    errs = validate(sys.argv[1])
    if errs:
        for e in errs:
            print(f"ERROR: {e}")
        sys.exit(1)

    print(f"Template compliance OK: {sys.argv[1]}")
