#!/usr/bin/env python3
"""Shared helpers for ChatGPT remote MCP setup and app binding."""

from __future__ import annotations

import ipaddress
import socket
from urllib.parse import urlsplit


class BindingValidationError(ValueError):
    """Raised when a ChatGPT remote MCP binding is unsafe or malformed."""


def _reject_ip(address: str) -> None:
    ip = ipaddress.ip_address(address)
    if (
        ip.is_loopback
        or ip.is_private
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_reserved
        or ip.is_unspecified
    ):
        raise BindingValidationError(
            f"ChatGPT remote MCP host resolves to a non-public address: {address}"
        )


def validate_remote_mcp_url(value: str, *, resolve_dns: bool = False) -> str:
    """Validate a remote MCP URL intended for a ChatGPT Custom MCP App.

    Build-time validation is deliberately deterministic and does not resolve DNS.
    Runtime doctor checks should pass ``resolve_dns=True`` to enforce that every
    resolved address is public before making HTTP requests.
    """

    raw = value.strip()
    if not raw:
        raise BindingValidationError("remote MCP URL is required")

    parsed = urlsplit(raw)
    if parsed.scheme.lower() != "https":
        raise BindingValidationError("ChatGPT remote MCP URL must use https://")
    if not parsed.hostname:
        raise BindingValidationError("ChatGPT remote MCP URL must include a host")
    if parsed.username or parsed.password:
        raise BindingValidationError("credentials must not be embedded in the MCP URL")
    if parsed.query or parsed.fragment:
        raise BindingValidationError("ChatGPT remote MCP URL must not contain query or fragment data")

    path = parsed.path.rstrip("/") or "/"
    if path != "/mcp":
        raise BindingValidationError("ChatGPT remote MCP URL must use the /mcp endpoint")

    hostname = parsed.hostname.rstrip(".").lower()
    if hostname == "localhost" or hostname.endswith(".localhost"):
        raise BindingValidationError("localhost cannot be used as a ChatGPT remote MCP host")

    # Detect literal IPs without catching our own BindingValidationError. A DNS
    # hostname is resolved only in doctor mode so build output remains deterministic.
    try:
        ipaddress.ip_address(hostname)
    except ValueError:
        pass
    else:
        _reject_ip(hostname)

    if resolve_dns:
        try:
            addresses = {
                item[4][0]
                for item in socket.getaddrinfo(
                    hostname,
                    parsed.port or 443,
                    type=socket.SOCK_STREAM,
                )
            }
        except socket.gaierror as exc:
            raise BindingValidationError(f"unable to resolve MCP host {hostname}: {exc}") from exc
        if not addresses:
            raise BindingValidationError(f"MCP host {hostname} resolved to no addresses")
        for address in addresses:
            _reject_ip(address)

    # urlsplit preserves the caller's HTTPS URL. Strip only a trailing slash so
    # the generated setup metadata is stable and points at the exact /mcp path.
    return raw.rstrip("/")


def public_origin(mcp_url: str) -> str:
    parsed = urlsplit(mcp_url)
    host = parsed.hostname or ""
    if ":" in host and not host.startswith("["):
        host = f"[{host}]"
    if parsed.port and parsed.port != 443:
        host = f"{host}:{parsed.port}"
    return f"https://{host}"
