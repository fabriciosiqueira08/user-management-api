# AWS Lambda Serverless CRUD Application

This repository serves as a learning project to demonstrate practical knowledge of serverless architecture using AWS Lambda. The project implements a basic CRUD (Create, Read, Update, Delete) application for user management.

---

## Technologies Used

- AWS Lambda
- AWS DynamoDB
- Serverless Framework
- Node.js
- AWS API Gateway

---

## Purpose

This project was created to practice and showcase real-world implementation of:

- Serverless Architecture
- AWS Cloud Services
- RESTful API Design
- Database Operations
- Infrastructure as Code
- Best Practices in Production Environment

---

## Features

- User Management CRUD Operations
- Serverless API Endpoints
- DynamoDB Integration
- Error Handling
- Input Validation

---

## Setup

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Deploy to AWS**:
   ```bash
   npm run deploy
   ```

---

## Testing

Import the Insomnia collection from the `docs` folder to test the API endpoints.

---

## Available Endpoints

- **POST** `/users` - Create user
- **GET** `/users` - List all users
- **GET** `/users/{id}` - Get specific user
- **PUT** `/users/{id}` - Update user
- **DELETE** `/users/{id}` - Delete user

For detailed documentation, see [API Documentation](docs/README.md).
