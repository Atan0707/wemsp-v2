import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, type PutObjectCommandInput } from '@aws-sdk/client-s3';
import { lookup } from 'mime-types';

// Initialize S3 client with environment variables
const s3Client = new S3Client({
	region: process.env.AWS_REGION || 'ap-southeast-1',
	credentials: {
		accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
	},
});

const bucketName = process.env.AWS_S3_BUCKET || '';

/**
 * Upload a file to S3
 * @param file - The file to upload (File, Blob, or Buffer)
 * @param key - The S3 key (path) where the file will be stored
 * @returns The URL of the uploaded file
 */
export async function uploadFileToS3(
	file: File | Buffer,
	key: string
): Promise<{ url: string; key: string }> {
	// Get file content and mime type
	let body: Buffer;
	let contentType: string;

	if (file instanceof File) {
		// Browser File object
		const arrayBuffer = await file.arrayBuffer();
		body = Buffer.from(arrayBuffer);
		contentType = file.type || lookup(key) || 'application/octet-stream';
	} else {
		// Node.js Buffer
		body = file;
		contentType = lookup(key) || 'application/octet-stream';
	}

	const params: PutObjectCommandInput = {
		Bucket: bucketName,
		Key: key,
		Body: body,
		ContentType: contentType,
	};

	try {
		await s3Client.send(new PutObjectCommand(params));

		// Return the S3 object URL
		const url = `https://${bucketName}.s3.${process.env.AWS_REGION || 'ap-southeast-1'}.amazonaws.com/${key}`;
		return { url, key };
	} catch (error) {
		console.error('Error uploading to S3:', error);
		throw new Error('Failed to upload file to S3');
	}
}

/**
 * Delete a file from S3
 * @param key - The S3 key of the file to delete
 */
export async function deleteFileFromS3(key: string): Promise<void> {
	const params = {
		Bucket: bucketName,
		Key: key,
	};

	try {
		await s3Client.send(new DeleteObjectCommand(params));
	} catch (error) {
		console.error('Error deleting from S3:', error);
		throw new Error('Failed to delete file from S3');
	}
}

/**
 * Get a file from S3
 * @param key - The S3 key of the file to fetch
 * @returns The file stream and content type
 */
export async function getFileFromS3(key: string): Promise<{
	stream: ReadableStream<Uint8Array>;
	contentType: string;
}> {
	const params = {
		Bucket: bucketName,
		Key: key,
	};

	try {
		const command = new GetObjectCommand(params);
		const response = await s3Client.send(command);

		if (!response.Body) {
			throw new Error('No file body received from S3');
		}

		return {
			stream: response.Body.transformToByteArray() as unknown as ReadableStream<Uint8Array>,
			contentType: response.ContentType || 'application/octet-stream',
		};
	} catch (error) {
		console.error('Error getting file from S3:', error);
		throw new Error('Failed to get file from S3');
	}
}

/**
 * Generate a unique S3 key for a file
 * @param fileName - The original file name
 * @param folder - The folder path (optional, defaults to 'uploads')
 * @returns A unique S3 key
 */
export function generateS3Key(fileName: string, folder: string = 'uploads'): string {
	const timestamp = Date.now();
	const randomString = Math.random().toString(36).substring(2, 15);
	const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
	return `${folder}/${timestamp}-${randomString}-${sanitizedName}`;
}

export { s3Client, bucketName };
