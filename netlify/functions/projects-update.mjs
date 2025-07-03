import { verifyToken } from "@clerk/backend";
import { PutObjectCommand } from "@aws-sdk/client-s3";
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
    
    const projectData = JSON.parse(event.body);
    const projectId = projectData.id;

    if (!projectId) {
        return {
            statusCode: 400,
            headers: { ...corsHeaders },
            body: JSON.stringify({ error: 'Project ID is required in the request body.'})
        };
    }
    
    // Ensure owner and project ID cannot be changed
    if (projectData.metadata?.author && projectData.metadata.author !== userId) {
        return { statusCode: 403, headers: { ...corsHeaders }, body: JSON.stringify({ error: "Forbidden" })};
    }
    if (!projectData.metadata) {
      projectData.metadata = {};
    }
    projectData.metadata.id = projectId;
    projectData.metadata.author = userId;
    projectData.metadata.modified = new Date().toISOString();

    const key = `${userId}/${projectId}/project.json`;

    const putCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: JSON.stringify(projectData),
      ContentType: "application/json",
    });

    await s3Client.send(putCommand);

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: "Project updated successfully." }),
    };
  } catch (error) {
    console.error("Error updating project:", error);
    if (error.message && (error.message.includes('Unexpected JWT payload') || error.message.includes('Token is expired') || error.message.includes('invalid_token'))) {
        return { statusCode: 401, headers: { ...corsHeaders }, body: JSON.stringify({ error: "Invalid or expired token" }) };
    }
    return {
      statusCode: 500,
      headers: { ...corsHeaders },
      body: JSON.stringify({ error: "Could not update project." }),
    };
  }
}; 