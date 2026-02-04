import { ethers, Contract, Wallet, JsonRpcProvider } from 'ethers';
import { AGREEMENT_NFT_ABI } from './contract-abi';

// Environment variables
const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

// Lazy initialization for provider and wallet
let _provider: JsonRpcProvider | null = null;
let _wallet: Wallet | null = null;
let _contract: Contract | null = null;

/**
 * Get the JSON RPC provider
 */
function getProvider(): JsonRpcProvider {
	if (!RPC_URL) {
		throw new Error('RPC_URL environment variable is not set');
	}
	if (!_provider) {
		_provider = new JsonRpcProvider(RPC_URL);
	}
	return _provider;
}

/**
 * Get the wallet signer (backend wallet)
 */
function getWallet(): Wallet {
	if (!PRIVATE_KEY) {
		throw new Error('PRIVATE_KEY environment variable is not set');
	}
	if (!_wallet) {
		_wallet = new Wallet(PRIVATE_KEY, getProvider());
	}
	return _wallet;
}

/**
 * Get the AgreementNFT contract instance
 */
function getContract(): Contract {
	if (!CONTRACT_ADDRESS) {
		throw new Error('CONTRACT_ADDRESS environment variable is not set');
	}
	if (!_contract) {
		_contract = new Contract(CONTRACT_ADDRESS, AGREEMENT_NFT_ABI, getWallet());
	}
	return _contract;
}

/**
 * Get the contract address
 */
export function getContractAddress(): string {
	if (!CONTRACT_ADDRESS) {
		throw new Error('CONTRACT_ADDRESS environment variable is not set');
	}
	return CONTRACT_ADDRESS;
}

// ============ Transaction Result Types ============

export interface MintResult {
	tokenId: number;
	txHash: string;
	blockNumber: number;
}

export interface SignatureResult {
	txHash: string;
	blockNumber: number;
	timestamp: number;
}

export interface AgreementData {
	visibleId: string;
	beneficiaryIds: string[];
	beneficiaryCount: number;
	signedCount: number;
	ownerSigned: boolean;
	ownerSignedAt: number;
	witnessSigned: boolean;
	witnessedAt: number;
	isFinalized: boolean;
}

export interface BeneficiarySignatureStatus {
	hasSigned: boolean;
	signedAt: number;
}

// ============ Write Functions (Transactions) ============

/**
 * Mint a new agreement NFT
 * @param visibleId Human-readable agreement ID from database
 * @param metadataUri S3 URI containing agreement JSON metadata
 * @param beneficiaryIds Array of database beneficiary IDs
 * @returns Mint result with tokenId and transaction hash
 */
export async function mintAgreementNFT(
	visibleId: string,
	metadataUri: string,
	beneficiaryIds: string[]
): Promise<MintResult> {
	const contract = getContract();

	const tx = await contract.mintAgreement(visibleId, metadataUri, beneficiaryIds);
	const receipt = await tx.wait();

	// Parse the AgreementMinted event to get the tokenId
	const mintEvent = receipt.logs
		.map((log: ethers.Log) => {
			try {
				return contract.interface.parseLog({
					topics: log.topics as string[],
					data: log.data,
				});
			} catch {
				return null;
			}
		})
		.find((event: ethers.LogDescription | null) => event?.name === 'AgreementMinted');

	if (!mintEvent) {
		throw new Error('AgreementMinted event not found in transaction receipt');
	}

	const tokenId = Number(mintEvent.args.tokenId);

	return {
		tokenId,
		txHash: receipt.hash,
		blockNumber: receipt.blockNumber,
	};
}

/**
 * Record owner signature for an agreement
 * @param tokenId The NFT token ID
 * @returns Signature result with transaction hash
 */
export async function recordOwnerSignature(tokenId: number): Promise<SignatureResult> {
	const contract = getContract();

	const tx = await contract.recordOwnerSignature(tokenId);
	const receipt = await tx.wait();

	// Get block timestamp
	const block = await getProvider().getBlock(receipt.blockNumber);
	const timestamp = block?.timestamp ?? Math.floor(Date.now() / 1000);

	return {
		txHash: receipt.hash,
		blockNumber: receipt.blockNumber,
		timestamp,
	};
}

/**
 * Record beneficiary signature for an agreement
 * @param tokenId The NFT token ID
 * @param beneficiaryId The database ID of the beneficiary
 * @returns Signature result with transaction hash
 */
export async function recordBeneficiarySignature(
	tokenId: number,
	beneficiaryId: string
): Promise<SignatureResult> {
	const contract = getContract();

	const tx = await contract.recordBeneficiarySignature(tokenId, beneficiaryId);
	const receipt = await tx.wait();

	// Get block timestamp
	const block = await getProvider().getBlock(receipt.blockNumber);
	const timestamp = block?.timestamp ?? Math.floor(Date.now() / 1000);

	return {
		txHash: receipt.hash,
		blockNumber: receipt.blockNumber,
		timestamp,
	};
}

