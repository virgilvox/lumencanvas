import { getAuth } from "@clerk/backend";
import { getStore } from "@netlify/kv";

export const handler = async (event) => {
  // Protect the function with Clerk authentication
  const { userId } = getAuth(event);
  if (!userId) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: "Unauthenticated" }),
    };
  }

  const projectStore = await getStore("projects");

  const { httpMethod, path } = event;
  const pathParts = path.split("/").filter(Boolean);
  const projectId = pathParts[2];


  try {
    switch (httpMethod) {
      case "GET":
        if (projectId) {
          // GET /api/projects/:id
          const project = await projectStore.get(projectId);
          if (!project || project.owner !== userId) {
            return { statusCode: 404, body: JSON.stringify({ error: "Project not found" }) };
          }
          return { statusCode: 200, body: JSON.stringify(project) };
        } else {
          // GET /api/projects
          const allKeys = await projectStore.list({ prefix: `${userId}:` });
          const projects = await Promise.all(
            allKeys.keys.map(async ({ name }) => await projectStore.get(name))
          );
          return { statusCode: 200, body: JSON.stringify(projects) };
        }
      
      case "POST":
        // POST /api/projects
        const { name } = JSON.parse(event.body);
        const newId = `proj_${Math.random().toString(36).substr(2, 9)}`;
        const newProject = {
          id: newId,
          owner: userId,
          name: name || "Untitled Project",
          updated: new Date().toISOString(),
          scenes: [],
          assets: {},
        };
        await projectStore.set(`${userId}:${newId}`, newProject);
        return { statusCode: 201, body: JSON.stringify(newProject) };

      case "PUT":
        // PUT /api/projects/:id
        if (!projectId) return { statusCode: 400, body: "Project ID required" };
        const updates = JSON.parse(event.body);
        const existing = await projectStore.get(`${userId}:${projectId}`);
        if (!existing) return { statusCode: 404, body: "Project not found" };
        
        const updatedProject = { ...existing, ...updates, id: projectId, owner: userId, updated: new Date().toISOString() };
        await projectStore.set(`${userId}:${projectId}`, updatedProject);
        return { statusCode: 200, body: JSON.stringify(updatedProject) };

      case "DELETE":
        // DELETE /api/projects/:id
         if (!projectId) return { statusCode: 400, body: "Project ID required" };
        await projectStore.delete(`${userId}:${projectId}`);
        // Note: Blob deletion would also happen here
        return { statusCode: 204 };

      default:
        return { statusCode: 405, body: "Method Not Allowed" };
    }
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
}; 