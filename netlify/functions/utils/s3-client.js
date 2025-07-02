import { S3Client } from "@aws-sdk/client-s3";

const rawSpacesEndpoint = process.env.DO_SPACES_ENDPOINT;
const spacesKey = process.env.DO_SPACES_KEY;
const spacesSecret = process.env.DO_SPACES_SECRET;
const spacesRegion = process.env.DO_SPACES_REGION;

if (!rawSpacesEndpoint || !spacesKey || !spacesSecret || !spacesRegion) {
  throw new Error("DigitalOcean Spaces environment variables are not configured.");
}

// Strip any protocol from the endpoint to prevent invalid URLs
const spacesEndpoint = rawSpacesEndpoint.replace(/^https?:\/\//, '');

export const s3Client = new S3Client({
  endpoint: `https://${spacesEndpoint}`,
  region: spacesRegion,
  forcePathStyle: true,
  credentials: {
    accessKeyId: spacesKey,
    secretAccessKey: spacesSecret,
  },
});

export const bucketName = process.env.DO_SPACES_BUCKET;

if (!bucketName) {
  throw new Error("DO_SPACES_BUCKET environment variable is not set.");
} 