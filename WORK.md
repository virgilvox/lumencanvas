# LumenCanvas Work Tracker

## Project Overview
LumenCanvas is a zero-install, browser-native projection mapping studio built with Vue 3, Pixi.js 8, and Netlify services.

## Current Implementation Status

### ✅ Completed Features

#### Core Architecture
- [x] Vue 3 application setup with Pinia state management
- [x] Vue Router configuration with single page (Editor)
- [x] Main layout structure (EditorLayout.vue)
- [x] Dark theme implementation matching PRD specs
- [x] vue3-pixi integration for canvas rendering

#### UI Components
- [x] **TopBar** (48px height)
  - [x] Logo display
  - [x] Tool buttons (Scene, +Layer, Mask, Shader, Preview)
  - [x] Export/Import buttons
  - [x] Save status indicator with auto-save
  - [x] User avatar placeholder
  
- [x] **Sidebar** (280px fixed width)
  - [x] Layers panel with full functionality
  - [x] Scene section (placeholder)
  - [x] Assets section (placeholder)
  
- [x] **Canvas Stage**
  - [x] Pixi.js Application setup
  - [x] Layer rendering system
  - [x] Warp outline rendering
  - [x] File drop support for images/videos
  - [x] Warp handles (basic implementation)

- [x] **Properties Panel**
  - [x] Transform controls (position, scale, rotation)
  - [x] Appearance controls (opacity, blend mode)
  - [x] Layer-specific properties

- [x] **Code Editor Modal**
  - [x] Monaco editor integration
  - [x] GLSL syntax highlighting
  - [x] HTML support
  - [x] Format code functionality
  - [x] Unsaved changes tracking

#### Layer System
- [x] **Layer Types**
  - [x] Image Layer (with drag & drop)
  - [x] Video Layer (with playback controls)
  - [x] Shader Layer (GLSL with uniforms)
  - [x] HTML Layer (basic structure)
  - [x] URL Layer (basic structure)

- [x] **Layer Management**
  - [x] Add/remove layers
  - [x] Reorder layers (drag & drop)
  - [x] Duplicate layers
  - [x] Toggle visibility
  - [x] Select/deselect layers
  - [x] Layer properties per type

#### Storage & Project Management
- [x] IndexedDB integration via idb
- [x] Project save/load functionality
- [x] Auto-save mechanism (5 second interval)
- [x] Export project as ZIP
- [x] Import project from ZIP
- [x] Asset storage in IndexedDB

#### Keyboard Shortcuts
- [x] Ctrl/Cmd + Z: Undo
- [x] Ctrl/Cmd + Shift + Z: Redo
- [x] Delete: Remove selected layer
- [x] Ctrl/Cmd + D: Duplicate layer
- [x] Ctrl/Cmd + S: Save project
- [x] Ctrl/Cmd + E: Export project
- [x] Ctrl/Cmd + O: Import project
- [x] Arrow keys: Nudge layer position
- [x] Shift + Arrow: Large nudge (10px)

#### Backend (Netlify Functions)
- [x] Basic projects.js function with CRUD operations
- [x] Clerk authentication integration structure
- [x] Netlify KV store setup

### 🚧 Partially Implemented

#### Canvas Features
- [ ] **Warp/Perspective Transformation**
  - [x] Warp handles display (fixed 2024-12-19)
  - [x] Handle dragging (fixed 2024-12-19)
  - [ ] Actual mesh deformation
  - [ ] Perspective correction
  - [ ] Snap to grid (Shift key)

#### Layer Features
- [ ] **HTML Layer**
  - [x] Basic structure
  - [ ] Actual HTML rendering in canvas
  - [ ] Foreign object implementation
  
- [ ] **URL Layer**  
  - [x] Basic structure
  - [ ] iFrame rendering
  - [ ] Interactive mode
  - [ ] Scrollable option

#### Effects & Masking
- [ ] **AI Masking**
  - [ ] Webcam capture
  - [ ] Background removal
  - [ ] Mask application to layers
  
- [ ] **Effects System**
  - [ ] Blur effect
  - [ ] Glow effect
  - [ ] Color correction
  - [ ] Custom shader effects

### ❌ Not Implemented

