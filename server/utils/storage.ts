import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'

let _s3: S3Client | undefined

export function useS3() {
  if (!_s3) {
    const config = useRuntimeConfig()
    _s3 = new S3Client({
      endpoint: config.s3Endpoint,
      region: config.s3Region || 'auto',
      credentials: {
        accessKeyId: config.s3AccessKeyId,
        secretAccessKey: config.s3SecretAccessKey,
      },
    })
  }
  return _s3
}

export async function uploadAudio(key: string, body: Buffer, contentType = 'audio/ogg') {
  const config = useRuntimeConfig()
  const s3 = useS3()
  await s3.send(new PutObjectCommand({
    Bucket: config.s3Bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  }))
}

export async function getAudioUrl(key: string): Promise<string> {
  const config = useRuntimeConfig()
  // For R2/S3 public buckets, construct the URL directly
  return `${config.s3Endpoint}/${config.s3Bucket}/${key}`
}
