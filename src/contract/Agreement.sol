// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
 
/**
 * @title AgreementContract
 * @dev Contract for minting NFTs that represent legally binding asset distribution agreements
 */
contract AgreementContract is ERC721URIStorage, Ownable, ReentrancyGuard {
    uint256 private _tokenIds;

    struct Agreement {
        string title;
        string URI;
    }
} 