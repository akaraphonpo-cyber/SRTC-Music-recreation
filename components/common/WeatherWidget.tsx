
import React, { useState, useEffect } from 'react';

interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  isDay: number;
}

const WeatherWidget: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Surat Thani Coordinates
  const LAT = 9.1333;
  const LON = 99.3167;

  useEffect(() => {
    const controller = new AbortController();

    const fetchWeather = async () => {
      try {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,relative_humidity_2m,is_day,weather_code,wind_speed_10m&timezone=Asia%2FBangkok`,
          { signal: controller.signal }
        );

        if (!response.ok) {
           throw new Error(`Weather API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.current) {
          setWeather({
            temperature: data.current.temperature_2m,
            humidity: data.current.relative_humidity_2m,
            windSpeed: data.current.wind_speed_10m,
            weatherCode: data.current.weather_code,
            isDay: data.current.is_day
          });
          setError(false);
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        // Downgrade to warning to avoid noise in console for network issues
        console.warn("Weather widget unavailable:", err.message);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 600000); // Refresh every 10 mins

    return () => {
        controller.abort();
        clearInterval(interval);
    };
  }, []);

  const getWeatherIcon = (code: number, isDay: number) => {
    // WMO Weather interpretation codes
    if (code === 0) return isDay ? '☀️' : '🌙'; // Clear sky
    if (code >= 1 && code <= 3) return isDay ? '⛅' : '☁️'; // Partly cloudy
    if (code >= 45 && code <= 48) return '🌫️'; // Fog
    if (code >= 51 && code <= 67) return '🌧️'; // Drizzle/Rain
    if (code >= 80 && code <= 99) return '⛈️'; // Showers/Thunderstorm
    return '🌤️';
  };

  const getWeatherDescription = (code: number) => {
    if (code === 0) return 'ท้องฟ้าแจ่มใส';
    if (code >= 1 && code <= 3) return 'มีเมฆบางส่วน';
    if (code >= 45 && code <= 48) return 'มีหมอก';
    if (code >= 51 && code <= 67) return 'ฝนตก';
    if (code >= 71 && code <= 77) return 'หิมะตก (เป็นไปได้?)';
    if (code >= 80 && code <= 82) return 'ฝนตกหนัก';
    if (code >= 95 && code <= 99) return 'พายุฝนฟ้าคะนอง';
    return 'ปกติ';
  };

  const getGradient = (code: number, isDay: number) => {
      if (!isDay) return 'from-slate-800 to-indigo-900'; // Night
      if (code >= 51) return 'from-slate-500 to-slate-700'; // Rain
      if (code <= 3) return 'from-sky-400 to-blue-600'; // Sunny/Cloudy
      return 'from-blue-500 to-cyan-600';
  };

  if (loading) return <div className={`glass-card p-4 rounded-2xl animate-pulse h-32 flex items-center justify-center ${className}`}><span className="text-sm opacity-50">กำลังโหลดสภาพอากาศ...</span></div>;
  
  // Gracefully handle error state by returning null (or a placeholder if preferred)
  if (error || !weather) return null; 

  const bgGradient = getGradient(weather.weatherCode, weather.isDay);

  return (
    <div className={`relative overflow-hidden rounded-2xl shadow-lg text-white p-5 bg-gradient-to-br ${bgGradient} ${className}`}>
        {/* Background Deco */}
        <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-white/10 rounded-full blur-xl"></div>

        <div className="relative z-10 flex justify-between items-center">
            <div>
                <h3 className="text-sm font-medium opacity-90 flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                    สุราษฎร์ธานี
                </h3>
                <div className="mt-2 flex items-center">
                    <span className="text-4xl font-bold mr-3 text-shadow-md">{Math.round(weather.temperature)}°</span>
                    <div>
                        <p className="text-2xl filter drop-shadow-md leading-none">{getWeatherIcon(weather.weatherCode, weather.isDay)}</p>
                        <p className="text-xs opacity-90 font-medium">{getWeatherDescription(weather.weatherCode)}</p>
                    </div>
                </div>
            </div>
            
            <div className="flex flex-col gap-2 text-xs font-medium bg-white/10 p-2 rounded-lg backdrop-blur-sm border border-white/10">
                <div className="flex items-center gap-2">
                    <span title="ความชื้น">💧 {weather.humidity}%</span>
                </div>
                <div className="flex items-center gap-2">
                    <span title="ความเร็วลม">💨 {weather.windSpeed} km/h</span>
                </div>
            </div>
        </div>
    </div>
  );
};

export default WeatherWidget;
