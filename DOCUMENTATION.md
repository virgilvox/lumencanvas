# LumenCanvas Documentation

This document provides a comprehensive overview of the LumenCanvas application architecture, components, state management, and services. It also includes a guide for extending the application by adding custom layer types.

## Table of Contents

1.  [High-Level Architecture](#1-high-level-architecture)
    -   [Frontend (Vue 3 + Vite)](#11-frontend-vue-3--vite)
    -   [Backend (Netlify Functions)](#12-backend-netlify-functions)
    -   [Collaboration Server (Yjs)](#13-collaboration-server-yjs)
2.  [Project Structure](#2-project-structure)
3.  [Frontend Deep Dive](#3-frontend-deep-dive)
    -   [State Management (Pinia)](#31-state-management-pinia)
    -   [Key Components](#32-key-components)
    -   [Services](#33-services)
    -   [Composables](#34-composables)
4.  [Backend Deep Dive (Netlify Functions)](#4-backend-deep-dive)
5.  [Real-Time Collaboration (Yjs)](#5-real-time-collaboration-yjs)
6.  [How to Add a Custom Layer](#6-how-to-add-a-custom-layer)
7.  [Environment Variables](#7-environment-variables)

---

## 1. High-Level Architecture

LumenCanvas is a single-page application (SPA) with a serverless backend and a separate WebSocket server for real-time collaboration.

### 1.1. Frontend (Vue 3 + Vite)

The frontend is a modern Vue 3 application built with Vite.

-   **Framework:** Vue 3 with the Composition API and `<script setup>`.
-   **Rendering:** [Pixi.js](https://pixijs.com/) is used for 2D WebGL rendering of the canvas, integrated via the `vue3-pixi` library. This allows for high-performance graphics and effects.
-   **State Management:** [Pinia](https://pinia.vuejs.org/) is used for centralized state management, with separate stores for the project, layers, and history.
-   **Routing:** [Vue Router](https://router.vuejs.org/) handles client-side routing.
-   **Authentication:** [Clerk](https://clerk.com/) is used for user authentication, providing a seamless sign-in/sign-up experience.

### 1.2. Backend (Netlify Functions)

The backend is built using serverless functions on Netlify.

-   **API:** A RESTful API is implemented for project and asset management.
-   **Storage:**
    -   **Netlify KV:** Project JSON data is stored in Netlify's Key-Value store.
    -   **Netlify Blobs:** Media assets (images, videos) are stored in Netlify's Blob store.
-   **Authentication:** All API endpoints are protected and authenticated using Clerk JWTs.

### 1.3. Collaboration Server (Yjs)

Real-time collaboration is powered by a standalone Yjs WebSocket server.

-   **Technology:** [Yjs](https://yjs.dev/) is a Conflict-free Replicated Data Type (CRDT) implementation that enables real-time collaborative editing.
-   **Server:** A standard Node.js WebSocket server using the `y-websocket` package.
-   **Deployment:** The server is containerized with Docker and can be deployed anywhere. A production instance is running at `wss://y.monolith.services`.
-   **Local Development:** The WebSocket URL is configurable via the `VITE_YJS_SERVER` environment variable, which defaults to the production server. This ensures a consistent development experience.

---

## 2. Project Structure

```
lumencanvas/
├── netlify/functions/     # Serverless functions for the API
├── public/                # Static assets
├── src/                   # Vue.js application source
│   ├── components/        # Reusable Vue components
│   │   ├── layers/        # Components for each layer type
│   ├── composables/       # Vue composables (e.g., useKeyboardShortcuts, useSync)
│   ├── layouts/           # Layout components (e.g., EditorLayout)
│   ├── pages/             # Page components for different routes
│   ├── router/            # Vue Router configuration
│   ├── schemas/           # Data schemas (e.g., projectSchema)
│   ├── services/          # API services and business logic
│   ├── store/             # Pinia stores
│   └── utils/             # Utility functions
├── vite.config.js         # Vite configuration
└── yjs-server/            # Standalone Yjs WebSocket server
```

---

## 3. Frontend Deep Dive

### 3.1. State Management (Pinia)

The application state is managed by three Pinia stores:

-   **`project.js`**: Manages the overall project state, including metadata (name, description), canvas properties (width, height, background), and assets. It also handles project saving, loading, and cloud sync.
-   **`layers.js`**: Manages the array of layers in the current project. It handles adding, removing, updating, and reordering layers. It also defines the different layer types and their default properties.
-   **`history.js`**: Manages the undo/redo history using a command pattern. Each action that modifies the project state pushes a command to the history store, which knows how to execute and undo the action.

### 3.2. Key Components

-   **`EditorPage.vue`**: The main view for the editor, which assembles the different parts of the UI.
-   **`EditorLayout.vue`**: A layout component that provides the structure for the editor page, including slots for the header, sidebar, and main content.
-   **`TopBar.vue`**: The header component, containing main actions like saving, exporting, and user authentication.
-   **`Sidebar.vue`**: The sidebar component, which contains the `LayersPanel` and `AssetsPanel`.
-   **`LayersPanel.vue`**: Manages the list of layers, allowing users to add, remove, and reorder them.
-   **`AssetsPanel.vue`**: Manages project assets, allowing users to upload and view them.
-   **`PropertiesPanel.vue`**: Displays and allows editing of the selected layer's properties.
-   **`CanvasStage.vue`**: The main canvas component where layers are rendered using Pixi.js. It handles user interactions like selecting and dragging layers.
-   **`LayerRenderer.vue`**: A dynamic component that renders the appropriate layer component based on its type.
-   **`layers/*.vue`**: A collection of components, each responsible for rendering a specific layer type (e.g., `ImageLayer.vue`, `VideoLayer.vue`).

### 3.3. Services

-   **`api.js`**: A wrapper around `fetch` for making authenticated requests to the Netlify serverless functions.
-   **`storage.js`**: A service for interacting with IndexedDB for local storage of projects and assets.
-   **`localBackup.js`**: Manages local project backups in IndexedDB.
-   **`videoManager.js`**: A utility for managing and caching video elements to improve performance.

### 3.4. Composables

-   **`useKeyboardShortcuts.js`**: A composable that sets up global keyboard shortcuts for the application.
-   **`useSync.js`**: Manages the Yjs connection and state synchronization for real-time collaboration.

---

## 4. Backend Deep Dive (Netlify Functions)

The backend API is composed of several serverless functions located in `netlify/functions/`.

-   **`projects-*.mjs`**: A set of functions for CRUD (Create, Read, Update, Delete) operations on projects, using Netlify KV for storage.
-   **`assets-*.mjs`**: A set of functions for managing assets, including generating signed upload URLs for Netlify Blobs and deleting assets.

All functions use Clerk's backend SDK to verify the JWT from the `Authorization` header, ensuring that users can only access their own data.

---

## 5. Real-Time Collaboration (Yjs)

Real-time collaboration is handled by Yjs and the `y-websocket` provider.

-   The `useSync.js` composable initializes the Yjs document and WebSocket provider for a given project ID.
-   The `yLayers` shared array and `yCanvas` shared map are used to synchronize the state of the layers and canvas properties between connected clients.
-   When a change is made locally, it's throttled and then sent to the Yjs document.
-   When a change is received from the WebSocket server, the local Pinia stores are updated to reflect the new state. This is handled in `EditorPage.vue`.
-   The WebSocket server URL is configurable via the `.env` file, defaulting to the production server `wss://y.monolith.services`.

---

## 6. How to Add a Custom Layer

Adding a new layer type involves these steps:

1.  **Define the Layer Type:**
    Add a new constant to the `LayerTypes` enum in `src/store/layers.js`.

    ```javascript
    // src/store/layers.js
    export const LayerTypes = {
      // ... existing types
      CUSTOM: 'custom',
    };
    ```

2.  **Define Default Content and Properties:**
    In `src/store/layers.js`, add cases for your new layer type in the `getDefaultContent` and `getDefaultProperties` helper functions.

    ```javascript
    // src/store/layers.js
    function getDefaultContent(type) {
      switch(type) {
        // ... existing cases
        case LayerTypes.CUSTOM:
          return { text: 'Custom Layer' };
      }
    }

    function getDefaultProperties(type) {
      switch(type) {
        // ... existing cases
        case LayerTypes.CUSTOM:
          return { color: '#ffffff' };
      }
    }
    ```

3.  **Create the Layer Component:**
    Create a new Vue component in `src/components/layers/` (e.g., `CustomLayer.vue`). This component will be responsible for rendering the layer on the Pixi.js canvas. It should accept a `layer` prop.

    ```vue
    <!-- src/components/layers/CustomLayer.vue -->
    <template>
      <text
        :text="layer.content.text"
        :style="{ fill: layer.properties.color }"
        :x="layer.x"
        :y="layer.y"
        :anchor="0.5"
      />
    </template>

    <script setup>
    import { Text } from 'vue3-pixi';

    defineProps({
      layer: { type: Object, required: true },
    });
    </script>
    ```

4.  **Register the New Component in `LayerRenderer.vue`:**
    Import your new layer component and add it to the `components` map in `src/components/layers/LayerRenderer.vue`.

    ```javascript
    // src/components/layers/LayerRenderer.vue
    import CustomLayer from './CustomLayer.vue';

    const layerComponent = computed(() => {
      const components = {
        // ... existing components
        [LayerTypes.CUSTOM]: CustomLayer,
      };
      return components[props.layer.type] || null;
    });
    ```

5.  **Update the "Add Layer" Menu:**
    In `src/components/LayersPanel.vue`, add an icon for your new layer type in the `getIcon` function.

    ```javascript
    // src/components/LayersPanel.vue
    function getIcon(type) {
      const icons = {
        // ... existing icons
        [LayerTypes.CUSTOM]: YourCustomIcon, // Import from lucide-vue-next
      };
      return icons[type] || Image;
    }
    ```

6.  **Add Properties to `PropertiesPanel.vue`:**
    If your new layer has custom properties, add controls for them in `src/components/PropertiesPanel.vue` using a `v-if` directive. Note that warping is now enabled by default for all new layers.

    ```vue
    <!-- src/components/PropertiesPanel.vue -->
    <div v-if="selectedLayer.type === 'custom'" class="property">
      <label>Text</label>
      <input type="text" v-model="selectedLayer.content.text" @change="updateContent({ text: selectedLayer.content.text })" />
    </div>
    ```

After these steps, your new custom layer type will be fully integrated into the application, including state management, rendering, and the UI.

---

## 7. Environment Variables

To run the application, you will need to configure environment variables for both local development and production.

### Local Development

For local development using `netlify dev`, create a `.env` file in the root of your project. **This file should not be committed to version control.**

```.env
# Clerk Development Keys (from your Clerk dashboard)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Yjs WebSocket Server (optional, defaults to production)
VITE_YJS_SERVER=ws://localhost:1234
```

- `VITE_CLERK_PUBLISHABLE_KEY`: Your public-facing key for the Clerk frontend. The `VITE_` prefix is required by Vite to expose the variable to the client-side code.
- `CLERK_SECRET_KEY`: Your secret key for verifying JWTs in your Netlify functions.
- `VITE_YJS_SERVER`: The URL for your local Yjs WebSocket server.

### Production

For your deployed Netlify site, you must set the environment variables in the Netlify UI:

1.  Go to your site's dashboard on Netlify.
2.  Navigate to **Site settings > Build & deploy > Environment**.
3.  Add the following variables with your **production** keys from Clerk:
    -   `VITE_CLERK_PUBLISHABLE_KEY`
    -   `CLERK_SECRET_KEY`
    -   `VITE_YJS_SERVER` (if you are running a production Yjs server, e.g., `wss://y.monolith.services`)

Netlify will automatically use these variables during the build and for your serverless functions. 