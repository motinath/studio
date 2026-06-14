import json
import logging
from pathlib import Path
from typing import List, Optional, Dict

from app.core.editor_models import ComponentSummary

log = logging.getLogger(__name__)


class ComponentRegistryService:
    def __init__(self) -> None:
        self._components_map: Dict[str, dict] = {}
        self._load_catalog()

    def _load_catalog(self) -> None:
        try:
            catalog_path = Path(__file__).parent.parent / "core" / "component_catalog.json"
            if catalog_path.exists():
                with open(catalog_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for item in data.get("components", []):
                        self._components_map[item["summary"]["id"]] = item
                log.info("Loaded %d components from component_catalog.json", len(self._components_map))
            else:
                log.warning("component_catalog.json not found at %s", catalog_path)
        except Exception as exc:
            log.error("Failed to load component catalog: %s", exc)

    def list_components(self) -> List[ComponentSummary]:
        return [
            ComponentSummary(**item["summary"])
            for item in self._components_map.values()
        ]

    def get_component(self, component_id: str) -> Optional[ComponentSummary]:
        item = self._components_map.get(component_id)
        if item:
            return ComponentSummary(**item["summary"])
        return None

    def get_catalog_item(self, component_id: str) -> Optional[dict]:
        return self._components_map.get(component_id)

    def invalidate(self) -> None:
        # Reload catalog from disk
        self._components_map.clear()
        self._load_catalog()


component_registry_service = ComponentRegistryService()