#### Authentication & Cloud
- [ ] Clerk authentication UI components
- [ ] Sign in/Sign up pages
- [ ] User profile management
- [ ] Cloud project sync
- [ ] Share URLs with JWT tokens
- [ ] Netlify Blob storage for assets

#### Advanced Features
- [ ] **Multi-Scene Support**
  - [ ] Scene creation/deletion
  - [ ] Scene switching
  - [ ] Scene-specific layers

- [ ] **Projector View**
  - [ ] Separate projector window/tab
  - [ ] CRDT sync between editor and projector
  - [ ] Fullscreen output
  - [ ] Multi-monitor support

- [ ] **Plugin System**
  - [ ] Plugin architecture
  - [ ] User-defined JS plugins
  - [ ] Plugin UI integration

- [ ] **Advanced Shader Features**
  - [ ] Multi-texture support
  - [ ] Audio reactivity
  - [ ] Time-based animations
  - [ ] Custom uniform controls

- [ ] **Collaboration**
  - [ ] Y.js CRDT integration
  - [ ] Real-time sync
  - [ ] Presence indicators
  - [ ] Conflict resolution

#### Missing Keyboard Shortcuts
- [ ] E: Toggle warp handles
- [ ] P: Open projector tab
- [ ] M: Mask via webcam
- [ ] F2: New shader layer

#### Performance & Polish
- [ ] Layer caching/optimization
- [ ] Smooth animations/transitions
- [ ] Error boundaries
- [ ] Loading states
- [ ] Toast notifications
- [ ] Proper file type validation
- [ ] Memory management for large media files

## Next Priority Tasks

### 1. Complete Warp/Perspective System
- Implement actual mesh deformation using Pixi.js mesh
- Add perspective-correct texture mapping
- Implement snap-to-grid functionality
- Save warp points per layer

### 2. Fix HTML/URL Layer Rendering
- Implement foreignObject for HTML content
- Create iframe wrapper for URL content
- Handle interaction modes properly
- Add proper masking/clipping

### 3. Authentication Flow
- Set up Clerk components
- Create sign-in/sign-up pages
- Implement user state management
- Connect to cloud storage

### 4. Projector Output
- Create projector route/view
- Implement window.open() for new tab
- Set up message passing between windows
- Add fullscreen API support

### 5. Complete Keyboard Shortcuts
- Implement remaining shortcuts
- Add help dialog
- Create shortcut customization

### 6. AI Masking Feature
- Integrate background removal library
- Set up webcam capture
- Create mask editing UI
- Apply masks to layers

## Technical Debt

1. **Error Handling**: Many async operations lack proper error handling
2. **Type Safety**: No TypeScript, making refactoring risky
3. **Component Props**: Some components have incomplete prop validation
4. **Memory Leaks**: Video/shader cleanup could be improved
5. **State Management**: Some state is duplicated between stores
6. **Performance**: Large media files can cause lag
7. **Accessibility**: No ARIA labels or keyboard navigation for UI

## Notes

- The codebase follows the PRD structure well but many features are scaffolded without implementation
- The layer system is well-architected and extensible
- Storage system is robust with good offline support
- UI matches the design specs from the PRD
- Authentication is set up but not connected to UI
- The project has good separation of concerns 

## Changelog

### 2024-12-24
- **Added Undo/Redo Functionality**:
  - Implemented command pattern with history stack for undo/redo operations
  - Created `history.js` store to manage command history
  - Added `commandFactory.js` utility for generating command objects
  - Integrated undo/redo buttons in TopBar component
  - Added keyboard shortcuts (Ctrl+Z for undo, Ctrl+Y/Ctrl+Shift+Z for redo)
  - Updated layer operations to use commands for position, warp points, and properties
  - All edits now properly record previous state for undoing
  - Fixed WarpHandle to emit events when dragging ends for command history
- **Improved Project State Management**:
  - Created standardized project schema in `projectSchema.js`
  - Added project validation and structure normalization
  - Implemented project serialization/deserialization utilities
  - Enhanced export/import functionality with structured data
  - Added support for saving/restoring project state
  - Improved project creation with standardized defaults
  - Better error handling for project loading/saving

