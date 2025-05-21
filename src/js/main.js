// Importeer Leaflet voor het renderen van de kaart
import L from 'leaflet';

// ======================================
// DOM-ELEMENTEN
// ======================================
const body = document.body;
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const locationForm = document.getElementById('location-form');
const locationInput = document.getElementById('location-input');
const locationError = document.getElementById('location-error');
const weatherContainer = document.getElementById('weather-container');
const favoritesContainer = document.getElementById('favorites-container');
const favoritesCount = document.getElementById('favorites-count');
const tabs = document.querySelectorAll('.tab-btn');
const sections = document.querySelectorAll('.weather-section');
const forecastContainer = document.querySelector('.forecast-container');
const extraWeatherInfo = document.getElementById('extra-weather-info');
// Selecteer alle informatie filters
const infoFilters = document.querySelectorAll('#weather-filters input[type="checkbox"]');

// ======================================
// GLOBALE VARIABELEN
// ======================================
let currentExtraWeatherData = null; // Extra weerdata bewaren
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
let currentWeatherData = null;
let map; // Leaflet kaart

// ======================================
// HELPER FUNCTIES
// ======================================

// KAART-FUNCTIES
function initMap(lat, lon) {
  if (!map) {
    map = L.map('map').setView([lat, lon], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);
  } else {
    map.setView([lat, lon], 10);
  }
}

function updateMap(lat, lon) {
  initMap(lat, lon);
  
  // Verwijder oude markers
  map.eachLayer(layer => {
    if (layer instanceof L.Marker) {
      map.removeLayer(layer);
    }
  });

  // Voeg nieuwe marker toe
  L.marker([lat, lon]).addTo(map);
}

// WEERCODE NAAR TEKST EN ICOON
function getWeatherInfo(weathercode) {
  const weatherDescriptions = {
    0: { icon: '☀️', text: 'Helder' },
    1: { icon: '🌤️', text: 'Gedeeltelijk bewolkt' },
    2: { icon: '⛅', text: 'Bewolkt' },
    3: { icon: '☁️', text: 'Zwaar bewolkt' },
    45: { icon: '🌫️', text: 'Mist' },
    48: { icon: '🌫️', text: 'Aanvriezende mist' },
    51: { icon: '🌧️', text: 'Lichte motregen' },
    53: { icon: '🌧️', text: 'Matige motregen' },
    55: { icon: '🌧️', text: 'Dichte motregen' },
    56: { icon: '🌧️', text: 'Lichte aanvriezende motregen' },
    57: { icon: '🌧️', text: 'Dichte aanvriezende motregen' },
    61: { icon: '🌧️', text: 'Lichte regen' },
    63: { icon: '🌧️', text: 'Matige regen' },
    65: { icon: '🌧️', text: 'Zware regen' },
    66: { icon: '🌧️', text: 'Lichte aanvriezende regen' },
    67: { icon: '🌧️', text: 'Zware aanvriezende regen' },
    71: { icon: '❄️', text: 'Lichte sneeuwval' },
    73: { icon: '❄️', text: 'Matige sneeuwval' },
    75: { icon: '❄️', text: 'Zware sneeuwval' },
    77: { icon: '❄️', text: 'Sneeuwkorrels' },
    80: { icon: '🌧️', text: 'Lichte regenbuien' },
    81: { icon: '🌧️', text: 'Matige regenbuien' },
    82: { icon: '🌧️', text: 'Hevige regenbuien' },
    85: { icon: '❄️', text: 'Lichte sneeuwbuien' },
    86: { icon: '❄️', text: 'Zware sneeuwbuien' },
    95: { icon: '⛈️', text: 'Onweer' },
    96: { icon: '⛈️', text: 'Onweer met lichte hagel' },
    99: { icon: '⛈️', text: 'Onweer met zware hagel' }
  };

  return weatherDescriptions[weathercode] || { icon: '❓', text: 'Onbekend' };
}

// ======================================
// API FUNCTIES
// ======================================

// 1. Geocoding: stad naar coords
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

// 2. Huidig weer ophalen
async function fetchWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Kon weerdata niet ophalen');
  const data = await res.json();
  return data.current_weather;
}

// 3. 7-daagse forecast ophalen
async function fetchForecast(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Kon voorspellingen niet ophalen');
  const data = await res.json();
  return data.daily;
}

