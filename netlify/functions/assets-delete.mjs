import { verifyToken } from "@clerk/backend";
import { ListObjectVersionsCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { s3Client, bucketName } from "./utils/s3-client.js";
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

    const { key } = JSON.parse(event.body);

    if (!key) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders },
        body: JSON.stringify({ error: "Missing required field: key" }),
      };
    }
    
    // Security check: ensure the user is deleting an object within their own folder
    if (!key.startsWith(`${userId}/`)) {
        return {
            statusCode: 403,
            headers: { ...corsHeaders },
            body: JSON.stringify({ error: "Forbidden: You can only delete your own assets."})
        }
    }

    // List all versions of the object
    const listVersionsCommand = new ListObjectVersionsCommand({
        Bucket: bucketName,
        Prefix: key,
    });
    const listedVersions = await s3Client.send(listVersionsCommand);

    const objectsToDelete = [];
    if (listedVersions.Versions) {
        objectsToDelete.push(...listedVersions.Versions.map(v => ({ Key: v.Key, VersionId: v.VersionId })));
    }
    if (listedVersions.DeleteMarkers) {
        objectsToDelete.push(...listedVersions.DeleteMarkers.map(dm => ({ Key: dm.Key, VersionId: dm.VersionId })));
    }
    
    if (objectsToDelete.length === 0) {
        return {
            statusCode: 200,
            headers: { ...corsHeaders },
            body: JSON.stringify({ message: "Asset not found or already deleted." }),
        };
    }

    const deleteCommand = new DeleteObjectsCommand({
      Bucket: bucketName,
      Delete: { Objects: objectsToDelete },
    });

    await s3Client.send(deleteCommand);

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: "Asset deleted successfully." }),
    };
  } catch (error) {
    console.error("Error deleting asset:", error);
    if (error.name === 'NoSuchKey') {
        return { statusCode: 404, headers: { ...corsHeaders }, body: JSON.stringify({ error: 'Asset not found.' }) };
    }
    if (error.message && (error.message.includes('Unexpected JWT payload') || error.message.includes('Token is expired') || error.message.includes('invalid_token'))) {
        return { statusCode: 401, headers: { ...corsHeaders }, body: JSON.stringify({ error: "Invalid or expired token" }) };
    }
    return {
      statusCode: 500,
      headers: { ...corsHeaders },
      body: JSON.stringify({ error: "Could not delete asset." }),
    };
  }
}; 