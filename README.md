# Chatrr -- Real-Time Chat Application

Chatrr is a modern real-time chat application built with the MERN stack and Socket.IO, featuring Google Authentication, real-time messaging, and a responsive UI designed with Tailwind CSS.

------------------------------------------------------------------------

### 🔗 Live Demo

![Chatrr Screenshot](https://github.com/user-attachments/assets/350c9200-07c9-4177-b610-ef868f9448f3)\
🌐 [chatrr-client.onrender.com](https://chatrr-client.onrender.com/)

------------------------------------------------------------------------

### 🔍 Overview

-   **User Login/Logout**\
![User Login/Logout Screenshot](https://github.com/user-attachments/assets/25040ab1-2ee7-45c3-a99d-b4ce91ced62b)

-   **Connections**\
![Connections Screenshot](https://github.com/user-attachments/assets/727b3f15-240c-414c-b9ae-20033592f1b8)

-   **Current User Profile**\
![Current User Profile Screenshot](https://github.com/user-attachments/assets/3f8d9780-3c7f-4528-8680-7d8132fdf8f0)

-   **Selected User Profile**\
![Selected User Profile Screenshot](https://github.com/user-attachments/assets/6da01cf2-4857-48af-b0e6-e66fe0295562)

-   **Settings**\
![Settings Screenshot](https://github.com/user-attachments/assets/4eb6afb8-9f0a-42a4-a5a7-0d7f3bdcdc84)


------------------------------------------------------------------------

### ✨ Features

-   **Google Authentication** -- Secure login with Google OAuth
-   **Real-time Messaging** -- Instant message delivery using Socket.IO
-   **Cloudinary** -- Saves chat images to cloudinary and gets the image link to preview
-   **Typing Indicators** -- See when friends are typing
-   **Friend System** -- Add, manage requests, unfriend, search
-   **Responsive Design** -- Works seamlessly on desktop and mobile
-   **daisyUi Themes** -- 32 Themes from daisyUi

------------------------------------------------------------------------

### 🛠️ Tech Stack

**Frontend:** 
- React + Vite 
- Socket.IO Client 
- daisyUi 
- Tailwind CSS 
- React Router 
- Context API for state management 

**Backend:** 
- Node.js + Express.js 
- MongoDB Atlas + Mongoose 
- Socket.IO 
- Cloudinary
- Passport-google-oauth20
- JWT + Bcrypt for Auth (Google OAuth)

**Deployment:** 
- Render (Frontend + Backend)

------------------------------------------------------------------------

### 📁 Project Structure

```
├── client/ # Frontend React application
│ ├── src/
│ │ ├── components/ # Reusable UI components
│ │ ├── context/ # React Context providers
│ │ ├── hooks/ # Custom React hooks
│ │ ├── pages/ # Application pages
│ │ └── utils/ # Utility functions
│
└── server/ # Backend Node.js application
├── config/ # Configuration files
├── middleware/ # Express middlewares
├── models/ # MongoDB models
├── routes/ # API routes
└── src/ # Server source code
```

------------------------------------------------------------------------

### 🧑‍💻 Local Setup

#### Backend

``` bash
cd server
npm install
```

Create `.env` file in `server/`:

    clientID=your_google_client_id
    clientSecret=your_google_client_secret
    MONGODB_URI=your_mongodb_uri
    JWT_SECRET=your_jwt_secret
    PORT=3000
    SESSION_SECRET=your_session_secret
    JWT_SECRET=your_jwt_secret
    FRONTEND_URL=http://localhost:5173

Start server:

``` bash
npm run dev
```

#### Frontend

Create `.env` file in `client/`:

    VITE_API_BASE_URL=http://localhost:3000

Start client:

``` bash
cd client
npm install
npm run dev
```

App runs at: <http://localhost:5173>

------------------------------------------------------------------------
