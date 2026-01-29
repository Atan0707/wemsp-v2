// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title AgreementContract
 * @dev NFT contract for legally binding asset distribution agreements
 * @notice All transactions are signed by the backend - users don't need wallets
 * @notice Beneficiaries are identified by database IDs, not wallet addresses
 */
contract AgreementContract is ERC721URIStorage, Ownable, ReentrancyGuard {
    uint256 private _tokenIds;

    // Agreement data structure (without mappings for return compatibility)
    struct AgreementData {
        string visibleId;           // Human-readable visible ID from database
        string[] beneficiaryIds;    // Database beneficiary IDs (not wallet addresses)
        uint256 beneficiaryCount;   // Total number of beneficiaries
        uint256 signedCount;        // Number of beneficiaries who have signed
        bool ownerSigned;           // Whether the agreement owner has signed
        uint256 ownerSignedAt;      // Timestamp when owner signed
        bool witnessSigned;         // Whether the witness/admin has signed
        uint256 witnessedAt;        // Timestamp when witnessed
        bool isFinalized;           // Whether agreement is finalized (locked)
    }

    // Storage for agreement data
    mapping(uint256 => AgreementData) private _agreements;
    
    // Separate mappings for beneficiary signatures (can't have mapping in struct)
    mapping(uint256 => mapping(string => bool)) private _beneficiaryHasSigned;
    mapping(uint256 => mapping(string => uint256)) private _beneficiarySignedAt;
    
    // Mapping from visibleId to tokenId for lookup
    mapping(string => uint256) private _visibleIdToTokenId;

    // Events
    event AgreementMinted(
        uint256 indexed tokenId,
        string visibleId,
        string metadataUri,
        uint256 beneficiaryCount
    );
    event OwnerSigned(uint256 indexed tokenId, uint256 timestamp);
    event BeneficiarySigned(
        uint256 indexed tokenId,
        string beneficiaryId,
        uint256 timestamp
    );
    event WitnessSigned(uint256 indexed tokenId, uint256 timestamp);
    event AgreementFinalized(uint256 indexed tokenId, uint256 timestamp);

    // Errors
    error AgreementNotFound(uint256 tokenId);
    error AgreementAlreadyFinalized(uint256 tokenId);
    error OwnerAlreadySigned(uint256 tokenId);
    error BeneficiaryAlreadySigned(uint256 tokenId, string beneficiaryId);
    error BeneficiaryNotFound(uint256 tokenId, string beneficiaryId);
    error WitnessAlreadySigned(uint256 tokenId);
    error VisibleIdAlreadyExists(string visibleId);
    error InvalidBeneficiaryCount();

    constructor() ERC721("AgreementNFT", "AGREE") Ownable(msg.sender) {}

    /**
     * @dev Mint a new agreement NFT
     * @param visibleId Human-readable ID from database
     * @param metadataUri S3 URI containing agreement JSON metadata
     * @param beneficiaryIds Array of database beneficiary IDs
     * @return tokenId The newly minted token ID
     */
    function mintAgreement(
        string calldata visibleId,
        string calldata metadataUri,
        string[] calldata beneficiaryIds
    ) external onlyOwner nonReentrant returns (uint256) {
        // Check visibleId doesn't already exist
        if (_visibleIdToTokenId[visibleId] != 0) {
            revert VisibleIdAlreadyExists(visibleId);
        }
        
        // Validate beneficiary count
        if (beneficiaryIds.length == 0) {
            revert InvalidBeneficiaryCount();
        }

        _tokenIds++;
        uint256 newTokenId = _tokenIds;

        // Mint NFT to contract owner (backend wallet)
        _safeMint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, metadataUri);

        // Initialize agreement data
        AgreementData storage agreement = _agreements[newTokenId];
        agreement.visibleId = visibleId;
        agreement.beneficiaryIds = beneficiaryIds;
        agreement.beneficiaryCount = beneficiaryIds.length;
        agreement.signedCount = 0;
        agreement.ownerSigned = false;
        agreement.ownerSignedAt = 0;
        agreement.witnessSigned = false;
        agreement.witnessedAt = 0;
        agreement.isFinalized = false;

        // Map visibleId to tokenId for lookup
        _visibleIdToTokenId[visibleId] = newTokenId;

        emit AgreementMinted(newTokenId, visibleId, metadataUri, beneficiaryIds.length);

        return newTokenId;
    }

    /**
     * @dev Record owner signature for an agreement
     * @param tokenId The token ID of the agreement
     */
    function recordOwnerSignature(uint256 tokenId) external onlyOwner nonReentrant {
        _requireAgreementExists(tokenId);
        
        AgreementData storage agreement = _agreements[tokenId];
        
        if (agreement.isFinalized) {
            revert AgreementAlreadyFinalized(tokenId);
        }
        if (agreement.ownerSigned) {
            revert OwnerAlreadySigned(tokenId);
        }

        agreement.ownerSigned = true;
        agreement.ownerSignedAt = block.timestamp;

        emit OwnerSigned(tokenId, block.timestamp);
    }

    /**
     * @dev Record beneficiary signature for an agreement
     * @param tokenId The token ID of the agreement
     * @param beneficiaryId The database ID of the beneficiary
     */
    function recordBeneficiarySignature(
        uint256 tokenId,
        string calldata beneficiaryId
    ) external onlyOwner nonReentrant {
        _requireAgreementExists(tokenId);
        
        AgreementData storage agreement = _agreements[tokenId];
        
        if (agreement.isFinalized) {
            revert AgreementAlreadyFinalized(tokenId);
        }
        
        // Check if beneficiary already signed
        if (_beneficiaryHasSigned[tokenId][beneficiaryId]) {
            revert BeneficiaryAlreadySigned(tokenId, beneficiaryId);
        }
        
        // Verify beneficiary is part of this agreement
        bool found = false;
        for (uint256 i = 0; i < agreement.beneficiaryIds.length; i++) {
            if (keccak256(bytes(agreement.beneficiaryIds[i])) == keccak256(bytes(beneficiaryId))) {
                found = true;
                break;
            }
        }
        if (!found) {
            revert BeneficiaryNotFound(tokenId, beneficiaryId);
        }

        // Record signature
        _beneficiaryHasSigned[tokenId][beneficiaryId] = true;
        _beneficiarySignedAt[tokenId][beneficiaryId] = block.timestamp;
        agreement.signedCount++;

        emit BeneficiarySigned(tokenId, beneficiaryId, block.timestamp);
    }

    /**
     * @dev Record witness (admin) signature for an agreement
     * @param tokenId The token ID of the agreement
     */
    function recordWitnessSignature(uint256 tokenId) external onlyOwner nonReentrant {
        _requireAgreementExists(tokenId);
        
        AgreementData storage agreement = _agreements[tokenId];
        
        if (agreement.isFinalized) {
            revert AgreementAlreadyFinalized(tokenId);
        }
        if (agreement.witnessSigned) {
            revert WitnessAlreadySigned(tokenId);
        }

        agreement.witnessSigned = true;
        agreement.witnessedAt = block.timestamp;

        emit WitnessSigned(tokenId, block.timestamp);
    }

    /**
     * @dev Finalize an agreement (lock it from further changes)
     * @param tokenId The token ID of the agreement
     */
    function finalizeAgreement(uint256 tokenId) external onlyOwner nonReentrant {
        _requireAgreementExists(tokenId);
        
        AgreementData storage agreement = _agreements[tokenId];
        
        if (agreement.isFinalized) {
            revert AgreementAlreadyFinalized(tokenId);
        }

        agreement.isFinalized = true;

        emit AgreementFinalized(tokenId, block.timestamp);
    }

    // ============ View Functions ============

    /**
     * @dev Get agreement data by token ID
     * @param tokenId The token ID of the agreement
     * @return Agreement data struct
     */
    function getAgreement(uint256 tokenId) external view returns (AgreementData memory) {
        _requireAgreementExists(tokenId);
        return _agreements[tokenId];
    }

    /**
     * @dev Get token ID by visible ID
     * @param visibleId The human-readable visible ID
     * @return tokenId The token ID (0 if not found)
     */
    function getTokenIdByVisibleId(string calldata visibleId) external view returns (uint256) {
        return _visibleIdToTokenId[visibleId];
    }

    /**
     * @dev Check if a beneficiary has signed
     * @param tokenId The token ID of the agreement
     * @param beneficiaryId The database ID of the beneficiary
     * @return hasSigned Whether the beneficiary has signed
     * @return signedAt Timestamp when signed (0 if not signed)
     */
    function getBeneficiarySignature(
        uint256 tokenId,
        string calldata beneficiaryId
    ) external view returns (bool hasSigned, uint256 signedAt) {
        _requireAgreementExists(tokenId);
        return (
            _beneficiaryHasSigned[tokenId][beneficiaryId],
            _beneficiarySignedAt[tokenId][beneficiaryId]
        );
    }

    /**
     * @dev Check if all required signatures are collected
     * @param tokenId The token ID of the agreement
     * @return allSigned Whether all parties have signed
     */
    function isFullySigned(uint256 tokenId) external view returns (bool) {
        _requireAgreementExists(tokenId);
        AgreementData storage agreement = _agreements[tokenId];
        
        return agreement.ownerSigned && 
               agreement.witnessSigned && 
               agreement.signedCount == agreement.beneficiaryCount;
    }

    /**
     * @dev Get the total number of minted agreements
     * @return Total token count
     */
    function totalSupply() external view returns (uint256) {
        return _tokenIds;
    }

    // ============ Internal Functions ============

    /**
     * @dev Check if agreement exists, revert if not
     * @param tokenId The token ID to check
     */
    function _requireAgreementExists(uint256 tokenId) internal view {
        if (tokenId == 0 || tokenId > _tokenIds) {
            revert AgreementNotFound(tokenId);
        }
    }
}
