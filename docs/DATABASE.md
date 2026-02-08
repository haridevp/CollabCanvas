# Database Schema

The application uses MongoDB with Mongoose.

## Collections

### Users (`users`)
Stores user account information.

| Field | Type | Description |
| :--- | :--- | :--- |
| `username` | String | Unique username. |
| `email` | String | Unique email address. |
| `password` | String | Hashed password (bcrypt). |
| `displayName` | String | Public display name. |
| `avatar` | String | Base64 string or URL of profile picture. |
| `bio` | String | User biography. |
| `isVerified` | Boolean | Email verification status. |
| `loginActivities` | Array | History of login attempts/devices. |

### Rooms (`rooms`)
Stores canvas state and room configuration.

| Field | Type | Description |
| :--- | :--- | :--- |
| `roomId` | String | Unique room identifier (e.g., generated code). |
| `password` | String | Optional room password. |
| `drawingData` | Array | Serialized Fabric.js objects (the canvas content). |
| `createdAt` | Date | Creation timestamp. |

### Participants (`participants`)
Join table linking Users to Rooms with roles.

| Field | Type | Description |
| :--- | :--- | :--- |
| `user` | ObjectId | Reference to `User`. |
| `room` | ObjectId | Reference to `Room`. |
| `role` | String | `owner`, `moderator`, or `viewer`. |
| `isBanned` | Boolean | If true, user cannot re-join. |
