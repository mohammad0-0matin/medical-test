# Health/Medical Domain Strict Rules

## 1. Data Integrity & Safety (Soft Deletes)
- **Never Hard Delete:** NEVER use `.delete()` on critical records like Patient Profiles, Appointments, or Medical Histories. Implement Soft Deletes (e.g., adding an `is_deleted = True` boolean or `deleted_at` timestamp) and filter them out in custom Model Managers.
- **Audit Trails:** For every critical action (creating a prescription, changing a diagnosis), ensure the system logs which user performed the action and at what time.

## 2. Security & Privacy (Data Masking)
- **UUIDs for Endpoints:** Use `UUIDField` as the primary key for URLs (e.g., `/api/patients//`) instead of sequential integers (`id=1`) to prevent attackers from guessing patient counts or scraping data.
- **Data Minimization:** Serializers must NEVER expose sensitive fields (like National ID, exact home address, or full medical history) on list endpoints unless specifically requested and authenticated.

## 3. Object-Level Permissions
- Ensure strict permission checks. A doctor must only be able to retrieve or modify records belonging to their assigned patients. Always apply `.filter(doctor=request.user)` or similar authorization checks before returning querysets.