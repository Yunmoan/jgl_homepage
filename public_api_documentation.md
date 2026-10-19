# Public API Documentation

This document outlines all the publicly accessible API endpoints for the application. "Public" means these endpoints do not require a JWT authentication token.

User-facing `error` and `message` values are returned in Chinese. Invalid login credentials
return 401 with `账号或密码不正确，请检查后重试`; expired sessions return 401, permission
errors return 403, and rate limits return 429 with a JSON `error` message.
An incorrect current password during a password change returns 400 and does not end the session.
Clients should use status codes for control flow and display the message without relying on its exact wording.

---

## Exhibition calendar

### GET /api/exhibitions/public?year=2026

Returns all exhibitions whose inclusive date range overlaps the requested calendar year,
ordered by start date and ID. `year` is a four-digit year from 1900 through 2199;
omitting it selects the current year in Asia/Shanghai.

```json
{
  "items": [
    {
      "id": 1,
      "title": "Exhibition name",
      "start_date": "2026-12-31",
      "end_date": "2027-01-02",
      "location": "Venue",
      "booth": "A01",
      "participation": "participating",
      "participation_notes": "Participating clubs, planned activities and other attendance notes",
      "description": "Exhibition introduction",
      "link": "https://example.com/event",
      "source_label": "thonly.cc"
    }
  ],
  "years": [2027, 2026],
  "source": {
    "kind": "thonly",
    "key": "thonly",
    "label": "thonly.cc",
    "url": "https://thonly.cc/calendar/",
    "cache_state": "fresh",
    "fetched_at": "2026-10-19T13:04:12.768Z",
    "warning": "",
    "skipped": 21
  }
}
```

Locally maintained exhibitions have no `source_key`, `source_event_id` or `source_label`.
Exhibitions read from an external calendar also include `source_key`, `source_event_id`,
`source_url`, `source_status`, `category`, `qq_group`, and `binding_id` when the
administrator has attached Gaolian attendance information. `source_label` identifies the
attribution that clients must display as `数据源来自 <label>`.
`source.cache_state` is one of `local`, `live`, `fresh`, `stale`, `offline` or `unavailable`.
When the external source cannot be reached, `warning` explains whether the last successful
cache or the bundled offline snapshot is being shown; an empty list with no warning means
there are genuinely no exhibitions for the selected period.

Dates are date-only strings and must not be shifted by timezone conversion.
`years` includes all years covered by stored exhibitions, the requested year, and the current year.
`participation` is `undecided`, `participating`, or `not_participating`.
`participation_notes` is optional public plain text, limited to 2000 UTF-16 code units,
with line breaks preserved. It is separate from `description`; an omitted, null or blank
value is stored as an empty string. Homepage cards, standalone cards and calendar details
display nonempty notes. Create or replace accepts this field; replace can clear it with `""`.
The standalone calendar shows the full year. The homepage defaults to the current month,
including exhibitions that overlap either end of that month. Both lists support pagination.

### GET /api/exhibitions/settings

Returns the public homepage display configuration. With no saved configuration it returns
`{"mode":"current_month","month":null}`. Supported modes are `current_month` (automatic),
`fixed_month` (a `YYYY-MM` value in `month`) and `year`.

### PUT /api/exhibitions/settings

Administrators can save the same configuration object. A fixed month must be between
1900-01 and 2199-12; other modes store `month` as `null`. The setting only affects the homepage.
The configuration is persisted in MySQL and is read again when the homepage is refreshed.

Create (`POST /api/exhibitions`), replace (`PUT /api/exhibitions/:id`) and delete
(`DELETE /api/exhibitions/:id`) require a Bearer token for a current `admin` account.
Create and replace accept the fields above except `id`; `title`, both dates and `participation`
are required. Invalid dates, reversed ranges, invalid statuses and non-HTTP(S) links return 400.
Unauthenticated writes return 401, non-admin writes return 403, and missing IDs return 404.

