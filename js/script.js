// API Configuration
const API_KEY = 'ef7b1d3a1828f384a89adb03fb5ff240';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

// Global variables
let currentUnit = 'C';
let currentCity = 'London';

// DOM Elements
const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const loadingDiv = document.getElementById('loading');
const errorDiv = document.getElementById('errorMsg');
const currentWeatherDiv = document.getElementById('currentWeather');
const forecastDiv = document.getElementById('forecast');
const recentSearchesDiv = document.getElementById('recentSearches');

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    loadRecentSearches();
    // Test if API key works
    testAPIKey();
});

// Test API key function
async function testAPIKey() {
    try {
        const testUrl = `${BASE_URL}/weather?q=London&appid=${API_KEY}&units=metric`;
        const response = await fetch(testUrl);
        
        if (response.status === 401) {
            showError('⚠️ API Key is invalid or not activated yet. Please wait 15-30 minutes after signing up.');
        } else if (response.ok) {
            console.log('✅ API Key works!');
            getWeather('London');
        }
    } catch (error) {
        console.error('API Test failed:', error);
    }
}

// Handle Enter key press
function handleKeyPress(event) {
    if (event.key === 'Enter') {
        getWeather();
    }
}

// Toggle temperature unit
function toggleUnit(unit) {
    currentUnit = unit;
    
    document.getElementById('celsiusBtn').classList.toggle('active', unit === 'C');
    document.getElementById('fahrenheitBtn').classList.toggle('active', unit === 'F');
    document.getElementById('tempUnit').textContent = unit === 'C' ? '°C' : '°F';
    
    if (currentCity) {
        getWeather(currentCity);
    }
}

// Main function to get weather
async function getWeather(city = null) {
    const searchCity = city || cityInput.value.trim();
    
    if (!searchCity) {
        showError('Please enter a city name');
        return;
    }
    
    currentCity = searchCity;
    
    showLoading(true);
    hideError();
    hideWeather();
    
    try {
        // Convert city name to proper case (e.g., MANCHESTER -> Manchester)
        const formattedCity = formatCityName(searchCity);
        
        const currentWeather = await fetchCurrentWeather(formattedCity);
        const forecast = await fetchForecast(formattedCity);
        
        displayCurrentWeather(currentWeather);
        displayForecast(forecast);
        
        saveToRecentSearches(formattedCity);
        
        currentWeatherDiv.style.display = 'block';
        forecastDiv.style.display = 'block';
        
    } catch (error) {
        console.error('Error:', error);
        
        // Better error messages
        if (error.message.includes('401')) {
            showError('❌ API Key Error: Please wait 15-30 minutes for your API key to activate, or check if it\'s correct.');
        } else if (error.message.includes('404')) {
            showError(`❌ City "${searchCity}" not found. Please check spelling and try again.`);
        } else if (error.message.includes('Network')) {
            showError('❌ Network error. Please check your internet connection.');
        } else {
            showError(`❌ Could not find weather for "${searchCity}". Try a different city name.`);
        }
        
        hideWeather();
    } finally {
        showLoading(false);
    }
}

// Format city name (MANCHESTER -> Manchester)
function formatCityName(city) {
    return city.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
}

// Fetch current weather
async function fetchCurrentWeather(city) {
    const url = `${BASE_URL}/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`;
    console.log('Fetching:', url); // For debugging
    
    const response = await fetch(url);
    
    if (response.status === 401) {
        throw new Error('401 - Invalid API Key');
    }
    
    if (!response.ok) {
        throw new Error(`${response.status} - City not found`);
    }
    
    return await response.json();
}

// Fetch 5-day forecast
async function fetchForecast(city) {
    const url = `${BASE_URL}/forecast?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`;
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error('Forecast not available');
    }
    
    const data = await response.json();
    const dailyForecasts = data.list.filter((item, index) => index % 8 === 0);
    return dailyForecasts.slice(0, 5);
}

// Display current weather
function displayCurrentWeather(data) {
    document.getElementById('cityName').textContent = `${data.name}, ${data.sys.country}`;
    document.getElementById('dateTime').textContent = new Date().toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const temp = currentUnit === 'C' ? data.main.temp : celsiusToFahrenheit(data.main.temp);
    document.getElementById('temp').textContent = Math.round(temp);
    document.getElementById('condition').textContent = data.weather[0].description;
    
    const iconCode = data.weather[0].icon;
    document.getElementById('weatherIcon').src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
    
    document.getElementById('humidity').textContent = `${data.main.humidity}%`;
    
    const windSpeed = currentUnit === 'C' ? data.wind.speed : (data.wind.speed * 0.621371).toFixed(1);
    document.getElementById('windSpeed').textContent = `${windSpeed} ${currentUnit === 'C' ? 'km/h' : 'mph'}`;
    
    document.getElementById('pressure').textContent = `${data.main.pressure} hPa`;
    const visibility = (data.visibility / 1000).toFixed(1);
    document.getElementById('visibility').textContent = `${visibility} km`;
}

// Display 5-day forecast
function displayForecast(forecastData) {
    const container = document.getElementById('forecastContainer');
    container.innerHTML = '';
    
    forecastData.forEach(day => {
        const date = new Date(day.dt * 1000);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const monthDay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        const temp = currentUnit === 'C' ? day.main.temp : celsiusToFahrenheit(day.main.temp);
        const iconCode = day.weather[0].icon;
        
        const forecastCard = document.createElement('div');
        forecastCard.className = 'forecast-card';
        forecastCard.innerHTML = `
            <div class="date">${dayName}<br><small>${monthDay}</small></div>
            <img src="https://openweathermap.org/img/wn/${iconCode}@2x.png" alt="${day.weather[0].description}">
            <div class="temp">${Math.round(temp)}°${currentUnit}</div>
            <div class="condition">${day.weather[0].description}</div>
        `;
        
        container.appendChild(forecastCard);
    });
}

// Save to recent searches
function saveToRecentSearches(city) {
    let searches = JSON.parse(localStorage.getItem('recentSearches') || '[]');
    searches = searches.filter(s => s.toLowerCase() !== city.toLowerCase());
    searches.unshift(city);
    searches = searches.slice(0, 5);
    localStorage.setItem('recentSearches', JSON.stringify(searches));
    displayRecentSearches();
}

// Display recent searches
function displayRecentSearches() {
    const searches = JSON.parse(localStorage.getItem('recentSearches') || '[]');
    const recentList = document.getElementById('recentList');
    
    if (searches.length === 0) {
        recentSearchesDiv.style.display = 'none';
        return;
    }
    
    recentSearchesDiv.style.display = 'block';
    recentList.innerHTML = '';
    
    searches.forEach(city => {
        const recentItem = document.createElement('div');
        recentItem.className = 'recent-item';
        recentItem.textContent = city;
        recentItem.onclick = () => {
            cityInput.value = city;
            getWeather(city);
        };
        recentList.appendChild(recentItem);
    });
}

function loadRecentSearches() {
    displayRecentSearches();
}

function celsiusToFahrenheit(celsius) {
    return (celsius * 9/5) + 32;
}

function showLoading(show) {
    loadingDiv.style.display = show ? 'block' : 'none';
}

function showError(message) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 8000);
}

function hideError() {
    errorDiv.style.display = 'none';
}

function hideWeather() {
    currentWeatherDiv.style.display = 'none';
    forecastDiv.style.display = 'none';
}

// Event listener
searchBtn.addEventListener('click', () => getWeather());