FROM python:3.13-slim

# Install uv package manager from official image
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Prevent Python from writing .pyc files and enable unbuffered output
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

WORKDIR /app

# Copy dependency specification files
COPY pyproject.toml uv.lock README.md* ./

# Install dependencies using uv into container .venv without installing local package yet
RUN uv sync --frozen --no-dev --no-install-project

# Copy application source code
COPY . .

# Sync to install the local package into virtual environment
RUN uv sync --frozen --no-dev

# Place virtual environment binaries on PATH
ENV PATH="/app/.venv/bin:$PATH"

# Expose port for FastAPI backend
EXPOSE 8000

# Run FastAPI app with Uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

