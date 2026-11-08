/**
 * Real-Time Weather Dashboard
 * Demonstrates: Asynchronous JavaScript, Fetch API, async/await, Comprehensive Error Handling, Nested JSON Parsing
 */

(function () {
  'use strict';

  // --- State ---
  const state = {
    unit: 'C', // 'C' | 'F'
    currentCity: null,
    weatherData: null,
    recentSearches: JSON.parse(localStorage.getItem('weather_recent_searches') || '["London", "Tokyo", "New York", "Paris"]')
  };

  // --- WMO Weather Interpretation Codes ---
  const WEATHER_CODES = {
    0: { desc: 'Clear sky', icon: '☀️' },
    1: { desc: 'Mainly clear', icon: '🌤️' },
    2: { desc: 'Partly cloudy', icon: '⛅' },
    3: { desc: 'Overcast', icon: '☁️' },
    45: { desc: 'Fog', icon: '🌫️' },
    48: { desc: 'Depositing rime fog', icon: '🌫️' },
    51: { desc: 'Light drizzle', icon: '🌦️' },
    53: { desc: 'Moderate drizzle', icon: '🌧️' },
    55: { desc: 'Dense drizzle', icon: '🌧️' },
    61: { desc: 'Slight rain', icon: '🌦️' },
    63: { desc: 'Moderate rain', icon: '🌧️' },
    65: { desc: 'Heavy rain', icon: '🌧️' },
    71: { desc: 'Slight snow', icon: '🌨️' },
    73: { desc: 'Moderate snow', icon: '❄️' },
    75: { desc: 'Heavy snow', icon: '❄️' },
    80: { desc: 'Slight rain showers', icon: '🌦️' },
    81: { desc: 'Moderate rain showers', icon: '🌧️' },
    82: { desc: 'Violent rain showers', icon: '⛈️' },
    95: { desc: 'Thunderstorm', icon: '⛈️' },
    96: { desc: 'Thunderstorm with slight hail', icon: '⛈️' },
    99: { desc: 'Thunderstorm with heavy hail', icon: '⛈️' }
  };

  function getWeatherMeta(code) {
    return WEATHER_CODES[code] || { desc: 'Partly cloudy', icon: '🌤️' };
  }

  // --- Temperature Conversion Helper ---
  function formatTemp(tempC) {
    if (tempC === null || tempC === undefined) return '--';
    if (state.unit === 'F') {
      const f = (tempC * 9) / 5 + 32;
      return Math.round(f);
    }
    return Math.round(tempC);
  }

  // --- DOM Elements ---
  const elements = {
    searchForm: document.getElementById('search-form'),
    cityInput: document.getElementById('city-input'),
    geoBtn: document.getElementById('geo-btn'),
    recentSearchesWrap: document.getElementById('recent-searches'),
    unitBtns: document.querySelectorAll('.unit-btn'),
    loadingCard: document.getElementById('loading-card'),
    errorCard: document.getElementById('error-card'),
    errorMessage: document.getElementById('error-message'),
    retryBtn: document.getElementById('retry-btn'),
    weatherDisplay: document.getElementById('weather-display'),
    cityName: document.getElementById('city-name'),
    countryCode: document.getElementById('country-code'),
    timestamp: document.getElementById('timestamp'),
    tempVal: document.getElementById('temp-val'),
    tempUnitSymbol: document.getElementById('temp-unit-symbol'),
    conditionIcon: document.getElementById('condition-icon'),
    conditionText: document.getElementById('condition-text'),
    humidityVal: document.getElementById('humidity-val'),
    windVal: document.getElementById('wind-val'),
    feelsLikeVal: document.getElementById('feels-like-val'),
    pressureVal: document.getElementById('pressure-val'),
    forecastGrid: document.getElementById('forecast-grid')
  };

  // --- UI State Management ---
  function showLoading() {
    elements.loadingCard.classList.add('active');
    elements.errorCard.classList.remove('active');
    elements.weatherDisplay.classList.remove('active');
  }

  function showError(msg) {
    elements.loadingCard.classList.remove('active');
    elements.errorCard.classList.add('active');
    elements.weatherDisplay.classList.remove('active');
    elements.errorMessage.textContent = msg;
  }

  function showWeather() {
    elements.loadingCard.classList.remove('active');
    elements.errorCard.classList.remove('active');
    elements.weatherDisplay.classList.add('active');
  }

  // --- REST API Call: Geocoding (Async / Await) ---
  async function fetchCityCoordinates(cityName) {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Geocoding API responded with HTTP status ${response.status}`);
    }

    const data = await response.json();
    if (!data.results || data.results.length === 0) {
      throw new Error(`Location "${cityName}" not found. Please verify the spelling and try again.`);
    }

    const result = data.results[0];
    return {
      name: result.name,
      country: result.country_code ? result.country_code.toUpperCase() : (result.country || ''),
      latitude: result.latitude,
      longitude: result.longitude
    };
  }

  // --- REST API Call: Weather Metrics (Async / Await) ---
  async function fetchWeatherData(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m,surface_pressure&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Weather service error: HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data.current) {
      throw new Error('Incomplete weather payload received from API.');
    }

    return data;
  }

  // --- Master Async Orchestrator ---
  async function loadWeatherForCity(cityName) {
    if (!navigator.onLine) {
      showError('You appear to be offline. Please verify your internet connection and retry.');
      return;
    }

    showLoading();

    try {
      // 1. Resolve coordinates
      const cityMeta = await fetchCityCoordinates(cityName);

      // 2. Fetch live metrics
      const weatherPayload = await fetchWeatherData(cityMeta.latitude, cityMeta.longitude);

      // 3. Save to state & render
      state.currentCity = cityMeta;
      state.weatherData = weatherPayload;
      updateRecentSearches(cityMeta.name);
      renderWeather();
      showWeather();
    } catch (error) {
      console.error('Async Fetch Error:', error);
      showError(error.message || 'An unexpected error occurred while querying the weather API.');
    }
  }

  // --- HTML5 Geolocation Async Handler ---
  async function loadWeatherForGeolocation() {
    if (!navigator.geolocation) {
      showError('Geolocation is not supported by your browser.');
      return;
    }

    showLoading();

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        try {
          // Reverse geocoding lookup
          const reverseUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${lat.toFixed(2)},${lon.toFixed(2)}&count=1&format=json`;
          let cityTitle = 'Current Location';
          let country = 'GPS';

          const weatherPayload = await fetchWeatherData(lat, lon);
          state.currentCity = { name: cityTitle, country: country, latitude: lat, longitude: lon };
          state.weatherData = weatherPayload;
          renderWeather();
          showWeather();
        } catch (err) {
          showError(err.message || 'Failed to retrieve weather for your coordinates.');
        }
      },
      (geoError) => {
        let msg = 'Unable to retrieve location.';
        if (geoError.code === 1) msg = 'Location permission denied by user.';
        else if (geoError.code === 2) msg = 'Location unavailable.';
        else if (geoError.code === 3) msg = 'Location request timed out.';
        showError(msg);
      },
      { timeout: 10000 }
    );
  }

  // --- Render Parsed JSON Objects into DOM ---
  function renderWeather() {
    if (!state.currentCity || !state.weatherData) return;

    const current = state.weatherData.current;
    const meta = getWeatherMeta(current.weather_code);

    // City & Time Info
    elements.cityName.textContent = state.currentCity.name;
    elements.countryCode.textContent = state.currentCity.country;
    elements.timestamp.textContent = `Last updated: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    // Main Current Temperature & Condition
    elements.tempVal.textContent = formatTemp(current.temperature_2m);
    elements.tempUnitSymbol.textContent = `°${state.unit}`;
    elements.conditionIcon.textContent = meta.icon;
    elements.conditionText.textContent = meta.desc;

    // Detailed Metrics
    elements.humidityVal.textContent = `${current.relative_humidity_2m}%`;
    const windSpeed = state.unit === 'F' ? Math.round(current.wind_speed_10m * 0.621371) : Math.round(current.wind_speed_10m);
    elements.windVal.textContent = `${windSpeed} ${state.unit === 'F' ? 'mph' : 'km/h'}`;
    elements.feelsLikeVal.textContent = `${formatTemp(current.apparent_temperature)}°${state.unit}`;
    elements.pressureVal.textContent = `${Math.round(current.surface_pressure)} hPa`;

    // Render 5-Day Forecast Grid
    renderForecast(state.weatherData.daily);
  }

  function renderForecast(daily) {
    if (!daily || !daily.time) return;

    elements.forecastGrid.innerHTML = '';
    const daysToShow = Math.min(5, daily.time.length);

    for (let i = 0; i < daysToShow; i++) {
      const date = new Date(daily.time[i] + 'T00:00:00');
      const dayName = i === 0 ? 'Today' : date.toLocaleDateString([], { weekday: 'short' });
      const code = daily.weather_code[i];
      const meta = getWeatherMeta(code);
      const max = formatTemp(daily.temperature_2m_max[i]);
      const min = formatTemp(daily.temperature_2m_min[i]);

      const card = document.createElement('div');
      card.className = 'forecast-day-card';
      card.innerHTML = `
        <span class="forecast-day-name">${dayName}</span>
        <span class="forecast-icon" aria-hidden="true">${meta.icon}</span>
        <span style="font-size: 0.75rem; color: var(--text-dim);">${meta.desc}</span>
        <div class="forecast-temps">
          <span class="forecast-max">${max}°</span>
          <span class="forecast-min">${min}°</span>
        </div>
      `;
      elements.forecastGrid.appendChild(card);
    }
  }

  // --- Recent Searches History ---
  function updateRecentSearches(cityName) {
    if (!state.recentSearches.includes(cityName)) {
      state.recentSearches.unshift(cityName);
      if (state.recentSearches.length > 5) {
        state.recentSearches.pop();
      }
      localStorage.setItem('weather_recent_searches', JSON.stringify(state.recentSearches));
      renderRecentSearches();
    }
  }

  function renderRecentSearches() {
    elements.recentSearchesWrap.innerHTML = '';
    state.recentSearches.forEach((city) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'recent-chip';
      chip.textContent = city;
      chip.addEventListener('click', () => {
        elements.cityInput.value = city;
        loadWeatherForCity(city);
      });
      elements.recentSearchesWrap.appendChild(chip);
    });
  }

  // --- Event Listeners ---
  elements.searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const city = elements.cityInput.value.trim();
    if (city) {
      loadWeatherForCity(city);
    }
  });

  elements.geoBtn.addEventListener('click', () => {
    loadWeatherForGeolocation();
  });

  elements.retryBtn.addEventListener('click', () => {
    const city = elements.cityInput.value.trim() || 'London';
    loadWeatherForCity(city);
  });

  elements.unitBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const newUnit = btn.dataset.unit;
      if (newUnit !== state.unit) {
        state.unit = newUnit;
        elements.unitBtns.forEach((b) => b.classList.toggle('active', b.dataset.unit === newUnit));
        renderWeather();
      }
    });
  });

  // --- Initial Boot ---
  renderRecentSearches();
  loadWeatherForCity('London');
})();
