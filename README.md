# LumenCanvas

A real-time collaborative visual editing platform built with Vue 3 and powered by Yjs for seamless collaboration.

## Features

- **Real-time Collaboration**: Multiple users can edit the same canvas simultaneously
- **Multi-layer Support**: Work with different types of layers including HTML, images, shaders, videos, and URLs
- **Canvas Warping**: Advanced warping capabilities with interactive handles
- **Asset Management**: Upload and manage project assets
- **Project Backup**: Local backup and restore functionality
- **Keyboard Shortcuts**: Efficient workflow with customizable shortcuts
- **Responsive Design**: Works on desktop and mobile devices

## Architecture

LumenCanvas consists of two main components:

### 1. Frontend Application (Vue 3 + Vite)
- Built with Vue 3 and Vite for fast development and production builds
- Real-time collaborative editing with Yjs integration
- Responsive canvas interface with multi-layer support
- Project management and asset handling

### 2. Yjs Collaboration Server
- Standalone WebSocket server for real-time collaboration
- Docker-based deployment with optional TLS support
- Scalable and production-ready
- Located in the [`yjs-server/`](./yjs-server/) directory

## Quick Start

### Prerequisites
- Node.js 18+ 
- Docker (for collaboration server)

### Development Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd lumencanvas
   ```

2. **Install frontend dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Set up collaboration server (optional for local development):**
   ```bash
   cd yjs-server
   docker-compose up
   ```
   
   Or using Docker directly:
   ```bash
   cd yjs-server
   docker build -t yjs-server .
   docker run -p 1234:1234 yjs-server
   ```

The application will be available at `http://localhost:5173` (or your configured port).

## Collaboration Server

The Yjs collaboration server enables real-time collaborative editing. See the [`yjs-server/README.md`](./yjs-server/README.md) for detailed setup instructions including:

- Local development setup
- Production deployment with TLS
- Environment configuration
- Testing and troubleshooting

## Project Structure

```
lumencanvas/
├── src/                    # Vue.js frontend application
│   ├── components/         # Vue components
│   ├── composables/        # Vue composables
│   ├── layouts/           # Layout components
│   ├── pages/             # Page components
│   ├── router/            # Vue Router configuration
│   ├── services/          # API and service modules
│   ├── store/             # Pinia store modules
│   └── utils/             # Utility functions
├── yjs-server/            # Collaboration server
│   ├── Dockerfile         # Docker configuration
│   ├── docker-compose.yml # Docker Compose setup
│   ├── docker-entrypoint.sh # Server startup script
│   ├── test-server.js     # Connection testing script
│   └── README.md          # Server documentation
├── netlify/               # Netlify Functions
│   └── functions/         # Serverless functions
└── public/                # Static assets
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally

### Collaboration Server Scripts

Navigate to the `yjs-server/` directory:

- `npm run test` - Test server connection
- `npm run docker:build` - Build Docker image
- `npm run docker:run` - Run server in Docker
- `npm run docker:up` - Start with Docker Compose

## Deployment

### Frontend Deployment
The frontend can be deployed to any static hosting service:
- Netlify (recommended - includes serverless functions)
- Vercel
- GitHub Pages
- AWS S3 + CloudFront

### Collaboration Server Deployment
The Yjs server can be deployed to:
- Docker containers on any cloud provider
- Railway, Heroku, or similar platforms
- Kubernetes clusters
- Self-hosted servers

See [`yjs-server/README.md`](./yjs-server/README.md) for detailed deployment instructions.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Technology Stack

- **Frontend**: Vue 3, Vite, Pinia, Vue Router
- **Collaboration**: Yjs, y-websocket
- **Styling**: CSS3, Responsive Design
- **Backend**: Netlify Functions, Node.js
- **Infrastructure**: Docker, WebSockets
- **Storage**: Local Storage, S3-compatible APIs

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For issues, questions, or contributions, please:
- Open an issue on GitHub
- Check the documentation in individual component README files
- Review the collaboration server setup guide in [`yjs-server/`](./yjs-server/)

---

Built with ❤️ for collaborative creativity
