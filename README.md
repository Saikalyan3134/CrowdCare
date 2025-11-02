# CrowdCare - Hospital and Ambulance Management System

A real-time digital platform that connects hospitals and ambulance drivers, enabling instant communication, patient tracking, resource sharing, and emergency coordination during crowded events or crises. The system streamlines ambulance dispatch, speeds up response, and improves patient outcomes through seamless collaboration.

## 🏗️ Project Structure

```
MSC-Hack/
├── frontend/          # React frontend application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── firebase/      # Firebase configuration
│   │   └── App.jsx        # Main app component
│   └── package.json
├── backend/           # Express.js backend API
│   ├── config/       # Configuration files
│   ├── controllers/  # Request handlers
│   ├── middleware/   # Custom middleware
│   ├── models/       # Data models
│   ├── routes/       # API routes
│   └── index.js      # Entry point
└── README.md
```

## 🚀 Quick Start

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your Firebase credentials
npm run dev
```

Backend runs on `http://localhost:5000`

## 🛠️ Technologies Used

### Frontend
- **React** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router DOM** - Navigation
- **Firebase Auth** - Authentication
- **Firebase Realtime Database** - Database

### Backend
- **Express.js** - Web framework
- **Firebase Admin SDK** - Backend Firebase integration
- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment variables
- **nodemon** - Development auto-reload

## 📋 Features

- ✅ Hospital Registration & Management
- ✅ User Authentication (Email/Password)
- ✅ Password Reset Functionality
- ✅ Hospital CRUD Operations
- ✅ Secure API with Firebase Authentication
- ✅ Real-time Database Operations
- ✅ Protected Routes & Middleware
- ✅ Responsive Design with Dark Mode Support

## 📡 API Endpoints

### Health Check
- `GET /health` - Server status

### Authentication
- `POST /api/auth/register` - Register user
- `GET /api/auth/user/:id` - Get user info

### Hospitals
- `GET /api/hospitals` - Get all hospitals
- `GET /api/hospitals/:id` - Get hospital by ID
- `POST /api/hospitals` - Create hospital (Protected)
- `PUT /api/hospitals/:id` - Update hospital (Protected)
- `DELETE /api/hospitals/:id` - Delete hospital (Admin)

## 🔐 Authentication

Protected routes require Firebase ID token in headers:
```
Authorization: Bearer <firebase-id-token>
```

## 📄 License

ISC
