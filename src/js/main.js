// Variabelen voor DOM elementen
const body = document.body;
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const themeIcon = themeToggleBtn.querySelector('i');
const themeText = themeToggleBtn.querySelector('span');
const locationForm = document.getElementById('location-form');
const locationInput = document.getElementById('location-input');
const locationError = document.getElementById('location-error');
const weatherContainer = document.getElementById('weather-container');
const favoritesContainer = document.getElementById('favorites-container');
const favoritesCount = document.getElementById('favorites-count');
const tabs = document.querySelectorAll('.tab-btn');
const sections = document.querySelectorAll('.weather-section');
const forecastContainer = document.querySelector('.forecast-container');
const noForecastMessage = document.getElementById('no-forecast-data');

let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
let currentWeatherData = [];

// 1. Functie: Geocoding (stad naar coords) via Open-Meteo geocoding API
async function fetchCoords(city) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=nl&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Kon locatie niet vinden');
  const data = await res.json();
  if (!data.results || data.results.length === 0) throw new Error('Geen resultaten gevonden');
  return {
    lat: data.results[0].latitude,
    lon: data.results[0].longitude,
    name: data.results[0].name,
    country: data.results[0].country
  };
}

// 2. Functie: Weerdata ophalen via Open-Meteo API (huidig weer)
async function fetchWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Kon weerdata niet ophalen');
  const data = await res.json();
  return data.current_weather;
}
// Functie: Weervoorspellingen ophalen via Open-Meteo API (7-daagse forecast)
async function fetchForecast(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Kon voorspellingen niet ophalen');
  const data = await res.json();
  return data.daily;
}

// 3. Functie: Renderen van één weerkaart (voor huidig weer)
function createWeatherCard(weather, location) {
  const { temperature, windspeed, weathercode } = weather;

  const weatherDescriptions = {
    0: { icon: '☀️', text: 'Helder' },
    1: { icon: '🌤️', text: 'Gedeeltelijk bewolkt' },
    2: { icon: '⛅', text: 'Bewolkt' },
    3: { icon: '☁️', text: 'Zwaar bewolkt' },
    61: { icon: '🌧️', text: 'Regen' },
    71: { icon: '❄️', text: 'Sneeuw' },
  };

  const weatherInfo = weatherDescriptions[weathercode] || { icon: '❓', text: 'Onbekend' };

  const isFavorite = favorites.some(fav => fav.name === location.name && fav.country === location.country);

  return `
    <div class="weather-card">
      <button class="favorite-btn" aria-label="Voeg toe aan favorieten" data-name="${location.name}" data-country="${location.country}">
        <i class="${isFavorite ? 'fas' : 'far'} fa-heart"></i>
      </button>
      <h3>${location.name}, ${location.country}</h3>
      <div class="weather-icon">${weatherInfo.icon}</div>
      <div class="temperature">${temperature.toFixed(1)}°C</div>
      <div class="weather-info">
        <div class="info-item"><i class="fas fa-wind"></i> ${windspeed} km/h</div>
        <div class="info-item">${weatherInfo.text}</div>
      </div>
    </div>
  `;
}

// 4. Functie: Render alle weerdata in container
function renderWeatherList(weatherList) {
  if (weatherList.length === 0) {
    weatherContainer.innerHTML = '<p>Zoek naar een locatie om het weer te bekijken.</p>';
    return;
  }

  weatherContainer.innerHTML = weatherList.map(item => createWeatherCard(item.weather, item.location)).join('');
}
function renderForecast(daily) {
  if (!daily || !daily.time || daily.time.length === 0) {
    forecastContainer.innerHTML = '<p>Geen voorspellingen beschikbaar.</p>';
    return;
  }

  const weatherDescriptions = {
    0: 'Helder ☀️',
    1: 'Gedeeltelijk bewolkt 🌤️',
    2: 'Bewolkt ⛅',
    3: 'Zwaar bewolkt ☁️',
    61: 'Regen 🌧️',
    71: 'Sneeuw ❄️',
  };

  // Bouw de forecast cards
  const forecastHTML = daily.time.map((date, i) => {
  const maxTemp = daily.temperature_2m_max[i];
  const minTemp = daily.temperature_2m_min[i];
  const weathercode = daily.weathercode[i];
  const precipitation = daily.precipitation_sum[i]; // neerslag mm
  const desc = weatherDescriptions[weathercode] || 'Onbekend ❓';

    return `
      <div class="forecast-day">
        <div class="date">${date}</div>
        <div class="weather-desc">${desc}</div>
        <div class="temp">Max: ${maxTemp}°C</div>
        <div class="temp">Min: ${minTemp}°C</div>
        <div class="precipitation">Neerslag: ${precipitation} mm</div>
      </div>
    `;
  }).join('');

  // Forecast kaarten injecteren
  forecastContainer.innerHTML = `
    <div class="forecast-list">${forecastHTML}</div>
    <canvas id="precipitationChart" width="400" height="200"></canvas>
  `;

  // Na injectie: grafiek tekenen
  drawPrecipitationChart(daily.time, daily.precipitation_sum);
}


