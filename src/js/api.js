// api.js
export async function fetchCoords(city) {
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

export async function fetchWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Kon weerdata niet ophalen');
  const data = await res.json();
  return data.current_weather;
}
