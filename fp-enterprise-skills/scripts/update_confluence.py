#!/usr/bin/env python3
"""
Pushes a markdown file to a Confluence page via the Confluence REST API.
Converts markdown to Confluence storage format (XHTML) using a simple
translation layer sufficient for tables, headers, and code blocks.

Required env vars:
  CONFLUENCE_API_TOKEN  — API token for the service account
  CONFLUENCE_EMAIL      — Email of the service account
  CONFLUENCE_PAGE_ID    — Numeric ID of the target Confluence page
"""
import os
import re
import sys

import requests
from requests.auth import HTTPBasicAuth

CONFLUENCE_BASE_URL = "https://forcepoint.atlassian.net/wiki"


def markdown_to_storage(md: str) -> str:
    """
    Minimal markdown → Confluence storage format conversion.
    Handles: headings, tables, bold, inline code, horizontal rules, paragraphs.
    """
    lines = md.splitlines()
    html_lines = []
    in_table = False

    for line in lines:
        # Headings
        heading_match = re.match(r"^(#{1,6})\s+(.*)", line)
        if heading_match:
            if in_table:
                html_lines.append("</tbody></table>")
                in_table = False
            level = len(heading_match.group(1))
            text = heading_match.group(2)
            html_lines.append(f"<h{level}>{text}</h{level}>")
            continue

        # Table rows
        if line.startswith("|"):
            cells = [c.strip() for c in line.strip("|").split("|")]
            # Skip separator rows
            if all(re.match(r"^[-:]+$", c) for c in cells if c):
                if not in_table:
                    html_lines.append("<table><tbody>")
                    in_table = True
                continue
            if not in_table:
                html_lines.append("<table><tbody>")
                in_table = True
            row_html = "<tr>" + "".join(f"<td>{c}</td>" for c in cells) + "</tr>"
            html_lines.append(row_html)
            continue

        if in_table:
            html_lines.append("</tbody></table>")
            in_table = False

        # Horizontal rule
        if re.match(r"^---+$", line.strip()):
            html_lines.append("<hr/>")
            continue

        # Blank line
        if not line.strip():
            html_lines.append("<br/>")
            continue

        # Inline formatting
        line = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", line)
        line = re.sub(r"`(.+?)`", r"<code>\1</code>", line)
        line = re.sub(r"_(.+?)_", r"<em>\1</em>", line)

        html_lines.append(f"<p>{line}</p>")

    if in_table:
        html_lines.append("</tbody></table>")

    return "\n".join(html_lines)


def get_current_version(page_id: str, auth: HTTPBasicAuth) -> int:
    url = f"{CONFLUENCE_BASE_URL}/rest/api/content/{page_id}?expand=version"
    resp = requests.get(url, auth=auth)
    resp.raise_for_status()
    return resp.json()["version"]["number"]


def update_page(page_id: str, title: str, storage_body: str, version: int, auth: HTTPBasicAuth) -> None:
    url = f"{CONFLUENCE_BASE_URL}/rest/api/content/{page_id}"
    payload = {
        "id": page_id,
        "type": "page",
        "title": title,
        "version": {"number": version + 1},
        "body": {
            "storage": {
                "value": storage_body,
                "representation": "storage"
            }
        }
    }
    resp = requests.put(url, json=payload, auth=auth)
    resp.raise_for_status()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: update_confluence.py <registry_markdown_file>")
        sys.exit(1)

    api_token = os.environ.get("CONFLUENCE_API_TOKEN")
    email = os.environ.get("CONFLUENCE_EMAIL")
    page_id = os.environ.get("CONFLUENCE_PAGE_ID")

    if not all([api_token, email, page_id]):
        print("ERROR: CONFLUENCE_API_TOKEN, CONFLUENCE_EMAIL, and CONFLUENCE_PAGE_ID must be set")
        sys.exit(1)

    auth = HTTPBasicAuth(email, api_token)

    with open(sys.argv[1]) as fh:
        md_content = fh.read()

    storage_body = markdown_to_storage(md_content)

    current_version = get_current_version(page_id, auth)
    update_page(page_id, "FP Enterprise Skills Registry", storage_body, current_version, auth)

    print(f"Confluence page {page_id} updated to version {current_version + 1}")
