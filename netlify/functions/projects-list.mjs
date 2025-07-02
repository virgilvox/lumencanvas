import { createClerkClient, verifyToken } from "@clerk/backend";
import { ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
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
  const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
  
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

    const prefix = `${userId}/`;
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix,
      Delimiter: '/',
    });

    const { CommonPrefixes } = await s3Client.send(command);
    
    if (!CommonPrefixes || CommonPrefixes.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify([]),
      };
    }

    const projectPromises = CommonPrefixes.map(async (commonPrefix) => {
      const projectKey = `${commonPrefix.Prefix}project.json`;
      try {
        const getCommand = new GetObjectCommand({
          Bucket: bucketName,
          Key: projectKey,
        });
        const { Body } = await s3Client.send(getCommand);
        const projectDataString = await streamToString(Body);
        return JSON.parse(projectDataString);
      } catch (error) {
        if (error.name !== 'NoSuchKey') {
          console.error(`Failed to fetch or parse project.json for prefix ${commonPrefix.Prefix}:`, error);
        }
        return null;
      }
    });

    const projects = (await Promise.all(projectPromises)).filter(p => p !== null);

    return {
      statusCode: 200,
      body: JSON.stringify(projects),
    };
  } catch (error) {
    console.error("Error listing projects:", error);
    if (error.message && (error.message.includes('Unexpected JWT payload') || error.message.includes('Token is expired') || error.message.includes('invalid_token'))) {
        return { statusCode: 401, body: JSON.stringify({ error: "Invalid or expired token" }) };
    }
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Could not list projects." }),
    };
  }
}; 