import { verifyToken } from "@clerk/backend";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, bucketName } from "./utils/s3-client.js";

async function streamToString(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
  });
}

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

    const key = `${userId}/${projectId}/project.json`;

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const { Body } = await s3Client.send(command);
    const projectDataString = await streamToString(Body);
    
    return {
      statusCode: 200,
      body: projectDataString,
      headers: {
        'Content-Type': 'application/json'
      }
    };
  } catch (error) {
    if (error.name === 'NoSuchKey') {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Project not found.'})
      }
    }
    console.error("Error reading project:", error);
    if (error.message && (error.message.includes('Unexpected JWT payload') || error.message.includes('Token is expired') || error.message.includes('invalid_token'))) {
        return { statusCode: 401, body: JSON.stringify({ error: "Invalid or expired token" }) };
    }
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Could not read project." }),
    };
  }
}; 