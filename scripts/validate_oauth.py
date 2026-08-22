#!/usr/bin/env python3
"""Release guard for the bundled per-user OAuth implementation."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

REQUIRED = [
    "packages/mcp-server/src/auth-context.ts",
    "packages/mcp-server/src/oauth-crypto.ts",
    "packages/mcp-server/src/oauth-store.ts",
    "packages/mcp-server/src/oauth-gateway.ts",
    "packages/mcp-server/tests/oauth-gateway.test.ts",
    "packages/mcp-server/tests/oauth-store.test.ts",
    "packages/mcp-server/tests/oauth-write-scope.test.ts",
]

REQUIRED_CONFIG_MARKERS = [
    "MCP_AUTH_MODE",
    "PUBLIC_BASE_URL",
    "GITLAB_OAUTH_CLIENT_ID",
    "GITLAB_OAUTH_CLIENT_SECRET",
    "OAUTH_ENCRYPTION_KEY",
]

REQUIRED_SERVER_MARKERS = [
    "/.well-known/oauth-protected-resource",
    "/.well-known/oauth-authorization-server",
    "/oauth/authorize",
    "/oauth/token",
    "/oauth/gitlab/callback",
]


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def require_markers(path: Path, markers: list[str]) -> None:
    text = path.read_text(encoding="utf-8")
    for marker in markers:
        if marker not in text:
            fail(f"missing OAuth marker {marker!r} in {path.relative_to(ROOT)}")


def main() -> None:
    for relative in REQUIRED:
        path = ROOT / relative
        if not path.is_file():
            fail(f"missing OAuth implementation/test file: {relative}")

    require_markers(ROOT / ".env.example", REQUIRED_CONFIG_MARKERS)
    require_markers(ROOT / "packages/mcp-server/src/server.ts", REQUIRED_SERVER_MARKERS)

    gitignore = (ROOT / ".gitignore").read_text(encoding="utf-8")
    if "data/" not in gitignore and "oauth-store" not in gitignore:
        fail(".gitignore must protect local OAuth store data")

    print("codex-plugin-glab OAuth validation passed")


if __name__ == "__main__":
    main()
