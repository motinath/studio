"""
Structured logging for Quantum Studio.

Provides a configured logger with consistent formatting across all modules.
"""

from __future__ import annotations

import logging
import sys
from typing import Optional


_LOG_FORMAT = (
    "%(asctime)s │ %(levelname)-8s │ %(name)-30s │ %(message)s"
)
_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

_configured = False


def setup_logging(level: str = "INFO") -> None:
    """
    Configure the root logger for Quantum Studio.

    Args:
        level: Logging level string (DEBUG, INFO, WARNING, ERROR, CRITICAL).
    """
    global _configured
    if _configured:
        return

    numeric_level = getattr(logging, level.upper(), logging.INFO)

    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(numeric_level)
    handler.setFormatter(logging.Formatter(_LOG_FORMAT, datefmt=_DATE_FORMAT))

    root = logging.getLogger("quantum_studio")
    root.setLevel(numeric_level)
    root.addHandler(handler)
    root.propagate = False

    _configured = True


def get_logger(name: str) -> logging.Logger:
    """
    Get a named logger under the quantum_studio namespace.

    Args:
        name: Module or component name (e.g., 'compiler.parser').

    Returns:
        Configured Logger instance.
    """
    if not _configured:
        setup_logging()

    return logging.getLogger(f"quantum_studio.{name}")