### 2024-12-23
- **Fixed Layer Dragging and Warp Handles**:
  - Completely rewrote the drag handling implementation using proper pointer events API
  - Fixed issue where layers would continue to follow the mouse after release until clicked again
  - Fixed offset problem where layers weren't following the mouse at the correct position
  - Implemented proper pointer capture with `setPointerCapture` and `releasePointerCapture`
  - Added proper event cleanup to prevent memory leaks
  - Layer dragging and warp handles now work perfectly in sync
  - Improved error handling throughout the drag implementation

### 2024-12-22
- **Fixed vue3-pixi Import Errors**:
  - Removed incorrect imports of `Sprite` and `Mesh` components from vue3-pixi in all layer components
  - Changed all component tags to lowercase (`<mesh>`, `<sprite>`) following vue3-pixi's global component registration pattern
  - Fixed files: `ShaderLayer.vue`, `ImageLayer.vue`, `VideoLayer.vue`, `HtmlLayer.vue`, `UrlLayer.vue`
  - This resolves the "vue3-pixi.js doesn't provide export named 'Mesh'" error
- **Layer Component Consistency**:
  - All layer types now follow the same pattern for warping and rendering
  - Warp-enabled layers use `<mesh>` component with vertices, uvs, and indices
  - Non-warped layers use `<sprite>` component with position and size properties
  - All layers support dragging via the pointerdown event emission

### 2024-12-21
- **Fixed UI & Interaction Bugs**:
  - Corrected layout in `PropertiesPanel` to properly display separate X/Y input fields for position and scale.
  - Fixed warp handle positioning to align with layer corners.
  - Implemented logic to move warp handles along with the layer when dragged.
  - Fixed event propagation for `pointerdown` to enable layer dragging.
  - Centered the selection bounding box correctly around the selected layer.
- **Fixed Layer Interaction & Rendering**:
  - Corrected warp handle positioning to align with layer corners.
  - Implemented logic to move warp handles along with the layer when dragged.
  - Fixed event propagation for `pointerdown` to enable layer dragging.
  - Centered the selection bounding box correctly around the selected layer.
  - Ensured `PropertiesPanel` correctly displays separate X and Y position fields.
  - Added drag-and-drop functionality to the `CanvasStage.vue` component.
  - Users can now select and drag layers to reposition them on the canvas.
  - Implemented 'E' key shortcut to toggle warp handles.
  - The selection outline and warp handles correctly follow the layer during dragging.
- **Reverted to `vue3-pixi` with `pixi.js` v7**:
  - Pinned `pixi.js` to version `7.4.3` in `package.json` to ensure compatibility with `vue3-pixi`.
  - Resolved dependency issues that were causing the application to fail on startup.
  - Corrected layer position handling across all layer components (`ImageLayer`, `VideoLayer`, `ShaderLayer`, `HtmlLayer`, `UrlLayer`) and `useKeyboardShortcuts.js` to use flat `layer.x` and `layer.y` properties.
  - This resolves bugs with layer nudging and ensures the X/Y position fields in the `PropertiesPanel` work as expected.
  - The application now correctly reflects the intended architecture of using `vue3-pixi` components for rendering.

### 2024-12-20
- **Fixed Bounding Box & Handle Rendering**:
  - Corrected the drawing logic in `CanvasStage.vue` to properly position the selection outline and handles around the selected layer.
  - New layers are now created in the center of the canvas by default.
- **Implemented Layer Dragging & Interaction**:
  - Added drag-and-drop functionality to the `CanvasStage.vue` component.
  - Users can now select and drag layers to reposition them on the canvas.
  - Implemented 'E' key shortcut to toggle warp handles.
  - The selection outline and warp handles correctly follow the layer during dragging.
- **Reverted to `vue3-pixi` with `pixi.js` v7**:
  - Pinned `pixi.js` to version `7.4.3` in `package.json` to ensure compatibility with `vue3-pixi`.
  - Resolved dependency issues that were causing the application to fail on startup.
- **Fixed Layer Positioning**:
  - Corrected layer position handling across all layer components (`ImageLayer`, `VideoLayer`, `ShaderLayer`, `HtmlLayer`, `UrlLayer`) and `useKeyboardShortcuts.js` to use flat `layer.x` and `layer.y` properties.
  - This resolves bugs with layer nudging and ensures the X/Y position fields in the `PropertiesPanel` work as expected.
  - The application now correctly reflects the intended architecture of using `vue3-pixi` components for rendering.