// 4. Extra weerdata ophalen (hourly + daily)
async function fetchExtraWeatherData(lat, lon) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation,uv_index,relative_humidity_2m&daily=sunrise,sunset&current=relative_humidity_2m,pressure_msl&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Kon extra weerdata niet ophalen');
    return await res.json();
  } catch (error) {
    console.error(error);
    return null;
  }
}

// ======================================
// RENDER FUNCTIES
// ======================================

// 1. Weerkaart maken (huidig weer)
function createWeatherCard(weather, location) {
  const { temperature, windspeed, weathercode } = weather;
  const weatherInfo = getWeatherInfo(weathercode);
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

// 2. Weerlijst renderen (huidig weer)
function renderWeatherList(weatherList) {
  if (!weatherList || weatherList.length === 0) {
    weatherContainer.innerHTML = '<p>Zoek naar een locatie om het weer te bekijken.</p>';
    return;
  }
  weatherContainer.innerHTML = weatherList.map(item => createWeatherCard(item.weather, item.location)).join('');
}

// 3. Forecast renderen
function renderForecast(daily) {
  if (!daily || !daily.time || daily.time.length === 0) {
    forecastContainer.innerHTML = '<p>Geen voorspellingen beschikbaar.</p>';
    return;
  }

  const forecastHTML = daily.time.map((date, i) => {
    const maxTemp = daily.temperature_2m_max[i];
    const minTemp = daily.temperature_2m_min[i];
    const weathercode = daily.weathercode[i];
    const precipitation = daily.precipitation_sum[i];
    const weatherInfo = getWeatherInfo(weathercode);

    return `
      <div class="forecast-day">
        <div class="date">${formatDate(date)}</div>
        <div class="weather-desc">${weatherInfo.icon} ${weatherInfo.text}</div>
        <div class="temp">Max: ${maxTemp.toFixed(1)}°C</div>
        <div class="temp">Min: ${minTemp.toFixed(1)}°C</div>
        <div class="precipitation">Neerslag: ${precipitation.toFixed(1)} mm</div>
      </div>
    `;
  }).join('');

  forecastContainer.innerHTML = `
    <div class="forecast-list">${forecastHTML}</div>
    <canvas id="precipitationChart" width="400" height="200"></canvas>
  `;

  drawPrecipitationChart(daily.time, daily.precipitation_sum);
}

// 4. Extra weerinfo tonen en filteren 
function updateExtraWeatherInfo(data) {
  if (!data) {
    extraWeatherInfo.innerHTML = '<p>Geen extra weerdata beschikbaar.</p>';
    return;
  }

  console.log("Updating extra weather info with data:", data);

  // Volledige informatie instellen
  if (data.daily && data.daily.sunrise && data.daily.sunset) {
    document.getElementById('sunrise').textContent = formatTime(data.daily.sunrise[0]);
    document.getElementById('sunset').textContent = formatTime(data.daily.sunset[0]);
  }

  if (data.hourly) {
    // UV-index uit eerste uur
    document.getElementById('uv-index').textContent = data.hourly.uv_index[0].toFixed(1);
    
    // Voor neerslag: als het in hourly zit
    if (data.hourly.precipitation && data.hourly.precipitation[0] !== undefined) {
      document.getElementById('precipitation').textContent = data.hourly.precipitation[0].toFixed(1);
    } 
    // Of als het in daily zit (dagsom)
    else if (data.daily && data.daily.precipitation_sum && data.daily.precipitation_sum[0] !== undefined) {
      document.getElementById('precipitation').textContent = data.daily.precipitation_sum[0].toFixed(1);
    }
    // Of als er een actuele neerslag is
    else if (data.current && data.current.precipitation !== undefined) {
      document.getElementById('precipitation').textContent = data.current.precipitation.toFixed(1);
    }
  }

  if (data.current) {
    // Vochtigheidsniveau 
    document.getElementById('humidity').textContent = data.current.relative_humidity_2m || "N/A";
    
    // Luchtdruk - controleer verschillende mogelijke veldnamen
    if (data.current.pressure_msl !== undefined) {
      document.getElementById('pressure').textContent = data.current.pressure_msl || "N/A";
    } else if (data.current.surface_pressure !== undefined) {
      document.getElementById('pressure').textContent = data.current.surface_pressure || "N/A";
    } else {
      document.getElementById('pressure').textContent = "N/A";
    }
  }

  // Voeg windsnelheid toe van huidige weather data
  if (currentWeatherData && currentWeatherData[0] && currentWeatherData[0].weather) {
    document.getElementById('wind').textContent = currentWeatherData[0].weather.windspeed || "N/A";
  }

  // Filter toepassen voor weergave
  applyInfoFilters();
}

// 5. Favorietenlijst weergeven
function renderFavorites() {
  if (favorites.length === 0) {
    favoritesContainer.innerHTML = '<p>Je hebt nog geen favoriete locaties toegevoegd. Klik op het hartje bij een locatie om deze toe te voegen.</p>';
    favoritesCount.textContent = '(0)';
    document.getElementById('no-favorites').classList.remove('hidden');
    return;
  }

  document.getElementById('no-favorites').classList.add('hidden');
  favoritesContainer.innerHTML = favorites.map(fav => `
    <div class="weather-card">
      <h3>${fav.name}, ${fav.country}</h3>
      <div>Temperatuur: ${fav.temperature.toFixed(1)}°C</div>
      <div><button class="remove-favorite-btn" data-name="${fav.name}" data-country="${fav.country}">Verwijder</button></div>
    </div>
  `).join('');
  favoritesCount.textContent = `(${favorites.length})`;
}

// 6. Neerslaggrafiek tekenen met Canvas
function drawPrecipitationChart(dates, precipitation) {
  const canvas = document.getElementById('precipitationChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Basisinstellingen
  const maxPrecip = Math.max(...precipitation);
  const margin = 40;
  const width = canvas.width - margin * 2;
  const height = canvas.height - margin * 2;
  const barWidth = width / precipitation.length * 0.7;
  const gap = width / precipitation.length * 0.3;

  ctx.fillStyle = '#3498db';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';

  // Staven tekenen
  precipitation.forEach((precip, i) => {
    const barHeight = maxPrecip === 0 ? 0 : (precip / maxPrecip) * height;
    const x = margin + i * (barWidth + gap);
    const y = canvas.height - margin - barHeight;

    ctx.fillRect(x, y, barWidth, barHeight);
    ctx.fillStyle = body.classList.contains('dark') ? '#eee' : '#333';
    ctx.fillText(precip.toFixed(1), x + barWidth / 2, y - 5);
    ctx.fillText(formatDate(dates[i], true), x + barWidth / 2, canvas.height - margin + 15);
    ctx.fillStyle = '#3498db';
  });
}

// ======================================
// FAVORIETEN BEHEER
// ======================================

// 1. Favoriet toevoegen
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

// 2. Favoriet verwijderen
function removeFavorite(name, country) {
  favorites = favorites.filter(fav => !(fav.name === name && fav.country === country));
  localStorage.setItem('favorites', JSON.stringify(favorites));
  renderFavorites();
  
  // Update het hartje in de huidige weerkaart als die zichtbaar is
  if (currentWeatherData && currentWeatherData[0] && 
      currentWeatherData[0].location.name === name && 
      currentWeatherData[0].location.country === country) {
    const heartIcon = weatherContainer.querySelector('.favorite-btn i');
    if (heartIcon) {
      heartIcon.classList.replace('fas', 'far');
    }
  }
}

// ======================================
// FILTER FUNCTIES
// ======================================

// 1. Extra info filters toepassen
function applyInfoFilters() {
  // Loop door alle checkboxes
  infoFilters.forEach(filter => {
    const value = filter.value;
    const isChecked = filter.checked;
    const statusSpan = filter.closest('.switch-label').querySelector('.status');
    
    // Update status tekst
    if (statusSpan) {
      statusSpan.textContent = isChecked ? 'Aan' : 'Uit';
    }
    
    // Toon/verberg het juiste element op basis van filter waarde
    const filterElement = document.querySelector(`.filter-${value}`);
    if (filterElement) {
      filterElement.style.display = isChecked ? 'block' : 'none';
    }
  });
}

// ======================================
// UTILITY FUNCTIES
// ======================================

// 1. Datum formatteren
function formatDate(dateString, shortFormat = false) {
  const date = new Date(dateString);
  
  if (shortFormat) {
    // Kort formaat (DD/MM)
    return `${date.getDate()}/${date.getMonth() + 1}`;
  }
  
  // Dag en maand met naam
  const options = { weekday: 'short', day: 'numeric', month: 'short' };
  return date.toLocaleDateString('nl-NL', options);
}

// 2. Tijd formatteren
function formatTime(timeString) {
  const date = new Date(timeString);
  return date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
}

// 3. Thema dag/nacht modus
function applyDayNightTheme() {
  const hour = new Date().getHours();
  if (hour >= 7 && hour < 19) {
    body.classList.remove('dark');
    body.classList.add('light');
  } else {
    body.classList.remove('light');
    body.classList.add('dark');
  }
}

// ======================================
// EVENT LISTENERS
// ======================================

// 1. Thema toggle
themeToggleBtn.addEventListener('click', () => {
  body.classList.toggle('dark');
  body.classList.toggle('light');
  
  // Als er een neerslaggrafiek is, herteken deze met juiste kleuren
  if (document.getElementById('precipitationChart') && currentExtraWeatherData) {
    drawPrecipitationChart(
      currentExtraWeatherData.daily.time, 
      currentExtraWeatherData.daily.precipitation_sum
    );
  }
});

// 2. Tabs wisselen
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

// 3. Formulier: locatie zoeken
locationForm.addEventListener('submit', async e => {
  e.preventDefault();
  const city = locationInput.value.trim();
  if (!city) {
    locationError.textContent = 'Vul een locatie in.';
    locationError.classList.remove('hidden');
    return;
  }
  
  locationError.textContent = '';
  locationError.classList.add('hidden');
  
  // Loading state
  const loader = document.querySelector('.loader');
  loader.classList.remove('hidden');
  document.getElementById('no-weather-data').classList.add('hidden');

  try {
    const coords = await fetchCoords(city);
    const currentWeather = await fetchWeather(coords.lat, coords.lon);
    const forecast = await fetchForecast(coords.lat, coords.lon);
    const extraData = await fetchExtraWeatherData(coords.lat, coords.lon);
    currentExtraWeatherData = extraData;

    currentWeatherData = [{
      weather: currentWeather,
      location: { name: coords.name, country: coords.country },
      weathercode: currentWeather.weathercode
    }];

    renderWeatherList(currentWeatherData);
    renderForecast(forecast);
    updateExtraWeatherInfo(extraData);
    updateMap(coords.lat, coords.lon);
    
    // Activeer forecast knop
    const loadForecastBtn = document.getElementById('load-forecast-btn');
    if (loadForecastBtn) {
      loadForecastBtn.disabled = false;
    }

  } catch (error) {
    locationError.textContent = error.message;
    locationError.classList.remove('hidden');
    weatherContainer.innerHTML = '<p>Kan geen weerdata laden voor deze locatie.</p>';
    forecastContainer.innerHTML = '<p>Geen voorspellingen beschikbaar.</p>';
    extraWeatherInfo.innerHTML = '<p>Geen extra weerdata beschikbaar.</p>';
  } finally {
    loader.classList.add('hidden');
  }
});

// 4. Favoriet toevoegen/verwijderen via click op hartje
weatherContainer.addEventListener('click', e => {
  if (e.target.closest('.favorite-btn')) {
    const btn = e.target.closest('.favorite-btn');
    const name = btn.dataset.name;
    const country = btn.dataset.country;
    const icon = btn.querySelector('i');

    const favIndex = favorites.findIndex(fav => fav.name === name && fav.country === country);

    if (favIndex > -1) {
      removeFavorite(name, country);
      if (icon) icon.classList.replace('fas', 'far');
    } else {
      // Zoek de actuele temperatuur van deze locatie
      const data = currentWeatherData.find(item => 
        item.location.name === name && item.location.country === country
      );
      if (data) {
        addFavorite(data.weather, data.location);
        if (icon) icon.classList.replace('far', 'fas');
      }
    }
  }
});

// 5. Favoriet verwijderen via knop in favorietenlijst
favoritesContainer.addEventListener('click', e => {
  if (e.target.classList.contains('remove-favorite-btn')) {
    const name = e.target.dataset.name;
    const country = e.target.dataset.country;
    removeFavorite(name, country);
  }
});

// 6. Extra info filters (checkboxes)
infoFilters.forEach(checkbox => {
  checkbox.addEventListener('change', () => {
    applyInfoFilters();
  });
});

// ======================================
// INITIALISATIE
// ======================================
document.addEventListener('DOMContentLoaded', () => {
  applyDayNightTheme();
  renderFavorites();
  
  // Standaard status van switches instellen
  infoFilters.forEach(checkbox => {
    const statusSpan = checkbox.closest('.switch-label').querySelector('.status');
    if (statusSpan) {
      statusSpan.textContent = checkbox.checked ? 'Aan' : 'Uit';
    }
  });
});