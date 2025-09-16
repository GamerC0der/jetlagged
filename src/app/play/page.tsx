"use client";

import { useState, useEffect, useCallback } from 'react';

interface City {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  importance: number;
}

export default function PlayPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [cities, setCities] = useState<City[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const [showModal, setShowModal] = useState(false);

  const popularLocations = [
    { name: "New York", lat: "40.7128", lon: "-74.0060", display_name: "New York, New York, USA" },
    { name: "London", lat: "51.5074", lon: "-0.1278", display_name: "London, England, UK" },
    { name: "Tokyo", lat: "35.6762", lon: "139.6503", display_name: "Tokyo, Japan" },
    { name: "Paris", lat: "48.8566", lon: "2.3522", display_name: "Paris, France" },
    { name: "San Francisco", lat: "37.7749", lon: "-122.4194", display_name: "San Francisco, California, USA" }
  ];

  const searchCities = useCallback(async (query: string) => {
    if (!query.trim()) {
      setCities([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=10&addressdetails=1&dedupe=1`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch locations');
      }

      const data: City[] = await response.json();

      const filteredCities = data.filter(item =>
        item.type === 'city' ||
        item.type === 'town' ||
        item.type === 'village' ||
        item.type === 'hamlet' ||
        item.type === 'suburb' ||
        item.type === 'locality' ||
        item.type === 'administrative' ||
        item.display_name.toLowerCase().includes('city') ||
        item.display_name.toLowerCase().includes('town') ||
        item.importance > 0.3
      );

      setCities(filteredCities);
    } catch (error) {
      console.error('Error searching locations:', error);
      setCities([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    const timer = setTimeout(() => {
      searchCities(searchTerm);
    }, 300);

    setDebounceTimer(timer);

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [searchTerm, searchCities]);

  const handleCitySelect = (city: City) => {
    setSelectedCity(city);
    console.log(`Selected Location: ${city.display_name} - Lat: ${city.lat}, Lon: ${city.lon}`);
  };

  const getRegionBounds = (cityName: string) => {
    const regions: Record<string, { bbox: string; zoom: number }> = {
      'New York': { bbox: '-80,35,-70,45', zoom: 8 },
      'San Francisco': { bbox: '-125,35,-115,40', zoom: 9 },
      'London': { bbox: '-5,50,2,52', zoom: 10 },
      'Tokyo': { bbox: '135,33,145,38', zoom: 8 },
      'Paris': { bbox: '0,47,5,50', zoom: 9 },
      'Sydney': { bbox: '145,-38,155,-32', zoom: 8 }
    };

    const cleanCityName = cityName.toLowerCase();
    for (const [key, value] of Object.entries(regions)) {
      if (cleanCityName.includes(key.toLowerCase())) {
        return value;
      }
    }

    return { bbox: '-125,24,-65,50', zoom: 6 };
  };

  const handlePopularLocationClick = (location: typeof popularLocations[0]) => {
    setSearchTerm(location.name);
    setSelectedCity({
      place_id: location.name,
      display_name: location.display_name,
      lat: location.lat,
      lon: location.lon,
      type: 'city',
      importance: 1
    });
    console.log(`Selected Popular Location: ${location.display_name} - Lat: ${location.lat}, Lon: ${location.lon}`);
  };
  return (
    <div className="h-screen bg-black flex">
      <div className="w-80 bg-gray-900 border-r border-gray-700 flex flex-col relative">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-xl text-white mb-2" style={{ fontFamily: "'Bitcount Grid Double', monospace" }}>
            Location Search
          </h1>
          <p className="text-gray-300 text-sm" style={{ fontFamily: "'Rubik', sans-serif" }}>
            Select a location for your hideout
          </p>
        </div>

        <div className="p-4">
          <input
            type="text"
            placeholder="Search locations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            style={{ fontFamily: "'Rubik', sans-serif" }}
          />

          <div className="mt-3">
            <div className="text-xs text-gray-400 mb-2" style={{ fontFamily: "'Rubik', sans-serif" }}>
              Popular locations:
            </div>
            <div className="flex flex-wrap gap-1">
              {popularLocations.map((location) => (
                <button
                  key={location.name}
                  onClick={() => handlePopularLocationClick(location)}
                  className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                  style={{ fontFamily: "'Rubik', sans-serif" }}
                >
                  {location.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div
          className="flex-1 overflow-y-auto custom-scrollbar"
        >
          <div className="p-2">
            {isLoading && (
              <div className="text-center text-gray-400 py-4" style={{ fontFamily: "'Rubik', sans-serif" }}>
                Searching...
              </div>
            )}

            {!isLoading && cities.length === 0 && searchTerm && (
              <div className="text-center text-gray-400 py-4" style={{ fontFamily: "'Rubik', sans-serif" }}>
                No locations found
              </div>
            )}

            {!isLoading && cities.map((city) => (
              <button
                key={city.place_id}
                onClick={() => handleCitySelect(city)}
                className={`w-full text-left p-3 mb-1 rounded transition-colors ${
                  selectedCity?.place_id === city.place_id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
                style={{ fontFamily: "'Rubik', sans-serif" }}
              >
                <div className="font-medium">{city.display_name.split(',')[0]}</div>
                <div className="text-sm opacity-75">{city.display_name.split(',').slice(1, 3).join(',')}</div>
              </button>
            ))}
          </div>
        </div>

        {selectedCity && (
          <div className="absolute bottom-4 left-4 right-4">
            <button
              onClick={() => setShowModal(true)}
              className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors font-medium"
              style={{ fontFamily: "'Bitcount Grid Double', monospace" }}
            >
              Hide
            </button>
          </div>
        )}

      </div>

      <div className="flex-1 relative">
        <iframe
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${
            selectedCity ? getRegionBounds(selectedCity.display_name).bbox : '-125,24,-65,50'
          }&layer=mapnik&zoom=${
            selectedCity ? getRegionBounds(selectedCity.display_name).zoom : 6
          }${
            selectedCity ? `&mlat=${selectedCity.lat}&mlon=${selectedCity.lon}&marker=${selectedCity.lat},${selectedCity.lon}` : ''
          }`}
          className="w-full h-full"
          title="OpenStreetMap"
          style={{ border: 'none' }}
        />
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-gray-900 border-4 border-yellow-400 p-6 max-w-md w-full mx-4"
               style={{
                 backgroundImage: 'linear-gradient(45deg, #1f2937 25%, transparent 25%), linear-gradient(-45deg, #1f2937 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1f2937 75%), linear-gradient(-45deg, transparent 75%, #1f2937 75%)',
                 backgroundSize: '4px 4px',
                 backgroundPosition: '0 0, 0 2px, 2px -2px, -2px 0px'
               }}>
            <div className="text-center">
              <div className="text-yellow-400 text-2xl mb-4" style={{ fontFamily: "'Bitcount Grid Double', monospace" }}>
                ⚠ WARNING ⚠
              </div>

              <div className="text-white text-lg mb-6" style={{ fontFamily: "'Bitcount Grid Double', monospace" }}>
                ARE YOU SURE YOU WANT TO<br/>
                HIDE AT:<br/>
                <span className="text-yellow-400 text-xl">
                  {selectedCity?.display_name.split(',')[0]}
                </span>
              </div>

              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => {
                    console.log(`Player hiding at: ${selectedCity?.display_name}`);
                    setShowModal(false);
                  }}
                  className="px-6 py-3 bg-green-600 text-white border-2 border-green-400 hover:bg-green-700 transition-colors font-bold"
                  style={{
                    fontFamily: "'Bitcount Grid Double', monospace",
                    textShadow: '2px 2px 0px rgba(0,0,0,0.8)'
                  }}
                >
                  YES
                </button>

                <button
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 bg-red-600 text-white border-2 border-red-400 hover:bg-red-700 transition-colors font-bold"
                  style={{
                    fontFamily: "'Bitcount Grid Double', monospace",
                    textShadow: '2px 2px 0px rgba(0,0,0,0.8)'
                  }}
                >
                  NO
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
