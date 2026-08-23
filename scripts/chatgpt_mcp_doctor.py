#!/usr/bin/env python3
"""Validate a deployed remote OAuth MCP endpoint before client installation/binding."""

from __future__ import annotations

import argparse
import json
import sys
from urllib.error import HTTPError, URLError
from urllib.request import HTTPRedirectHandler, Request, build_opener

from chatgpt_binding import BindingValidationError, public_origin, validate_remote_mcp_url


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):  # type: ignore[override]
        return None


def fail(message: str) -> "NoReturn":
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def get_json(url: str) -> dict:
    opener = build_opener(NoRedirect)
    request = Request(url, headers={"Accept": "application/json", "User-Agent": "codex-plugin-glab-doctor/0.5.2"})
    try:
        with opener.open(request, timeout=10) as response:
            if response.status != 200:
                fail(f"expected 200 from {url}, got {response.status}")
            content_type = response.headers.get("Content-Type", "")
            if "json" not in content_type.lower():
                fail(f"expected JSON from {url}, got Content-Type {content_type!r}")
            return json.loads(response.read(1024 * 1024).decode("utf-8"))
    except HTTPError as exc:
        fail(f"unexpected HTTP {exc.code} from {url}")
    except (URLError, TimeoutError, OSError, json.JSONDecodeError) as exc:
        fail(f"unable to read {url}: {exc}")


def verify_mcp_challenge(mcp_url: str) -> None:
    opener = build_opener(NoRedirect)
    request = Request(
        mcp_url,
        data=b"{}",
        method="POST",
        headers={
            "Accept": "application/json, text/event-stream",
            "Content-Type": "application/json",
            "User-Agent": "codex-plugin-glab-doctor/0.5.2",
        },
    )
    try:
        opener.open(request, timeout=10)
    except HTTPError as exc:
        if exc.code != 401:
            fail(f"unauthenticated /mcp should return 401, got {exc.code}")
        challenge = exc.headers.get("WWW-Authenticate", "")
        if "resource_metadata=" not in challenge:
            fail("/mcp 401 is missing WWW-Authenticate resource_metadata")
        return
    except (URLError, TimeoutError, OSError) as exc:
        fail(f"unable to probe {mcp_url}: {exc}")
    fail("unauthenticated /mcp unexpectedly succeeded; OAuth protection is not active")


def doctor(mcp_url: str) -> None:
    try:
        mcp_url = validate_remote_mcp_url(mcp_url, resolve_dns=True)
    except BindingValidationError as exc:
        fail(str(exc))

    origin = public_origin(mcp_url)
    protected_url = f"{origin}/.well-known/oauth-protected-resource"
    protected = get_json(protected_url)
    resource = protected.get("resource")
    if resource and str(resource).rstrip("/") != mcp_url:
        fail(f"protected-resource metadata resource does not match MCP URL: {resource}")

    authorization_servers = protected.get("authorization_servers")
    if not isinstance(authorization_servers, list) or not authorization_servers:
        fail("protected-resource metadata must publish authorization_servers")
    authorization_server = str(authorization_servers[0]).rstrip("/")
    if not authorization_server.startswith("https://"):
        fail("authorization server metadata issuer must use HTTPS")

    auth_metadata_url = f"{authorization_server}/.well-known/oauth-authorization-server"
    auth = get_json(auth_metadata_url)
    for key in ("issuer", "authorization_endpoint", "token_endpoint"):
        if not auth.get(key):
            fail(f"authorization-server metadata is missing {key}")
    if str(auth["issuer"]).rstrip("/") != authorization_server:
        fail("authorization-server metadata issuer does not match advertised server")

    verify_mcp_challenge(mcp_url)

    print("Remote OAuth MCP doctor passed")
    print(f"MCP URL: {mcp_url}")
    print(f"Protected Resource Metadata: {protected_url}")
    print(f"Authorization Server Metadata: {auth_metadata_url}")
    print(f"CIMD advertised: {bool(auth.get('client_id_metadata_document_supported'))}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate a remote OAuth MCP deployment for Codex/ChatGPT clients.")
    parser.add_argument("--mcp-url", required=True, help="public HTTPS MCP URL ending in /mcp")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    doctor(args.mcp_url)


if __name__ == "__main__":
    main()
