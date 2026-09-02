"""Application configuration for the core medical-test app."""
from django.apps import AppConfig


class CoreConfig(AppConfig):
    """Django application configuration for the ``core`` app."""

    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'
