# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Mover Maker is a Next.js-based creative application that provides a canvas-based interface for AI-powered media generation. Users can create node-based workflows to generate and manipulate images and videos using Google's Flow and Whisk APIs.

## Key Technologies

- **Framework**: Next.js 16 with App Router
- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Canvas**: React Flow for node-based visual programming
- **State Management**: Zustand with localStorage persistence
- **API Integration**: Google Labs Flow API and Whisk API
- **Proxy**: Custom proxy agent for global accessibility

## Architecture

### Canvas System
- **Canvas.tsx**: Main canvas component managing React Flow instance
- **Node Types**:
  - `ImageNode.tsx`: Handles image display, upload, and AI generation controls
  - `VideoNode.tsx`: Video display and generation controls
  - `TextNode.tsx`: Text input and prompt editing

### API Layer
- **Flow API** (`app/api/flow/`):
  - `/upload`: Image upload to get mediaGenerationId
  - `/generate`: Batch image generation (text-to-image, image-to-image)
  - Supports up to 4 simultaneous generations with aspect ratio control

- **Whisk API** (`app/api/whisk/`):
  - `/generate`: High-quality image generation (Imagen 3.5)
  - `/upload`: Image upload for Whisk services
  - `/edit`: AI-powered image editing (Gemini Pix)
  - `/caption`: Image analysis and caption generation
  - `/recipe`: Video generation recipe planning

### State Management
- **store.ts**: Zustand store with slices for:
  - Canvas state (nodes, edges, viewport)
  - API configuration (auth tokens, project IDs)
  - Generation parameters (aspect ratios, batch settings)
  - Proxy configuration

## Common Commands

```bash
# Development
npm run dev          # Start development server on localhost:3000
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint code quality checks

# API Configuration
# Flow API requires: Bearer Token, Project ID
# Whisk API requires: Cookies (NID, __Secure-1PSID, etc.)
```

## Important File Patterns

### API Route Structure
All API routes follow the pattern:
```typescript
export async function POST(request: Request) {
  try {
    const body = await request.json();
    // Proxy to Google APIs with auth headers
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    return Response.json(await response.json());
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

### Node Component Pattern
All nodes follow the structure:
```typescript
interface NodeData {
  id: string;
  type: 'image' | 'video' | 'text';
  content?: string;
  mediaId?: string;
  // ... other properties
}

const CustomNode: React.FC<NodeProps<NodeData>> = ({ data, selected }) => {
  // Node implementation
};
```

## API Details

### Flow API Parameters
- **Image Aspect Ratios**: `IMAGE_ASPECT_RATIO_PORTRAIT`, `IMAGE_ASPECT_RATIO_LANDSCAPE`, `IMAGE_ASPECT_RATIO_SQUARE`
- **Video Models**: `veo_3_1_t2v_fast_portrait`, `veo_3_1_t2v_fast`, `veo_3_1_i2v_s_fast_portrait_fl`
- **Batch Generation**: Supports 1-4 simultaneous generations

### Whisk API Features
- **Image Generation**: Imagen 3.5 with aspect ratio control
- **Image Editing**: Gemini Pix for AI-powered modifications
- **Video Generation**: Recipe-based approach with scene planning

## Development Notes

- Canvas auto-saves to localStorage every 30 seconds
- All API calls are proxied through Next.js routes to handle CORS and authentication
- The app uses a custom proxy agent (`lib/proxy-agent.ts`) for network-restricted environments
- Generation progress is tracked through polling for async operations (especially video generation)

## Configuration Requirements

Create `.env.local` with:
```
# Flow API
FLOW_BEARER_TOKEN=your_bearer_token
FLOW_PROJECT_ID=your_project_id

# Whisk API
WHISK_COOKIE_NID=your_nid_cookie
WHISK_COOKIE_SECURE_PSID=your_secure_psid_cookie
```

## Important Gotchas

- Video generation is asynchronous; requires polling `/video:batchCheckAsyncVideoGenerationStatus`
- Image uploads return `mediaGenerationId` which must be used in subsequent generation requests
- Flow API requires specific projectId format in URL
- Whisk API requires cookie-based authentication