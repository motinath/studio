"""Qiskit Metal parameter metadata extraction."""
from __future__ import annotations

import logging
import re

from app.core.registry_cache import registry_cache
from app.core.editor_models import ComponentMetadata, ParameterSpec

log = logging.getLogger(__name__)


class MetadataService:
    """Extract parameter schemas from QComponent defaults."""

    @staticmethod
    def _cache_key(component_id: str) -> str:
        return f"metadata:{component_id}"

    def extract_metadata(self, component_id: str) -> ComponentMetadata:
        """Read and classify a component's default options from catalog cache."""
        from app.services.component_registry import component_registry_service

        item = component_registry_service.get_catalog_item(component_id)
        parameters = []

        if item is None:
            log.warning("Metadata requested for unknown component %s. Returning default empty metadata.", component_id)
        else:
            try:
                for p in item.get("parameters", []):
                    parameters.append(ParameterSpec(**p))
            except Exception as exc:
                log.warning("Could not load options metadata for %s: %s", component_id, exc)

        route_ids = [
            component.id
            for component in component_registry_service.list_components()
            if component.category == "routes"
        ]

        return ComponentMetadata(
            id=component_id,
            parameters=parameters,
            supportedRouteComponents=route_ids or None,
        )

    def get_metadata(self, component_id: str) -> ComponentMetadata:
        return registry_cache.get_or_set(
            self._cache_key(component_id),
            lambda: self.extract_metadata(component_id),
        )


metadata_service = MetadataService()

