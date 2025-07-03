import { verifyToken } from "@clerk/backend";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, bucketName } from "./utils/s3-client.js";
import { corsHeaders } from "./utils/cors.js";

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
    if (!projectId) {
        return {
            statusCode: 400,
            headers: { ...corsHeaders },
            body: JSON.stringify({ error: 'Project ID is required.'})
        };
    }

    const key = `${userId}/${projectId}/project.json`;

    let Body;
    try {
      const command = new GetObjectCommand({ Bucket: bucketName, Key: key });
      ({ Body } = await s3Client.send(command));
    } catch (err) {
      if (err.name === 'NoSuchKey') {
        return {
          statusCode: 404,
          headers: { ...corsHeaders },
          body: JSON.stringify({ error: 'Project not found.' }),
        };
      }
      throw err;
    }

    const projectDataString = await streamToString(Body);
    
    return {
      statusCode: 200,
      body: projectDataString,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    };
  } catch (error) {
    if (error.name === 'NoSuchKey') {
      return {
        statusCode: 404,
        headers: { ...corsHeaders },
        body: JSON.stringify({ error: 'Project not found.'})
      }
    }
    console.error("Error reading project:", error);
    if (error.message && (error.message.includes('Unexpected JWT payload') || error.message.includes('Token is expired') || error.message.includes('invalid_token'))) {
        return { statusCode: 401, headers: { ...corsHeaders }, body: JSON.stringify({ error: "Invalid or expired token" }) };
    }
    return {
      statusCode: 500,
      headers: { ...corsHeaders },
      body: JSON.stringify({ error: "Could not read project." }),
    };
  }
}; 