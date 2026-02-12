FROM python:3.12-slim
WORKDIR /app
COPY x402-contrib/server/ ./
RUN pip install --no-cache-dir -r requirements.txt
CMD ["gunicorn", "--config", "gunicorn.conf.py", "wsgi:application"]
