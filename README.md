# Real-time Chat Application

A full-stack real-time chat application built with the MERN stack (MongoDB, Express, React, Node.js), Socket.IO, and Redis.

## Features

- **Real-time Messaging**: Instant messaging using Socket.IO and Redis.
- **Authentication**: Secure JWT-based authentication (Access & Refresh tokens).
- **File Sharing**: Image and file uploads via Cloudinary.
- **Online Status**: Real-time user online/offline status.
- **Responsive UI**: Built with React, TailwindCSS, and DaisyUI.
- **Monitoring**: Metrics and analytics with Prometheus.

## Tech Stack

- **Frontend**: React, Vite, TailwindCSS, DaisyUI, Zustand, Socket.io-client.
- **Backend**: Node.js, Express, Mongoose, Redis, Socket.io.
- **Database**: MongoDB.
- **Services**: Redis (Caching/PubSub), Cloudinary (Media).

## Prerequisites

- Node.js (v18+)
- MongoDB
- Redis

## Getting Started

### 1. Installation

This project uses npm workspaces. Install all dependencies from the root:

```bash
npm install
```

### 2. Environment Setup

Configure the backend environment variables:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and provide your configuration (MongoDB URI, Cloudinary credentials, etc.).

### 3. Running the Application

**Development Mode:**

Run backend and frontend in separate terminals:

```bash
# Terminal 1: Backend
npm run dev:backend

# Terminal 2: Frontend
npm run dev:frontend
```

**Docker Compose:**

Alternatively, use Docker to spin up the entire stack (Database, Redis, Backend, Frontend):

```bash
docker-compose -f docker-compose.app.yml up --build
```

## Project Structure

- `backend/`: Server-side code (Express, API, Socket.IO).
- `frontend/`: Client-side code (React, Vite).
- `monitoring/`: Prometheus and Grafana configurations.

## Scripts

- `npm run dev:backend`: Start backend in development mode.
- `npm run dev:frontend`: Start frontend development server.
- `npm run build:frontend`: Build frontend for production.
- `npm run lint:frontend`: Lint frontend code.

