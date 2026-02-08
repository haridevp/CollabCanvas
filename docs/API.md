# API Documentation

Base URL: `http://localhost:5000/api`

## Authentication (`/auth`)

### Check Username Availability
*   **URL:** `/auth/check-username/:username`
*   **Method:** `GET`
*   **Description:** Checks if a username is already taken.
*   **Response:**
    ```json
    {
      "available": true,
      "message": "Username is available!"
    }
    ```

### Register
*   **URL:** `/auth/register`
*   **Method:** `POST`
*   **Body:**
    ```json
    {
      "fullName": "John Doe",
      "username": "johndoe",
      "email": "john@example.com",
      "password": "secretpassword"
    }
    ```
*   **Response:** `201 Created`

### Login
*   **URL:** `/auth/login`
*   **Method:** `POST`
*   **Body:**
    ```json
    {
      "email": "john@example.com",
      "password": "secretpassword"
    }
    ```
*   **Response:**
    ```json
    {
      "success": true,
      "token": "jwt_token_here",
      "user": { ... }
    }
    ```

### Get Profile
*   **URL:** `/auth/profile`
*   **Method:** `GET`
*   **Headers:** `x-auth-token: <token>`
*   **Response:** User profile object.

### Update Profile
*   **URL:** `/auth/update-profile`
*   **Method:** `PUT`
*   **Headers:** `x-auth-token: <token>`
*   **Body:**
    ```json
    {
      "displayName": "New Name",
      "bio": "New Bio",
      "avatar": "base64_string"
    }
    ```

### Verify Email
*   **URL:** `/auth/verify-email`
*   **Method:** `POST`
*   **Body:** `{ "token": "verification_token" }`

### Forgot Password
*   **URL:** `/auth/forgot-password`
*   **Method:** `POST`
*   **Body:** `{ "email": "john@example.com" }`

### Reset Password
*   **URL:** `/auth/reset-password`
*   **Method:** `POST`
*   **Body:** `{ "token": "reset_token", "password": "new_password" }`

### Delete Account
*   **URL:** `/auth/delete-account`
*   **Method:** `DELETE`
*   **Headers:** `x-auth-token: <token>`
*   **Body:** `{ "password": "current_password" }`
