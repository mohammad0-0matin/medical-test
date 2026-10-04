---
name: django-mastery
description: Use for any Django/DRF backend work in Salamat Yar: models, migrations, querysets, serializers, views, API endpoints, permissions and business logic. Covers ORM optimization, thin views and consistent API errors.
---

# Django backend rules

Also read `.agent/rules/health-project-rules.md`. It covers soft deletes, UUID endpoints, audit trails and object-level permissions, and it wins if the two files ever conflict.

## Models

- Every model has a meaningful `__str__`, so admin, logs and debugging stay readable.
- Every model has a `Meta` class with explicit `ordering`. Without it, pagination can return rows in an unstable order.

## Queries

- Never run queries inside loops (the N+1 problem).
- Use `select_related` for ForeignKey and OneToOne fields, and `prefetch_related` for ManyToMany and reverse relations.
- Every list endpoint gets a test that checks the query count (`django_assert_num_queries` from pytest-django), so regressions are caught.

## Architecture

- Views only parse the request, validate input, call the model or service layer, and return the response.
- Simple rules that involve one model (state changes, computed values) go in model methods or custom managers.
- Logic that spans several models, needs a transaction, or has side effects (notifications, audit logs) goes in the app's `services.py`. Wrap multi-step writes in `transaction.atomic()`.

## API (Django REST Framework)

- Use standard status codes: 201 on creation, 400 for bad input, 401 unauthenticated, 403 forbidden, 404 not found.
- Error responses always use this shape: `{"error": "human readable message", "code": "ERROR_CODE"}`. This needs a custom exception handler registered as `REST_FRAMEWORK["EXCEPTION_HANDLER"]`. Check that one exists before adding endpoints, and create it if not.
- Use separate list and detail serializers. List serializers never expose sensitive fields (national ID, address, full history).
- Paginate every list endpoint.

## Tests

- Use pytest. Cover the normal case, validation errors, and permission isolation (one doctor must not be able to read another doctor's patient).
- Never use real patient data. Use English sample names and values in tests and fixtures.
