// File: src/services/external/AwsService.ts
import {
  S3Client, // This import is actually not needed here if s3Client is imported
  PutObjectCommand,
  DeleteObjectCommand,
  ObjectCannedACL,
} from '@aws-sdk/client-s3'

// Ensure this path is correct and 's3Client' (or 's3') is the exported S3Client instance
import s3ClientInstance from '../../aws' // Renamed import for clarity to s3ClientInstance

class AwsService {
  private getMimeType(key: string): string | undefined {
    if (!key || typeof key !== 'string') {
      console.warn('AwsService: getMimeType received invalid key.')
      return undefined
    }
    const extension = key.split('.').pop()?.toLowerCase()
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg'
      case 'png':
        return 'image/png'
      case 'gif':
        return 'image/gif'
      case 'webp':
        return 'image/webp'
      // Add more common image MIME types as needed
      default:
        console.warn(
          `AwsService: Unknown extension ".${extension}" for key "${key}". MIME type not set.`,
        )
        return undefined // Let S3 infer, or set a default like 'application/octet-stream' if required
    }
  }

  /**
   * Stores an image in the specified S3 bucket.
   * @param imageData The image data as a Buffer.
   * @param bucketName The name of the S3 bucket.
   * @param key The S3 object key (path/filename).
   * @throws Will throw an error if the upload fails.
   */
  async storeImage(imageData: Buffer, bucketName: string, key: string): Promise<void> {
    if (!imageData || !bucketName || !key) {
      const errorMsg = 'AwsService: storeImage called with invalid parameters.'
      console.error(errorMsg, { hasImageData: !!imageData, bucketName, key })
      throw new Error(errorMsg)
    }

    const contentType = this.getMimeType(key)
    const params = {
      Bucket: bucketName,
      Key: key,
      Body: imageData,
      // ACL: ObjectCannedACL.public_read, // Makes the object publicly readable
      ContentType: contentType,
    }

    // If ContentType is undefined, AWS SDK might try to infer it,
    // or you might choose to remove it or set a default like 'application/octet-stream'.
    // For this example, we'll send it even if undefined.
    if (!contentType) {
      console.warn(`AwsService: ContentType for ${key} is undefined. S3 will attempt to infer.`)
    }

    try {
      const command = new PutObjectCommand(params)
      // Using the imported s3ClientInstance
      await s3ClientInstance.send(command)
      console.log(`AwsService: Successfully uploaded ${key} to ${bucketName}`)
    } catch (error) {
      console.error(`AwsService: Error uploading "${key}" to S3 bucket "${bucketName}":`, error)
      // Ensure the error is an instance of Error for consistent handling downstream
      if (error instanceof Error) {
        throw error
      } else {
        throw new Error(`Unknown error during S3 upload: ${String(error)}`)
      }
    }
  }

  /**
   * Deletes an image from the specified S3 bucket.
   * @param bucketName The name of the S3 bucket.
   * @param key The S3 object key (path/filename).
   * @throws Will throw an error if the deletion fails.
   */
  async deleteImage(bucketName: string, key: string): Promise<void> {
    if (!bucketName || !key) {
      const errorMsg = 'AwsService: deleteImage called with invalid parameters.'
      console.error(errorMsg, { bucketName, key })
      throw new Error(errorMsg)
    }

    const params = {
      Bucket: bucketName,
      Key: key,
    }

    try {
      const command = new DeleteObjectCommand(params)
      // Using the imported s3ClientInstance
      await s3ClientInstance.send(command)
      console.log(`AwsService: Successfully deleted ${key} from ${bucketName}`)
    } catch (error) {
      console.error(`AwsService: Error deleting "${key}" from S3 bucket "${bucketName}":`, error)
      if (error instanceof Error) {
        throw error
      } else {
        throw new Error(`Unknown error during S3 deletion: ${String(error)}`)
      }
    }
  }
}

export default AwsService
