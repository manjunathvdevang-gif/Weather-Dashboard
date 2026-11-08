# Task 4: Asynchronous JavaScript & RESTful APIs (Weather Matrix)

## Overview
A dynamic real-time Weather Dashboard engineered with modern asynchronous JavaScript (`async`/`await`), Fetch API, comprehensive error boundaries, and deep nested JSON parsing.

---

## Technical Implementations & Evaluation Criteria

### 1. Fetch API & `async`/`await` Pipeline
- Communicates directly with the Open-Meteo REST API (free, open, no rate-limit barriers, highly reliable).
- Two-step asynchronous pipeline:
  1. Geocoding resolution: `https://geocoding-api.open-meteo.com/v1/search?name={city}` converts user query into coordinates.
  2. Meteorological data retrieval: `https://api.open-meteo.com/v1/forecast?...` retrieves current condition metrics and 5-day daily forecasts.

### 2. Comprehensive Error Handling
- **Offline / Network Detection:** Checks `navigator.onLine` and intercepts network timeout/failure in `try { ... } catch (err)`.
- **Invalid City Lookup:** Handles cases where query returns 0 matches gracefully with clear user feedback.
- **HTTP Status Validation:** Explicitly checks `response.ok` before attempting JSON deserialization.
- **Retry Mechanism:** Dedicated "Retry Query" action button allowing immediate recovery without page refresh.

### 3. Parsing Complex Nested JSON
- Traverses multi-tiered objects including `current.temperature_2m`, `current.relative_humidity_2m`, `current.wind_speed_10m`, `current.surface_pressure`, and daily arrays (`daily.temperature_2m_max[]`, `daily.weather_code[]`).
- Maps international WMO weather codes to contextual descriptive text and visual weather icons.

### 4. Interactive UX Capabilities
- **City Search Bar:** Direct input field for any global city.
- **GPS / Geolocation:** Optional 1-click HTML5 `navigator.geolocation` integration.
- **Unit Toggle:** Instant recalculation between Celsius (°C) and Fahrenheit (°F).
- **Recent Searches:** Automatically stores and restores the last 5 queried cities in `localStorage`.
