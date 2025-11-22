# Gemini Context: AI Movie Maker

## Project Overview
**AI Movie Maker** is a Next.js-based creative application offering a node-based canvas interface (built with React Flow) for AI-powered media generation. It enables users to create workflows for generating images and videos using Google's **Flow** and **Whisk** APIs. The application features a visual canvas where users can organize, generating, and edit multimedia content.

## Tech Stack

*   **Frontend:**
    *   **Framework:** Next.js 16 (App Router)
    *   **Library:** React 19
    *   **Language:** TypeScript
    *   **Styling:** Tailwind CSS 4
    *   **Canvas Engine:** @xyflow/react (React Flow 12+)
    *   **State Management:** Zustand 5
    *   **Icons:** Lucide React
*   **Backend / API:**
    *   Next.js API Routes (`app/api/*`) act as proxies to external AI services.
    *   **Auth & DB:** Supabase (Google OAuth configured).
*   **External Services:**
    *   **Google Whisk API:** Image generation (Imagen 3.5), editing (Gemini Pix), captioning.
    *   **Google Flow API:** Video generation (Veo), image upload.

## Development Workflow

### Prerequisites
Ensure you have `Node.js` installed.

### Installation
```bash
npm install
```

### Running Local Server
```bash
npm run dev
```
Access the app at `http://localhost:3000`.

### Building for Production
```bash
npm run build
npm start
```

### Linting
```bash
npm run lint
```

## Configuration & Environment

The application relies heavily on environment variables for API authentication.
Create a `.env.local` file in the root directory with the following keys:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Flow API (Google Labs)
FLOW_BEARER_TOKEN=your_bearer_token
FLOW_PROJECT_ID=your_project_id

# Whisk API (Google Labs)
# These are extracted from browser cookies when logged into labs.google
WHISK_COOKIE_NID=your_nid_cookie
WHISK_COOKIE_SECURE_PSID=your_secure_psid_cookie
```

**Note:** The application handles proxying requests to bypass CORS and authentication issues inherent in calling these specific Google APIs directly from the browser.

## Project Structure

```
/
├── app/                    # Next.js App Router
│   ├── api/                # Backend API routes (Proxies)
│   │   ├── flow/           # Flow API endpoints (video, upload)
│   │   ├── whisk/          # Whisk API endpoints (image gen, edit)
│   │   └── blob/           # Blob storage routes
│   ├── canvas/             # Canvas page logic
│   ├── globals.css         # Global styles (Tailwind)
│   └── page.tsx            # Landing page
├── components/             # React Components
│   ├── canvas/             # Canvas-specific UI
│   ├── nodes/              # React Flow Custom Nodes (ImageNode, VideoNode)
│   ├── AIInputPanel.tsx    # Main prompt input
│   └── Canvas.tsx          # Main Canvas setup
├── lib/                    # Utilities
│   ├── store.ts            # Zustand global store
│   ├── proxy-agent.ts      # Custom proxy handling
│   └── supabaseClient.ts   # Supabase initialization
├── public/                 # Static assets
└── docs/                   # Detailed API documentation
```

## Key Features & Conventions

1.  **Canvas Interaction:**
    *   The core UI is a **React Flow** canvas.
    *   **Nodes:** Custom nodes (`ImageNode`, `VideoNode`, `TextNode`) handle specific media types.
    *   **State:** Canvas state (nodes, edges) is managed via Zustand and persisted to `localStorage` (auto-saves every 30s).

2.  **API Architecture:**
    *   **Proxy Pattern:** Frontend components NEVER call external AI APIs directly. They call internal Next.js API routes (`/api/flow/*` or `/api/whisk/*`).
    *   **Authentication:** The server-side API routes inject the necessary Bearer tokens or Cookies headers before forwarding requests to Google's servers.
    *   **Batching:** The app supports batch generation (e.g., generating 4 images at once).

3.  **Styling:**
    *   Use **Tailwind CSS** for all styling.
    *   **Shadcn UI** components (or similar patterns) are likely used for standard UI elements.

4.  **Authentication:**
    *   Supabase is used for user authentication (Google Login).
    *   `window.location.origin` is used to handle redirects dynamically between localhost and production.

## Documentation References

*   **`README.md`**: General introduction and feature list.
*   **`CLAUDE.md`**: detailed technical context and codebase patterns.
*   **`docs/`**: Contains specific API documentation for Flow and Whisk services. Check these files if debugging API integration issues.
