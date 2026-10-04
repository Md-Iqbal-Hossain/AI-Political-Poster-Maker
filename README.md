# AI Political Poster Maker

AI Political Poster Maker is a full-stack web application for generating high-quality political posters with accurate Bangla typography and AI-assisted layout generation.

Users can select a poster template, enter poster information, upload up to three photos, and generate a ready-to-use poster using Google Gemini for AI-assisted layout and decoration suggestions.

## Live Demo

https://ai-political-poster-maker-s1me.vercel.app/

## Features

* User registration and login
* JWT-based authentication
* Template library with occasion-based templates
* Poster generation with AI-assisted layout suggestions
* Bangla headline and text support
* Upload up to 3 photos
* Cloudinary image storage
* High-resolution 1200 × 1600 PNG poster generation
* Poster preview
* Poster regeneration with limited retries
* User-specific poster history
* Re-download generated posters
* Responsive user interface
* Generation rate limiting
* Secure user-level access control

## Tech Stack

### Frontend

* Next.js (App Router)
* TypeScript
* Tailwind CSS

### Backend

* Node.js
* Express.js
* TypeScript

### Database

* MongoDB Atlas
* Mongoose

### Authentication

* JWT (JSON Web Tokens)
* HTTP-only cookies
* bcryptjs

### AI

* Google Gemini API

### File Storage

* Cloudinary

### Poster Rendering

* HTML
* CSS
* Puppeteer
* Bangla font support

### Validation & Security

* Zod
* CORS
* Authentication middleware
* Rate limiting
* File type and size validation
* User-level data isolation

## Project Architecture

The application uses a client-server architecture where the Next.js frontend communicates with the Express.js backend through REST APIs.

```text
                    ┌──────────────────────┐
                    │      Next.js         │
                    │      Frontend        │
                    └──────────┬───────────┘
                               │
                               │ REST API
                               ▼
                    ┌──────────────────────┐
                    │      Express.js      │
                    │       Backend        │
                    └──────┬───────┬───────┘
                           │       │
             ┌─────────────┘       └─────────────┐
             ▼                                   ▼
      ┌──────────────┐                    ┌──────────────┐
      │ MongoDB Atlas│                    │  Cloudinary  │
      │  + Mongoose  │                    │    Storage   │
      └──────────────┘                    └──────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ Google Gemini│
                    │     API      │
                    └──────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ HTML/CSS +   │
                    │   Puppeteer  │
                    └──────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ High-Res PNG │
                    │    Poster    │
                    └──────────────┘
```

## Project Structure

```text
AI-Political-Poster-Maker/
├── client/                  # Next.js frontend application
│   ├── src/
│   ├── public/
│   └── package.json
│
├── server/                  # Express + TypeScript backend API
│   ├── src/
│   └── package.json
│
├── README.md
└── .gitignore
```

## Poster Generation Flow

```text
1. User selects a poster template
          ↓
2. User enters poster information
          ↓
3. User uploads up to 3 photos
          ↓
4. Photos are uploaded to Cloudinary
          ↓
5. Poster data is sent to the backend
          ↓
6. Gemini provides AI-assisted layout
   and visual property suggestions
          ↓
7. Backend combines the template,
   uploaded photos, AI suggestions,
   and user-provided text
          ↓
8. HTML/CSS poster is rendered with Puppeteer
          ↓
9. High-resolution PNG is generated
          ↓
10. Poster is saved and displayed to the user
```

The final poster is rendered using HTML/CSS rather than relying on an AI image model to generate the text. This provides accurate Bangla typography and precise placement of user-provided content.

## Poster Information

Users can provide:

* Name
* Designation
* Party / Organization
* Location
* Occasion
* Bangla headline
* Up to 3 photos

## Image Upload

Uploaded images are stored using Cloudinary.

Supported formats:

* JPEG
* PNG
* WEBP

Maximum:

* 3 images per poster
* 5 MB per image

## Poster Output

Generated posters are rendered at:

```text
1200 × 1600 pixels
```

The rendering pipeline supports Bangla fonts and preserves the exact user-provided text.

## API Endpoints

### Authentication

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/logout
```

### Templates

```text
GET /api/templates
GET /api/templates/:id
```

### Uploads

```text
POST /api/uploads
```

### Posters

```text
POST /api/posters/generate
GET  /api/posters/:id
GET  /api/posters/user/:userId
POST /api/posters/:id/regenerate
```

### Health Check

```text
GET /api/health
```

## Security

The application includes:

* JWT authentication
* HTTP-only authentication cookies
* Password hashing with bcrypt
* Protected API routes
* User-level poster access control
* Zod input validation
* File type validation
* File size validation
* Generation rate limiting
* Regeneration limits
* CORS configuration
* Protected upload operations

## Local Development

### Prerequisites

* Node.js
* npm
* MongoDB Atlas
* Cloudinary account
* Google Gemini API key

### Clone the repository

```bash
git clone https://github.com/Md-Iqbal-Hossain/AI-Political-Poster-Maker.git

cd AI-Political-Poster-Maker
```

### Install frontend dependencies

```bash
cd client
npm install
```

### Install backend dependencies

```bash
cd ../server
npm install
```

### Environment Variables

Use the provided environment variable examples:

```text
client/.env.example
server/.env.example
```

Configure the required values for:

* MongoDB
* JWT
* Cloudinary
* Google Gemini
* Frontend API URL

### Run the backend

From the `server` directory:

```bash
npm run dev
```

### Run the frontend

From the `client` directory:

```bash
npm run dev
```

The frontend runs at:

```text
http://localhost:3000
```

The backend runs at:

```text
http://localhost:5000
```

## Template Seeding

To seed the initial poster templates:

```bash
cd server
npm run seed:templates
```

## Deployment

The application is deployed using:

* **Frontend:** Vercel
* **Backend:** Vercel
* **Database:** MongoDB Atlas
* **Image Storage:** Cloudinary
* **AI:** Google Gemini API

## License

This project is for demonstration and development purposes.