// 5. Functie: Favorieten renderen
function renderFavorites() {
  if (favorites.length === 0) {
    favoritesContainer.innerHTML = '<p>Je hebt nog geen favoriete locaties toegevoegd. Klik op het hartje bij een locatie om deze toe te voegen.</p>';
    favoritesCount.textContent = '(0)';
    return;
  }

  favoritesContainer.innerHTML = favorites.map(fav => `
    <div class="weather-card">
      <h3>${fav.name}, ${fav.country}</h3>
      <div>Temperatuur: ${fav.temperature.toFixed(1)}°C</div>
      <div><button class="remove-favorite-btn" data-name="${fav.name}" data-country="${fav.country}">Verwijder</button></div>
    </div>
  `).join('');
  favoritesCount.textContent = `(${favorites.length})`;
}

// 6. Functie: Voeg locatie toe aan favorieten
function addFavorite(weather, location) {
  if (favorites.some(fav => fav.name === location.name && fav.country === location.country)) return;

  favorites.push({
    name: location.name,
    country: location.country,
    temperature: weather.temperature
  });

  localStorage.setItem('favorites', JSON.stringify(favorites));
  renderFavorites();
}

// 7. Functie: Verwijder locatie uit favorieten
function removeFavorite(name, country) {
  favorites = favorites.filter(fav => !(fav.name === name && fav.country === country));
  localStorage.setItem('favorites', JSON.stringify(favorites));
  renderFavorites();
}

// 8. Tab wisselen
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    sections.forEach(section => {
      section.classList.add('hidden');
      if (section.id === tab.dataset.tab) {
        section.classList.remove('hidden');
      }
    });
  });
});

// 9. Thema: day-night automatisch plus toggle met onthouden voorkeur
function applyDayNightTheme() {
  const hour = new Date().getHours();
  if (hour >= 20 || hour < 6) {
    body.classList.add('dark-theme');
    localStorage.setItem('theme', 'dark');
  } else {
    body.classList.remove('dark-theme');
    localStorage.setItem('theme', 'light');
  }
}

function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    if (savedTheme === 'dark') {
      body.classList.add('dark-theme');
    } else {
      body.classList.remove('dark-theme');
    }
  } else {
    applyDayNightTheme();
  }
}

function drawPrecipitationChart(dates, precipitation) {
  const ctx = document.getElementById('precipitationChart').getContext('2d');

  if (window.precipitationChartInstance) {
    window.precipitationChartInstance.destroy();
  }

  window.precipitationChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: dates,
      datasets: [{
        label: 'Neerslag (mm)',
        data: precipitation,
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
        borderRadius: 5,
      }]
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: 'mm neerslag' }
        },
        x: {
          title: { display: true, text: 'Datum' }
        }
      },
      plugins: {
        legend: { display: false }
      },
      responsive: true,
      maintainAspectRatio: false,
    }
  });
}

themeToggleBtn.addEventListener('click', () => {
  if (body.classList.contains('dark-theme')) {
    body.classList.remove('dark-theme');
    localStorage.setItem('theme', 'light');
  } else {
    body.classList.add('dark-theme');
    localStorage.setItem('theme', 'dark');
  }
});

initTheme();

// 10.  favorieten klik op kaarten
weatherContainer.addEventListener('click', e => {
  if (e.target.closest('.favorite-btn')) {
    const btn = e.target.closest('.favorite-btn');
    const name = btn.dataset.name;
    const country = btn.dataset.country;
    const weatherItem = currentWeatherData.find(w => w.location.name === name && w.location.country === country);
    if (!weatherItem) return;
    addFavorite(weatherItem.weather, weatherItem.location);

    btn.querySelector('i').classList.remove('far');
    btn.querySelector('i').classList.add('fas');
  }
});

// 11.  verwijder favoriet
favoritesContainer.addEventListener('click', e => {
  if (e.target.classList.contains('remove-favorite-btn')) {
    const btn = e.target;
    removeFavorite(btn.dataset.name, btn.dataset.country);
  }
});

// 12. Zoekformulier afhandelen
locationForm.addEventListener('submit', async e => {
  e.preventDefault();
  locationError.classList.add('hidden');

  const city = locationInput.value.trim();
  if (!city) {
    locationError.textContent = 'Voer een geldige locatie in!';
    locationError.classList.remove('hidden');
    return;
  }

  try {
    weatherContainer.innerHTML = `<div class="loader"><div class="spinner"></div><p>Weerdata laden...</p></div>`;

    const coords = await fetchCoords(city);
    const currentWeather = await fetchWeather(coords.lat, coords.lon);
    const forecast = await fetchForecast(coords.lat, coords.lon);

    currentWeatherData = [{ weather: currentWeather, location: coords }];

    renderWeatherList(currentWeatherData);
    renderForecast(forecast);

  } catch (error) {
    weatherContainer.innerHTML = `<p>Fout bij laden van weerdata: ${error.message}</p>`;
  }
});