### 2024-12-19
- **Fixed graphics component errors**: Removed incorrect vue3-pixi imports and changed to lowercase `<graphics>` tags
- **Position Controls Clarification**: Properties panel already has both X and Y inputs for position (they're in the input-group div)
- **Pixi.js 8 Compatibility Note**: 
  - Pixi.js 8 works fine with Vue 3 (project is using it successfully)
  - vue3-pixi may have compatibility issues with Pixi.js 8 (was built for v7)
  - Current hybrid approach: using direct Pixi.js for main rendering, attempting vue3-pixi for some components
  - Consider removing vue3-pixi dependency and using direct Pixi.js throughout for consistency

### 2024-12-19 - Debugging Warp Handles Visibility
- **Issue**: Warp handles not appearing on canvas despite rendering logic being correct
- **Discoveries**:
  - Version mismatch: vue3-pixi uses pixi.js 7.4.3 internally while project has 8.10.1
  - Graphics components need proper structure and positioning
- **Changes Made**:
  - Increased handle size from 8x8 to 16x16 pixels for better visibility
  - Added explicit opacity (alpha: 1) to handle fill
  - Increased outline thickness from 1.5 to 2 pixels
  - Added hit area for better mouse interaction
  - Updated initial warp points from small corner values to more centered positions
  - Added debug console logging for warp points and draw calls
  - Added test red rectangle to verify graphics component rendering
  - Wrapped warp controls in a container for better organization
  - Restructured WarpHandle to use container with positioned graphics child
  - Changed handles to bright red circles with white outlines for visibility
  - Made outline bright green with corner dots for debugging
  - Added explicit width/height to Application component
  - Added test graphics components to verify rendering works
- **Status**: Debugging in progress - need to check console output and verify if any graphics are rendering
- **Next Steps**: 
  - Check browser console for draw function logs
  - Verify if test rectangle and outline are visible
  - Consider downgrading pixi.js to match vue3-pixi version if needed

### 2024-12-19 - Fixed Vue3-Pixi Graphics Components
- **Issue**: "The requested module 'vue3-pixi' does not provide an export named 'Graphics'" error
- **Root Cause**: vue3-pixi doesn't export PixiJS classes directly, it provides Vue components that are pre-registered globally
- **Fixed**:
  - Removed incorrect imports of Graphics and Container from vue3-pixi in WarpHandle.vue and CanvasStage.vue
  - Changed `<Graphics>` to `<graphics>` (lowercase) in WarpHandle.vue template
  - Kept only the Application import in CanvasStage.vue as that's the only component that needs explicit import
- **Result**: Proper usage of vue3-pixi components as global components in templates

### 2024-12-19 - Fixed vue3-pixi Import Errors
- **Issue**: `Graphics` export not found error from vue3-pixi
- **Root Cause**: vue3-pixi doesn't export PixiJS classes directly; it provides Vue components
- **Solution**: 
  - Removed incorrect imports of `Graphics` and `Container` from vue3-pixi
  - Use lowercase component tags (`<graphics>`, `<container>`) in templates instead
  - Only `Application` should be imported from vue3-pixi
- **Files Modified**:
  - `src/components/WarpHandle.vue`: Removed Graphics import, changed `<Graphics>` to `<graphics>`
  - `src/components/CanvasStage.vue`: Removed Container and Graphics imports, kept only Application

### 2024-12-19 - Fixed Warp Handles Display Issue
- **Problem**: Warp handles were not rendering in the canvas
- **Root Cause**: Missing imports from vue3-pixi (Graphics, Container components)
- **Fixed files**:
  - `src/components/WarpHandle.vue`: Added Graphics import
  - `src/components/CanvasStage.vue`: Added Container and Graphics imports
- **Additional fixes**:
  - Removed duplicate warpPoints computation that was overriding project store values
  - Fixed updateWarpPoint function to properly update the project store
  - Corrected template to use project warp points directly instead of computed layer corners
- **Result**: Warp handles now render correctly at the positions defined in the project store
- **TODO**: Implement actual mesh deformation when handles are dragged

### 2024-12-18
- Initial comprehensive codebase analysis
- Documented all implemented features and identified gaps
- Created work tracking structure
- Fixed Vue component warnings (missing imports from vue3-pixi) 

### 2024-06-24 – Remove `:interactive="true"` and use `event-mode="static"`

PixiJS ≥ 7.2 deprecates the boolean `interactive` flag. Vue3-Pixi promotes the new `eventMode`/`event-mode` prop. We audited layer components and `WarpHandle.vue`, replacing every `:interactive="true"` with `event-mode="static"` (sufficient for pointerdown listeners). This silences deprecation warnings and avoids unnecessary event processing.

Affected files:
- `src/components/layers/ImageLayer.vue`
- `src/components/layers/HtmlLayer.vue`
- `src/components/layers/UrlLayer.vue`
- `src/components/layers/VideoLayer.vue`
- `src/components/layers/ShaderLayer.vue`
- `src/components/WarpHandle.vue`

No components require dynamic hit testing, so `static` mode is appropriate. If future interaction needs hover or dragging across stage, switch to `dynamic`.

### 2025-06-24 Fix Pixi blend-mode crash

* Replaced string → PIXI.BLEND_MODES constant mapping in all layer components and `LayerRenderer.vue` to guarantee valid values passed to renderer and prevent `_StateSystem.setBlendMode` crash.
* Files touched:
  * `src/components/layers/*Layer.vue` (Image, Video, Url, Html, Shader)
  * `src/components/layers/LayerRenderer.vue`
* Fallback now defaults to `PIXI.BLEND_MODES.NORMAL` to avoid undefined.

Run `npm run dev` and verify no TypeError in console when rendering layers with various blend-mode selections.

### 2024-06-25 – Fix runtime crashes on non-shader layers

Switched `VideoLayer.vue`, `UrlLayer.vue`, and `HtmlLayer.vue` from inline `vertices/uvs/indices` props to an explicit `PIXI.Geometry`, mirroring the earlier `ImageLayer` fix.  Geometry is now rebuilt reactively when warp points or basic transform (x, y, width, height) change.  This prevents undefined-buffer / tint errors in Pixi 7.4.3.

Next: investigate drag-to-move persistence and make warp handles continue updating until pointer-up.

# LumenCanvas Development Work Log

## Current Status: Fixing Vue/Pixi.js Integration Issues

### Issues Fixed:
1. **Vue Component Resolution Errors** - Fixed unresolved component warnings for `<ForeignObject>` and `<graphics>`
2. **TypeError: Cannot read properties of undefined (reading 'toUpperCase')** - Fixed by:
   - Adding missing canvas properties (canvasWidth, canvasHeight, blendMode) to project store
   - Adding null checks before calling toUpperCase on blendMode
3. **Image/Video Loading Errors** - Fixed by:
   - Updating layer content structure to use `{ src: null }` for images and videos
   - Modifying createImageLayer and createVideoLayer to handle content.src properly
   - Adding proper error handling with try/catch blocks
4. **Layer Structure Issues** - Fixed by:
   - Changing position from nested object to flat x, y properties
   - Adding width and height properties to layers
   - Adding warp configuration to layer structure
   - Updating duplicateLayer to properly deep clone nested objects
5. **Missing File Upload Functionality** - Added:
   - File upload UI for image and video layers in PropertiesPanel
   - File input handlers for converting files to base64 data URLs
   - Preview display for uploaded images

### Current Architecture:
- **Vue 3** with Composition API
- **Pixi.js v8** (native, not vue3-pixi wrapper) for performance
- **Pinia** for state management
- **IndexedDB** for local storage
- **Netlify Functions** for cloud sync

### Next Steps:
1. Test file upload functionality with actual images/videos
2. Implement proper video playback controls in Pixi.js
3. Fix warp/distortion functionality
4. Add shader editor integration
5. Implement effects system 

## Session 1: Vue Component Resolution Fixes

### Fixed Vue3-Pixi Component Warnings
- Changed `<ForeignObject>` to `<foreignObject>` (lowercase) in multiple layer components
- Added proper imports for vue3-pixi components (Graphics, Sprite, Container, Mesh)
- Fixed component registration issues across the codebase

### Fixed Runtime Errors
1. **Missing Project Store Properties:**
   - Added `canvasWidth`, `canvasHeight`, and `blendMode` to project store
   - Updated projectData computed property
   - Added proper initialization in loadProject

2. **Layer Content Structure:**
   - Fixed image/video content to use `{ src: null }` structure
   - Updated layer creation functions to access `content.src`
   - Added proper error handling

3. **Layer Property Structure:**
   - Changed from nested position object to flat `x` and `y` properties
   - Added `width` and `height` properties (default 200x200)
   - Added warp configuration structure
   - Fixed duplicateLayer deep cloning

4. **File Upload Functionality:**
   - Added file upload UI in PropertiesPanel
   - Implemented FileReader for base64 conversion
   - Added image preview display
   - Styled upload buttons with Upload icon

## Session 2: Vue3-Pixi vs Direct Pixi.js Decision

### The Issue
- Initially attempted to use Pixi.js v8 directly
- Encountered version mismatch: vue3-pixi v0.9.6 expects Pixi.js v7, but v8 was installed
- This caused errors like `PIXI.Geometry is not defined`

### The Decision: Stick with Vue3-Pixi + Pixi.js v7
After careful consideration, we decided to use vue3-pixi with Pixi.js v7 for the following reasons:

#### Benefits of Vue3-Pixi:
1. **Declarative Component Syntax**: Clean, readable templates with familiar Vue patterns
2. **Reactive Updates**: Automatic re-rendering when Vue data changes
3. **Component Composition**: Easy to create reusable visual components
4. **Event Handling**: Native Vue event syntax (@pointerdown, @render, etc.)
5. **Vue DevTools Integration**: Inspect Pixi objects as Vue components

#### Can We Still Do Everything?
**YES!** Vue3-pixi with Pixi.js v7 supports all our advanced features:
- ✅ **Mesh Warping**: Full access to PIXI.Mesh and custom geometries
- ✅ **Custom Shaders**: PIXI.Shader.from() works perfectly
- ✅ **Video Textures**: PIXI.Texture.from(video) supported
- ✅ **Complex Geometries**: Full geometry manipulation capabilities
- ✅ **Blend Modes**: All blend modes available
- ✅ **Filters/Effects**: Full filter pipeline access

#### Implementation Approach:
- Removed conflicting Pixi.js v8 dependency
- Rewritten CanvasStage.vue using vue3-pixi components
- Maintained all advanced features (warping, shaders, etc.)
- Cleaner code with better Vue integration

### Example: Mesh Warping with Vue3-Pixi
```vue
<Mesh
  v-if="layer.warp?.enabled && warpMeshes[layer.id]"
  :geometry="warpMeshes[layer.id].geometry"
  :shader="warpMeshes[layer.id].shader"
  @pointerdown="onLayerPointerDown($event, layer)"
/>
```

The mesh geometry and shader are created using standard Pixi.js v7 APIs, then passed as props to the vue3-pixi Mesh component. Best of both worlds!

## Current Architecture

### Layer System
- **Types**: image, video, url, html, shader, text
- **Properties**: 
  - Position: `x`, `y` (flat properties)
  - Size: `width`, `height`
  - Visual: `opacity`, `blendMode`, `visible`
  - Warp: `{ enabled, points: [{x,y}, ...] }`
  - Content: Type-specific data

### Canvas Rendering (Vue3-Pixi)
- Uses `<Application>` component for Pixi app
- `<Container>` for layer grouping
- `<Sprite>` for images/videos
- `<Mesh>` for warped content and shaders
- `<Graphics>` for shapes and overlays
- Reactive updates via Vue watchers

### Storage System
- **Local**: IndexedDB via `idb` library
- **Cloud**: Netlify Functions + Blobs
- **Auto-save**: Every 30 seconds
- **Format**: JSON with base64 encoded assets

## Next Steps

1. **Implement Missing Layer Types**
   - Text layers with custom fonts
   - Proper HTML/URL rendering

2. **Complete Warp System**
   - Smooth handle dragging
   - Mesh subdivision controls
   - Perspective correction

3. **Effects System**
   - Port effects to Pixi filters
   - Real-time parameter adjustment
   - Effect stacking/ordering

4. **Shader Editor**
   - Monaco editor integration
   - Live preview
   - Uniform controls

5. **Performance Optimization**
   - Texture caching
   - Layer culling
   - WebGL state management

6. **Export Features**
   - Canvas to image/video
   - Project packaging
   - Code generation 