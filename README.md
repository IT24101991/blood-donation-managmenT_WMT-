# Lifeline - Blood Donation Management System

A comprehensive full-stack application designed to streamline blood donation management, connecting donors, hospitals, camps, and administrators in a seamless ecosystem.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Getting Started](#getting-started)
- [API Documentation](#api-documentation)
- [Database](#database)

## Overview

**Lifeline** is a modern blood donation management platform that facilitates:
- Donors in finding donation camps and scheduling appointments
- Hospitals in managing blood inventory and requests
- Camps in organizing blood donation drives
- Administrators in overseeing the entire system

The platform consists of a robust backend API and a mobile-first React Native application.

## Features

### For Donors
- Secure authentication and profile management
- Find nearby donation camps with GPS integration
- Schedule and manage appointments
- View eligibility requirements
- Receive emergency blood donation alerts
- In-app chat with hospitals

### For Hospitals
- Manage blood inventory in real-time
- Request blood from available donors
- Manage donor relationships
- View donation history and analytics
- Send emergency blood requests

### For Camps
- Organize blood donation drives
- Set location and schedule
- Track donor participation
- Generate reports

### For Administrators
- System-wide management and oversight
- Manage users (donors, hospitals, admins)
- View comprehensive analytics
- Access control and permissions
- Activity logging and auditing

## Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs
- **File Upload**: Multer
- **Logging**: Morgan
- **API Testing**: REST
- **CORS**: Enabled for cross-origin requests

### Mobile
- **Framework**: React Native with Expo
- **State Management**: Context API
- **Navigation**: React Navigation
- **HTTP Client**: Axios
- **Storage**: Async Storage, Expo SecureStore
- **UI Components**: Custom components with Lucide icons
- **Platforms**: iOS & Android

### Additional Tools
- Version Control: Git & GitHub
- Package Manager: npm / yarn
- Development: Hot reload, Watch mode

## Project Structure

```
lifeline-project/
├── lifeline-backend-deploy/          # Backend API (Node.js + Express)
│   ├── src/
│   │   ├── app.js                   # Express app configuration
│   │   ├── config/                  # Configuration files
│   │   │   └── db.js               # MongoDB connection
│   │   ├── controllers/             # Route controllers
│   │   ├── models/                  # MongoDB schemas
│   │   ├── routes/                  # API routes
│   │   ├── middleware/              # Custom middleware
│   │   ├── utils/                   # Helper utilities
│   │   └── scripts/                 # Database scripts
│   ├── server.js                    # Server entry point
│   ├── package.json
│   └── README.md
│
├── lifeline-mobile/                  # Mobile App (React Native + Expo)
│   ├── src/
│   │   ├── screens/                 # Screen components
│   │   ├── components/              # Reusable components
│   │   ├── navigation/              # Navigation configuration
│   │   ├── context/                 # React Context
│   │   ├── services/                # API services
│   │   ├── constants/               # App constants
│   │   └── utils/                   # Helper functions
│   ├── App.js                       # Main app component
│   ├── android/                     # Android native code
│   ├── ios/                         # iOS native code
│   ├── package.json
│   └── eas.json                     # EAS build configuration
│
└── README.md (this file)
```

## Prerequisites

Ensure you have the following installed:

- Node.js (v16 or higher)
- npm (v8 or higher) or yarn
- MongoDB (v5.0 or higher)
- Git
- Expo CLI (for mobile development)
  ```bash
  npm install -g expo-cli
  ```

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/lifeline-project.git
cd lifeline-project
```

### 2. Backend Setup

```bash
cd lifeline-backend-deploy
npm install
```

### 3. Mobile Setup

```bash
cd ../lifeline-mobile
npm install
```

## Configuration

### Backend Configuration

Create a `.env` file in the `lifeline-backend-deploy/` directory:

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/lifeline
# OR for MongoDB Atlas
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/lifeline

# JWT
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d

# CORS
CORS_ORIGIN=*

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_DIR=uploads
```

### Mobile Configuration

Create a `.env` file in the `lifeline-mobile/` directory:

```env
# API Configuration
API_BASE_URL=http://your-backend-url:5000/api
EXPO_PUBLIC_API_URL=http://your-backend-url:5000/api

# Feature Flags
ENABLE_LOCATION_TRACKING=true
```

### Database Configuration

Ensure MongoDB is running locally or provide Atlas connection string in `.env`.

Start MongoDB (if local):
```bash
mongod
```

## Getting Started

### Start Backend Server

```bash
cd lifeline-backend-deploy

# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

Server will run on `http://localhost:5000`

### Start Mobile App

```bash
cd lifeline-mobile

# Start Expo development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run on Web
npm run web
```

### Database Seeding (Optional)

Populate the database with initial data:

```bash
cd lifeline-backend-deploy
npm run seed
```

## API Documentation

### Base URL
```
http://localhost:5000/api
```

### Main Endpoints

#### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout

#### Donors
- `GET /donors` - List all donors
- `GET /donors/:id` - Get donor details
- `PUT /donors/:id` - Update donor profile
- `GET /donors/:id/appointments` - Get donor appointments

#### Hospitals
- `GET /hospitals` - List all hospitals
- `GET /hospitals/:id` - Get hospital details
- `POST /hospitals/requests` - Create blood request
- `GET /hospitals/:id/inventory` - Get blood inventory

#### Appointments
- `GET /appointments` - List appointments
- `POST /appointments` - Create appointment
- `PUT /appointments/:id` - Update appointment
- `DELETE /appointments/:id` - Cancel appointment

#### Camps
- `GET /camps` - List donation camps
- `POST /camps` - Create camp
- `PUT /camps/:id` - Update camp
- `DELETE /camps/:id` - Delete camp

#### Emergency
- `POST /emergency/requests` - Create emergency request
- `GET /emergency/requests` - Get emergency requests

#### Activity Logs
- `GET /activity` - View activity logs
- `GET /activity/user/:userId` - Get user activity

For detailed API documentation, see [DATABASE_COLLECTIONS_GUIDE.md](./lifeline-backend-deploy/DATABASE_COLLECTIONS_GUIDE.md)

## Database

### Collections Overview

The application uses MongoDB with the following main collections:

- Users - Stores user information (donors, hospitals, admins)
- Donors - Extended donor information and eligibility
- Hospitals - Hospital details and blood inventory
- Appointments - Blood donation appointments
- Camps - Blood donation camp information
- EmergencyRequests - Emergency blood requests
- HospitalRequests - Blood requests from hospitals
- Inventory - Blood inventory management
- ActivityLogs - System activity tracking

For detailed database schema information, see [DATABASE_COLLECTIONS_GUIDE.md](./lifeline-backend-deploy/DATABASE_COLLECTIONS_GUIDE.md)

### Database Validation

To validate the database setup:

```bash
cd lifeline-backend-deploy
node src/scripts/validateDB.js
```
