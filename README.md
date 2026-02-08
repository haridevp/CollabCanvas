# Real-Time Collaborative Digital Canvas

> A powerful, real-time collaborative workspace that enables teams to draw, design, and ideate together on an infinite canvas.

[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Enabled-blue.svg)](https://www.docker.com/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Built with the MERN stack (MongoDB, Express, React, Node.js) and Fabric.js, this platform supports seamless real-time synchronization, allowing multiple users to work simultaneously with live cursors, layer management, and a rich set of drawing tools.

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
  - [Docker Compose (Recommended)](#docker-compose-recommended)
  - [Manual Installation](#manual-installation)
- [Configuration](#configuration)
  - [Environment Variables](#environment-variables)
- [Usage](#usage)
  - [Authentication](#authentication)
  - [Room Management](#room-management)
  - [Canvas Tools](#canvas-tools)
- [Development](#development)
- [Tech Stack](#tech-stack)
- [Documentation](#documentation)
- [Troubleshooting](#troubleshooting)
- [Team](#team)

## Features

*   **🔐 Authentication & Security**: Secure email/password login, profile management, and session handling using JWT and bcrypt.
*   **🏠 Room Management**: Create private/public rooms, manage participants (kick/ban), and secure access with passwords.
*   **🎨 Infinite Canvas**: Pan/zoom freely on an expansive workspace powered by Fabric.js.
*   **⚡ Real-Time Collaboration**: Bi-directional WebSocket syncing for instant updates, live cursors, and active user indicators.
*   **🛠 Rich Tools**: Freehand brush, shapes (rectangles, circles, arrows), text, and image uploads.
*   **📚 Layer System**: Professional layer management to reorder, lock, and hide elements.
*   **⚙️ Customization**: Dark/Light mode, keyboard shortcuts, and export options (PNG/SVG).

## Prerequisites

Before you begin, ensure you have the following installed:

*   **Node.js** (v18 or higher)
*   **npm** (v9 or higher)
*   **Docker** & **Docker Compose** (optional, for containerized setup)
*   **MongoDB** (if running locally without Docker)

## Installation

### Docker Compose (Recommended)

The easiest way to get started is using Docker Compose, which spins up the Frontend, Backend, and MongoDB database automatically.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/haridevp/Real-Time-Collaborative-Digital-Canvas-and-Creative-Workspace.git
    cd Real-Time-Collaborative-Digital-Canvas-and-Creative-Workspace
    ```

2.  **Start the services:**
    ```bash
    docker compose up --build
    ```

3.  **Access the application:**
    *   **Frontend:** [http://localhost:3000](http://localhost:3000)
    *   **Backend API:** [http://localhost:5000](http://localhost:5000)

### Manual Installation

If you prefer to run services individually:

#### 1. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory (see [Configuration](#configuration)).

Start the server:
```bash
npm run dev
# Server runs on http://localhost:5000
```

#### 2. Frontend Setup

```bash
cd frontend
npm install
```

Start the client:
```bash
npm run dev
# Client runs on http://localhost:5173 (or similar Vite port)
```

## Configuration

The application requires environment variables to function correctly.

1.  Copy the example configuration:
    ```bash
    cp .env.example .env
    # Or manually create .env in backend/ and frontend/ directories
    ```

### Environment Variables

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| **Backend** | | |
| `PORT` | API Server Port | `5000` |
| `MONGO_URI` | MongoDB Connection String | `mongodb://localhost:27017/collaborative-canvas` |
| `JWT_SECRET` | Secret key for signing tokens | `your_super_secret_key` |
| `FRONTEND_URL` | URL of the frontend app (CORS) | `http://localhost:3000` |
| **Frontend** | | |
| `VITE_API_URL` | Backend API URL | `http://localhost:5000/api` |

## Usage

### Authentication
*   **Register**: Create a new account with your email and password.
*   **Login**: Access your dashboard using your credentials.
*   **Profile**: Update your avatar and personal details in the Profile section.

### Room Management
*   **Create Room**: Click "Create Room" on the dashboard. You can set a password for private rooms.
*   **Join Room**: Enter a Room Code or browse the public gallery.
*   **Share**: Copy the Room Code or URL to invite others.

### Canvas Tools
Once inside a room, use the toolbar on the left:
*   **Select (V)**: Move, resize, and rotate objects.
*   **Brush (B)**: Freehand drawing. Adjust size and color in the settings panel.
*   **Shapes**: Insert rectangles, circles, and lines.
*   **Text (T)**: Add text labels.
*   **Layers**: Use the right-side panel to manage object stacking order.

## Development

To contribute or modify the codebase:

**Backend Scripts:**
*   `npm start`: Runs the server in production mode.
*   `npm run dev`: Runs the server with `nodemon` for hot-reloading.

**Frontend Scripts:**
*   `npm run dev`: Starts the Vite development server.
*   `npm run build`: Compiles the app for production.
*   `npm run lint`: Runs ESLint checks.

## Tech Stack

*   **Frontend:** [React](https://react.dev/), [Vite](https://vitejs.dev/), [Fabric.js](http://fabricjs.com/), [Tailwind CSS](https://tailwindcss.com/)
*   **Backend:** [Node.js](https://nodejs.org/), [Express.js](https://expressjs.com/), [Socket.io](https://socket.io/)
*   **Database:** [MongoDB](https://www.mongodb.com/)
*   **DevOps:** Docker, GitHub Actions

## Documentation

For more detailed technical documentation, please refer to the following guides:

*   [API Reference](docs/API.md): Details on authentication and user management endpoints.
*   [WebSocket Events](docs/SOCKETS.md): Comprehensive list of real-time events for collaboration.
*   [Database Schema](docs/DATABASE.md): Overview of MongoDB collections and models.

## Troubleshooting

**Problem: Connection Refused (MongoDB)**
*   Ensure MongoDB is running locally (`mongod`) or that the Docker container is up (`docker ps`).
*   Check if `MONGO_URI` is correct in your `.env` file.

**Problem: CORS Errors**
*   Verify that `FRONTEND_URL` in the backend `.env` matches the URL your browser is using for the frontend.

**Problem: WebSocket Connection Failed**
*   Ensure the backend is running and accessible.
*   Check if `VITE_API_URL` points to the correct backend host.

## Team

**Team 12**

*   RATAN RAJA
*   HARIDEV P
*   LAKKINENI JATHIN
*   SIDHARTH S NAIR
*   SISTHICK S