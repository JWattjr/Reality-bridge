// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../src/ProofPlayBaseDuel.sol";

contract MockGenLayerBridgeSender is IGenLayerBridgeSender {
    uint256 public fee = 0.01 ether;
    address public lastTarget;
    bytes public lastData;
    bytes public lastOptions;
    uint256 public lastValue;
    bytes32 public constant MESSAGE_ID = keccak256("proofplay-ticket-message");

    function quoteSendToGenLayer(
        address,
        bytes calldata,
        bytes calldata
    ) external view returns (uint256 nativeFee, uint256 lzTokenFee) {
        return (fee, 0);
    }

    function sendToGenLayer(
        address targetContract,
        bytes calldata data,
        bytes calldata options
    ) external payable returns (bytes32 messageId) {
        require(msg.value == fee, "Wrong fee");
        lastTarget = targetContract;
        lastData = data;
        lastOptions = options;
        lastValue = msg.value;
        return MESSAGE_ID;
    }
}
