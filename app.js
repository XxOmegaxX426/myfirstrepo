const forecastApi = "https://api.open-meteo.com/v1/forecast";
const geocodingApi = "https://geocoding-api.open-meteo.com/v1/search";
const weatherDescriptions = {
  0: ["Clear sky", "☀️", "☀️"],
  1: ["Mostly clear", "🌤️", "🌙"],
  2: ["Partly cloudy", "⛅", "☁️"],
  3: ["Overcast", "☁️", "☁️"],
  45: ["Foggy", "🌫️", "🌫️"],
  48: ["Icy fog", "🌫️", "🌫️"],
  51: ["Light drizzle", "🌦️", "🌧️"],
  53: ["Drizzle", "🌦️", "🌧️"],
  55: ["Steady drizzle", "🌧️", "🌧️"],
  56: ["Icy drizzle", "🌧️", "🌧️"],
  57: ["Freezing drizzle", "🌧️", "🌧️"],
  61: ["Light rain", "🌦️", "🌧️"],
  63: ["Rain", "🌧️", "🌧️"],
  65: ["Heavy rain", "🌧️", "🌧️"],
  66: ["Freezing rain", "🌧️", "🌧️"],
  67: ["Heavy freezing rain", "🌧️", "🌧️"],
  71: ["Light snow", "🌨️", "🌨️"],
  73: ["Snow", "❄️", "❄️"],
  75: ["Heavy snow", "❄️", "❄️"],
  77: ["Snow grains", "🌨️", "🌨️"],
  80: ["Passing showers", "🌦️", "🌧️"],
  81: ["Rain showers", "🌧️", "🌧️"],
  82: ["Heavy showers", "🌧️", "🌧️"],
  85: ["Snow showers", "🌨️", "🌨️"],
  86: ["Heavy snow showers", "❄️", "❄️"],
  95: ["Thunderstorms", "⛈️", "⛈️"],
  96: ["Thunder & hail", "⛈️", "⛈️"],
  99: ["Strong thunder & hail", "⛈️", "⛈️"],
};

const elements = {
  content: document.querySelector("#weather-content"),
  status: document.querySelector("#status-message"),
  locationName: document.querySelector("#location-name"),
  locationMeta: document.querySelector("#location-meta"),
  currentTemperature: document.querySelector("#current-temperature"),
  currentIcon: document.querySelector("#current-icon"),
  conditionName: document.querySelector("#condition-name"),
  feelsLike: document.querySelector("#feels-like"),
  humidity: document.querySelector("#humidity-value"),
  humidityHint: document.querySelector("#humidity-hint"),
  wind: document.querySelector("#wind-value"),
  rain: document.querySelector("#rain-value"),
  detailFeels: document.querySelector("#detail-feels-value"),
  sunrise: document.querySelector("#sunrise-label"),
  sunset: document.querySelector("#sunset-label"),
  updated: document.querySelector("#updated-time"),
  hourly: document.querySelector("#hourly-list"),
  daily: document.querySelector("#daily-list"),
};

let unit = "celsius";
let latestForecast;
let latestPlace;

function weatherFor(code, isDay = true) {
  const description = weatherDescriptions[code] || ["Variable conditions", "🌤️", "☁️"];
  return { name: description[0], icon: isDay ? description[1] : description[2] };
}

function temperature(value) {
  const converted = unit === "fahrenheit" ? (value * 9) / 5 + 32 : value;
  return Math.round(converted);
}

