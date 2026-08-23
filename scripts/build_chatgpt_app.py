#!/usr/bin/env python3
"""Build the recommended ChatGPT App-bound GitLab Self-Hosted plugin variant.

This wrapper follows the current ChatGPT developer-mode flow:

1. Register the deployed HTTPS MCP endpoint in ChatGPT developer mode.
2. Complete OAuth and confirm the MCP connection exposes GitLab tools.
3. Copy the platform-generated technical ID (it starts with
   ``plugin_asdk_app_``).
4. Build a workspace-specific plugin variant whose ``.app.json`` references
   that registered App/connection.

The public repository plugin stays endpoint-neutral. The generated artifact is
workspace-specific and should be imported/installed only in the workspace that
owns the referenced App/connection.
"""

from __future__ import annotations

import argparse
import os
import re
from pathlib import Path

from build_chatgpt_variant import DEFAULT_OUTPUT, build, fail

APP_ID_PATTERN = re.compile(r"^plugin_asdk_app_[A-Za-z0-9_-]+$")


def resolve_app_id(cli_value: str | None) -> str:
    value = (cli_value or os.getenv("CHATGPT_APP_ID") or "").strip()
    if not value:
        fail("provide --app-id or set CHATGPT_APP_ID to the registered ChatGPT App technical ID")
    if not APP_ID_PATTERN.fullmatch(value):
        fail("ChatGPT App technical ID must start with 'plugin_asdk_app_' and contain only letters, numbers, '_' or '-'")
    return value


def resolve_mcp_url(cli_value: str | None) -> str:
    value = (cli_value or os.getenv("GITLAB_MCP_URL") or "").strip()
    if not value:
        fail("provide --mcp-url or set GITLAB_MCP_URL to the registered HTTPS /mcp endpoint")
    return value


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build a GitLab Self-Hosted plugin variant bound to a registered ChatGPT MCP App."
    )
    parser.add_argument(
        "--app-id",
        help="registered ChatGPT App technical ID (plugin_asdk_app_...); defaults to CHATGPT_APP_ID",
    )
    parser.add_argument(
        "--mcp-url",
        help="remote HTTPS /mcp endpoint already registered on that App; defaults to GITLAB_MCP_URL",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help="marketplace-source output directory (default: dist/gitlab-chatgpt-marketplace)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="replace the output directory if it already exists",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    build(
        resolve_app_id(args.app_id),
        resolve_mcp_url(args.mcp_url),
        args.output,
        args.force,
    )


if __name__ == "__main__":
    main()
