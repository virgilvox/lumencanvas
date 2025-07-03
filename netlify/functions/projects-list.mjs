import { verifyToken } from "@clerk/backend";
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
  console.log("--- projects-list function invoked ---");
  console.log("Event Summary:", {
    method: event.httpMethod,
    path: event.rawUrl || event.path,
    authorizationHeaderPresent: !!event.headers.authorization,
  });
  console.log("Environment:", {
    bucketName,
    region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'unknown',
  });
  try {
    const authorizationHeader = event.headers.authorization;
    if (!authorizationHeader) {
      console.log("No authorization header found.");
      return { statusCode: 401, body: JSON.stringify({ error: "Unauthenticated" }) };
    }
    
    const sessionToken = authorizationHeader.replace('Bearer ', '');
    const claims = await verifyToken(sessionToken, { secretKey: process.env.CLERK_SECRET_KEY });
    const userId = claims.sub;
    console.log(`Authenticated user ID: ${userId}`);

    if (!userId) {
      console.log("Clerk verification failed, no user ID.");
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Unauthenticated" }),
      };
    }

    // Keys now follow pattern: <userId>/<projectId>/project.json
    const prefix = `${userId}/`;
    console.log(`Listing objects with bucket: '${bucketName}' and prefix: '${prefix}'`);
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix,
      // Delimiter intentionally omitted to ensure full recursive listing
    });
    console.log("ListObjectsV2Command input:", command.input);
    
    let response;
    try {
      response = await s3Client.send(command);
    } catch (error) {
      // For some S3-compatible services, a prefix with no objects returns NoSuchKey
      if (error.name === 'NoSuchKey') {
        console.log("S3 returned NoSuchKey for prefix, treating as empty list.");
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify([])
        };
      }
      console.error("FATAL: Error calling ListObjectsV2Command:", error);
      throw error;
    }

    // --- START EXTENSIVE DEBUG LOG ---
    console.log("Full S3 Response:", JSON.stringify(response, null, 2));
    // --- END EXTENSIVE DEBUG LOG ---

    // Collect project.json keys directly from the Contents array
    let projectKeys = [];

    if (response.Contents && response.Contents.length > 0) {
      projectKeys = response.Contents
        .map(obj => obj.Key)
        .filter(key => key.endsWith('project.json'));

      console.log(`Parsed ${projectKeys.length} project.json keys from Contents.`);
    }

    // No CommonPrefixes handling required when Delimiter is omitted.

    if (projectKeys.length === 0) {
      console.log("No project.json files found under user prefix. Returning empty array.");
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([]),
      };
    }

    console.log(`Found ${projectKeys.length} project.json files:`, projectKeys);

    const projectPromises = projectKeys.map(async (key) => {
      try {
        const getCommand = new GetObjectCommand({ Bucket: bucketName, Key: key });
        console.log(`Downloading project file from key: ${key}`);
        const { Body } = await s3Client.send(getCommand);
        const projectDataString = await streamToString(Body);
        const project = JSON.parse(projectDataString);

        // Extract projectId from key (pattern: <userId>/<projectId>/project.json)
        const parts = key.split('/').filter(Boolean);
        let projectIdFromKey = null;
        if (parts.length >= 2) {
          projectIdFromKey = parts[1];
        }
        if (projectIdFromKey) {
          project.id = projectIdFromKey;
          project.metadata = {
            ...(project.metadata || {}),
            id: projectIdFromKey,
            modified: project.metadata?.modified || new Date().toISOString(),
            name: project.metadata?.name || project.name || 'Untitled Project',
          };
        }
        return project;
      } catch (error) {
        console.error(`Failed to read or parse project key ${key}:`, error);
        return null;
      }
    });

    const projects = (await Promise.all(projectPromises)).filter(Boolean);
    console.log(`Successfully processed ${projects.length} projects.`);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(projects),
    };
  } catch (error) {
    console.error("--- UNHANDLED ERROR in projects-list handler ---:", error);
    if (error.message && (error.message.includes('Unexpected JWT payload') || error.message.includes('Token is expired') || error.message.includes('invalid_token'))) {
        return { statusCode: 401, body: JSON.stringify({ error: "Invalid or expired token" }) };
    }
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Could not list projects due to an internal server error." }),
    };
  }
}; 