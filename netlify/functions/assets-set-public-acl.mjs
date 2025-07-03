import { verifyToken } from "@clerk/backend";
import { PutObjectAclCommand } from "@aws-sdk/client-s3";
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
      return { statusCode: 401, headers: { ...corsHeaders }, body: JSON.stringify({ error: "Unauthenticated" }) };
    }

    const { key } = JSON.parse(event.body);

    if (!key) {
      return { statusCode: 400, headers: { ...corsHeaders }, body: JSON.stringify({ error: "Missing required field: key" }) };
    }
    
    // Security check: ensure the user is modifying an object within their own folder
    if (!key.startsWith(`${userId}/`)) {
        return { statusCode: 403, headers: { ...corsHeaders }, body: JSON.stringify({ error: "Forbidden: You can only modify your own assets."}) }
    }

    const command = new PutObjectAclCommand({
      Bucket: bucketName,
      Key: key,
      ACL: 'public-read',
    });

    await s3Client.send(command);

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: "Asset permissions updated successfully." }),
    };
  } catch (error) {
    console.error("Error setting public ACL:", error);
    if (error.message && (error.message.includes('Unexpected JWT payload') || error.message.includes('Token is expired') || error.message.includes('invalid_token'))) {
        return { statusCode: 401, headers: { ...corsHeaders }, body: JSON.stringify({ error: "Invalid or expired token" }) };
    }
    return {
      statusCode: 500,
      headers: { ...corsHeaders },
      body: JSON.stringify({ error: "Could not update asset permissions." }),
    };
  }
}; 