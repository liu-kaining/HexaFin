FROM python:3.11-slim

WORKDIR /app

COPY backend/requirements.txt backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend/ backend/
COPY public/ public/

ENV OUTPUT_PATH=/app/public/daily_result.json \
    TICKERS_FILE=/app/backend/tickers.txt

CMD ["python", "backend/hexafin_engine.py"]
