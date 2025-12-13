# Public API Documentation

This document outlines all the publicly accessible API endpoints for the application. "Public" means these endpoints do not require a JWT authentication token.

---

## News

### GET /api/news

-   **Description**: Retrieves a list of all news articles, sorted by date in descending order.
-   **Request Body**: None.
-   **Response Body**:
    ```json
    [
      {
        "id": 1,
        "title": "News Title",
        "date": "2025-12-13T10:46:05.000Z",
        "author": "Author Name",
        "image": "/uploads/news/image.jpg",
        "summary": "A short summary of the news article.",
        "content": "The full content of the news article.",
        "created_at": "2025-12-13T10:46:05.000Z"
      }
    ]
    ```

---

## Messages

### GET /api/messages

-   **Description**: Retrieves a list of all *approved* messages, sorted by ID in descending order.
-   **Request Body**: None.
-   **Response Body**:
    ```json
    [
      {
        "id": 1,
        "author": "Visitor Name",
        "content": "This is a message.",
        "qq": "123456",
        "status": "approved",
        "created_at": "2025-12-13T10:46:05.000Z"
      }
    ]
    ```

### POST /api/messages

-   **Description**: Submits a new message for approval. Requires a valid reCAPTCHA v3 token.
-   **Request Body**:
    ```json
    {
      "author": "Visitor Name",
      "content": "This is my new message.",
      "qq": "123456", // Optional
      "token": "recaptcha_token_here"
    }
    ```
-   **Response Body (Success)**:
    ```json
    {
      "message": "Message created successfully",
      "insertId": 123
    }
    ```

---

## Admin History

### GET /api/admin-history

-   **Description**: Retrieves the administrative history, including all terms and their members.
-   **Request Body**: None.
-   **Response Body**:
    ```json
    [
      {
        "id": 1,
        "title": "First Term",
        "trem": "2024-2025",
        "description": "Description of the first term.",
        "created_at": "2025-12-13T10:46:05.000Z",
        "members": [
          {
            "name": "Admin Name",
            "position": "President",
            "image": "/uploads/admins/admin.jpg"
          }
        ]
      }
    ]
    ```

---

## Fame Members

### GET /api/fame-members

-   **Description**: Retrieves a list of all members in the hall of fame.
-   **Request Body**: None.
-   **Response Body**:
    ```json
    [
      {
        "id": 1,
        "name": "Fame Member Name",
        "description": "Description of their contributions.",
        "image": "/uploads/fame/member.jpg",
        "created_at": "2025-12-13T10:46:05.000Z"
      }
    ]
    ```

---

## History

### GET /api/history

-   **Description**: Retrieves a list of all historical events.
-   **Request Body**: None.
-   **Response Body**:
    ```json
    [
      {
        "id": 1,
        "title": "Event Title",
        "date": "2025-12-13",
        "description": "Description of the event.",
        "image": "/uploads/history/event.jpg",
        "link": "https://example.com",
        "dialog_data": "{}",
        "created_at": "2025-12-13T10:46:05.000Z"
      }
    ]
    ```

---

## Members

### GET /api/members

-   **Description**: Retrieves a list of all member organizations.
-   **Request Body**: None.
-   **Response Body**:
    ```json
    [
      {
        "id": 1,
        "name": "Member Organization Name",
        "logo": "/uploads/members/logo.png",
        "link": "https://example.com",
        "created_at": "2025-12-13T10:46:05.000Z"
      }
    ]
    ```

---

## Works

### GET /api/works

-   **Description**: Retrieves a list of all works.
-   **Request Body**: None.
-   **Response Body**:
    ```json
    [
      {
        "id": 1,
        "title": "Work Title",
        "description": "Description of the work.",
        "imageUrl": "/uploads/works/image.jpg",
        "link": "https://example.com",
        "created_at": "2025-12-13T10:46:05.000Z"
      }
    ]
    ```

---

## Friend Links

### GET /api/friend-links

-   **Description**: Retrieves a list of all friend links.
-   **Request Body**: None.
-   **Response Body**:
    ```json
    [
      {
        "id": 1,
        "title": "Link Title",
        "url": "https://example.com",
        "logo": "/uploads/links/logo.png",
        "created_at": "2025-12-13T10:46:05.000Z"
      }
    ]
    ```

---

## Authentication (For Admin Panel)

These endpoints are public but are intended for use by the admin panel.

### POST /api/auth/login

-   **Description**: Authenticates a user and returns a JWT.
-   **Request Body**:
    ```json
    {
      "username": "admin",
      "password": "password"
    }
    ```
-   **Response Body (Success)**:
    ```json
    {
      "token": "your_jwt_here"
    }
    ```

### POST /api/auth/register

-   **Description**: Registers a new user. (Note: In a production environment, this might be restricted).
-   **Request Body**:
    ```json
    {
      "username": "newuser",
      "password": "password",
      "role": "editor" // Optional, defaults to 'viewer'
    }
    ```
-   **Response Body (Success)**:
    ```json
    {
      "message": "User registered successfully"
    }
    ```

