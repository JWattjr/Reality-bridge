"""Fast direct-mode tests for the ProofPlay Studionet resolver."""

import json


ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
CONTRACT = "contracts/proofplay_resolver.py"
FIXTURE_COMMITMENT = 123456789


def as_hex(address) -> str:
    if hasattr(address, "as_hex"):
        return address.as_hex
    if isinstance(address, bytes):
        return "0x" + address.hex()
    return str(address)


def deploy(direct_deploy, *args):
    defaults = (
        ZERO_ADDRESS,
        ZERO_ADDRESS,
        40245,
        ZERO_ADDRESS,
        84532,
        ZERO_ADDRESS,
    )
    return direct_deploy(CONTRACT, *(args or defaults))


def register(contract):
    contract.register_match(
        1,
        FIXTURE_COMMITMENT,
        "Denmark",
        "England",
        "2024-06-20",
        "https://www.bbc.com/sport/football/scores-fixtures/2024-06-20",
    )


def mock_result(direct_vm, home_score: int, away_score: int, outcome: str):
    direct_vm.mock_web(
        r".*bbc\.com/sport/football/scores-fixtures.*",
        {
            "status": 200,
            "body": f"Denmark {home_score}-{away_score} England. Full time.",
        },
    )
    direct_vm.mock_llm(
        r".*resolving one football match.*",
        json.dumps(
            {
                "status": "FINAL",
                "home_score": home_score,
                "away_score": away_score,
                "outcome": outcome,
            }
        ),
    )


def test_owner_registers_match(direct_deploy):
    contract = deploy(direct_deploy)
    register(contract)

    match = contract.get_match(1)
    assert match["home_team"] == "Denmark"
    assert match["away_team"] == "England"
    assert match["fixture_commitment"] == FIXTURE_COMMITMENT
    assert match["status"] == "PENDING"
    assert contract.get_market_ids() == [1]


def test_non_owner_cannot_register(direct_vm, direct_deploy, direct_alice):
    contract = deploy(direct_deploy)
    direct_vm.sender = direct_alice

    with direct_vm.expect_revert("Only owner"):
        register(contract)


def test_resolves_draw_and_persists_canonical_score(direct_vm, direct_deploy):
    contract = deploy(direct_deploy)
    register(contract)
    mock_result(direct_vm, 1, 1, "DRAW")

    contract.resolve_match(1)

    match = contract.get_match(1)
    assert match["status"] == "RESOLVED"
    assert match["outcome"] == 2
    assert match["home_score"] == 1
    assert match["away_score"] == 1


def test_rejects_llm_outcome_inconsistent_with_score(direct_vm, direct_deploy):
    contract = deploy(direct_deploy)
    register(contract)
    mock_result(direct_vm, 2, 0, "AWAY")

    with direct_vm.expect_revert("Could not verify a valid result"):
        contract.resolve_match(1)

    assert contract.get_match(1)["status"] == "PENDING"


def test_unfinished_match_does_not_change_state(direct_vm, direct_deploy):
    contract = deploy(direct_deploy)
    register(contract)
    direct_vm.mock_web(r".*bbc\.com.*", {"status": 200, "body": "Kick-off 20:00"})
    direct_vm.mock_llm(
        r".*resolving one football match.*",
        json.dumps(
            {
                "status": "UNFINISHED",
                "home_score": 0,
                "away_score": 0,
                "outcome": "UNSET",
            }
        ),
    )

    with direct_vm.expect_revert("Match is not final"):
        contract.resolve_match(1)

    assert contract.get_match(1)["status"] == "PENDING"


def test_validator_independently_compares_decision_fields(
    direct_vm, direct_deploy
):
    contract = deploy(direct_deploy)
    register(contract)
    mock_result(direct_vm, 2, 1, "HOME")
    contract.resolve_match(1)

    direct_vm.clear_mocks()
    mock_result(direct_vm, 1, 2, "AWAY")
    assert direct_vm.run_validator() is False


def test_bridge_rejects_wrong_caller(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = deploy(
        direct_deploy,
        as_hex(direct_bob),
        ZERO_ADDRESS,
        40245,
        ZERO_ADDRESS,
        84532,
        as_hex(direct_alice),
    )
    register(contract)

    with direct_vm.expect_revert("Only BridgeReceiver"):
        contract.process_bridge_message(
            "message-1",
            84532,
            as_hex(direct_alice),
            (1).to_bytes(32, byteorder="big")
            + FIXTURE_COMMITMENT.to_bytes(32, byteorder="big"),
        )


def test_bridge_request_resolves_once(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = deploy(
        direct_deploy,
        as_hex(direct_bob),
        ZERO_ADDRESS,
        40245,
        ZERO_ADDRESS,
        84532,
        as_hex(direct_alice),
    )
    register(contract)
    mock_result(direct_vm, 0, 1, "AWAY")

    direct_vm.sender = direct_bob
    contract.process_bridge_message(
        "message-1",
        84532,
        as_hex(direct_alice),
        (1).to_bytes(32, byteorder="big")
        + FIXTURE_COMMITMENT.to_bytes(32, byteorder="big"),
    )

    assert contract.get_match(1)["outcome"] == 3
    with direct_vm.expect_revert("Message already processed"):
        contract.process_bridge_message(
            "message-1",
            84532,
            as_hex(direct_alice),
            (1).to_bytes(32, byteorder="big")
            + FIXTURE_COMMITMENT.to_bytes(32, byteorder="big"),
        )


def test_bridge_replays_a_directly_resolved_match(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = deploy(
        direct_deploy,
        as_hex(direct_bob),
        ZERO_ADDRESS,
        40245,
        ZERO_ADDRESS,
        84532,
        as_hex(direct_alice),
    )
    register(contract)
    mock_result(direct_vm, 3, 1, "HOME")
    contract.resolve_match(1)

    direct_vm.sender = direct_bob
    contract.process_bridge_message(
        "message-after-direct-resolution",
        84532,
        as_hex(direct_alice),
        (1).to_bytes(32, byteorder="big")
        + FIXTURE_COMMITMENT.to_bytes(32, byteorder="big"),
    )

    match = contract.get_match(1)
    assert match["status"] == "RESOLVED"
    assert match["outcome"] == 1


def test_bridge_rejects_wrong_fixture_commitment(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = deploy(
        direct_deploy,
        as_hex(direct_bob),
        ZERO_ADDRESS,
        40245,
        ZERO_ADDRESS,
        84532,
        as_hex(direct_alice),
    )
    register(contract)
    direct_vm.sender = direct_bob

    with direct_vm.expect_revert("Fixture commitment mismatch"):
        contract.process_bridge_message(
            "wrong-fixture",
            84532,
            as_hex(direct_alice),
            (1).to_bytes(32, byteorder="big")
            + (FIXTURE_COMMITMENT + 1).to_bytes(32, byteorder="big"),
        )
