# 🚀 Yo.Works Backend API

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-5.1-000000?logo=express&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Admin-FFCA28?logo=firebase&logoColor=black)
![Stripe](https://img.shields.io/badge/Stripe-18.5-635BFF?logo=stripe&logoColor=white)

**RESTful API backend for Yo.Works - A professional talent-matching platform connecting models, hostesses, and marketing agencies.**

[API Documentation](#-api-endpoints) • [Getting Started](#-getting-started) • [Database Schema](#-database-schema) • [Architecture](#-architecture)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [API Endpoints](#-api-endpoints)
- [Database Schema](#-database-schema)
- [Environment Variables](#-environment-variables)
- [Authentication](#-authentication)
- [File Uploads](#-file-uploads)
- [Architecture](#-architecture)
- [Development Guide](#-development-guide)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)

---

## 🎯 Overview

**Yo.Works Backend** is a robust RESTful API built with Node.js and Express, powering a comprehensive talent-matching platform. It handles authentication, profile management, campaign management, real-time messaging, payment processing, and file uploads for videos, photos, and documents.

### Key Highlights

- 🔐 **JWT Authentication** - Secure token-based authentication with role-based access control
- 📊 **MySQL Database** - Relational database with automatic schema migrations
- 💬 **Firebase Integration** - Real-time chat messaging with Firestore
- 💳 **Stripe Integration** - Payment processing with webhook support
- 📁 **File Upload System** - Multer-based uploads for videos, images, and PDFs
- 🛡️ **Security First** - Bcrypt password hashing, CORS protection, input validation
- 🚀 **Production Ready** - Connection pooling, error handling, logging

---

## ✨ Features

### 🔐 Authentication & Authorization
- **User Registration** - Separate flows for Models/Hostesses and Agencies
- **JWT Tokens** - Secure authentication with configurable expiration
- **Role-Based Access Control** - Middleware protection for different user roles
- **Password Security** - Bcrypt hashing with salt rounds
- **Session Management** - Persistent authentication state

### 👥 Profile Management
- **Model Profiles** - Complete profile creation and updates
- **Agency Profiles** - Agency information with VAT and PDF documentation
- **Profile Photos** - Multi-photo upload with organization system
- **Video Portfolios** - 30-second professional video uploads
- **Profile Validation** - Comprehensive data validation and sanitization

### 📢 Campaign System
- **Campaign Creation** - Full campaign management for agencies
- **Campaign Updates** - Edit existing campaigns
- **Campaign Discovery** - Filtered campaign listings for models
- **Application System** - Model applications and agency approvals
- **Match System** - Intelligent matching algorithm with scoring

### 💬 Real-Time Communication
- **Firebase Chat** - Firestore-based messaging system
- **Custom Tokens** - Server-side Firebase authentication
- **Message History** - Persistent chat with timestamps
- **Long Polling** - Efficient message polling mechanism

### 💳 Payment Processing
- **Stripe Integration** - Checkout session creation
- **Webhook Handling** - Secure webhook verification
- **Payment Verification** - Transaction status tracking

### 📁 File Management
- **Video Uploads** - MP4 video processing
- **Image Uploads** - Photo gallery management
- **PDF Uploads** - Document storage for agencies
- **Static File Serving** - Efficient file delivery

---

## 🛠 Tech Stack

### Core Framework
- **Node.js** >= 18.x - JavaScript runtime
- **Express 5.1** - Web application framework
- **MySQL2 3.14** - MySQL database driver with connection pooling

### Authentication & Security
- **jsonwebtoken 9.0** - JWT token generation and verification
- **bcrypt 6.0** - Password hashing
- **cors 2.8** - Cross-origin resource sharing

### Database
- **MySQL** - Relational database management system
- **Connection Pooling** - Efficient database connection management
- **Automatic Migrations** - Schema updates on startup

### File Handling
- **Multer 2.0** - Multipart/form-data handling
- **Express Static** - Static file serving

### Third-Party Integrations
- **Firebase Admin SDK 13.4** - Server-side Firebase operations
- **Stripe 18.5** - Payment processing
- **dotenv 17.2** - Environment variable management

### Development Tools
- **nodemon 3.1** - Automatic server restart during development

---

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** >= 18.x
- **MySQL** >= 8.0
- **npm** >= 9.x or **yarn** >= 1.22
- **Git**

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd vellena-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your configuration (see [Environment Variables](#-environment-variables))

4. **Set up MySQL database**
   ```bash
   npm run create-db
   ```
   
   Or manually create the database:
   ```sql
   CREATE DATABASE IF NOT EXISTS vellena CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

5. **Start the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

6. **Verify the server is running**
   ```bash
   curl http://localhost:3000/api/ping
   # Should return: "pong"
   ```

---

## 📁 Project Structure

```
vellena-backend/
├── controllers/              # Business logic
│   ├── authController.js    # Authentication logic
│   ├── modelController.js   # Model profile management
│   ├── agencyController.js  # Agency profile management
│   ├── campaignController.js # Campaign CRUD operations
│   ├── applicationController.js # Applications & matches
│   ├── uploadController.js  # File upload handling
│   ├── videoController.js   # Video upload & serving
│   └── modelPhotosController.js # Photo management
├── routes/                   # API route definitions
│   ├── authRoutes.js        # /api/auth
│   ├── modelRoutes.js       # /api/model
│   ├── agencyRoutes.js      # /api/agency
│   ├── campaignRoutes.js   # /api/campaigns
│   ├── uploadRoutes.js     # /api/upload
│   ├── chatMessages.js     # /api/chat
│   ├── firebaseAuth.js     # /api/firebase
│   ├── favoriteRoutes.js  # /api/favorites
│   ├── stripeRoutes.js    # /api/stripe
│   └── stripeWebhook.js   # /api/stripe/webhook
├── middlewares/             # Express middleware
│   └── authMiddleware.js   # JWT authentication & role checks
├── db/                      # Database configuration
│   └── db.js               # MySQL connection & migrations
├── utils/                   # Utility functions
│   ├── firebase_admin.js   # Firebase Admin SDK setup
│   ├── multer.js          # Multer configurations
│   └── match.js           # Matching algorithm
├── chat/                    # Chat helpers
│   └── chatHelper.js      # Chat creation utilities
├── scripts/                 # Utility scripts
│   └── createDatabase.js  # Database creation script
├── uploads/                 # Uploaded files (gitignored)
│   ├── videos/            # Video files
│   ├── model_photos/      # Model photos
│   └── pdf/               # PDF documents
├── server.js               # Main application entry point
├── package.json            # Dependencies & scripts
├── .env                    # Environment variables (gitignored)
└── README.md              # This file
```

---

## 🔌 API Endpoints

### Authentication
```
POST   /api/auth/register      # Register new user (Model or Agency)
POST   /api/auth/login         # User login, returns JWT token
```

### Model Profiles
```
POST   /api/model/profile      # Create/update model profile [Protected, Model]
GET    /api/model/profile      # Get current model profile [Protected, Model]
GET    /api/model/profile/:userId # Get model profile by user ID
GET    /api/model/matches      # Get approved matches [Protected, Model]
```

### Agency Profiles
```
POST   /api/agency/profile    # Create/update agency profile [Protected, Agency]
GET    /api/agency/profile    # Get current agency profile [Protected, Agency]
POST   /api/agency/upload-pdf  # Upload agency PDF document [Protected, Agency]
```

### Campaigns
```
POST   /api/campaigns         # Create new campaign [Protected, Agency]
PUT    /api/campaigns/:id     # Update campaign [Protected, Agency]
GET    /api/campaigns         # Get all campaigns (filtered by role)
GET    /api/campaigns/:id     # Get campaign by ID
GET    /api/me/campaigns      # Get current user's campaigns [Protected]
```

### Applications & Matches
```
POST   /api/campaigns/:id/apply    # Apply to campaign [Protected, Model]
POST   /api/matches/:matchId/approve # Approve match [Protected, Agency]
GET    /api/matches/status/:campaignId/:modelId # Get match status
```

### File Uploads
```
POST   /api/upload/video      # Upload video file [Protected]
POST   /api/upload/photo      # Upload photo [Protected]
GET    /uploads/videos/:filename # Serve video file
GET    /uploads/model_photos/:filename # Serve photo file
GET    /uploads/pdf/:filename # Serve PDF file
```

### Model Photos
```
POST   /api/model/photos      # Upload model photo [Protected, Model]
GET    /api/model/photos/:modelId # Get model photos
DELETE /api/model/photos/:photoId # Delete photo [Protected, Model]
```

### Chat (Firebase)
```
POST   /api/firebase/token    # Get Firebase custom token [Protected]
GET    /api/chat/:chatId/messages # Get chat messages [Protected]
POST   /api/chat/:chatId/message  # Send message [Protected]
GET    /api/chat/:chatId/poll     # Long polling for new messages [Protected]
```

### Favorites
```
POST   /api/favorites         # Add to favorites [Protected]
GET    /api/favorites         # Get user's favorites [Protected]
DELETE /api/favorites/:id     # Remove from favorites [Protected]
```

### Payments (Stripe)
```
POST   /api/stripe/create-checkout-session # Create checkout session [Protected]
POST   /api/stripe/webhook    # Stripe webhook handler (no auth)
```

### Health Check
```
GET    /api/ping              # Server health check
```

---

## 🗄 Database Schema

### Tables

#### `users`
- `id` (INT, PRIMARY KEY)
- `name` (VARCHAR)
- `email` (VARCHAR, UNIQUE)
- `password` (VARCHAR, hashed with bcrypt)
- `role` (ENUM: 'model', 'agency')
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### `model`
- `id` (INT, PRIMARY KEY)
- `user_id` (INT, FK → users.id)
- `name` (VARCHAR)
- `age` (INT)
- `genre` (ENUM: 'male', 'female', 'other')
- `height` (DECIMAL)
- `location` (VARCHAR)
- `category` (VARCHAR)
- `description` (TEXT)
- `video_portfolio` (VARCHAR, URL)
- `is_pro` (BOOLEAN)
- `card_number` (VARCHAR, nullable)

#### `agency`
- `id` (INT, PRIMARY KEY)
- `agency_id` (INT, FK → users.id)
- `name` (VARCHAR)
- `operating_years` (INT)
- `employees` (INT)
- `location` (VARCHAR)
- `bio` (TEXT)
- `website` (VARCHAR, nullable)
- `vat_number` (VARCHAR, nullable)
- `pdf_path` (VARCHAR, nullable)

#### `campaign`
- `id` (INT, PRIMARY KEY)
- `agency_profile_id` (INT, FK → agency.id)
- `title` (VARCHAR)
- `category` (ENUM)
- `start_date` (DATE)
- `start_time` (TIME)
- `end_date` (DATE)
- `end_time` (TIME)
- `city` (VARCHAR)
- `address` (VARCHAR)
- `compensation` (DECIMAL)
- `description` (TEXT)
- `required_people` (INT)
- `deadline` (DATE)
- `pro_only` (BOOLEAN)
- `gender_preference` (ENUM)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### `campaign_applications`
- `campaign_id` (INT, FK → campaign.id)
- `user_id` (INT, FK → users.id)
- `created_at` (TIMESTAMP)
- PRIMARY KEY (campaign_id, user_id)

#### `campaign_matches`
- `campaign_id` (INT, FK → campaign.id)
- `model_id` (INT, FK → model.id)
- `score` (INT, 0-100)
- `agency_approved` (BOOLEAN)
- `created_at` (TIMESTAMP)
- PRIMARY KEY (campaign_id, model_id)

#### `favorites`
- `agency_id` (INT, FK → agency.id)
- `model_id` (INT, FK → model.id)
- `created_at` (TIMESTAMP)
- PRIMARY KEY (agency_id, model_id)

#### `model_photo`
- `id` (INT, PRIMARY KEY)
- `model_id` (INT, FK → model.id)
- `group_label` (VARCHAR)
- `url` (VARCHAR)
- `position` (INT, 1-based)
- UNIQUE KEY (model_id, group_label, position)

### Automatic Migrations

The database automatically applies schema migrations on startup. Check `db/db.js` for migration logic.

---

## 🔧 Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here_min_32_chars

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=vellena

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:8080

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Firebase Configuration (optional - for chat)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY_ID=your_key_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_CLIENT_ID=your_client_id
FIREBASE_CLIENT_X509_CERT_URL=your_cert_url
```

### Required Variables
- `PORT` - Server port (default: 3000)
- `JWT_SECRET` - Secret key for JWT tokens
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` - MySQL credentials
- `FRONTEND_URL` - Allowed CORS origin

### Optional Variables
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` - For payment processing
- Firebase credentials - For real-time chat functionality

---

## 🔐 Authentication

### Registration

```json
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePassword123!",
  "role": "model" // or "agency"
}
```

### Login

```json
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePassword123!"
}

Response:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "model"
  }
}
```

### Using JWT Token

Include the token in the `Authorization` header:
```
Authorization: Bearer <your_jwt_token>
```

### Protected Routes

Routes marked with `[Protected]` require authentication. Some routes have role restrictions:
- `[Protected, Model]` - Only models can access
- `[Protected, Agency]` - Only agencies can access

---

## 📁 File Uploads

### Video Upload
```javascript
POST /api/upload/video
Content-Type: multipart/form-data
Authorization: Bearer <token>

Form Data:
- file: <video_file> (max 50MB, MP4)
```

### Photo Upload
```javascript
POST /api/upload/photo
Content-Type: multipart/form-data
Authorization: Bearer <token>

Form Data:
- file: <image_file> (max 10MB, JPEG/PNG)
- modelId: <model_id>
- groupLabel: <group_label> (optional)
- position: <position> (optional)
```

### PDF Upload (Agency)
```javascript
POST /api/agency/upload-pdf
Content-Type: multipart/form-data
Authorization: Bearer <token>

Form Data:
- file: <pdf_file> (max 10MB, PDF)
```

### File Serving

Uploaded files are served statically:
- Videos: `http://localhost:3000/uploads/videos/<filename>`
- Photos: `http://localhost:3000/uploads/model_photos/<filename>`
- PDFs: `http://localhost:3000/uploads/pdf/<filename>`

---

## 🏗 Architecture

### Request Flow

```
Client Request
    ↓
Express Middleware (CORS, JSON parsing)
    ↓
Route Handler (authentication check)
    ↓
Controller (business logic)
    ↓
Database Query / External API
    ↓
Response (JSON)
```

### Error Handling

- **Validation Errors** - 400 Bad Request
- **Authentication Errors** - 401 Unauthorized
- **Authorization Errors** - 403 Forbidden
- **Not Found** - 404 Not Found
- **Server Errors** - 500 Internal Server Error

Error responses follow this format:
```json
{
  "success": false,
  "msg": "Error message",
  "error": "Detailed error (development only)"
}
```

### Database Connection

- **Connection Pooling** - Efficient connection management
- **Automatic Reconnection** - Handles connection failures gracefully
- **Migration System** - Automatic schema updates on startup

### Security Features

- **Password Hashing** - Bcrypt with salt rounds
- **JWT Tokens** - Secure, stateless authentication
- **CORS Protection** - Restrictive CORS policy
- **Input Validation** - Sanitize user inputs
- **SQL Injection Prevention** - Parameterized queries
- **File Upload Limits** - Size and type restrictions

---

## 💻 Development Guide

### Adding a New Endpoint

1. **Create Controller** in `controllers/`
   ```javascript
   // controllers/myController.js
   exports.myHandler = async (req, res) => {
     try {
       // Business logic
       res.json({ success: true, data: result });
     } catch (error) {
       res.status(500).json({ success: false, msg: error.message });
     }
   };
   ```

2. **Create Route** in `routes/`
   ```javascript
   // routes/myRoutes.js
   const router = express.Router();
   const { myHandler } = require("../controllers/myController.js");
   const { protect } = require("../middlewares/authMiddleware.js");
   
   router.get("/my-endpoint", protect, myHandler);
   module.exports = router;
   ```

3. **Register Route** in `server.js`
   ```javascript
   const myRoutes = require("./routes/myRoutes.js");
   app.use("/api/my", myRoutes);
   ```

### Database Migrations

Add migration logic in `db/db.js`:
```javascript
db.query(`
  ALTER TABLE my_table 
  ADD COLUMN IF NOT EXISTS new_column VARCHAR(255)
`, (err) => {
  if (err && err.code !== 'ER_DUP_FIELDNAME') {
    console.error("Migration error:", err);
  } else {
    console.log("✅ Migration applied");
  }
});
```

### Testing Firebase Integration

1. Create Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Generate service account key
3. Place `serviceAccountKey.json` in project root
4. Restart server

---

## 🐛 Troubleshooting

### Database Connection Issues

**Error**: `Access denied for user`
- Check `.env` database credentials
- Verify MySQL user has proper permissions

**Error**: `ER_BAD_DB_ERROR`
- Database doesn't exist
- Run `npm run create-db` or create manually

### Firebase Chat Not Working

**Error**: `Firebase not configured`
- Ensure `serviceAccountKey.json` exists
- Check Firebase credentials in `.env` (production)
- See console warnings for details

### File Upload Failures

**Error**: `File too large`
- Check Multer file size limits in `utils/multer.js`
- Default: Videos 50MB, Photos 10MB, PDFs 10MB

**Error**: `Invalid file type`
- Verify file extensions are allowed
- Videos: `.mp4`, Photos: `.jpg`, `.jpeg`, `.png`, PDFs: `.pdf`

### CORS Issues

**Error**: `CORS policy blocked`
- Check `FRONTEND_URL` in `.env`
- Ensure frontend URL matches exactly (including port)

---

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start development server with nodemon |
| `npm run create-db` | Create MySQL database if it doesn't exist |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Maintenance tasks

---

## 📄 License

This project is proprietary software. All rights reserved.

---

## 📞 Support

For support, email [muntazer.mehdi.rizvi@gmail.com] or open an issue in the repository.
