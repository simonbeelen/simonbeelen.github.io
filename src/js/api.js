const BASE_URL = 'https://api.open-meteo.com/v1';
const GEO_URL = 'https://geocoding-api.open-meteo.com/v1/search';

export async function searchLocation(query) {
  try {
    const response = await fetch(`${GEO_URL}?name=${encodeURIComponent(query)}&count=10&language=nl`);
    if (!response.ok) {
      throw new Error(`Probleem bij locatie opzoeken: ${response.status}`);
    }
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Fout bij locatiezoekopdracht:', error);
    throw error;
  }
}

export async function getCurrentWeather(latitude, longitude) {
  try {
    const params = new URLSearchParams({
      latitude,
      longitude,
      current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,is_day',
      timezone: 'auto',
      forecast_days: 1
    });

    const response = await fetch(`${BASE_URL}/forecast?${params}`);
    if (!response.ok) {
      throw new Error(`Probleem bij weer ophalen: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Fout bij ophalen van huidig weer:', error);
    throw error;
  }
}

export async function getForecast(latitude, longitude, days = 7) {
  try {
    const forecastDays = Math.min(Math.max(days, 1), 7);

    const params = new URLSearchParams({
      latitude,
      longitude,
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max',
      timezone: 'auto',
      forecast_days: forecastDays
    });

    const response = await fetch(`${BASE_URL}/forecast?${params}`);
    if (!response.ok) {
      throw new Error(`Probleem bij voorspelling ophalen: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Fout bij voorspelling ophalen:', error);
    throw error;
  }
}

export async function getHourlyForecast(latitude, longitude) {
  try {
    const params = new URLSearchParams({
      latitude,
      longitude,
      hourly: 'temperature_2m,precipitation,weather_code,wind_speed_10m',
      timezone: 'auto',
      forecast_days: 1
    });

    const response = await fetch(`${BASE_URL}/forecast?${params}`);
    if (!response.ok) {
      throw new Error(`Probleem bij uurlijkse data: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Fout bij uurlijkse data ophalen:', error);
    throw error;
  }
}
