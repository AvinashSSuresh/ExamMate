# ExamMate

Exam timetable scheduler built with React, Vite, Tailwind CSS and Supabase.

## Setup

1. Clone the repository and open the folder:
   git clone https://github.com/<your-username>/ExamMate.git
   cd ExamMate

2. Install dependencies:
   npm install

3. Create a Supabase project at https://supabase.com.

4. Run `supabase/schema.sql` in the Supabase SQL Editor.

5. In Supabase, go to Authentication > URL Configuration and set:
   - Site URL: http://localhost:5173
   - Redirect URLs: http://localhost:5173/reset-password and http://localhost:5173/login

6. Copy `.env.example` to `.env` and fill in your project URL and anon key
   (Project Settings > API).

7. Start the app:
   npm run dev

Open http://localhost:5173 in your browser.

## Never commit

- `.env` (contains your Supabase keys)
- The `service_role` key, under any name