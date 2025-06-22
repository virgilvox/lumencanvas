# 🎨 LumenCanvas — Style & UI System v2.0
_Last updated: 22 Jun 2025 — Based on PRD + Live Screenshot_

---

## 1 · UI Structure

| Region              | Size / Behavior                | Notes                                                                 |
|---------------------|--------------------------------|-----------------------------------------------------------------------|
| Top Bar             | 48px height                    | Sticky, flat black, contains logo + actions                          |
| Sidebar             | 280px fixed width              | Segmented: Layers, Scenes, Assets — scrollable                       |
| Canvas Area         | Fills remaining space          | WebGL (Pixi) surface with warping handles                            |
| Shader Editor Panel | Floats modal above canvas      | Monaco w/ dark+ theme, blur background, close button                 |

---

## 2 · Layout Details

- **Grid**: Flex-based layout with sidebar + main content.
- **Topbar buttons**: Segmented (Scene ▾, +Layer, Mask, Shader(F2), Preview(P))
- **Canvas frame**: Black background (`#000`) with projected quads; uses subtle box-shadow for focus
- **Handles**: 8px square corners, filled `--accent`, no stroke
- **Asset list**: File-type icon + label + file size

---

## 3 · Color & Theme

| Use                        | Token             | Color       |
|----------------------------|-------------------|-------------|
| Background (Body)          | `--bg`            | `#0b0b0c`   |
| Sidebar background         | `--sidebar-bg`    | `#111213`   |
| Canvas background          | `--canvas-bg`     | `#000000`   |
| Panel / Editor             | `--panel-bg`      | `#1e1e1e`   |
| Border / Handle Line       | `--border`        | `#2a2a2a`   |
| Accent Highlight           | `--accent`        | `#12B0FF`   |
| Button Hover               | `--hover`         | `#222`      |
| Text (Main)                | `--text`          | `#E0E0E0`   |
| Text (Muted)               | `--text-muted`    | `#888`      |

---

## 4 · Typography

| Element            | Font               | Weight | Size   |
|--------------------|--------------------|--------|--------|
| Base UI            | Inter, system-ui   | 400    | 14px   |
| Topbar Buttons     | Inter, system-ui   | 500    | 13–14px|
| Editor (Code)      | Fira Code, Monaco  | 400    | 13px   |
| Sidebar Labels     | Inter              | 500    | 14px   |
| Asset File Size    | Inter              | 400    | 12px   |

---

## 5 · UI Components

### Top Bar
- Flat black, no shadow
- Buttons: padded (6px 10px), hover `--hover`, selected = border-bottom `2px solid --accent`

### Sidebar
- Sections: Layers / Scenes / Assets
- Selected item: background `rgba(18,176,255,0.1)`, text `--accent`
- Icons: Lucide, 1.5px stroke
- Scenes are minimal (Scene 1, Scene 2), no heavy styling

### Assets
- Vertical list with file icon + filename + size
- Hover reveals slight bg tint
- Reuse styles from ShadCN `command` component + badge for file size

---

## 6 · Canvas & Warping

- Warped quad outlined in `--accent` with draggable corners
- Corners: 8px, filled, `border-radius: 3px`
- Border: 1.5px dashed or solid depending on “linked” status
- When dragging: semi-transparent quad preview

---

## 7 · Shader/Code Panel

- Floats over canvas, max width: `480px`
- Background: `--panel-bg`
- Blur backdrop
- Titlebar: “WebGL Shader” + close icon (hoverable)
- Monaco theme: `vs-dark`
- Text is sharp and minimal, no rounded corners

---

## 8 · Interactions

| Action            | Visual Feedback                                      |
|------------------|------------------------------------------------------|
| Dragging handles | Live transform w/ quad border update                 |
| Hover layer      | Layer outline pulses / glow                          |
| Drop file        | Dropzone glow + filename popup                       |
| Edit shader      | Monaco opens modal, canvas dims                      |
| Add layer        | +Layer button flashes, new item highlights           |

---

## 9 · Responsive Behavior

| Width Range   | Behavior                                |
|---------------|-----------------------------------------|
| ≥1440px       | Full layout                             |
| 1024–1439px   | Editor hides shader panel on idle       |
| ≤768px        | Sidebar collapses to drawer             |
| ≤480px        | Projection mode only recommended        |

---

## 10 · Animation Spec

- Panel open: `opacity 0.2s ease`, `transform 0.3s ease-out`
- Drag quad: ghost quad follows pointer
- Handle hover: `scale(1.1)`
- Monaco fade-in: `backdrop-blur` + `scale(0.95 → 1.0)`
