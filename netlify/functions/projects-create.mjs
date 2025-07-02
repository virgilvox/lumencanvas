import { verifyToken } from "@clerk/backend";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, bucketName } from "./utils/s3-client.js";
import { nanoid } from "nanoid";

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

    const projectData = JSON.parse(event.body);
    const projectId = `proj_${nanoid()}`;
    const key = `${userId}/${projectId}/project.json`;

    // Add server-side metadata
    projectData.id = projectId;
    projectData.owner = userId;
    projectData.createdAt = new Date().toISOString();
    projectData.updatedAt = new Date().toISOString();

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: JSON.stringify(projectData),
      ContentType: "application/json",
    });

    await s3Client.send(command);

    return {
      statusCode: 201,
      body: JSON.stringify(projectData),
    };
  } catch (error) {
    console.error("Error creating project:", error);
    if (error.message && (error.message.includes('Unexpected JWT payload') || error.message.includes('Token is expired') || error.message.includes('invalid_token'))) {
        return { statusCode: 401, body: JSON.stringify({ error: "Invalid or expired token" }) };
    }
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Could not create project." }),
    };
  }
}; 