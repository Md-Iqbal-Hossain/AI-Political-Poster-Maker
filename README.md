# AI Political Poster Maker

AI Political Poster Maker is a full-stack web application for generating high-quality political posters with accurate Bangla typography, AI-assisted content generation using Google Gemini API, image hosting via Cloudinary, and PDF/image export using Puppeteer.

## Tech Stack

- **Frontend**: Next.js (App Router), TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript
- **Database**: MongoDB Atlas, Mongoose
- **Auth**: JWT (JSON Web Tokens)
- **Storage**: Cloudinary
- **AI Integration**: Google Gemini API
- **Poster Rendering**: HTML/CSS + Puppeteer (with accurate Bangla font support)

## Project Structure

```text
AI-Political-Poster-Maker/
├── client/          # Next.js frontend application
├── server/          # Express + TypeScript backend API
├── README.md        # Project overview & documentation
└── .gitignore       # Git ignore rules
```

## Scaffolding Setup (Phase 1)

1. Client: `cd client && npm install`
2. Server: `cd server && npm install`

Refer to `client/.env.example` and `server/.env.example` for required environment variables.
