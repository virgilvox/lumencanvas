import { verifyToken } from "@clerk/backend";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, bucketName } from "./utils/s3-client.js";
import { nanoid } from "nanoid";

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
      },
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
        body: JSON.stringify({ error: "Unauthenticated" }),
      };
    }

    const projectData = JSON.parse(event.body);
    const projectId = `proj_${nanoid()}`;
    const key = `${userId}/${projectId}/project.json`;
    const now = new Date().toISOString();

    const newProject = {
      id: projectId,
      version: "1.0",
      metadata: {
        id: projectId,
        name: projectData.name || 'Untitled Project',
        description: projectData.description || '',
        created: now,
        modified: now,
        author: userId,
      },
      canvas: {
        width: projectData.width || 1280,
        height: projectData.height || 720,
        background: '#000000',
        blendMode: 'normal',
      },
      layers: [],
      assets: [],
      history: {
        commands: [],
        currentIndex: -1,
      }
    };

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: JSON.stringify(newProject),
      ContentType: "application/json",
    });

    await s3Client.send(command);

    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProject),
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