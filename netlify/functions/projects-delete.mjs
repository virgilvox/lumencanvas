import { verifyToken } from "@clerk/backend";
import { DeleteObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { s3Client, bucketName } from "./utils/s3-client.js";

export const handler = async (event) => {
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
        body: JSON.stringify({ error: "Unauthenticated" }),
      };
    }
    
    const { id: projectId } = event.queryStringParameters;
    if (!projectId) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Project ID is required.'})
        };
    }

    const prefix = `${userId}/${projectId}/`;

    // List all objects in the project folder
    const listCommand = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: prefix,
    });
    const listedObjects = await s3Client.send(listCommand);

    if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
        return { statusCode: 200, body: JSON.stringify({ message: "Project folder already empty or not found."}) };
    }

    // Prepare objects for deletion
    const deleteParams = {
        Bucket: bucketName,
        Delete: {
            Objects: listedObjects.Contents.map(({ Key }) => ({ Key })),
        },
    };

    const deleteCommand = new DeleteObjectsCommand(deleteParams);
    await s3Client.send(deleteCommand);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Project and all associated assets deleted successfully." }),
    };
  } catch (error) {
    console.error("Error deleting project:", error);
    if (error.message && (error.message.includes('Unexpected JWT payload') || error.message.includes('Token is expired') || error.message.includes('invalid_token'))) {
        return { statusCode: 401, body: JSON.stringify({ error: "Invalid or expired token" }) };
    }
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Could not delete project." }),
    };
  }
}; 