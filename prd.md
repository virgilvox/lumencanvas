Below is the **single, canonical PRD (v1.4)** for the **Vue 3 / Netlify** edition of **LumenCanvas** — now updated to use **Clerk** for authentication and **Netlify Blobs + KV** for storage.
Copy-paste this straight into `/docs/PRD_LumenCanvas.md`, Notion, Cursor, or anywhere you keep specs.

---

````markdown
# 🖼️ LumenCanvas v1.4 — Projection Mapping, Reimagined in the Browser  
**Warp · Drop · Glow** — *(Vue 3 + vanilla JS, Netlify-ready, Clerk-powered cloud sync)*  
_Last updated: 22 Jun 2025_

---

## 0 · One-Sentence Pitch  
A **zero-install**, browser-native projection-mapping studio with drag-warp simplicity, live GLSL/HTML coding, portable ZIP exports, and Clerk-backed login for seamless multi-device sync.

---

## 1 · Core Value Propositions

| 💡 | Why It Matters |
|----|----------------|
| **Warp · Drop · Glow** | Fastest projection workflow on the market |
| **Runs Anywhere** | No installers — `file://`, localhost, or Netlify |
| **Offline-First** | IndexedDB autosave; works fully offline |
| **Cloud-Optional** | Login adds project & asset sync |
| **Code-Enabled Layers** | Click a shader layer → instant Monaco |
| **AI Masking** | ONNX segmenter in-browser for quick surface isolation |
| **Plugin-Extendable** | One JS file = new generator or input |

---

## 2 · Personas

| Persona              | Pain Today                         | LumenCanvas Fixes It With… |
|----------------------|------------------------------------|----------------------------|
| VJ / AV Artist       | Heavy desktop apps                 | Local-first PWA + CRDT sync |
| Installation Artist  | Tedious backups                    | Cloud+ZIP export fallback  |
| Educator             | Locked-down lab machines           | Runs from USB or Netlify   |
| Tinkerer / Dev       | Closed toolchains                  | Plugin runtime + live IDE  |

---

## 3 · Primary User Flow (“Happy Path”)

1. **Open** `/edit`   → guest session starts.  
2. *(Optional)* Click **Sign Up** → Clerk signup modal (email, passkey, social).  
3. **Warp** quad handles to fit the target surface.  
4. **Drop** media (PNG / MP4 / URL).  
5. **Mask** via webcam AI (optional).  
6. **Code** a shader → Monaco auto-opens.  
7. Hit **E** to hide handles, **P** to pop full-screen projector tab.  
8. **Save** — guest = IndexedDB, logged-in = IndexedDB + KV + Blobs.  
9. **Resume** anywhere; projects & assets rehydrate after Clerk login.

---

## 4 · Technical Stack (All JS, no TS)

| Concern        | Library / Service (latest)                                     |
|----------------|----------------------------------------------------------------|
| Framework      | Vue 3 + `<script setup>` / Vite 5                              |
| Render Canvas  | Pixi.js 8 via `vue3-pixi`                                       |
| State / CRDT   | Pinia + Yjs (`y-broadcast-channel` offline, `y-websocket` prod) |
| Shader IDE     | Monaco Editor (via `@monaco-editor/vue`)                       |
| Auth           | **Clerk** — `@clerk/vue` (front-end) + `@clerk/backend` (functions) :contentReference[oaicite:0]{index=0} |
| Storage        | **Netlify Blobs** (assets) + **Netlify KV** (project JSON) :contentReference[oaicite:1]{index=1} |
| AI Masking     | `onnxruntime-web`                                               |
| PWA            | `vite-plugin-pwa`                                              |
| Icons          | `lucide-vue`                                                   |

---

## 5 · Functional Requirements

### 🧍 Offline / Guest

| ID  | Feature                                   |
|-----|-------------------------------------------|
| F-1 | Warp quads with snap (`Shift`)            |
| F-2 | Media layers: image, video, URL, HTML, GLSL |
| F-3 | `E` toggles handles globally              |
| F-4 | Shader layers auto-open Monaco            |
| F-5 | `/projector/:id` CRDT-synced pop-out      |
| F-6 | Webcam AI masking                         |
| F-7 | IndexedDB save, ZIP export/import         |

### ☁️ Cloud Features (Clerk + Netlify Blobs/KV)

| ID  | Feature                        | Implementation Sketch |
|-----|--------------------------------|-----------------------|
| C-1 | **Auth / Signup / Login**      | Clerk Components `<SignUp/>`, `<SignIn/>`, session cookie |
| C-2 | **Projects API**               | Netlify Function CRUD on KV (auth = Clerk JWT) |
| C-3 | **Asset Upload API**           | Signed PUT → Blobs, returns public URL |
| C-4 | **Sync on Login**              | Pinia store rehydration after `onAuthChange` |
| C-5 | **Share URL**                  | JWT-signed `/projector/:id?token=` (24 h) |

---

## 6 · **API Specification**

All endpoints live in `netlify/functions/`, use Node 20, and **MUST** verify the Clerk JWT.

### 6.1 Auth Context (every function)

