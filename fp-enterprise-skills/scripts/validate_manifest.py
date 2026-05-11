#!/usr/bin/env python3
"""
Validates a manifest.json file against the fp-enterprise-skills schema.
"""
import json
import sys

MANIFEST_SCHEMA = {
    "type": "object",
    "required": [
        "name", "version", "description", "triggers", "owner",
        "contributed_date", "token_efficiency", "connection",
        "execution_paths", "maintenance", "status"
    ],
    "properties": {
        "name": {"type": "string", "minLength": 1},
        "version": {"type": "string", "pattern": r"^\d+\.\d+(\.\d+)?$"},
        "description": {"type": "string", "minLength": 10},
        "triggers": {"type": "array", "items": {"type": "string"}, "minItems": 1},
        "owner": {"type": "string", "format": "email"},
        "contributed_date": {"type": "string", "pattern": r"^\d{4}-\d{2}-\d{2}$"},
        "token_efficiency": {
            "type": "object",
            "required": ["baseline_tokens", "skill_tokens", "reduction_percent"],
            "properties": {
                "baseline_tokens": {"type": "integer", "minimum": 0},
                "skill_tokens": {"type": "integer", "minimum": 0},
                "reduction_percent": {"type": "number", "minimum": 0, "maximum": 100}
            }
        },
        "connection": {
            "type": "object",
            "required": ["catalog", "schema"],
            "properties": {
                "catalog": {"type": "string"},
                "schema": {"type": "string"}
            }
        },
        "execution_paths": {
            "type": "array",
            "items": {"type": "string", "enum": ["Claude-LangGraph", "NMAP"]},
            "minItems": 1
        },
        "maintenance": {
            "type": "object",
            "required": ["review_cadence", "deprecation_criteria", "skill_owner"],
            "properties": {
                "review_cadence": {"type": "string"},
                "deprecation_criteria": {"type": "string"},
                "skill_owner": {"type": "string"}
            }
        },
        "status": {"type": "string", "enum": ["active", "deprecated", "draft"]}
    }
}


def validate_manifest(manifest_path: str) -> list[str]:
    try:
        from jsonschema import validate, ValidationError, SchemaError
    except ImportError:
        print("WARNING: jsonschema not installed, skipping schema validation")
        return []

    try:
        with open(manifest_path) as fh:
            manifest = json.load(fh)
    except FileNotFoundError:
        return [f"File not found: {manifest_path}"]
    except json.JSONDecodeError as e:
        return [f"Invalid JSON: {e}"]

    errors = []
    try:
        validate(instance=manifest, schema=MANIFEST_SCHEMA)
    except ValidationError as e:
        errors.append(f"Schema validation failed: {e.message} (path: {'.'.join(str(p) for p in e.path)})")
    except SchemaError as e:
        errors.append(f"Schema definition error: {e.message}")

    # Cross-field check: skill_tokens should be less than baseline_tokens
    te = manifest.get("token_efficiency", {})
    if te.get("skill_tokens", 0) >= te.get("baseline_tokens", 1):
        errors.append("token_efficiency.skill_tokens must be less than baseline_tokens")

    expected_reduction = round(
        (1 - te.get("skill_tokens", 0) / te.get("baseline_tokens", 1)) * 100, 1
    ) if te.get("baseline_tokens") else 0
    actual_reduction = te.get("reduction_percent", 0)
    if abs(actual_reduction - expected_reduction) > 2:
        errors.append(
            f"token_efficiency.reduction_percent ({actual_reduction}) does not match "
            f"computed value ({expected_reduction})"
        )

    return errors


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: validate_manifest.py <path/to/manifest.json>")
        sys.exit(1)

    errs = validate_manifest(sys.argv[1])
    if errs:
        for e in errs:
            print(f"ERROR: {e}")
        sys.exit(1)

    print(f"Manifest schema OK: {sys.argv[1]}")
