FROM python:3.11-slim AS builder

WORKDIR /app
COPY pyproject.toml README.md ./
COPY src/ src/

RUN pip install --no-cache-dir .

FROM python:3.11-slim

WORKDIR /app
COPY --from=builder /usr/local/lib/python3.11/site-packages/ /usr/local/lib/python3.11/site-packages/
COPY --from=builder /usr/local/bin/ /usr/local/bin/
COPY src/ src/
COPY examples/ examples/

ENV PYTHONUNBUFFERED=1
ENV PHYSICS_ENGINE_PORT=8100

EXPOSE ${PHYSICS_ENGINE_PORT}

CMD ["uvicorn", "physics_engine.api.app:app", "--host", "0.0.0.0", "--port", "8100"]
