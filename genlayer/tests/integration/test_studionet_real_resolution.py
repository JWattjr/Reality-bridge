"""Real Studionet adjudication used by the cross-chain payout test.

This test deliberately uses no mocked web or LLM responses. Validators render
the committed public match-statistics page, agree on the canonical result, and
persist it through the authenticated Base-to-GenLayer message entrypoint.
"""

import hashlib
import json

from gltest import get_contract_factory, get_default_account
from gltest.assertions import tx_execution_succeeded


ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
SOURCE_DUEL_CONTRACT = "0x1111111111111111111111111111111111111111"
FIXTURE = {
    "homeTeam": "Denmark",
    "awayTeam": "England",
    "competition": "UEFA Euro 2024",
    "kickoff": 1718902800,
    "matchDate": "2024-06-20",
    "resolutionUrl": "https://www.europeanchampionship2024.co.uk/match/17/denmark-england",
    "goalsLine": 25,
    "cornersLine": 95,
    "cardsLine": 35,
}


def fixture_commitment() -> int:
    canonical = "\x1f".join(
        (
            "proofplay-fixture-v1",
            FIXTURE["homeTeam"],
            FIXTURE["awayTeam"],
            FIXTURE["competition"],
            str(FIXTURE["kickoff"]),
            FIXTURE["matchDate"],
            FIXTURE["resolutionUrl"],
            str(FIXTURE["goalsLine"]),
            str(FIXTURE["cornersLine"]),
            str(FIXTURE["cardsLine"]),
        )
    )
    return int.from_bytes(hashlib.sha256(canonical.encode()).digest(), "big")


def transaction_id(receipt) -> str:
    for key in ("hash", "transaction_hash", "tx_hash", "id"):
        value = receipt.get(key)
        if value:
            return str(value)
    return "unavailable"


def test_real_web_resolution_exports_consensus_result():
    account = get_default_account()
    commitment = fixture_commitment()
    factory = get_contract_factory("ProofPlayResolver")
    contract = factory.deploy(
        args=[
            account.address,
            ZERO_ADDRESS,
            40245,
            ZERO_ADDRESS,
            84532,
            SOURCE_DUEL_CONTRACT,
        ],
        account=account,
    )

    registration = contract.register_match(
        args=[
            1,
            commitment,
            FIXTURE["homeTeam"],
            FIXTURE["awayTeam"],
            FIXTURE["competition"],
            FIXTURE["kickoff"],
            FIXTURE["matchDate"],
            FIXTURE["resolutionUrl"],
            FIXTURE["goalsLine"],
            FIXTURE["cornersLine"],
            FIXTURE["cardsLine"],
        ]
    ).transact()
    assert tx_execution_succeeded(registration), registration

    payload = (1).to_bytes(32, byteorder="big") + commitment.to_bytes(
        32, byteorder="big"
    )
    resolution = contract.process_bridge_message(
        args=[
            "proofplay-real-web-e2e-v1",
            84532,
            SOURCE_DUEL_CONTRACT,
            payload,
        ]
    ).transact(consensus_max_rotations=5)
    assert tx_execution_succeeded(resolution), resolution

    match = contract.get_match(args=[1]).call()
    assert match["status"] == "RESOLVED"
    assert match["fixture_commitment"] == commitment
    assert match["home_goals"] == 1
    assert match["away_goals"] == 1
    assert match["first_team_to_score"] == 2
    assert match["total_corners"] == 6
    assert match["total_cards"] == 4

    proof = {
        "network": "studionet",
        "resolverAddress": contract.address,
        "registrationTransaction": transaction_id(registration),
        "resolutionTransaction": transaction_id(resolution),
        "fixture": FIXTURE,
        "fixtureCommitment": "0x" + commitment.to_bytes(32, "big").hex(),
        "result": {
            "homeGoals": match["home_goals"],
            "awayGoals": match["away_goals"],
            "firstTeamToScore": match["first_team_to_score"],
            "totalCorners": match["total_corners"],
            "totalCards": match["total_cards"],
        },
    }
    print("PROOFPLAY_STUDIONET_RESULT=" + json.dumps(proof, separators=(",", ":")))
