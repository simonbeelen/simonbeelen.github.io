
import "leaflet";
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
let filterSettings = JSON.parse(localStorage.getItem('weather-filters')) || {
  wind: true,
  humidity: true,
  sunrise: true,
  sunset: true,
  pressure: true,
  precipitation: true,
  uv: true
};
let map; // Leaflet kaart

// ======================================
// HELPER FUNCTIES
// ======================================
function setupIntersectionObserver(targetElement, callback) {
  if (!targetElement) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        callback();
        observer.unobserve(targetElement); 
      }
    });
  }, { threshold: 0.1 });

  observer.observe(targetElement);
}
setupIntersectionObserver(extraWeatherInfo, async () => {
  
  if (currentWeatherData && currentWeatherData[0]) {
    const { lat, lon } = currentWeatherData[0].location;
    const extraData = await fetchExtraWeatherData(lat, lon);
    updateExtraWeatherInfo(extraData);
  }
});

// KAART-FUNCTIES
function initMap(lat, lon) {
  if (!map) {
    const mapElement = document.getElementById('map');
    if (mapElement) {
      map = L.map('map').setView([lat, lon], 10);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);
    }
  } else {
    map.setView([lat, lon], 10);
  }
}

function updateMap(lat, lon) {
  initMap(lat, lon);
  
  if (map) {
    // Verwijder oude markers
    map.eachLayer(layer => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    // Voeg nieuwe marker toe
    L.marker([lat, lon]).addTo(map);
  }
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

// Veilige DOM element setter
function safeSetTextContent(elementId, value) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = value;
  } else {
    console.warn(`Element with ID '${elementId}' not found`);
  }
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

// 4. Extra weerdata ophalen (uitgebreid met meer parameters)
async function fetchExtraWeatherData(lat, lon) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation,uv_index,relative_humidity_2m,precipitation_probability&daily=sunrise,sunset,precipitation_sum,uv_index_max&current=relative_humidity_2m,pressure_msl,precipitation,uv_index&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Kon extra weerdata niet ophalen');
    return await res.json();
  } catch (error) {
    console.error('Error fetching extra weather data:', error);
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
  if (!weatherContainer) {
    console.warn('Weather container not found');
    return;
  }

  if (!weatherList || weatherList.length === 0) {
    weatherContainer.innerHTML = '<p>Zoek naar een locatie om het weer te bekijken.</p>';
    return;
  }
  weatherContainer.innerHTML = weatherList.map(item => createWeatherCard(item.weather, item.location)).join('');
}

