#!/usr/bin/env python3
"""
For skill updates: diffs the new manifest against the previous version on main
and flags breaking changes that require a MAJOR version bump.

Breaking changes are: triggers removed, connection catalog/schema changed,
execution_paths removed, or status changed from active to deprecated without
a MAJOR version bump.
"""
import json
import os
import subprocess
import sys


def get_manifest_on_main(skill_dir: str) -> dict | None:
    """Retrieve manifest.json from origin/main for the same skill directory."""
    manifest_rel = os.path.join(skill_dir, "manifest.json")
    try:
        result = subprocess.run(
            ["git", "show", f"origin/main:{manifest_rel}"],
            capture_output=True, text=True, check=True
        )
        return json.loads(result.stdout)
    except subprocess.CalledProcessError:
        return None  # New skill — no previous manifest
    except json.JSONDecodeError as e:
        print(f"WARNING: could not parse manifest on main: {e}")
        return None


def parse_version(version_str: str) -> tuple[int, int, int]:
    parts = version_str.split(".")
    major = int(parts[0]) if len(parts) > 0 else 0
    minor = int(parts[1]) if len(parts) > 1 else 0
    patch = int(parts[2]) if len(parts) > 2 else 0
    return major, minor, patch


def diff_manifests(old: dict, new: dict) -> list[str]:
    errors = []

    old_ver = parse_version(old.get("version", "0.0.0"))
    new_ver = parse_version(new.get("version", "0.0.0"))
    major_bumped = new_ver[0] > old_ver[0]

    # Triggers removed = breaking
    old_triggers = set(old.get("triggers", []))
    new_triggers = set(new.get("triggers", []))
    removed_triggers = old_triggers - new_triggers
    if removed_triggers and not major_bumped:
        errors.append(
            f"BREAKING: triggers removed {removed_triggers} — requires MAJOR version bump"
        )

    # Connection changed = breaking
    old_conn = old.get("connection", {})
    new_conn = new.get("connection", {})
    if old_conn != new_conn and not major_bumped:
        errors.append(
            f"BREAKING: connection changed from {old_conn} to {new_conn} — requires MAJOR version bump"
        )

    # Execution paths removed = breaking
    old_paths = set(old.get("execution_paths", []))
    new_paths = set(new.get("execution_paths", []))
    removed_paths = old_paths - new_paths
    if removed_paths and not major_bumped:
        errors.append(
            f"BREAKING: execution_paths removed {removed_paths} — requires MAJOR version bump"
        )

    # Status downgrade without MAJOR bump
    if old.get("status") == "active" and new.get("status") == "deprecated" and not major_bumped:
        errors.append(
            "BREAKING: status changed from active to deprecated — requires MAJOR version bump or explicit deprecation PR"
        )

    # Version must increase
    if new_ver <= old_ver:
        errors.append(
            f"Version must increase: old={old.get('version')} new={new.get('version')}"
        )

    return errors


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: schema_diff.py <skill_dir>")
        sys.exit(1)

    skill_dir = sys.argv[1]
    manifest_path = os.path.join(skill_dir, "manifest.json")

    if not os.path.exists(manifest_path):
        print(f"ERROR: {manifest_path} not found")
        sys.exit(1)

    with open(manifest_path) as fh:
        new_manifest = json.load(fh)

    old_manifest = get_manifest_on_main(skill_dir)
    if old_manifest is None:
        print(f"No previous manifest found on main — treating as new skill, skipping diff.")
        sys.exit(0)

    errs = diff_manifests(old_manifest, new_manifest)
    if errs:
        for e in errs:
            print(f"ERROR: {e}")
        sys.exit(1)

    print(f"Schema diff OK: no breaking changes detected.")
