import { verifyToken } from "@clerk/backend";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client, bucketName } from "./utils/s3-client.js";
import { nanoid } from "nanoid";
import { corsHeaders } from "./utils/cors.js";

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  try {
    const authorizationHeader = event.headers.authorization;
    if (!authorizationHeader) {
      return { statusCode: 401, body: JSON.stringify({ error: "Unauthenticated" }) };
    }
    
    const sessionToken = authorizationHeader.replace('Bearer ', '');
    const claims = await verifyToken(sessionToken, { secretKey: process.env.CLERK_SECRET_KEY });
    const userId = claims.sub;

    if (!userId) {
      return {
        statusCode: 401,
        headers: { ...corsHeaders },
        body: JSON.stringify({ error: "Unauthenticated" }),
      };
    }

    const { fileName, fileType, projectId } = JSON.parse(event.body);

    if (!fileName || !fileType || !projectId) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders },
        body: JSON.stringify({ error: "Missing required fields: fileName, fileType, projectId" }),
      };
    }

    const assetId = nanoid();
    const key = `${userId}/${projectId}/assets/${assetId}-${fileName}`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600, // 1 hour
    });
    
    const publicUrl = process.env.DO_SPACES_CDN
      ? `${process.env.DO_SPACES_CDN}/${key}`
      : `https://${bucketName}.${process.env.DO_SPACES_ENDPOINT}/${key}`;

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uploadUrl,
        publicUrl,
        assetId,
        key
      }),
    };
  } catch (error) {
    console.error("Error generating signed URL:", error);
    if (error.message && (error.message.includes('Unexpected JWT payload') || error.message.includes('Token is expired') || error.message.includes('invalid_token'))) {
        return { statusCode: 401, headers: { ...corsHeaders }, body: JSON.stringify({ error: "Invalid or expired token" }) };
    }
    return {
      statusCode: 500,
      headers: { ...corsHeaders },
      body: JSON.stringify({ error: "Could not generate upload URL." }),
    };
  }
}; 