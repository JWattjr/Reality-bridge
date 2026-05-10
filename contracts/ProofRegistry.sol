// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ProofPlay Proof Registry
/// @notice Anchors ProofPlay mission receipts after their evidence is stored on 0G Storage.
contract ProofRegistry {
    struct ProofAnchor {
        string proofRecordId;
        address user;
        string eventId;
        string missionId;
        string proofRootHash;
        string mediaRootHash;
        uint256 xpEarned;
        uint256 anchoredAt;
    }

    mapping(bytes32 => ProofAnchor) public proofAnchors;

    event ProofAnchored(
        bytes32 indexed proofKey,
        address indexed user,
        string proofRecordId,
        string eventId,
        string missionId,
        string proofRootHash,
        string mediaRootHash,
        uint256 xpEarned,
        uint256 anchoredAt
    );

    function anchorProof(
        string calldata proofRecordId,
        string calldata eventId,
        string calldata missionId,
        string calldata proofRootHash,
        string calldata mediaRootHash,
        uint256 xpEarned
    ) external returns (bytes32 proofKey) {
        require(bytes(proofRecordId).length > 0, "Proof id required");
        require(bytes(proofRootHash).length > 0, "0G root hash required");

        proofKey = keccak256(abi.encodePacked(proofRecordId));
        require(proofAnchors[proofKey].user == address(0), "Proof already anchored");

        uint256 anchoredAt = block.timestamp;
        proofAnchors[proofKey] = ProofAnchor({
            proofRecordId: proofRecordId,
            user: msg.sender,
            eventId: eventId,
            missionId: missionId,
            proofRootHash: proofRootHash,
            mediaRootHash: mediaRootHash,
            xpEarned: xpEarned,
            anchoredAt: anchoredAt
        });

        emit ProofAnchored(
            proofKey,
            msg.sender,
            proofRecordId,
            eventId,
            missionId,
            proofRootHash,
            mediaRootHash,
            xpEarned,
            anchoredAt
        );
    }
}