Calendar source administration also requires an `admin` token:
`GET/PUT /api/exhibitions/sources`, `POST /api/exhibitions/sources/refresh`,
and `GET/POST/PUT/DELETE /api/exhibitions/bindings`. Source configuration includes
`kind` (`local`, `thonly`, `json`), `label`, HTTPS feed `urls`, `cache_mode`
(`ttl`, `offline`, `none`) and `cache_ttl_seconds` (1 second through 365 days).
For `thonly`, the server automatically discovers newly published yearly spreadsheets and
needs no manual feed maintenance; `GET /api/exhibitions/sources` returns the current list as
`thonly_urls`. Attendance bindings reference a `source_key` and `source_event_id` and store
`participation`, `booth` and `participation_notes` independently of the source data.

---

## News

### GET /api/news

- **Description**: Retrieves a list of all news articles, sorted by date in descending order.
- **Request Body**: None.
- **Response Body**:
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

- **Description**: Retrieves a list of all _approved_ messages, sorted by ID in descending order.
- **Request Body**: None.
- **Response Body**:
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

- **Description**: Submits a new message for approval. Requires a valid reCAPTCHA v3 token.
- **Request Body**:
  ```json
  {
    "author": "Visitor Name",
    "content": "This is my new message.",
    "qq": "123456", // Optional
    "token": "recaptcha_token_here"
  }
  ```
- **Response Body (Success)**:
  ```json
  {
    "message": "留言已提交，审核通过后将公开显示",
    "insertId": 123
  }
  ```

---

## Admin History

### GET /api/admin-history

- **Description**: Retrieves the administrative history, including all terms and their members.
- **Request Body**: None.
- **Response Body**:
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

- **Description**: Retrieves a list of all members in the hall of fame.
- **Request Body**: None.
- **Response Body**:
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

- **Description**: Retrieves a list of all historical events.
- **Request Body**: None.
- **Response Body**:
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

- **Description**: Retrieves a list of all member organizations.
- **Request Body**: None.
- **Response Body**:
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

- **Description**: Retrieves a list of all works.
- **Request Body**: None.
- **Response Body**:
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

- **Description**: Retrieves a list of all friend links.
- **Request Body**: None.
- **Response Body**:
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

- **Description**: Authenticates a user and returns a JWT.
- **Request Body**:
  ```json
  {
    "username": "admin",
    "password": "password"
  }
  ```
- **Response Body (Success)**:
  ```json
  {
    "token": "your_jwt_here"
  }
  ```

### POST /api/auth/register

- **Description**: Registers a new user. (Note: In a production environment, this might be restricted).
- **Request Body**:
  ```json
  {
    "username": "newuser",
    "password": "password",
    "role": "editor" // Optional, defaults to 'viewer'
  }
  ```
- **Response Body (Success)**:
  ```json
  {
    "message": "申请已提交，请等待管理员审核"
  }
  ```

---

## Users (Admin - Private)

All endpoints below require Authorization: Bearer <JWT> and admin role unless otherwise specified.

### GET /api/users

- **Description**: List all users.
- **Response**:
  ```json
  [{ "id": 1, "username": "admin", "role": "admin", "created_at": "2025-12-13T10:46:05.000Z" }]
  ```

### POST /api/users

- **Description**: Create a new user.
- **Request**:
  ```json
  { "username": "alice", "password": "secret123", "role": "editor" }
  ```
- **Errors**: 409 if username already exists.

### PUT /api/users/:id/role

- **Description**: Update a user's role. Valid roles: admin | editor | viewer.
- **Request**:
  ```json
  { "role": "viewer" }
  ```

### PUT /api/users/:id/password

- **Description**: Admin resets a user's password (no old password required).
- **Request**:
  ```json
  { "newPassword": "newpass123" }
  ```

### PUT /api/users/me/password (Private - Self)

- **Description**: Logged-in user changes own password. Requires oldPassword.
- **Request**:
  ```json
  { "oldPassword": "oldpass", "newPassword": "newpass123" }
  ```
- **Errors**: 401 if old password incorrect; 400 if invalid payload.

### DELETE /api/users/:id

- **Description**: Delete a user. Prevents deleting yourself.
