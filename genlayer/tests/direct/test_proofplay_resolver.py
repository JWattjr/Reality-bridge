"""Fast direct-mode tests for the ProofPlay Studionet ticket resolver."""

import hashlib
import json
from pathlib import Path


ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
CONTRACT = str(
    Path(__file__).resolve().parents[2] / "contracts" / "proofplay_resolver.py"
)
HOME_TEAM = "Denmark"
AWAY_TEAM = "England"
COMPETITION = "UEFA Euro 2024"
KICKOFF = 1718902800
MATCH_DATE = "2024-06-20"
RESOLUTION_URL = "https://www.europeanchampionship2024.co.uk/match/17/denmark-england"
GOALS_LINE = 25
CORNERS_LINE = 95
CARDS_LINE = 35


def expected_fixture_commitment() -> int:
    canonical = "\x1f".join(
        (
            "proofplay-fixture-v1",
            HOME_TEAM,
            AWAY_TEAM,
            COMPETITION,
            str(KICKOFF),
            MATCH_DATE,
            RESOLUTION_URL,
            str(GOALS_LINE),
            str(CORNERS_LINE),
            str(CARDS_LINE),
        )
    )
    return int.from_bytes(hashlib.sha256(canonical.encode()).digest(), "big")


FIXTURE_COMMITMENT = expected_fixture_commitment()


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
        HOME_TEAM,
        AWAY_TEAM,
        COMPETITION,
        KICKOFF,
        MATCH_DATE,
        RESOLUTION_URL,
        GOALS_LINE,
        CORNERS_LINE,
        CARDS_LINE,
    )


def mock_result(
    direct_vm,
    home_goals: int,
    away_goals: int,
    first_team_to_score: str,
    total_corners: int = 11,
    total_cards: int = 4,
):
    direct_vm.mock_web(
        r".*europeanchampionship2024\.co\.uk/match/17/denmark-england.*",
        {
            "status": 200,
            "body": (
                f"Denmark {home_goals}-{away_goals} England. Full time. "
                f"Corners {total_corners}; cards {total_cards}."
            ),
        },
    )
    direct_vm.mock_llm(
        r".*resolving one football match.*",
        json.dumps(
            {
                "status": "FINAL",
                "home_goals": home_goals,
                "away_goals": away_goals,
                "first_team_to_score": first_team_to_score,
                "total_corners": total_corners,
                "total_cards": total_cards,
            }
        ),
    )


def bridge_payload(duel_id=1, commitment=FIXTURE_COMMITMENT):
    return duel_id.to_bytes(32, byteorder="big") + commitment.to_bytes(
        32, byteorder="big"
    )


def test_owner_registers_match(direct_deploy):
    contract = deploy(direct_deploy)
    register(contract)

    match = contract.get_match(1)
    assert match["home_team"] == "Denmark"
    assert match["away_team"] == "England"
    assert match["fixture_commitment"] == FIXTURE_COMMITMENT
    assert match["competition"] == COMPETITION
    assert match["kickoff"] == KICKOFF
    assert match["resolution_url"] == RESOLUTION_URL
    assert match["total_corners_line_tenths"] == CORNERS_LINE
    assert match["status"] == "PENDING"
    assert contract.get_duel_ids() == [1]


def test_non_owner_cannot_register(direct_vm, direct_deploy, direct_alice):
    contract = deploy(direct_deploy)
    direct_vm.sender = direct_alice

    with direct_vm.expect_revert("Only owner"):
        register(contract)


def test_registration_rejects_metadata_not_matching_base_commitment(
    direct_vm,
    direct_deploy,
):
    contract = deploy(direct_deploy)

    with direct_vm.expect_revert("Base fixture commitment mismatch"):
        contract.register_match(
            1,
            FIXTURE_COMMITMENT + 1,
            HOME_TEAM,
            AWAY_TEAM,
            COMPETITION,
            KICKOFF,
            MATCH_DATE,
            RESOLUTION_URL,
            GOALS_LINE,
            CORNERS_LINE,
            CARDS_LINE,
        )


def test_resolves_all_ticket_facts_and_persists_them(direct_vm, direct_deploy):
    contract = deploy(direct_deploy)
    register(contract)
    mock_result(direct_vm, 1, 1, "AWAY", total_corners=12, total_cards=5)

    contract.resolve_match(1)

    match = contract.get_match(1)
    assert match["status"] == "RESOLVED"
    assert match["home_goals"] == 1
    assert match["away_goals"] == 1
    assert match["first_team_to_score"] == 2
    assert match["total_corners"] == 12
    assert match["total_cards"] == 5


def test_rejects_first_scorer_inconsistent_with_goal_free_draw(
    direct_vm, direct_deploy
):
    contract = deploy(direct_deploy)
    register(contract)
    mock_result(direct_vm, 0, 0, "HOME")

    with direct_vm.expect_revert("Could not verify a valid result"):
        contract.resolve_match(1)

    assert contract.get_match(1)["status"] == "PENDING"


def test_unfinished_match_does_not_change_state(direct_vm, direct_deploy):
    contract = deploy(direct_deploy)
    register(contract)
    direct_vm.mock_web(
        r".*europeanchampionship2024\.co\.uk.*",
        {"status": 200, "body": "Kick-off 20:00"},
    )
    direct_vm.mock_llm(
        r".*resolving one football match.*",
        json.dumps(
            {
                "status": "UNFINISHED",
                "home_goals": 0,
                "away_goals": 0,
                "first_team_to_score": "NO_GOALS",
                "total_corners": 0,
                "total_cards": 0,
            }
        ),
    )

    with direct_vm.expect_revert("Match is not final"):
        contract.resolve_match(1)

    assert contract.get_match(1)["status"] == "PENDING"


def test_validator_independently_compares_all_ticket_facts(
    direct_vm, direct_deploy
):
    contract = deploy(direct_deploy)
    register(contract)
    mock_result(direct_vm, 2, 1, "HOME", total_corners=10, total_cards=3)
    contract.resolve_match(1)

    direct_vm.clear_mocks()
    mock_result(direct_vm, 2, 1, "HOME", total_corners=11, total_cards=3)
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
            bridge_payload(),
        )


def test_full_committed_registration_resolution_and_authenticated_bridge_request(
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
    mock_result(direct_vm, 0, 1, "AWAY", total_corners=8, total_cards=2)

    direct_vm.sender = direct_bob
    contract.process_bridge_message(
        "message-1",
        84532,
        as_hex(direct_alice),
        bridge_payload(),
    )

    assert contract.get_match(1)["away_goals"] == 1
    assert contract.get_match(1)["fixture_commitment"] == FIXTURE_COMMITMENT
    with direct_vm.expect_revert("Message already processed"):
        contract.process_bridge_message(
            "message-1",
            84532,
            as_hex(direct_alice),
            bridge_payload(),
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
    mock_result(direct_vm, 3, 1, "HOME", total_corners=14, total_cards=6)
    contract.resolve_match(1)

    direct_vm.sender = direct_bob
    contract.process_bridge_message(
        "message-after-direct-resolution",
        84532,
        as_hex(direct_alice),
        bridge_payload(),
    )

    match = contract.get_match(1)
    assert match["status"] == "RESOLVED"
    assert match["first_team_to_score"] == 1


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
            bridge_payload(commitment=FIXTURE_COMMITMENT + 1),
        )