```js
import { getAuth } from "@clerk/backend";

export const handler = async (event) => {
  const { userId } = getAuth(event);
  if (!userId) return { statusCode: 401, body: "Unauthenticated" };
  // ...
};
````

### 6.2 Endpoint List

| Path                | Method     | Body / Params      | Purpose                                                        |
| ------------------- | ---------- | ------------------ | -------------------------------------------------------------- |
| `/api/projects`     | **GET**    | –                  | List current user’s projects (KV keys prefixed with `userId:`) |
| `/api/projects`     | **POST**   | `{name}`           | Create project ⇒ returns `{id}`                                |
| `/api/projects/:id` | **GET**    | –                  | Fetch single project JSON                                      |
| `/api/projects/:id` | **PUT**    | `ProjectSchema`    | Upsert project                                                 |
| `/api/projects/:id` | **DELETE** | –                  | Delete project & related Blobs                                 |
| `/api/upload-url`   | **POST**   | `{fileName, mime}` | Return signed PUT URL + Blob key                               |
| `/api/assets/:key`  | **GET**    | –                  | Proxy asset (optional auth)                                    |

> **ProjectSchema** (KV value)

```json
{
  "id": "proj_f38e2",
  "owner": "user_abc123",
  "name": "My Mapping",
  "updated": "2025-06-22T22:18:00Z",
  "scenes": [...],
  "assets": {
    "asset_xyz": {
      "name": "loop.mp4",
      "type": "video",
      "blobKey": "user_abc123/proj_f38e2/loop.mp4",
      "url": "https://blobs.netlifyusercontent.com/.../loop.mp4"
    }
  }
}
```

### 6.3 Rate Limits & Consistency

* Soft limit: 300 requests/user/min via Netlify Function settings.
* KV writes = eventual consistency (`last-write-wins`).
* Blobs: allow overwrite only when project owner.

---

## 7 · File & Folder Structure

```
src/
  main.js
  router/
    index.js        # /edit, /sign-in, /sign-up, /projector/:id
  stores/           # Pinia (user, project, assets)
  composables/      # useAuth.js, useProjectSync.js, useMask.js
  components/
    TopBar.vue
    Sidebar/
      Layers.vue  Scenes.vue  Assets.vue
    CanvasStage.vue
    ShaderPanel.vue
    auth/          # Clerk components wrappers
  plugins/         # User JS plugins (drop-in)
netlify/
  functions/
    projects.js
    upload-url.js
    yjs-socket.js
.env               # CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY
netlify.toml
```

---

## 8 · Netlify Configuration

### `netlify.toml`

```toml
[build]
  command   = "npm run build && npm run build:functions"
  publish   = "dist"
  functions = "netlify/functions"

[dev]
  command = "vite"

[[redirects]]
  from = "/*"
  to   = "/index.html"
  status = 200
```

> **Local Dev**
> `CLERK_PUBLISHABLE_KEY` & `CLERK_SECRET_KEY` must be set in `.env` and Netlify UI.

---

## 9 · Keyboard Shortcuts

| Key          | Action              |
| ------------ | ------------------- |
| `E`          | Toggle warp handles |
| `P`          | Open projector tab  |
| `M`          | Mask via webcam     |
| `F2`         | New shader layer    |
| `⌘/Ctrl + E` | Open code editor    |

---

## 10 · Developer Quick-Start

```bash
# 1 · Scaffold
npm create vite@latest lumencanvas -- --template vue
cd lumencanvas

# 2 · Install deps
npm i vue-router pinia pixi.js vue3-pixi \
      @monaco-editor/vue yjs y-broadcast-channel y-websocket \
      onnxruntime-web @clerk/vue @clerk/backend \
      @netlify/blobs @netlify/kv lucide-vue vite-plugin-pwa browser-fs-access

# 3 · Run
vite              # offline
netlify dev       # with Clerk + functions
netlify deploy --prod
```

---

## 11 · UI / Style Guide (matches screenshot)

| Region           | Spec                                                                                                                 |
| ---------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Top Bar**      | 48 px, flat black `#0b0b0c`; segmented buttons → Scene ▾ · +Layer · Mask · Shader (F2) · Preview (P)                 |
| **Sidebar**      | 280 px fixed; sections — Layers (blue selected), Scenes, Assets (file icon + name + size)                            |
| **Canvas**       | fills remaining space; Pixi surface; quad outline =`1.5px dashed --accent #12B0FF`; 8 px square handles              |
| **Shader Panel** | modal (`max-w 480px`) with blur backdrop; Monaco dark+; close icon top-right                                         |
| **Palette**      | `--bg #0b0b0c`, `--sidebar-bg #111213`, `--canvas-bg #000`, `--panel-bg #1e1e1e`, `--accent #12B0FF`, text `#E0E0E0` |
| **Fonts**        | Inter 14 px UI, Fira Code 13 px editor                                                                               |

Animations: panel `opacity 0.2s ease` + `scale(0.95→1)`, handle hover `scale(1.1)`, drop-file glow.

---

## 12 · Roadmap

| Phase               | Features                                    |
| ------------------- | ------------------------------------------- |
| **Beta (Sep 2025)** | Warp, drop, shader, mask, Clerk auth, Blobs |
| **1.0 (Dec 2025)**  | Timeline editor, edge-blend, MIDI/OSC       |
| **1.x (2026+)**     | Remote sync, 3D calibration, shader store   |

---

## 13 · Final Pitch

**LumenCanvas** turns any browser into a light-sculpting studio.
From VJs in underground clubs to teachers in locked-down labs, you can **warp, drop, and glow** in minutes, sync across devices with Clerk, and keep working offline.

> *Speak to space with photons. Let the canvas glow.*

---

```

**Key changes vs v1.3**

* 🔑 **Switched auth to Clerk** (`@clerk/vue` front-end, `@clerk/backend` in functions) :contentReference[oaicite:2]{index=2}  
* 📦 Assets now stored in **Netlify Blobs**, project JSON in **Netlify KV** :contentReference[oaicite:3]{index=3}  
* 🆕 Full API spec (signup handled by Clerk, CRUD, signed upload, share links).  
* 🗄️ Environment & file tree updated, no deprecated packages.  

Copy, commit, and ship. 🖤
::contentReference[oaicite:4]{index=4}
```
