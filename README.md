
# Echo 📝

An AI-assisted web-based conversational journaling system designed to provide an interactive and reflective journaling experience.

🌐 **Live Demo:** [https://conversational-journal.vercel.app/](https://conversational-journal.vercel.app/)

## Overview
Echo transforms traditional journaling into a dynamic conversation. By integrating natural language processing and voice transcription, it allows users to reflect on their day through intelligent, multi-modal interactions.

## Features
* **Conversational Journaling:** Engage in reflective dialogues and narrative synthesis powered by the Google Gemini API.
* **Speech-to-Text Integration:** Voice journaling capabilities enabled by the Deepgram Speech-to-Text API.
* **Emotion Classification:** Analyze and categorize journal entries using Hugging Face DistilBERT models.
* **Secure Storage:** Persistent and secure database management for user entries and profiles.

## Tech Stack
* **Frontend/Framework:** Next.js, React
* **Backend:** Node.js
* **Database & Auth:** Supabase, PostgreSQL
* **Deployment:** Vercel
* **AI & Machine Learning:** Google Gemini API, Hugging Face DistilBERT, Deepgram API

## Getting Started

### Prerequisites
* Node.js (v18 or higher)
* A Supabase account and project
* API keys for Google Gemini, Deepgram, and Hugging Face

### Installation

1. **Clone the repository**
   ```bash
   git clone [https://github.com/yourusername/echo.git](https://github.com/yourusername/echo.git)
   cd echo

```

2. **Install dependencies**
```bash
npm install

```


3. **Environment Setup**
Create a `.env.local` file in the root directory and add your API keys and database URLs:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
DEEPGRAM_API_KEY=your_deepgram_api_key
HUGGINGFACE_API_KEY=your_huggingface_api_key

```


4. **Run the development server**
```bash
npm run dev

```


Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Acknowledgments

Special thanks to Ts. Dr. Manoranjitham A/P Muniandy for supervision and guidance throughout the development of this Final Year Project at Universiti Teknologi PETRONAS.

## Author

**Wafy**

```

```