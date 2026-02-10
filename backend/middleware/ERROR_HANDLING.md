/\*\*

- Standardized Error Response Format
-
- All API endpoints now return errors in a consistent format for better
- client-side handling and debugging.
  \*/

/\*\*

- Success Response Format:
- {
- success: true,
- statusCode: 200,
- data: { ... },
- message: "optional message"
- }
  \*/

/\*\*

- Error Response Format:
- {
- success: false,
- statusCode: <HTTP Status Code>,
- message: "Human-readable error message",
- stack: "error stack trace (only in development)"
- }
  \*/

/\*\*

- HTTP Status Codes Used:
-
- 200 - OK: Request successful
- 201 - Created: Resource created successfully
- 204 - No Content: Successful request with no content
-
- 400 - Bad Request: Invalid input or validation error
- 401 - Unauthorized: authentication required or failed
- 403 - Forbidden: Authenticated but not authorized
- 404 - Not Found: Resource not found
- 409 - Conflict: Resource already exists
- 422 - Unprocessable Entity: Validation failed
-
- 500 - Internal Server Error: Unhandled server errors
- 503 - Service Unavailable: Temporary server issues
  \*/

/\*\*

- Common Error Messages:
-
- Authentication Errors:
- - "Invalid credentials"
- - "Token expired"
- - "Invalid token"
- - "Authentication required"
-
- Validation Errors:
- - "Email already exists"
- - "Username already exists"
- - "Validation failed: <specific errors>"
-
- Authorization Errors:
- - "You don't have permission to perform this action"
- - "Only room owners can perform this action"
-
- Resource Errors:
- - "Resource not found"
- - "Room not found"
- - "User not found"
- - "Participant not found"
    \*/

/\*\*

- Error Handling Middleware Features:
-
- 1.  Mongoose Validation Errors: Converts MongoDB validation errors to 400 Bad Request
- 2.  Duplicate Key Errors (11000): Detects and formats duplicate field errors
- 3.  JWT Errors: Handles token validation and expiration
- 4.  Cast Errors: Converts MongoDB invalid ObjectId errors
- 5.  404 Handler: Returns 404 for undefined routes
- 6.  Async Error Wrapper: Automatically catches unhandled promise rejections
- 7.  Development Mode: Stack traces included in development environment
      \*/

/\*\*

- Usage Examples:
-
- 1.  Throwing errors in controllers:
-
- const { AppError } = require('../middleware/errorHandler');
-
- if (!user) {
-      throw new AppError('User not found', 404);
- }
-
- 2.  Wrapping async routes:
-
- const { asyncHandler } = require('../middleware/errorHandler');
-
- router.get('/users/:id', asyncHandler(async (req, res) => {
-      const user = await User.findById(req.params.id);
-      res.json({ success: true, data: user });
- }));
  \*/