function formatClock(dateTime) {
  const match = dateTime.match(/T(\d{2}):(\d{2})/);
  if (!match) return "--:--";
  const hour = Number(match[1]);
  const suffix = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${match[2]} ${suffix}`;
}

function weekday(dateString, options = {}) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat("en", { timeZone: "UTC", ...options }).format(date);
}

function showError(message) {
  elements.status.replaceChildren(document.createTextNode(message));
  elements.status.classList.add("is-visible");
}

function clearError() {
  elements.status.replaceChildren();
  elements.status.classList.remove("is-visible");
}

function render(forecast, place) {
  latestForecast = forecast;
  latestPlace = place;
  const current = forecast.current;
  const currentWeather = weatherFor(current.weather_code, current.is_day === 1);
  const currentUnit = unit === "celsius" ? "C" : "F";

  elements.locationName.textContent = place.name;
  elements.locationMeta.textContent = [place.admin1, place.country].filter(Boolean).join(", ");
  elements.currentTemperature.textContent = temperature(current.temperature_2m);
  elements.currentIcon.textContent = currentWeather.icon;
  elements.conditionName.textContent = currentWeather.name;
  elements.feelsLike.textContent = `Feels like ${temperature(current.apparent_temperature)}°${currentUnit}`;
  elements.humidity.textContent = `${current.relative_humidity_2m}%`;
  elements.humidityHint.textContent = current.relative_humidity_2m >= 70 ? "A bit humid" : "In the air";
  const currentHour = current.time.slice(0, 13);
  const rainIndex = forecast.hourly.time.findIndex((time) => time.slice(0, 13) === currentHour);
  elements.wind.replaceChildren(document.createTextNode(`${Math.round(current.wind_speed_10m)} `));
  const windUnit = document.createElement("small");
  windUnit.textContent = "km/h";
  elements.wind.append(windUnit);
  elements.rain.textContent = `${forecast.hourly.precipitation_probability[rainIndex >= 0 ? rainIndex : 0]}%`;
  elements.detailFeels.textContent = `${temperature(current.apparent_temperature)}°`;
  elements.sunrise.textContent = `Sunrise ${formatClock(forecast.daily.sunrise[0])}`;
  elements.sunset.textContent = `Sunset ${formatClock(forecast.daily.sunset[0])}`;
  elements.updated.textContent = formatClock(current.time);

  renderHourly(forecast);
  renderDaily(forecast);
}

function renderHourly(forecast) {
  const { hourly, current } = forecast;
  const currentHour = current.time.slice(0, 13);
  let nextHour = hourly.time.findIndex((time) => time.slice(0, 13) > currentHour);
  if (nextHour < 0) nextHour = hourly.time.length;
  const currentWeather = weatherFor(current.weather_code, current.is_day === 1);
  const currentRainIndex = hourly.time.findIndex((time) => time.slice(0, 13) === currentHour);
  const entries = [{
    label: "Now",
    icon: currentWeather.icon,
    temp: current.temperature_2m,
    rain: hourly.precipitation_probability[currentRainIndex >= 0 ? currentRainIndex : 0],
    isNow: true,
  }, ...hourly.time.slice(nextHour, nextHour + 11).map((time, offset) => {
    const index = nextHour + offset;
    const weather = weatherFor(hourly.weather_code[index], hourly.is_day[index] === 1);
    return {
      label: formatClock(time),
      icon: weather.icon,
      temp: hourly.temperature_2m[index],
      rain: hourly.precipitation_probability[index],
      isNow: false,
    };
  })];
  elements.hourly.replaceChildren(...entries.map((entry) => {
    const item = document.createElement("div");
    item.className = `hour-item${entry.isNow ? " is-now" : ""}`;
    const timeLabel = document.createElement("span");
    timeLabel.className = "hour-time";
    timeLabel.textContent = entry.label;
    const icon = document.createElement("span");
    icon.className = "hour-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = entry.icon;
    const temp = document.createElement("strong");
    temp.className = "hour-temp";
    temp.textContent = `${temperature(entry.temp)}°`;
    const rain = document.createElement("span");
    rain.className = "hour-rain";
    rain.textContent = `${entry.rain}% rain`;
    item.append(timeLabel, icon, temp, rain);
    return item;
  }));
}

function renderDaily(forecast) {
  const { daily } = forecast;
  const lows = daily.temperature_2m_min.map(temperature);
  const highs = daily.temperature_2m_max.map(temperature);
  const min = Math.min(...lows);
  const max = Math.max(...highs);
  const spread = Math.max(max - min, 1);

  elements.daily.replaceChildren(...daily.time.map((date, index) => {
    const weather = weatherFor(daily.weather_code[index]);
    const fillLeft = ((lows[index] - min) / spread) * 100;
    const fillWidth = Math.max(((highs[index] - lows[index]) / spread) * 100, 8);
    const row = document.createElement("div");
    row.className = "day-row";
    row.innerHTML = `<span class="day-name">${index === 0 ? "Today" : weekday(date, { weekday: "short" })}</span><span class="day-icon" aria-label="${weather.name}">${weather.icon}</span><span class="rain-chance${daily.precipitation_probability_max[index] >= 30 ? " is-rainy" : ""}">☂ ${daily.precipitation_probability_max[index]}%</span>`;

    const range = document.createElement("span");
    range.className = "temp-range";
    range.setAttribute("aria-label", `High ${highs[index]} degrees, low ${lows[index]} degrees`);
    const high = document.createElement("span");
    high.className = "temp-high";
    high.textContent = `${highs[index]}°`;
    const track = document.createElement("span");
    track.className = "range-track";
    const fill = document.createElement("span");
    fill.className = "range-fill";
    fill.style.cssText = `display:block;margin-left:${fillLeft}%;width:${fillWidth}%`;
    track.append(fill);
    const low = document.createElement("span");
    low.className = "temp-low";
    low.textContent = `${lows[index]}°`;
    range.append(high, track, low);
    row.append(range);
    return row;
  }));
}

async function loadForecast(place) {
  clearError();
  elements.content.setAttribute("aria-busy", "true");
  try {
    const url = new URL(forecastApi);
    url.search = new URLSearchParams({
      latitude: place.latitude,
      longitude: place.longitude,
      current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m",
      hourly: "temperature_2m,precipitation_probability,weather_code,is_day",
      daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset",
      timezone: "auto",
      forecast_days: "7",
    }).toString();
    const response = await fetch(url);
    if (!response.ok) throw new Error("The forecast service is temporarily unavailable. Please try again in a moment.");
    const forecast = await response.json();
    if (!forecast.current || !forecast.hourly || !forecast.daily) {
      throw new Error("The forecast service returned incomplete data. Please try again.");
    }
    render(forecast, place);
  } catch (error) {
    showError(error instanceof Error ? error.message : "Couldn't load the forecast. Please check your connection and try again.");
  } finally {
    elements.content.setAttribute("aria-busy", "false");
  }
}

async function searchLocation(query) {
  clearError();
  elements.content.setAttribute("aria-busy", "true");
  try {
    const url = new URL(geocodingApi);
    url.search = new URLSearchParams({ name: query, count: "1", language: "en", format: "json" }).toString();
    const response = await fetch(url);
    if (!response.ok) throw new Error("Couldn't search for that city right now. Please try again.");
    const result = await response.json();
    const place = result.results?.[0];
    if (!place) throw new Error(`We couldn't find "${query}". Try another city name.`);
    await loadForecast(place);
  } catch (error) {
    showError(error instanceof Error ? error.message : "Couldn't find that city. Please try another name.");
    elements.content.setAttribute("aria-busy", "false");
  }
}

document.querySelector("#search-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = document.querySelector("#location-search");
  const query = input.value.trim();
  if (query) searchLocation(query);
});

document.querySelectorAll(".unit-button").forEach((button) => {
  button.addEventListener("click", () => {
    if (unit === button.dataset.unit) return;
    unit = button.dataset.unit;
    document.querySelectorAll(".unit-button").forEach((toggle) => {
      const selected = toggle === button;
      toggle.classList.toggle("is-selected", selected);
      toggle.setAttribute("aria-pressed", String(selected));
    });
    if (latestForecast && latestPlace) render(latestForecast, latestPlace);
  });
});

loadForecast({ name: "New York", admin1: "New York", country: "United States", latitude: 40.7128, longitude: -74.006 });
