# 🛠️ EditSync Backend

**EditSync Backend** is the server-side engine of the EditSync collaborative document editor. It supports real-time collaboration, user and document management, and secure authentication via JWT. Built with **Node.js**, **Express**, **MongoDB**, and **Socket.IO**, it enables fast, scalable editing and sharing of markdown documents.

![Node.js](https://img.shields.io/badge/Node.js-14+-green?logo=node.js)
![Express](https://img.shields.io/badge/Express.js-black?logo=express)
![MongoDB](https://img.shields.io/badge/MongoDB-%20-green?logo=mongodb)
![Socket.IO](https://img.shields.io/badge/Socket.IO-%20-black?logo=socket.io)

## Features

- JWT-based user authentication
- Create, edit, delete, and share documents
- Collaborative editing
- Email notifications via SMTP
- Secure password hashing with bcrypt

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB instance (local or cloud)
- npm or yarn

### Setup Instructions

```bash
git clone https://github.com/your-username/edit-sync-backend
cd edit-sync-backend
npm install
````

Create a `.env` file in the root directory with the following content:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
FRONTEND_URL=http://localhost:8080

# Email/SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
GMAIL_USER=your_email@gmail.com
GMAIL_APP_PASSWORD=your_gmail_app_password
SMTP_FROM=your_email@gmail.com
```

Start the backend server:

```bash
npm start
```

The server will run on [http://localhost:5000](http://localhost:5000).

## Deployment

You can deploy the backend to platforms like:

* **Render**
* **Railway**
* **Heroku**
* **Any Node.js-compatible cloud server**

### Notes for Deployment

* Set all environment variables in the hosting dashboard or via CLI
* Use a production-ready MongoDB service like **MongoDB Atlas**
* Ensure CORS is configured to allow your frontend's domain
* Protect environment variables and secrets in deployment pipelines

## License

This project is licensed under the [MIT License](LICENSE).
