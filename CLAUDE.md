# CLAUDE.md - Development Guidelines

## Build Commands
- Frontend: `cd frontend && npm install && npm run dev` (http://localhost:5174)
- Backend: `cd backend && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt && python app.py` (http://localhost:8000)
- Build: `cd frontend && npm run build`

## Code Style Guidelines
- TypeScript for frontend, Python for backend
- 2-space indentation in all files
- Use React functional components with hooks
- Strong typing with TypeScript interfaces (see APIService.ts)
- Error handling: try/catch blocks with console.error logging
- Use TailwindCSS for styling with class naming conventions
- API service pattern for backend communication

## Naming Conventions
- PascalCase for React components
- camelCase for variables, functions, and methods
- Use descriptive function/variable names
- Type interfaces with prefix 'I' or descriptive names
- Backend: snake_case for variables and functions

## Architecture Notes
- Frontend: React + TypeScript + Vite
- Backend: Flask Python application
- APIService pattern for all backend communication