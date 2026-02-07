# Real-Time Collaborative Digital Canvas

A powerful, real-time collaborative workspace that enables teams to draw, design, and ideate together on an infinite canvas. Built with the MERN stack and Fabric.js, this platform supports seamless real-time synchronization, allowing multiple users to work simultaneously with live cursors, layer management, and a rich set of drawing tools.

## Features

### 🔐 Authentication & User Management
- **Secure Login & Registration:** Email/password authentication with bcrypt hashing.
- **Profile Management:** Customize user profiles, manage personal information, and upload profile pictures.
- **Security:** Secure session management and password reset functionality.

### 🏠 Room Management
- **Collaborative Rooms:** Create, join, and manage private or public rooms.
- **Room Controls:** Set room visibility, passwords, and manage participants (kick/ban).
- **Dashboard:** Access recently visited rooms and favorites.

### 🎨 Real-Time Digital Canvas
- **Infinite Canvas:** Pan and zoom freely on an expansive workspace.
- **Drawing Tools:** Freehand brush with variable stroke settings, eraser, and shapes (rectangles, circles, lines, arrows).
- **Text & Media:** Add text boxes and insert images directly onto the canvas.
- **Layer Management:** Organize artwork with a robust layering system (reorder, lock, toggle visibility).
- **Manipulation:** Select, move, resize, and rotate objects with transformation handles.

### ⚡ Real-Time Collaboration
- **Live Sync:** Bi-directional WebSocket communication ensures instant updates for all users.
- **Presence:** See live remote cursors and active user indicators.
- **Conflict Resolution:** Smart locking mechanisms to prevent editing conflicts.

### 🛠 Tools & Enhancements
- **Export:** Save your work as PNG or SVG.
- **Undo/Redo:** Local history stack for mistake correction.
- **Chat:** In-room text chat for seamless communication.
- **Customization:** Theme toggling (Dark/Light mode) and keyboard shortcut configuration.

## Tech Stack

- **Frontend:** React, Vite, Fabric.js, Tailwind CSS
- **Backend:** Node.js, Express.js, Socket.io
- **Database:** MongoDB
- **DevOps:** Docker, GitHub Actions (CI/CD)

## Getting Started

### Prerequisites

- Node.js (v18+)
- Docker & Docker Compose

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/haridevp/Real-Time-Collaborative-Digital-Canvas-and-Creative-Workspace.git
    cd Real-Time-Collaborative-Digital-Canvas-and-Creative-Workspace
    ```

2.  **Start with Docker Compose (Recommended):**
    ```bash
    docker compose up --build
    ```
    - Frontend: http://localhost:3000
    - Backend: http://localhost:5000

3.  **Manual Setup (Development):**

    *Backend:*
    ```bash
    cd backend
    npm install
    npm start
    ```

    *Frontend:*
    ```bash
    cd frontend
    npm install
    npm run dev
    ```

## CI/CD Pipeline

This project uses GitHub Actions for Continuous Integration and Deployment.

- **Build & Lint:** Automatically builds the frontend and runs linting checks on every push to `main`.
- **Docker Build:** Verifies that Docker images for both frontend and backend can be built successfully.

## Team 12

- RATAN RAJA
- HARIDEV P
- LAKKINENI JATHIN
- SIDHARTH S NAIR
- SISTHICK S

Testing 