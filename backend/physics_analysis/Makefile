.PHONY: install test lint format run docker-build docker-run clean

install:
	pip install -e ".[dev]"

test:
	pytest tests/ -v --cov=physics_engine --cov-report=term-missing

test-quick:
	pytest tests/test_models.py tests/test_parameter_converter.py -v

lint:
	ruff check src/ tests/
	mypy src/physics_engine/

format:
	ruff format src/ tests/

run:
	uvicorn physics_engine.api.app:app --reload --port 8100

run-example:
	python examples/run_analysis.py

docker-build:
	docker build -f docker/Dockerfile -t silicofeller-physics-engine .

docker-run:
	docker run -p 8100:8100 silicofeller-physics-engine

clean:
	rm -rf output/ .pytest_cache/ .mypy_cache/ .ruff_cache/
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
