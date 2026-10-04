# Project Core Skills & Rules (SalamatYar)

## 1. Backend (Django & DRF)
- **Architecture:** Use Django REST Framework (DRF) with ModelViewSets and Routers.
- **Coding Standards:** Follow PEP8 strictly. Keep views thin and put business logic in models or separate service/utils files.
- **Responses:** Always return standardized JSON responses. Handle exceptions gracefully.
- **Auth:** Rely on JWT (`rest_framework_simplejwt`). Endpoints should check permissions via `IsAuthenticated` where necessary.

## 2. Frontend (React)
- **Components:** Write ONLY functional components with React Hooks (`useState`, `useEffect`, etc.). No class components.
- **State Management:** When dealing with dynamic arrays (like prescription items or medical tests), use immutable state updates (e.g., `setItems([...items, newItem])`).
- **API Calls:** Always structure API calls asynchronously (`async/await`) and handle `try/catch` blocks. Include JWT Bearer tokens in headers.
- **Styling:** Keep inline styles minimal; rely on the project's standard CSS utility classes or styled components currently in use.
- **UX:** Always include loading states (disabled buttons/spinners) and clear error/success messages.

## 3. General AI Behavior
- **Context First:** Read referenced files completely before proposing changes.
- **No Dummy Code:** Provide complete, working code blocks instead of `// do something here` placeholders.
- **Language:** Variables, models, and API endpoints must be in English. User-facing labels, toasts, and UI texts must be in Persian (Farsi).