"""Tests for the FastAPI endpoints."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    """Create a FastAPI test client."""
    from physics_engine.api.app import app
    return TestClient(app)


class TestHealthEndpoint:
    """Tests for the health check endpoint."""

    def test_health_returns_200(self, client) -> None:
        response = client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "version" in data


class TestSchemasEndpoint:
    """Tests for the JSON schema endpoint."""

    def test_em_results_schema(self, client) -> None:
        response = client.get("/api/v1/schemas/em_results")
        assert response.status_code == 200
        schema = response.json()
        assert "properties" in schema

    def test_design_spec_schema(self, client) -> None:
        response = client.get("/api/v1/schemas/design_spec")
        assert response.status_code == 200

    def test_physics_report_schema(self, client) -> None:
        response = client.get("/api/v1/schemas/physics_report")
        assert response.status_code == 200

    def test_unknown_schema_returns_404(self, client) -> None:
        response = client.get("/api/v1/schemas/nonexistent")
        assert response.status_code == 404
