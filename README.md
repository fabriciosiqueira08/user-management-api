# User Management API

A secure user management API built with AWS Lambda, Cognito, and DynamoDB. Features MFA authentication and comprehensive user management capabilities.

## Features

- User registration and authentication with MFA
- JWT-based authentication
- Role-based access control (Admin/User)
- Rate limiting for security
- Complete user CRUD operations
- Token refresh mechanism
- Secure logout

## Tech Stack

- Node.js with TypeScript
- AWS Lambda
- Amazon Cognito for authentication
- DynamoDB for data storage
- Serverless Framework
- AWS IAM for security

## Prerequisites

- Node.js 18.x or later
- AWS CLI configured
- Serverless Framework CLI
- An AWS account with appropriate permissions

## Setup

1. Clone the repository:

```bash
git clone [repository-url]
cd user-management-api
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file with the following variables:

```env
USER_POOL_ID=your-cognito-user-pool-id
USER_POOL_CLIENT_ID=your-cognito-client-id
USERS_TABLE=your-dynamodb-table-name
FRONTEND_URL=your-frontend-url
```

4. Deploy to AWS:

```bash
npm run deploy
```

## Authentication Flow

1. **User Registration**

   - Create user with email and name
   - User receives verification code
   - Complete registration with code and password

2. **Login (with MFA)**

   - Submit email and password
   - Receive session token
   - Submit MFA code
   - Receive access tokens

3. **Token Management**
   - Use refresh token to get new access tokens
   - Logout to invalidate tokens

## API Endpoints

### Public Endpoints

- `POST /users` - Create new user
- `POST /auth/complete-registration` - Complete user registration
- `POST /auth/login` - Login (requires MFA)
- `POST /auth/verify-mfa` - Verify MFA code
- `POST /auth/refresh-token` - Refresh access token

### Protected Endpoints (requires authentication)

- `GET /users` - List all users (Admin only)
- `GET /users/{id}` - Get user details
- `PUT /users/{id}` - Update user
- `DELETE /users/{id}` - Delete user
- `POST /users/{id}/make-admin` - Make user admin (Admin only)
- `POST /auth/logout` - Logout user

## Testing

1. Run the test script:

```bash
npm run test:api
```

2. Import the Insomnia collection (`insomnia.json`) to test endpoints manually.

## Security Features

- MFA required for all users
- Rate limiting on authentication endpoints
- JWT token validation
- IAM role-based permissions
- DynamoDB encryption at rest
- CORS configuration
- HTTP-only cookies for tokens

## Development

1. Run locally:

```bash
npm run dev
```

2. Run tests:

```bash
npm test
```

3. Build:

```bash
npm run build
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
