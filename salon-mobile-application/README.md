# Salon Management Mobile Application (MERN)

Production-ready university project using:
- React Native (Expo) mobile frontend
- Node.js + Express backend API
- MongoDB (Atlas-ready)
- JWT authentication + role-based access

## 1. Project Structure

```text
salon-mobile-application/
  backend/
    src/
      config/
      controllers/
      middleware/
      models/
      routes/
      utils/
      validators/
    uploads/
    .env.example
    package.json
  mobile/
    src/
      components/
      constants/
      context/
      navigation/
      screens/
      services/
    .env.example
    App.js
    app.json
    package.json
```

## 2. Backend Setup

1. Install dependencies:
```bash
cd backend
npm install
```

2. Configure environment:
```bash
cp .env.example .env
```

3. Update `.env` values:
- `MONGODB_URI`
- `JWT_SECRET`
- `PORT` (optional)

4. Run backend:
```bash
npm run dev
```

Health check:
```http
GET /health
```

## 3. Mobile Setup

1. Install dependencies:
```bash
cd mobile
npm install
```

2. Configure API URL:
```bash
cp .env.example .env
```
- Set `EXPO_PUBLIC_API_URL=http://<YOUR_BACKEND_HOST>/api`

3. Run mobile app:
```bash
npm run start
```

## 4. Architecture & Best Practices

- Layered backend structure (`models`, `controllers`, `routes`, `middleware`, `validators`)
- Centralized error handling middleware
- JWT auth middleware + role authorization
- Request validation using `express-validator`
- Password hashing via `bcryptjs`
- Async/Await + clear HTTP status codes
- Environment-driven configuration for deployment

## 5. Key API Endpoints

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Services
- `GET /api/services`
- `GET /api/services/:id`
- `POST /api/services` (admin)
- `PUT /api/services/:id` (admin)
- `DELETE /api/services/:id` (admin)

### Staff
- `GET /api/staff`
- `GET /api/staff/:id`
- `POST /api/staff` (admin)
- `PUT /api/staff/:id` (admin)
- `DELETE /api/staff/:id` (admin)

### Appointments
- `POST /api/appointments`
- `GET /api/appointments`
- `GET /api/appointments/:id`
- `PUT /api/appointments/:id`
- `DELETE /api/appointments/:id`

### Payments
- `POST /api/payments`
- `GET /api/payments`
- `GET /api/payments/appointment/:appointmentId`
- `PUT /api/payments/:id/status`

## 6. Sample Requests / Responses

### Register
`POST /api/auth/register`

Request:
```json
{
  "name": "Admin User",
  "email": "admin@salon.com",
  "password": "secret123",
  "role": "admin",
  "phone": "1234567890"
}
```

Response:
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "66f...",
    "name": "Admin User",
    "email": "admin@salon.com",
    "role": "admin",
    "phone": "1234567890"
  },
  "token": "jwt_token_here"
}
```

### Login
`POST /api/auth/login`

Request:
```json
{
  "email": "admin@salon.com",
  "password": "secret123"
}
```

### Create Service (Admin)
`POST /api/services`

Headers:
```text
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

Request:
```json
{
  "name": "Hair Cut",
  "description": "Professional haircut service",
  "price": 25,
  "duration": 40,
  "image": "https://example.com/images/haircut.jpg"
}
```

### Book Appointment (Customer)
`POST /api/appointments`

Request:
```json
{
  "serviceId": "66f_service_id",
  "staffId": "66f_staff_id",
  "date": "2026-03-30",
  "time": "14:00"
}
```

### Mark Payment as Paid
`PUT /api/payments/:id/status`

Request:
```json
{
  "status": "paid"
}
```

## 7. Image Upload (Multer)

- Backend accepts image uploads on service create/update via `multipart/form-data` with field name `image`.
- Stored in `backend/uploads/`.
- Public URL format: `http://<host>/uploads/<filename>`.

## 8. Deployment (Render/Railway)

### Backend Deployment Steps
1. Push repository to GitHub.
2. Create a new Web Service on Render or Railway.
3. Set root directory to `backend`.
4. Build command: `npm install`
5. Start command: `npm start`
6. Add environment variables:
   - `NODE_ENV=production`
   - `PORT=5000` (or platform port)
   - `MONGODB_URI=<MongoDB Atlas URI>`
   - `JWT_SECRET=<strong secret>`
   - `JWT_EXPIRES_IN=7d`
   - `CLIENT_URL=*` (or mobile/web origin)
7. Verify `GET /health`.

### MongoDB Atlas Setup
1. Create cluster in MongoDB Atlas.
2. Create DB user and password.
3. Whitelist allowed IPs (or `0.0.0.0/0` for development).
4. Copy connection string to `MONGODB_URI`.

### Mobile Deployment/Usage
1. Set `EXPO_PUBLIC_API_URL` to deployed backend URL.
2. Build with Expo EAS (optional for production):
```bash
npx expo install expo-dev-client
npx eas build -p android
```

## 9. Notes for Submission / Viva

- Auth flow is fully JWT based.
- All major entities are implemented with CRUD.
- Admin/customer role separation is implemented.
- Backend is deployment-ready with `.env` configuration.
- Mobile app uses hooks, navigation, Axios, and live API integration.
