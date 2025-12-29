# Study.io - AI-Powered Study Platform

Study.io is a premium web application designed to help users learn more effectively by generating study content from prompts and converting it into high-quality audio using AI.

## 🚀 Features

### 1. AI Content Generation
- Generate study guides, summaries, and explanations using OpenAI's GPT models.
- Support for various topics and custom prompts.
- Multiple session durations (3, 5, 10 minutes).

### 2. Audio Synthesis
- High-quality neural text-to-speech using AWS Polly.
- Synchronized text highlighting during playback.
- Authenticated audio streaming with short-lived sessions.

### 3. Admin Dashboard
- **User Management**: View and manage user accounts and plans.
- **Usage Metrics**: Track OpenAI token usage, Polly character counts, and total costs.
- **Prompt History**: View all generated study sessions across the platform.
- **App Configuration**: Real-time control over feature toggles, trial limits, and topic presets.

### 4. Security & Optimization
- **Role-Based Access Control (RBAC)**: Distinct User and Admin roles.
- **Rate Limiting**: Protection against abuse for content generation and audio streaming.
- **Short-Lived Tokens**: Secure audio playback via temporary JWT tokens.
- **Caching**: Optimized performance by caching generated sessions.

## 🛠 Tech Stack

- **Backend**: FastAPI (Python), MongoDB Atlas (Motor), AWS Polly, OpenAI API.
- **Frontend**: React, Lucide React (Icons), Vanilla CSS (Premium Design).
- **Authentication**: JWT-based authentication.

## 🏁 Getting Started

### Prerequisites
- Python 3.9+
- Node.js & npm
- MongoDB Atlas account
- AWS Account (for Polly)
- OpenAI API Key

### Backend Setup
1. Clone the repository.
2. Create a virtual environment: `python -m venv env`.
3. Install dependencies: `pip install -r requirements.txt`.
4. Configure environment variables in `.env` (see `.env.example`).
5. Start the server: `uvicorn app.main:app --reload`.

### Frontend Setup
1. Navigate to the `frontend` directory.
2. Install dependencies: `npm install`.
3. Start the development server: `npm run dev`.

## 🛡 Security
- Audio streaming is protected by short-lived tokens.
- Admin endpoints require the `admin` role.
- Rate limiting is applied to all sensitive endpoints.

## 📊 Cost Tracking
The platform tracks costs in real-time:
- **OpenAI**: ~$0.045 per 1k tokens.
- **AWS Polly**: $16.00 per 1M characters (Neural).

---
Built with ❤️ by the Study.io Team.
# studyio
# updated by Pallav