/**
 * Record witness (admin) signature for an agreement
 * @param tokenId The NFT token ID
 * @returns Signature result with transaction hash
 */
export async function recordWitnessSignature(tokenId: number): Promise<SignatureResult> {
	const contract = getContract();

	const tx = await contract.recordWitnessSignature(tokenId);
	const receipt = await tx.wait();

	// Get block timestamp
	const block = await getProvider().getBlock(receipt.blockNumber);
	const timestamp = block?.timestamp ?? Math.floor(Date.now() / 1000);

	return {
		txHash: receipt.hash,
		blockNumber: receipt.blockNumber,
		timestamp,
	};
}

/**
 * Finalize an agreement (lock from further changes)
 * @param tokenId The NFT token ID
 * @returns Signature result with transaction hash
 */
export async function finalizeAgreement(tokenId: number): Promise<SignatureResult> {
	const contract = getContract();

	const tx = await contract.finalizeAgreement(tokenId);
	const receipt = await tx.wait();

	// Get block timestamp
	const block = await getProvider().getBlock(receipt.blockNumber);
	const timestamp = block?.timestamp ?? Math.floor(Date.now() / 1000);

	return {
		txHash: receipt.hash,
		blockNumber: receipt.blockNumber,
		timestamp,
	};
}

// ============ Read Functions (No Gas) ============

/**
 * Get agreement data from the blockchain
 * @param tokenId The NFT token ID
 * @returns Agreement data from the contract
 */
export async function getAgreementData(tokenId: number): Promise<AgreementData> {
	const contract = getContract();

	const data = await contract.getAgreement(tokenId);

	return {
		visibleId: data.visibleId,
		beneficiaryIds: [...data.beneficiaryIds],
		beneficiaryCount: Number(data.beneficiaryCount),
		signedCount: Number(data.signedCount),
		ownerSigned: data.ownerSigned,
		ownerSignedAt: Number(data.ownerSignedAt),
		witnessSigned: data.witnessSigned,
		witnessedAt: Number(data.witnessedAt),
		isFinalized: data.isFinalized,
	};
}

/**
 * Get beneficiary signature status
 * @param tokenId The NFT token ID
 * @param beneficiaryId The database ID of the beneficiary
 * @returns Whether the beneficiary has signed and when
 */
export async function getBeneficiarySignatureStatus(
	tokenId: number,
	beneficiaryId: string
): Promise<BeneficiarySignatureStatus> {
	const contract = getContract();

	const [hasSigned, signedAt] = await contract.getBeneficiarySignature(tokenId, beneficiaryId);

	return {
		hasSigned,
		signedAt: Number(signedAt),
	};
}

/**
 * Check if agreement is fully signed (owner + all beneficiaries + witness)
 * @param tokenId The NFT token ID
 * @returns Whether the agreement is fully signed
 */
export async function isAgreementFullySigned(tokenId: number): Promise<boolean> {
	const contract = getContract();
	return await contract.isFullySigned(tokenId);
}

/**
 * Get token ID by visible ID
 * @param visibleId The human-readable visible ID
 * @returns The token ID (0 if not found)
 */
export async function getTokenIdByVisibleId(visibleId: string): Promise<number> {
	const contract = getContract();
	const tokenId = await contract.getTokenIdByVisibleId(visibleId);
	return Number(tokenId);
}

/**
 * Get the metadata URI (S3 URL) for an agreement NFT
 * @param tokenId The NFT token ID
 * @returns The metadata URI
 */
export async function getTokenURI(tokenId: number): Promise<string> {
	const contract = getContract();
	return await contract.tokenURI(tokenId);
}

/**
 * Get total number of minted agreements
 * @returns Total supply of agreement NFTs
 */
export async function getTotalSupply(): Promise<number> {
	const contract = getContract();
	const supply = await contract.totalSupply();
	return Number(supply);
}

// ============ Utility Functions ============

/**
 * Generate a block explorer URL for a transaction
 * @param txHash The transaction hash
 * @returns Block explorer URL for Base Sepolia
 */
export function getExplorerUrl(txHash: string): string {
	// Base Sepolia block explorer
	return `https://sepolia.basescan.org/tx/${txHash}`;
}

/**
 * Generate a block explorer URL for the contract
 * @returns Block explorer URL for the contract
 */
export function getContractExplorerUrl(): string {
	return `https://sepolia.basescan.org/address/${getContractAddress()}`;
}

/**
 * Check if the contract is properly configured
 * @returns Whether all required environment variables are set
 */
export function isContractConfigured(): boolean {
	return Boolean(RPC_URL && PRIVATE_KEY && CONTRACT_ADDRESS);
}

/**
 * Get the backend wallet address
 * @returns The wallet address that signs all transactions
 */
export function getWalletAddress(): string {
	return getWallet().address;
}
