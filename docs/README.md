# API Documentation

## Importing Insomnia Collection

1. Open Insomnia
2. Go to Application > Preferences > Data > Import Data
3. Select "From File"
4. Choose the `insomnia.json` file from this folder

## Available Endpoints

### Create User

- **POST** `/users`

````json
{
"name": "Teste User",
"email": "test1@email.com"
}

### Update User

- **PUT** `/users/{id}`

```json
{
"name": "Teste User 2",
"email": "test2@email.com"
}

### Get User

- **GET** `/users/{id}`

### List Users

- **GET** `/users`

### Delete User

- **DELETE** `/users/{id}`

## Response Examples

### Create User Response

```json
{
"id": "550e8400-e29b-41d4-a716-446655440000",
"name": "Test User",
"email": "test1@email.com",
"createdAt": 1616516781,
"updatedAt": 1616516781
}

### Get/List Users Response

```json
{
"id": "550e8400-e29b-41d4-a716-446655440000",
"name": "Test User",
"email": "test1@email.com",
"createdAt": 1616516781,
"updatedAt": 1616516781
}

### Update User Response

```json
{
"id": "550e8400-e29b-41d4-a716-446655440000",
"name": "Test User 2",
"email": "test2@email.com",
"createdAt": 1616516781,
"updatedAt": 1616516982
}

### Delete User Response

- Status: 204 No Content
````
