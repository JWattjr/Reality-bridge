"""Shared test-suite compatibility shims.

Package shadowing
-----------------

This application keeps its contract code in a directory called ``genlayer/``,
which is also the name of the GenVM SDK package. Running ``python -m pytest``
from ``apps/reality-bridge`` puts that directory on ``sys.path[0]``, so
``from genlayer import *`` inside the contract resolves to the *application*
folder — an empty namespace package — and every test fails with
``NameError: name 'gl' is not defined``.

``_unshadow_sdk()`` drops any ``sys.path`` entry whose ``genlayer`` subdirectory
has no ``__init__.py``, so the suite behaves identically whether it is invoked
from the application root or from ``genlayer/``.

Windows direct-runner cleanup
-----------------------------

The direct runner ``dup2``s a temporary calldata file onto stdin and then tries
to unlink it while that handle is still open. Windows rejects that unlink (a
runner cleanup bug, not a contract behavior), so the short-lived file is left
for process-exit cleanup while every contract behavior is preserved.

On POSIX the patch is a no-op passthrough, so the same suite runs unchanged in
Linux CI.

Address-family ordering
-----------------------

Where IPv6 is advertised but unroutable, every StudioNet JSON-RPC call blocks on
two dead AAAA records first. See ``genlayer/scripts/netprefs.py``.
"""

import os
import sys
from pathlib import Path

import pytest


def _unshadow_sdk() -> None:
    """Remove path entries where a bare ``genlayer/`` folder hides the SDK."""

    for entry in list(sys.path):
        candidate = Path(entry or ".") / "genlayer"
        if candidate.is_dir() and not (candidate / "__init__.py").exists():
            sys.path.remove(entry)
    sys.modules.pop("genlayer", None)


_unshadow_sdk()

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from netprefs import prefer_ipv4  # noqa: E402  (must follow the sys.path setup)


@pytest.fixture(autouse=True, scope="session")
def prefer_ipv4_addresses():
    """Stop unroutable IPv6 records from adding ~43s to every StudioNet call."""

    prefer_ipv4()
    yield


@pytest.fixture(autouse=True, scope="session")
def tolerate_windows_calldata_cleanup():
    try:
        from gltest.direct import loader
    except ImportError:
        yield
        return

    original_inject = loader._inject_message_to_fd0
    original_unlink = os.unlink

    def patched_inject(vm):
        def tolerant_unlink(path):
            try:
                original_unlink(path)
            except PermissionError:
                pass

        os.unlink = tolerant_unlink
        try:
            return original_inject(vm)
        finally:
            os.unlink = original_unlink

    loader._inject_message_to_fd0 = patched_inject
    yield
    loader._inject_message_to_fd0 = original_inject
