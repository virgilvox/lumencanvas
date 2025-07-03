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
      return { statusCode: 401, headers: { ...corsHeaders }, body: JSON.stringify({ error: "Unauthenticated" }) };
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
    
    const { id: projectId } = event.queryStringParameters;
    if (!projectId || projectId === 'undefined') {
        return {
            statusCode: 400,
            headers: { ...corsHeaders },
            body: JSON.stringify({ error: 'Project ID is required.'})
        };
    }

    const prefix = `${userId}/${projectId}/`;

    const prefixesToCheck = [prefix];

    const objectsToDelete = [];

    for (const prefix of prefixesToCheck) {
      const listCommand = new ListObjectVersionsCommand({ Bucket: bucketName, Prefix: prefix });
      try {
        const listedObjectVersions = await s3Client.send(listCommand);
        if (listedObjectVersions.Versions) {
          objectsToDelete.push(...listedObjectVersions.Versions.map(v => ({ Key: v.Key, VersionId: v.VersionId })));
        }
        if (listedObjectVersions.DeleteMarkers) {
          objectsToDelete.push(...listedObjectVersions.DeleteMarkers.map(dm => ({ Key: dm.Key, VersionId: dm.VersionId })));
        }
      } catch (listErr) {
        if (listErr.name !== 'NoSuchKey') {
          console.error(`Error listing objects with prefix ${prefix}:`, listErr);
        }
      }
    }

    if (objectsToDelete.length === 0) {
        return { statusCode: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ message: "Project folder already empty or not found."}) };
    }

    // Prepare objects for deletion
    const deleteParams = {
        Bucket: bucketName,
        Delete: {
            Objects: objectsToDelete,
        },
    };

    const deleteCommand = new DeleteObjectsCommand(deleteParams);
    await s3Client.send(deleteCommand);

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: "Project and all associated assets deleted successfully." }),
    };
  } catch (error) {
    console.error("Error deleting project:", error);
    if (error.message && (error.message.includes('Unexpected JWT payload') || error.message.includes('Token is expired') || error.message.includes('invalid_token'))) {
        return { statusCode: 401, headers: { ...corsHeaders }, body: JSON.stringify({ error: "Invalid or expired token" }) };
    }
    return {
      statusCode: 500,
      headers: { ...corsHeaders },
      body: JSON.stringify({ error: "Could not delete project." }),
    };
  }
}; 