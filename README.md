<div align="center">

# Meteo Sicilia

**A real-time weather platform for Sicily, built on a custom IoT weather station running on a Raspberry Pi.**

Live sensor data and AI-based forecasting for Palermo · Professional Open-Meteo data for every other Sicilian town.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38BDF8?logo=tailwindcss&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![MQTT](https://img.shields.io/badge/MQTT-660066?logo=mqtt&logoColor=white)
![Raspberry Pi](https://img.shields.io/badge/Raspberry_Pi-A22846?logo=raspberrypi&logoColor=white)

</div>

---

## Overview

Meteo Sicilia isn't "just a weather site": it's a full chain connecting a real sensor to a screen. A weather station built around a Raspberry Pi measures environmental conditions, sends them to a backend that stores them, and distributes them in real time to a modern, responsive web interface.

The project brings together three layers — the hardware (the station and its sensors), the backend (which receives and stores the data), and the frontend (the site that displays it) — supported by two data sources: an AI model for local forecasting, and Open-Meteo for island-wide coverage.

## Features

- Real-time data from the station's sensors, updated without reloading the page (Server-Sent Events).
- AI forecast for the upcoming hours in the city hosting the station (Palermo).
- Full Sicily coverage: professional data and forecasts from Open-Meteo for every other town.
- Interactive hourly chart drawn in pure SVG: 9 selectable metrics, day navigation (from yesterday to +6), tooltips, sunrise/sunset markers, and a clear distinction between measured data (solid line) and forecast data (dashed line).
- "Weather details" cards with derived values (feels-like temperature, dew point, Beaufort scale, trends).
- Responsive design, tuned for desktop, tablet and mobile.
- Light and dark themes, with an original logo and visual identity.
- Instant, offline search across Sicilian municipalities.

## Architecture

```
┌──────────────────┐   MQTT    ┌──────────────────┐  HTTP / SSE  ┌──────────────────┐
│ Physical station │ ────────▶ │     Backend      │ ───────────▶ │     Frontend     │
│   Raspberry Pi   │           │  FastAPI (Python)│              │ React + TypeScript│
│  Sensors + cam   │           │  SQLite · SSE    │              │  PC/tablet/phone │
└──────────────────┘           └──────────────────┘              └──────────────────┘
                                        ▲                                  ▲
                                        │                                  │
                                 ┌──────────────┐                  ┌──────────────┐
                                 │   AI model   │                  │  Open-Meteo  │
                                 │  (Palermo)   │                  │(other towns) │
                                 └──────────────┘                  └──────────────┘
```

- **Station** — the Raspberry Pi reads the sensors and publishes the data over MQTT (Mosquitto broker).
- **Backend** — FastAPI receives the messages, stores them in SQLite, and re-distributes them in real time via SSE.
- **Frontend** — React displays the data; Open-Meteo calls are made directly from the browser.

### The Palermo case

Palermo doesn't work like the other towns: as the station's home city, its current data comes from the real sensors, and its short-term forecast from the AI model. This logic is consistent across the whole app (search, chart, details). Every other town uses Open-Meteo.

## Tech stack

- **Frontend** — React 19, TypeScript, Vite, Tailwind CSS v4, shadcn/ui, React Router
- **Graphics** — hand-drawn SVG (no charting library), Catmull-Rom → Bézier curves
- **Backend** — Python, FastAPI, aiosqlite (SQLite), SSE
- **IoT** — Raspberry Pi, MQTT (Mosquitto), environmental sensors + camera
- **External data** — Open-Meteo (weather and 7-day forecast)

## Project structure

```
Meteo_Project/
├── frontend/                 # Web application (Vite + React + TypeScript)
│   ├── public/               # Logo, favicon and static assets
│   └── src/
│       ├── api/              # Open-Meteo integration
│       ├── components/ui/    # Header, chart, details, cards, logo…
│       ├── hooks/            # Data logic (Palermo / Open-Meteo routing)
│       ├── pages/            # Dashboard and single-town page
│       └── types/            # Shared TypeScript types
└── backend/
    └── app.py                # FastAPI server (MQTT, SQLite, SSE, endpoints)
```

## Getting started

### Prerequisites
- Node.js 18+ and npm
- Python 3.10+

### Frontend
```bash
cd frontend
npm install
npm run dev
```
The app will be available at `http://localhost:5173`.

### Backend
```bash
cd backend
pip install fastapi uvicorn aiosqlite paho-mqtt
uvicorn app:app --reload
```
The backend exposes, among others, the `/last_read`, `/sse`, `/storico/oggi` and `/previsione/oggi` endpoints.

## Backend endpoints

- `GET /last_read` — latest sensor reading
- `GET /sse` — real-time channel (new measurements)
- `GET /storico/oggi` — today's station readings (Palermo chart)
- `GET /previsione/oggi` — AI forecast for the remaining hours *(scaffolded)*

## Security & deployment

HTTPS/TLS is handled with a free Let's Encrypt certificate. The station is exposed through a Cloudflare Tunnel, so no router ports need to be opened and the home IP stays hidden. The domain is protected with WHOIS privacy and a registrar lock, and CORS is configured to authorize the frontend in a controlled way.

## Roadmap

- [ ] Integrate the AI model into the `/previsione/oggi` endpoint
- [ ] More stations in other Sicilian cities
- [ ] Installable app (PWA) and weather notifications
- [ ] Historical storage and statistics (averages, records, comparisons)
- [ ] Sky-image gallery synced with the data

## Preview

<img width="1375" height="1236" alt="immagine" src="https://github.com/user-attachments/assets/c715eb4a-6199-474f-a2f5-009510c68303" />


## Credits

Built as a collaborative project: station and data acquisition (Raspberry Pi, MQTT, sensors) + web application and integration.



<div align="center">
<sub>Meteo Sicilia · from sensor to screen</sub>
</div>
