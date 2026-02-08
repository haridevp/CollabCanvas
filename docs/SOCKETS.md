# WebSocket Events Documentation

The application uses `socket.io` for real-time collaboration.

**Namespace:** `/` (Default)

## Client -> Server Events

| Event | Payload | Description |
| :--- | :--- | :--- |
| `join-room` | `{ roomId, userId }` | User joins a specific room. |
| `leave-room` | `{ roomId, userId }` | User leaves a room. |
| `cursor-move` | `{ roomId, x, y, userId }` | Broadcasts cursor position. |
| `drawing-update` | `{ roomId, element, saveToDb }` | Sends a new drawing object (path, shape, etc.) to the room. |
| `request-lock` | `{ roomId, objectId, userId }` | Requests a lock on an object to prevent concurrent edits. |
| `release-lock` | `{ roomId, objectId, userId }` | Releases a lock on an object. |
| `clear-canvas` | `{ roomId }` | Requests to clear the entire canvas. |
| `kick-participant`| `{ roomId, targetUserId, moderatorId }` | Moderator kicks a user. |
| `ping` | `callback` | Health check. |

## Server -> Client Events

| Event | Payload | Description |
| :--- | :--- | :--- |
| `room-state` | `{ room, drawingData, activeLocks }` | Sent to the user upon joining, contains current canvas state. |
| `user-joined` | `{ user, userId, role }` | Notify others that a user joined. |
| `user-left` | `{ userId }` | Notify others that a user left. |
| `cursor-update` | `{ userId, x, y }` | Updates a remote user's cursor position. |
| `drawing-update` | `{ element }` | A new drawing element to be rendered. |
| `object-locked` | `{ objectId, userId }` | Notify that an object is locked by a user. |
| `object-unlocked` | `{ objectId }` | Notify that an object is now free. |
| `lock-denied` | `{ objectId, lockedBy }` | Sent to requester if lock failed. |
| `canvas-cleared` | `(empty)` | Signal to clear the local canvas. |
| `participant-kicked`| `{ userId }` | Signal that a user has been kicked. |
| `error` | `{ message }` | Error notification. |
