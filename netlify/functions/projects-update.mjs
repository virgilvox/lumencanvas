import { verifyToken } from "@clerk/backend";
import { PutObjectCommand } from "@aws-sdk/client-s3";
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

    const projectData = JSON.parse(event.body);
    
    // Ensure owner and project ID cannot be changed
    if (projectData.owner && projectData.owner !== userId) {
        return { statusCode: 403, body: JSON.stringify({ error: "Forbidden" })};
    }
    projectData.id = projectId;
    projectData.owner = userId;
    projectData.updatedAt = new Date().toISOString();

    const key = `${userId}/${projectId}/project.json`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: JSON.stringify(projectData),
      ContentType: "application/json",
    });

    await s3Client.send(command);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Project updated successfully." }),
    };
  } catch (error) {
    console.error("Error updating project:", error);
    if (error.message && (error.message.includes('Unexpected JWT payload') || error.message.includes('Token is expired') || error.message.includes('invalid_token'))) {
        return { statusCode: 401, body: JSON.stringify({ error: "Invalid or expired token" }) };
    }
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Could not update project." }),
    };
  }
}; 