# Backend — Raspberry Pi

Qui dentro va il codice che gira sul Raspberry Pi (`app.py`, schema DB,
ecc.). Questa cartella è gestita dal componente del gruppo che si
occupa del backend.

## Cosa fa

- Espone l'endpoint `GET /last_read` che restituisce l'ultimo dato dei
  sensori (temperatura, umidità, pressione, luce, vento, monossido di
  carbonio, qualità dell'aria) letto dalla stazione di Palermo.
- Espone l'endpoint `GET /sse` (Server-Sent Events) che notifica al
  frontend ogni nuova lettura ricevuta.
- Riceve i dati dai sensori via MQTT (broker Mosquitto sul Pi) sul
  topic `stazione1/sensori` e li salva in SQLite (`sensors.db`).
- Riceve immagini sul topic `stazione1/immagini` e le salva in
  `immagini/`.
- Serve il frontend buildato dalla cartella `static/`.

## Avvio sul Pi

```bash
pip install fastapi uvicorn[standard] aiosqlite paho-mqtt
uvicorn app:app --host 0.0.0.0 --port 8000
```

## Endpoint disponibili

- `GET /last_read` → JSON con i campi sensore (timestamp e file_path
  rimossi).
- `GET /sse` → stream SSE che manda `{"event": "new_reading"}` a
  ogni nuova lettura.

## Deploy del frontend

Dopo `npm run build` nella cartella `frontend/`, copiate il contenuto
di `frontend/dist/` dentro `backend/static/`. FastAPI lo serve da `/`.