// 3. Forecast renderen met verbeterde layout
function renderForecast(daily) {
  if (!forecastContainer) {
    console.warn('Forecast container not found');
    return;
  }

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
    <h2>7-daagse voorspelling</h2>
    <div class="forecast-list">${forecastHTML}</div>
    <div class="chart-container">
      <h3>Neerslagverwachting</h3>
      <canvas id="precipitationChart" width="800" height="300"></canvas>
    </div>
  `;

  // Wacht even voordat we de grafiek tekenen
  setTimeout(() => {
    drawPrecipitationChart(daily.time, daily.precipitation_sum);
  }, 100);
}

// 4. Extra weerinfo tonen met verbeterde data handling
function updateExtraWeatherInfo(data) {
  if (!extraWeatherInfo) {
    console.warn('Extra weather info container not found');
    return;
  }

  if (!data) {
    extraWeatherInfo.innerHTML = '<h2>Extra Weerinformatie</h2><p>Geen extra weerdata beschikbaar.</p>';
    return;
  }

  console.log("Updating extra weather info with data:", data);

  // Update alle weergegevens met juiste eenheden
  if (data.daily && data.daily.sunrise && data.daily.sunset) {
    safeSetTextContent('sunrise', formatTime(data.daily.sunrise[0]));
    safeSetTextContent('sunset', formatTime(data.daily.sunset[0]));
  }

  // UV-index - probeer verschillende bronnen
  let uvIndex = '-';
  if (data.current && typeof data.current.uv_index === 'number') {
    uvIndex = data.current.uv_index.toFixed(1);
  } else if (data.hourly && data.hourly.uv_index && data.hourly.uv_index[0] !== undefined) {
    uvIndex = data.hourly.uv_index[0].toFixed(1);
  } else if (data.daily && data.daily.uv_index_max && data.daily.uv_index_max[0] !== undefined) {
    uvIndex = data.daily.uv_index_max[0].toFixed(1);
  }
  safeSetTextContent('uv-index', uvIndex);

  // Neerslag - probeer verschillende bronnen
  let precipitation = '-';
  if (data.current && typeof data.current.precipitation === 'number') {
    precipitation = data.current.precipitation.toFixed(1) + ' mm';
  } else if (data.hourly && data.hourly.precipitation && data.hourly.precipitation[0] !== undefined) {
    precipitation = data.hourly.precipitation[0].toFixed(1) + ' mm';
  } else if (data.daily && data.daily.precipitation_sum && data.daily.precipitation_sum[0] !== undefined) {
    precipitation = data.daily.precipitation_sum[0].toFixed(1) + ' mm';
  }
  safeSetTextContent('precipitation', precipitation);

  // Vochtigheid
  if (data.current && typeof data.current.relative_humidity_2m === 'number') {
    safeSetTextContent('humidity', data.current.relative_humidity_2m + '%');
  } else {
    safeSetTextContent('humidity', '-');
  }

  // Luchtdruk
  if (data.current && typeof data.current.pressure_msl === 'number') {
    safeSetTextContent('pressure', data.current.pressure_msl + ' hPa');
  } else {
    safeSetTextContent('pressure', '-');
  }

  // Windsnelheid van huidige weerdata
  if (currentWeatherData && currentWeatherData[0] && currentWeatherData[0].weather) {
    safeSetTextContent('wind', currentWeatherData[0].weather.windspeed + ' km/h');
  }

  // Filter toepassen voor weergave
  applyInfoFilters();
}

// 5. Favorietenlijst weergeven
function renderFavorites() {
  if (!favoritesContainer) {
    console.warn('Favorites container not found');
    return;
  }

  if (favorites.length === 0) {
    favoritesContainer.innerHTML = '<p>Je hebt nog geen favoriete locaties toegevoegd. Klik op het hartje bij een locatie om deze toe te voegen.</p>';
    safeSetTextContent('favorites-count', '(0)');
    
    const noFavoritesElement = document.getElementById('no-favorites');
    if (noFavoritesElement) {
      noFavoritesElement.classList.remove('hidden');
    }
    return;
  }

  const noFavoritesElement = document.getElementById('no-favorites');
  if (noFavoritesElement) {
    noFavoritesElement.classList.add('hidden');
  }
  
  favoritesContainer.innerHTML = favorites.map(fav => `
    <div class="weather-card">
      <h3>${fav.name}, ${fav.country}</h3>
      <div>Temperatuur: ${fav.temperature.toFixed(1)}°C</div>
      <div><button class="remove-favorite-btn" data-name="${fav.name}" data-country="${fav.country}">Verwijder</button></div>
    </div>
  `).join('');
  
  safeSetTextContent('favorites-count', `(${favorites.length})`);
}

// 6.  neerslaggrafiek
function drawPrecipitationChart(dates, precipitation) {
  const canvas = document.getElementById('precipitationChart');
  if (!canvas) {
    console.warn('Canvas element not found');
    return;
  }
  
  const ctx = canvas.getContext('2d');
  
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!precipitation || precipitation.length === 0) {
    ctx.fillStyle = body.classList.contains('dark') ? '#eee' : '#333';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Geen neerslagdata beschikbaar', canvas.width / 2, canvas.height / 2);
    return;
  }

  // Basisinstellingen
  const maxPrecip = Math.max(...precipitation, 1); // Minimum 1 om deling door 0 te voorkomen
  const margin = 60;
  const width = canvas.width - margin * 2;
  const height = canvas.height - margin * 2;
  const barWidth = width / precipitation.length * 0.6;
  const gap = width / precipitation.length * 0.4;

  // Kleuren gebaseerd op thema
  const barColor = '#3498db';
  const textColor = body.classList.contains('dark') ? '#eee' : '#333';
  const gridColor = body.classList.contains('dark') ? '#555' : '#ddd';

  // Teken grid lijnen
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y = margin + (height / 5) * i;
    ctx.beginPath();
    ctx.moveTo(margin, y);
    ctx.lineTo(canvas.width - margin, y);
    ctx.stroke();
  }

  // Y-as labels
  ctx.fillStyle = textColor;
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'right';
  for (let i = 0; i <= 5; i++) {
    const y = margin + (height / 5) * i;
    const value = (maxPrecip * (5 - i) / 5).toFixed(1);
    ctx.fillText(value + ' mm', margin - 10, y + 4);
  }

  // Staven tekenen
  ctx.fillStyle = barColor;
  precipitation.forEach((precip, i) => {
    const barHeight = maxPrecip === 0 ? 0 : (precip / maxPrecip) * height;
    const x = margin + i * (barWidth + gap);
    const y = canvas.height - margin - barHeight;

    // Teken staaf
    ctx.fillRect(x, y, barWidth, barHeight);
    
    // Waarde boven staaf
    ctx.fillStyle = textColor;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(precip.toFixed(1), x + barWidth / 2, y - 5);
    
    // Datum onder staaf
    ctx.fillText(formatDate(dates[i], true), x + barWidth / 2, canvas.height - margin + 20);
    
    ctx.fillStyle = barColor;
  });

  // Titel
  ctx.fillStyle = textColor;
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Neerslag per dag (mm)', canvas.width / 2, 20);
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
    const heartIcon = weatherContainer?.querySelector('.favorite-btn i');
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
  infoFilters.forEach(filter => {
    const value = filter.value;
    const isChecked = filter.checked;
    const statusSpan = filter.closest('.switch-label')?.querySelector('.status');
    
    // Update status tekst
    if (statusSpan) {
      statusSpan.textContent = isChecked ? 'Aan' : 'Uit';
    }
    
    // Speciale behandeling voor sunrise filter (controleert beide elementen)
    if (value === 'sunrise') {
      const sunriseElement = document.querySelector('.filter-sunrise');
      const sunsetElement = document.querySelector('.filter-sunset');
      
      if (sunriseElement) {
        sunriseElement.style.display = isChecked ? 'flex' : 'none';
      }
      if (sunsetElement) {
        sunsetElement.style.display = isChecked ? 'flex' : 'none';
      }
    } else {
      // Voor alle andere filters
      const filterElements = document.querySelectorAll(`.filter-${value}`);
      filterElements.forEach(element => {
        if (element) {
          element.style.display = isChecked ? 'flex' : 'none';
        }
      });
    }
    
    // Sla filter instellingen op
    filterSettings[value] = isChecked;
  });
  
  // Sla instellingen op in localStorage
  localStorage.setItem('weather-filters', JSON.stringify(filterSettings));
  
  // Check of alle items verborgen zijn
  if (extraWeatherInfo) {
    const visibleItems = extraWeatherInfo.querySelectorAll('li:not([style*="display: none"])');
    
    if (visibleItems.length === 0) {
      extraWeatherInfo.classList.add('empty-state');
      extraWeatherInfo.innerHTML = '<h2>Extra Weerinformatie</h2><p>Selecteer filters om weerinfo te tonen</p>';
    } else {
      extraWeatherInfo.classList.remove('empty-state');
    }
  }
}


// 2. Filter instellingen laden uit localStorage
function loadFilterSettings() {
  infoFilters.forEach(checkbox => {
    const value = checkbox.value;
    if (filterSettings.hasOwnProperty(value)) {
      checkbox.checked = filterSettings[value];
    }
    
    // Update status tekst
    const statusSpan = checkbox.closest('.switch-label')?.querySelector('.status');
    if (statusSpan) {
      statusSpan.textContent = checkbox.checked ? 'Aan' : 'Uit';
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
  if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', () => {
    body.classList.toggle('dark');
    body.classList.toggle('light');
    
    // Als er een neerslaggrafiek is, herteken deze met juiste kleuren
    if (document.getElementById('precipitationChart') && currentExtraWeatherData) {
      setTimeout(() => {
        if (currentExtraWeatherData.daily) {
          drawPrecipitationChart(
            currentExtraWeatherData.daily.time, 
            currentExtraWeatherData.daily.precipitation_sum
          );
        }
      }, 100);
    }
  });
}

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
if (locationForm) {
  locationForm.addEventListener('submit', async e => {
    e.preventDefault();
    const city = locationInput?.value.trim();
    if (!city) {
      if (locationError) {
        locationError.textContent = 'Vul een locatie in.';
        locationError.classList.remove('hidden');
      }
      return;
    }
    
    if (locationError) {
      locationError.textContent = '';
      locationError.classList.add('hidden');
    }
    
    // Loading state
    const loader = document.querySelector('.loader');
    if (loader) {
      loader.classList.remove('hidden');
    }
    
    const noWeatherData = document.getElementById('no-weather-data');
    if (noWeatherData) {
      noWeatherData.classList.add('hidden');
    }

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
      console.error('Error fetching weather data:', error);
      if (locationError) {
        locationError.textContent = error.message;
        locationError.classList.remove('hidden');
      }
      
      if (weatherContainer) {
        weatherContainer.innerHTML = '<p>Kan geen weerdata laden voor deze locatie.</p>';
      }
      if (forecastContainer) {
        forecastContainer.innerHTML = '<p>Geen voorspellingen beschikbaar.</p>';  
      }
      if (extraWeatherInfo) {
        extraWeatherInfo.innerHTML = '<p>Geen extra weerdata beschikbaar.</p>';
      }
    } finally {
      if (loader) {
        loader.classList.add('hidden');
      }
    }
  });
}

// 4. Favoriet toevoegen/verwijderen via click op hartje
if (weatherContainer) {
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
        const data = currentWeatherData?.find(item => 
          item.location.name === name && item.location.country === country
        );
        if (data) {
          addFavorite(data.weather, data.location);
          if (icon) icon.classList.replace('far', 'fas');
        }
      }
    }
  });
}

// 5. Favoriet verwijderen via knop in favorietenlijst
favoritesContainer.addEventListener('click', e => {
  if (e.target.classList.contains('remove-favorite-btn')) {
    const name = e.target.dataset.name;
    const country = e.target.dataset.country;
    removeFavorite(name, country);
  }
});

// 6. Extra info filters (checkboxes) met  event handling
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
  loadFilterSettings(); // Laad opgeslagen filter instellingen
  applyInfoFilters(); // Pas filters toe
  
  // Standaard status van switches instellen voor nieuwe gebruikers
  infoFilters.forEach(checkbox => {
    const statusSpan = checkbox.closest('.switch-label').querySelector('.status');
    if (statusSpan) {
      statusSpan.textContent = checkbox.checked ? 'Aan' : 'Uit';
    }
  });
});
