"""Network preferences for StudioNet clients.

On hosts where IPv6 is advertised but not routable, ``studio.genlayer.com``
resolves to two AAAA records ahead of its A records. Python's
``socket.create_connection`` tries them in order and blocks on each until the
TCP connect times out, so **every** JSON-RPC call costs about 43 seconds even
though the endpoint itself answers instantly. A dozen-transaction run then takes
hours instead of minutes, and it looks like StudioNet is hanging when it is not.

``prefer_ipv4()`` sorts IPv4 results ahead of IPv6 in ``socket.getaddrinfo``.
Nothing is removed, so an IPv6-only host still connects; the reordered list
simply stops IPv6 from being the first thing tried.

Import and call this before creating a GenLayer client:

    from netprefs import prefer_ipv4
    prefer_ipv4()
"""

from __future__ import annotations

import socket


_PATCHED = False


def prefer_ipv4() -> None:
    """Order IPv4 addresses first in every ``getaddrinfo`` result."""

    global _PATCHED
    if _PATCHED:
        return

    original = socket.getaddrinfo

    def ordered(*args, **kwargs):
        results = original(*args, **kwargs)
        return sorted(results, key=lambda entry: 0 if entry[0] == socket.AF_INET else 1)

    socket.getaddrinfo = ordered  # type: ignore[assignment]
    _PATCHED = True
