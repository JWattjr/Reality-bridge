"""Print a Reality Bridge round straight from StudioNet.

A second, independent view of the same state the interface renders. Use it
while testing to confirm the UI is reporting what the chain actually holds —
if the two ever disagree, the UI is wrong.

Usage (from ``apps/reality-bridge``)::

    python genlayer/scripts/show_round.py                     # every round
    python genlayer/scripts/show_round.py 4                   # one round
    python genlayer/scripts/show_round.py 4 --watch           # refresh every 15s

The contract address comes from ``deployment/studionet.json`` unless
``--contract`` is given.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

from genlayer_py import create_account, create_client
from genlayer_py.chains import studionet

sys.path.insert(0, str(Path(__file__).resolve().parent))
from netprefs import prefer_ipv4  # noqa: E402  (must follow the sys.path setup)

MANIFEST = Path(__file__).resolve().parents[2] / "deployment" / "studionet.json"

# Round titles and this script's own glyphs are UTF-8; a default Windows
# console is cp1252 and would mangle them.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def countdown(target: int, now: int) -> str:
    if not target:
        return "—"
    delta = target - now
    sign = "in" if delta > 0 else "ago"
    delta = abs(delta)
    if delta >= 3600:
        return f"{sign} {delta // 3600}h {(delta % 3600) // 60:02d}m"
    if delta >= 60:
        return f"{sign} {delta // 60}m {delta % 60:02d}s"
    return f"{sign} {delta}s"


def stamp(value: int) -> str:
    if not value:
        return "—"
    return datetime.fromtimestamp(value, tz=timezone.utc).strftime("%Y-%m-%d %H:%M:%SZ")


def gen(wei) -> str:
    value = int(wei)
    whole, fraction = divmod(value, 10**18)
    return f"{whole}.{str(fraction).rjust(18, '0')[:6]} GEN"


def show(client, address: str, round_id: int) -> None:
    now = int(time.time())
    read = lambda fn, args: client.read_contract(  # noqa: E731
        address=address, function_name=fn, args=args
    )

    view = read("get_round", [round_id])
    if not view:
        print(f"round {round_id}: not found")
        return

    print(f"\n=== ROUND {round_id} — {view['title']} ===")
    print(f"  status           {view['status']}")
    print(f"  entry / pool     {gen(view['entry_amount'])} / {gen(view['pool'])}")
    print(f"  seats            {view['player_count']}   panels {view['tile_count']}")
    print(
        f"  join deadline    {stamp(view['join_deadline'])} "
        f"({countdown(view['join_deadline'], now)})"
    )
    if view["status"] == "ACTIVE":
        print(f"  current panel    {view['current_tile_index'] + 1}")
        print(f"  active seat      {view['active_player_index'] + 1}")
        print(
            f"  commit deadline  {stamp(view['attempt_deadline'])} "
            f"({countdown(view['attempt_deadline'], now)})"
        )
        print(
            f"  reveal cut-off   {stamp(view['reveal_deadline'])} "
            f"({countdown(view['reveal_deadline'], now)})"
        )
    print(
        f"  terminal         {stamp(view['terminal_deadline'])} "
        f"({countdown(view['terminal_deadline'], now)})"
    )
    print(f"  claimed/refunded {gen(view['claimed_amount'])} / {gen(view['refunded_amount'])}")

    for index in range(view["tile_count"]):
        tile = read("get_tile", [round_id, index])
        print(f"\n  panel {index + 1}: {tile['status']} / {tile['outcome']}")
        print(f"    question       {tile['question'][:70]}")
        print(
            f"    cut-off        {stamp(tile['choice_deadline'])} "
            f"({countdown(tile['choice_deadline'], now)})"
        )
        print(
            f"    resolvable     {stamp(tile['resolution_time'])} "
            f"({countdown(tile['resolution_time'], now)})"
        )
        print(f"    attempts       {tile['attempts']}")
        if tile["status"] == "RESOLVED":
            print(f"    reason         {tile['reason_code']}")
            print(f"    event / date   {tile['event_id']} / {tile['effective_date'] or '—'}")
            print(f"    receipt        {tile['evidence_receipt'][:24]}…")

    for index in range(view["player_count"]):
        p = read("get_player_by_index", [round_id, index])
        flags = []
        if p["committed"]:
            flags.append("committed")
        if p["revealed"]:
            flags.append(f"revealed {p['choice']}")
        if p["claimed"]:
            flags.append("claimed")
        if p["refunded"]:
            flags.append("refunded")
        marker = " <- runner" if index == view["active_player_index"] and view["status"] == "ACTIVE" else ""
        print(
            f"\n  seat {index + 1} {p['account']}{marker}\n"
            f"    {p['status']}  credits {p['discovery_credits']}  "
            f"claim {gen(p['claim_amount'])}  refund {gen(p['refund_amount'])}"
            + (f"\n    {', '.join(flags)}" if flags else "")
        )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("round_id", nargs="?", type=int, help="Round to show.")
    parser.add_argument("--contract", default="", help="Override the address.")
    parser.add_argument(
        "--watch", action="store_true", help="Refresh every 15 seconds."
    )
    options = parser.parse_args()

    prefer_ipv4()

    address = options.contract
    if not address:
        if not MANIFEST.exists():
            raise SystemExit(
                "No deployment/studionet.json. Pass --contract 0x… instead."
            )
        address = json.loads(MANIFEST.read_text(encoding="utf-8"))["contractAddress"]

    client = create_client(chain=studionet, account=create_account())
    print(f"contract {address} on GenLayer StudioNet (chain {studionet.id})")

    while True:
        ids = (
            [options.round_id]
            if options.round_id
            else client.read_contract(
                address=address, function_name="get_round_ids", args=[]
            )
        )
        for round_id in ids:
            show(client, address, int(round_id))
        if not options.watch:
            return 0
        print("\n" + "-" * 60)
        time.sleep(15)


if __name__ == "__main__":
    sys.exit(main())
