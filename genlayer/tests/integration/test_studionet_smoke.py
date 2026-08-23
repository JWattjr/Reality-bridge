"""Hosted Studionet smoke test; intentionally avoids Bradbury."""

from gltest import get_contract_factory
from gltest.assertions import tx_execution_succeeded


ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
FIXTURE_COMMITMENT = 123456789


def test_register_and_read_match_on_studionet():
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
            "2024-06-20",
            "https://www.bbc.com/sport/football/scores-fixtures/2024-06-20",
        ]
    ).transact()
    assert tx_execution_succeeded(receipt)

    match = contract.get_match(args=[1]).call()
    assert match["status"] == "PENDING"
    assert match["home_team"] == "Denmark"
