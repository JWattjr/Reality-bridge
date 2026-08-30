"""Hosted Studionet smoke test."""

import hashlib

from gltest import get_contract_factory
from gltest.assertions import tx_execution_succeeded


ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
FIXTURE_FIELDS = (
    "proofplay-fixture-v1",
    "Denmark",
    "England",
    "UEFA Euro 2024",
    "1718902800",
    "2024-06-20",
    "https://www.bbc.com/sport/football/scores-fixtures/2024-06-20",
    "25",
    "95",
    "35",
)
FIXTURE_COMMITMENT = int.from_bytes(
    hashlib.sha256("\x1f".join(FIXTURE_FIELDS).encode()).digest(), "big"
)


def test_register_and_read_ticket_fixture_on_studionet():
    factory = get_contract_factory("ProofPlayResolver")
    contract = factory.deploy(
        args=[ZERO_ADDRESS, ZERO_ADDRESS, 40245, ZERO_ADDRESS, 84532, ZERO_ADDRESS]
    )

    receipt = contract.register_match(
        args=[
            1,
            FIXTURE_COMMITMENT,
            "Denmark",
            "England",
            "UEFA Euro 2024",
            1718902800,
            "2024-06-20",
            "https://www.bbc.com/sport/football/scores-fixtures/2024-06-20",
            25,
            95,
            35,
        ]
    ).transact()
    assert tx_execution_succeeded(receipt)

    match = contract.get_match(args=[1]).call()
    assert match["status"] == "PENDING"
    assert match["home_team"] == "Denmark"
    assert match["fixture_commitment"] == FIXTURE_COMMITMENT
    assert match["first_team_to_score"] == 0
