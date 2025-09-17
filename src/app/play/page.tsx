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

interface Address {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  importance: number;
}

interface QuestionHistory {
  distance: number;
  wasWithin: boolean;
  aiPosition: { lat: number; lon: number };
}

export default function PlayPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [cities, setCities] = useState<City[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const [addressSearchTerm, setAddressSearchTerm] = useState('');
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isAddressLoading, setIsAddressLoading] = useState(false);
  const [addressDebounceTimer, setAddressDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isHiding, setIsHiding] = useState(false);
  const [zoomLocked, setZoomLocked] = useState(false);
  const [seekerCountdown, setSeekerCountdown] = useState<number | null>(null);
  const [showSeekerReleased, setShowSeekerReleased] = useState(false);
  const [aiPosition, setAiPosition] = useState<Address | null>(null);
  const [aiMovementTimer, setAiMovementTimer] = useState<number | null>(null);
  const [showQuestion, setShowQuestion] = useState(false);
  const [questionDistance, setQuestionDistance] = useState<number | null>(null);
  const [questionType, setQuestionType] = useState<'distance' | 'letter'>('distance');
  const [letterQuestion, setLetterQuestion] = useState<{ position: number; letter: string } | null>(null);
  const [answerTimer, setAnswerTimer] = useState<number | null>(null);
  const [showAnswerResult, setShowAnswerResult] = useState(false);
  const [isWithinDistance, setIsWithinDistance] = useState<boolean | null>(null);
  const [isCorrectLetter, setIsCorrectLetter] = useState<boolean | null>(null);
  const [questionDelayTimer, setQuestionDelayTimer] = useState<number | null>(null);
  const [aiPositionReady, setAiPositionReady] = useState(false);
  const [questionHistory, setQuestionHistory] = useState<QuestionHistory[]>([]);
  const [coins, setCoins] = useState(0);

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
        `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=10&lang=en`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch locations');
      }

      const photonData = await response.json();

      const data: City[] = photonData.features.map((feature: any) => ({
        place_id: feature.properties.osm_id?.toString() || feature.properties.name,
        display_name: feature.properties.name + (feature.properties.city ? `, ${feature.properties.city}` : '') + (feature.properties.country ? `, ${feature.properties.country}` : ''),
        lat: feature.geometry.coordinates[1].toString(),
        lon: feature.geometry.coordinates[0].toString(),
        type: feature.properties.osm_type || 'unknown',
        importance: feature.properties.importance || 0.5
      }));

      const filteredCities = data.filter(item =>
        item.display_name.toLowerCase().includes('city') ||
        item.display_name.toLowerCase().includes('town') ||
        item.display_name.toLowerCase().includes('village') ||
        item.importance > 0.4 ||
        (item.type && ['city', 'town', 'village', 'hamlet', 'suburb', 'locality'].includes(item.type))
      );

      setCities(filteredCities);
    } catch (error) {
      console.error('Error searching locations:', error);
      setCities([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const searchAddresses = useCallback(async (query: string, city: City) => {
    if (!query.trim() || !city) {
      setAddresses([]);
      return;
    }

    setIsAddressLoading(true);
    try {
      const cityLat = parseFloat(city.lat);
      const cityLon = parseFloat(city.lon);
      const mileRadius = 25 / 69;

      const minLat = cityLat - mileRadius;
      const maxLat = cityLat + mileRadius;
      const minLon = cityLon - mileRadius;
      const maxLon = cityLon + mileRadius;

      const bbox = `${minLon},${minLat},${maxLon},${maxLat}`;

      const response = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=10&lang=en&bbox=${bbox}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch addresses');
      }

      const photonData = await response.json();

      const data: Address[] = photonData.features.map((feature: any) => ({
        place_id: feature.properties.osm_id?.toString() || feature.properties.name,
        display_name: feature.properties.name + (feature.properties.street ? `, ${feature.properties.street}` : '') + (feature.properties.city ? `, ${feature.properties.city}` : ''),
        lat: feature.geometry.coordinates[1].toString(),
        lon: feature.geometry.coordinates[0].toString(),
        type: feature.properties.osm_type || 'unknown',
        importance: feature.properties.importance || 0.5
      }));

      const filteredAddresses = data.filter(item => {
        const hasStreetInfo = item.display_name.toLowerCase().includes('street') ||
          item.display_name.toLowerCase().includes('avenue') ||
          item.display_name.toLowerCase().includes('road') ||
          item.display_name.toLowerCase().includes('lane') ||
          item.display_name.toLowerCase().includes('drive') ||
          item.display_name.toLowerCase().includes('boulevard') ||
          item.display_name.toLowerCase().includes('way') ||
          item.display_name.toLowerCase().includes('place') ||
          /\d+/.test(item.display_name);

        const isAddressType = item.type === 'house' ||
          item.type === 'residential' ||
          item.type === 'street' ||
          item.type === 'pedestrian';

        return hasStreetInfo || isAddressType;
      });

      setAddresses(filteredAddresses);
    } catch (error) {
      console.error('Error searching addresses:', error);
      setAddresses([]);
    } finally {
      setIsAddressLoading(false);
    }
  }, []);

  const findNearbyStreet = useCallback(async (currentLat: number, currentLon: number, radiusMiles: number = 2): Promise<Address | null> => {
    try {
      const cityName = selectedCity?.display_name.split(',')[0] || 'New York';

      const duckDuckGoQuery = `random street addresses in ${cityName}`;
      const duckResponse = await fetch(
        `https://api.duckduckgo.com/?q=${encodeURIComponent(duckDuckGoQuery)}&format=json&no_html=1&skip_disambig=1`
      );

      if (!duckResponse.ok) {
        console.log('DuckDuckGo search failed, falling back to OpenStreetMap');
        return await fallbackStreetSearch(currentLat, currentLon, radiusMiles);
      }

      const duckData = await duckResponse.json();

      const searchResults = duckData.RelatedTopics?.map((topic: any) => topic.Text).join(' ') || duckData.Abstract || '';

      const aiPrompt = `Based on this search information about streets in ${cityName}: "${searchResults}"

Please find 3-5 different real street addresses that are geographically close to each other in the same neighborhood/area of ${cityName}. For each address, provide:
- Full street address
- Approximate latitude and longitude coordinates

The addresses should be in the same general area/neighborhood, not spread across the entire city.

Format your response as JSON:
{
  "addresses": [
    {
      "street_address": "123 Main Street, ${cityName}",
      "lat": 40.7128,
      "lon": -74.0060
    }
  ]
}

Only include real, existing addresses in the same neighborhood. If you can't find real addresses, return an empty array.`;

      const aiResponse = await fetch('https://ai.hackclub.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: aiPrompt
            }
          ],
          model: 'meta-llama/llama-4-maverick'
        })
      });

      if (!aiResponse.ok) {
        console.log('AI API failed, falling back to OpenStreetMap');
        return await fallbackStreetSearch(currentLat, currentLon, radiusMiles);
      }

      const aiData = await aiResponse.json();
      const aiContent = aiData.choices?.[0]?.message?.content;

      if (!aiContent) {
        console.log('No AI content, falling back to OpenStreetMap');
        return await fallbackStreetSearch(currentLat, currentLon, radiusMiles);
      }

      let parsedResponse;
      try {
        const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResponse = JSON.parse(jsonMatch[0]);
        } else {
          console.log('No JSON found in AI response, falling back to OpenStreetMap');
          return await fallbackStreetSearch(currentLat, currentLon, radiusMiles);
        }
      } catch (parseError) {
        console.log('Failed to parse AI response, falling back to OpenStreetMap');
        return await fallbackStreetSearch(currentLat, currentLon, radiusMiles);
      }

      const addresses = parsedResponse.addresses || [];

      if (addresses.length === 0) {
        console.log('No addresses found in AI response, falling back to OpenStreetMap');
        return await fallbackStreetSearch(currentLat, currentLon, radiusMiles);
      }

      const randomIndex = Math.floor(Math.random() * addresses.length);
      const selectedAddress = addresses[randomIndex];

      console.log(`AI found ${addresses.length} addresses, selected: ${selectedAddress.street_address}`);

      return {
        place_id: selectedAddress.street_address,
        display_name: selectedAddress.street_address,
        lat: selectedAddress.lat.toString(),
        lon: selectedAddress.lon.toString(),
        type: 'street',
        importance: 0.5
      };

    } catch (error) {
      console.error('Error finding nearby street:', error);
      return await fallbackStreetSearch(currentLat, currentLon, radiusMiles);
    }
  }, [selectedCity]);

  const fallbackStreetSearch = useCallback(async (currentLat: number, currentLon: number, radiusMiles: number): Promise<Address | null> => {
    try {
      const mileRadius = radiusMiles / 69;

      const attempts = 5;
      const streetNames = [
        'Main Street', 'Oak Avenue', 'Elm Street', 'Maple Drive', 'Pine Road',
        'Cedar Lane', 'Washington Street', 'Lincoln Avenue', 'Jefferson Road',
        'Madison Drive', 'Adams Street', 'Jackson Avenue', 'Monroe Road'
      ];

      for (let i = 0; i < attempts; i++) {
        const angle = Math.random() * 2 * Math.PI;
        const distance = Math.random() * mileRadius;

        const newLat = currentLat + (distance * Math.cos(angle));
        const newLon = currentLon + (distance * Math.sin(angle));

        const randomStreetName = streetNames[Math.floor(Math.random() * streetNames.length)];
        const cityName = selectedCity?.display_name.split(',')[0] || 'Unknown City';

        const displayName = `${randomStreetName}, ${cityName}`;

        console.log(`Fallback: Generated synthetic address: ${displayName} at (${newLat}, ${newLon})`);

        return {
          place_id: displayName,
          display_name: displayName,
          lat: newLat.toString(),
          lon: newLon.toString(),
          type: 'street',
          importance: 0.3
        };
      }

      return null;
    } catch (error) {
      console.error('Error in fallback street search:', error);
      return null;
    }
  }, [selectedCity]);

  const moveAiToNearbyStreet = useCallback(async () => {
    if (!aiPosition) return;

    const currentLat = parseFloat(aiPosition.lat);
    const currentLon = parseFloat(aiPosition.lon);

    const playerEstimate = estimatePlayerPosition();

    if (playerEstimate) {
      const estimateLat = playerEstimate.center.lat;
      const estimateLon = playerEstimate.center.lon;
      const estimateRadius = playerEstimate.radius;

      const distanceToEstimate = calculateDistance(currentLat, currentLon, estimateLat, estimateLon);

      if (distanceToEstimate > estimateRadius / 2) {
        const moveDistance = Math.min(distanceToEstimate / 2, 1.0);

        const bearing = Math.atan2(estimateLon - currentLon, estimateLat - currentLat);
        const moveLat = currentLat + (moveDistance / 69.172) * Math.cos(bearing);
        const moveLon = currentLon + (moveDistance / (69.172 * Math.cos(currentLat * Math.PI / 180))) * Math.sin(bearing);

        console.log(`AI moving towards estimated player position: ${moveLat}, ${moveLon}`);
        const newStreet = await findNearbyStreet(moveLat, moveLon, 0.5);

        if (newStreet) {
          setAiPosition(newStreet);
          console.log(`AI smart-moved to: ${newStreet.display_name}`);
          return;
        }
      }
    }

    const newStreet = await findNearbyStreet(currentLat, currentLon, 0.5);

    if (newStreet) {
      setAiPosition(newStreet);
      console.log(`AI random-moved to nearby street: ${newStreet.display_name}`);
    }
  }, [aiPosition, findNearbyStreet, questionHistory]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 3959;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const startQuestionPhase = () => {
    setQuestionDelayTimer(3);
  };

  const recordQuestionAnswer = (distance: number, wasWithin: boolean) => {
    if (!aiPosition) return;

    const newHistory: QuestionHistory = {
      distance,
      wasWithin,
      aiPosition: {
        lat: parseFloat(aiPosition.lat),
        lon: parseFloat(aiPosition.lon)
      }
    };

    setQuestionHistory(prev => [...prev, newHistory]);
  };

  const generateLetterQuestion = (): { position: number; letter: string } => {
    const commonLetters = ['S', 'M', 'B', 'C', 'R', 'W', 'P', 'H', 'A', 'E'];
    const randomLetter = commonLetters[Math.floor(Math.random() * commonLetters.length)];

    const position = Math.floor(Math.random() * 3) + 1;

    return { position, letter: randomLetter };
  };

  const shouldAskLetterQuestion = (nextDistance: number): boolean => {
    return (nextDistance === 1 || nextDistance === 0.5) && questionHistory.length >= 3;
  };

  const getSmartQuestionDistance = (): number => {
    const allowedDistances = [5, 3, 1, 0.5, 0.25];

    if (questionHistory.length === 0) {
      return 5;
    }

    const lastQuestion = questionHistory[questionHistory.length - 1];
    const currentIndex = allowedDistances.indexOf(lastQuestion.distance);

    if (currentIndex === -1) {
      return 5;
    }

    if (lastQuestion.wasWithin) {
      if (currentIndex < allowedDistances.length - 1) {
        return allowedDistances[currentIndex + 1];
      } else {
        return lastQuestion.distance;
      }
    } else {
      const sameDistanceCount = questionHistory
        .filter(q => q.distance === lastQuestion.distance && !q.wasWithin)
        .length;

      if (sameDistanceCount >= 2) {
        if (currentIndex > 0) {
          return allowedDistances[currentIndex - 1];
        }
      }

      return lastQuestion.distance;
    }
  };

  const estimatePlayerPosition = () => {
    if (questionHistory.length === 0) {
      return null;
    }

    const withinAnswers = questionHistory.filter(q => q.wasWithin);

    if (withinAnswers.length === 0) {
      return null;
    }

    const bestEstimate = withinAnswers[withinAnswers.length - 1];

    return {
      center: bestEstimate.aiPosition,
      radius: bestEstimate.distance
    };
  };

  const autoAnswer = () => {
    if (!aiPosition) {
      console.log('AI position not ready for auto-answer');
      return;
    }

    if (questionType === 'distance') {
      const playerLat = parseFloat(selectedAddress!.lat);
      const playerLon = parseFloat(selectedAddress!.lon);
      const aiLat = parseFloat(aiPosition.lat);
      const aiLon = parseFloat(aiPosition.lon);
      const actualDistance = calculateDistance(playerLat, playerLon, aiLat, aiLon);
      const isWithin = actualDistance <= questionDistance!;

      recordQuestionAnswer(questionDistance!, isWithin);
      setIsWithinDistance(isWithin);
      setIsCorrectLetter(null);
    } else if (questionType === 'letter') {
      const streetName = selectedAddress!.display_name.split(',')[0].toUpperCase();
      const letter = letterQuestion!.letter.toUpperCase();
      const position = letterQuestion!.position - 1;

      const isCorrect = position < streetName.length && streetName[position] === letter;
      setIsCorrectLetter(isCorrect);
      setIsWithinDistance(null);
    }

    setShowAnswerResult(true);
    setShowQuestion(false);
    setAnswerTimer(null);

    setTimeout(() => {
      setShowAnswerResult(false);
      setSeekerCountdown(5);
    }, 3000);
  };

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

  useEffect(() => {
    if (addressDebounceTimer) {
      clearTimeout(addressDebounceTimer);
    }

    const timer = setTimeout(() => {
      if (selectedCity) {
        searchAddresses(addressSearchTerm, selectedCity);
      }
    }, 300);

    setAddressDebounceTimer(timer);

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [addressSearchTerm, selectedCity, searchAddresses]);

  useEffect(() => {
    if (countdown === null) return;

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setShowModal(false);
      setCountdown(null);
      setIsHiding(true);
      setSeekerCountdown(5);
    }
  }, [countdown, selectedCity]);

  useEffect(() => {
    if (seekerCountdown === null && isHiding && !aiPosition) {
      startQuestionPhase();
    }
  }, [seekerCountdown, isHiding, aiPosition]);

  useEffect(() => {
    if (questionDelayTimer === null) return;

    if (questionDelayTimer > 0) {
      const timer = setTimeout(() => {
        setQuestionDelayTimer(questionDelayTimer - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setQuestionDelayTimer(null);
      const initializeAiPosition = async () => {
        setAiPositionReady(false);
        const initialStreet = await findNearbyStreet(parseFloat(selectedCity!.lat), parseFloat(selectedCity!.lon), 1);
        if (initialStreet) {
          setAiPosition(initialStreet);
          setAiPositionReady(true);
          console.log(`AI starts at: ${initialStreet.display_name}`);
        } else {
          console.log('No streets found for AI initialization - using fallback');
          const fallbackPosition = {
            place_id: selectedCity!.display_name,
            display_name: selectedCity!.display_name,
            lat: selectedCity!.lat,
            lon: selectedCity!.lon,
            type: 'street',
            importance: 0.5
          };
          setAiPosition(fallbackPosition);
          setAiPositionReady(true);
        }
      };
      initializeAiPosition();
    }
  }, [questionDelayTimer, selectedCity, findNearbyStreet]);

  useEffect(() => {
    if (aiPositionReady && questionDelayTimer === null && !showQuestion) {
      const smartDistance = getSmartQuestionDistance();

      if (shouldAskLetterQuestion(smartDistance) && Math.random() < 0.3) {
        const letterQ = generateLetterQuestion();
        setQuestionType('letter');
        setLetterQuestion(letterQ);
        setQuestionDistance(null);
        setCoins(prev => prev + 50);
      } else {
        setQuestionType('distance');
        setQuestionDistance(smartDistance);
        setLetterQuestion(null);
        setCoins(prev => prev + 30);
      }

      setShowQuestion(true);
      setAnswerTimer(15);
    }
  }, [aiPositionReady, questionDelayTimer, showQuestion, questionHistory]);

  useEffect(() => {
    if (answerTimer === null) return;

    if (answerTimer > 0) {
      const timer = setTimeout(() => {
        setAnswerTimer(answerTimer - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      autoAnswer();
    }
  }, [answerTimer]);

  useEffect(() => {
    if (seekerCountdown === null) return;

    if (seekerCountdown > 0) {
      const timer = setTimeout(() => {
        setSeekerCountdown(seekerCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setSeekerCountdown(null);
      setShowSeekerReleased(true);
      setTimeout(() => setShowSeekerReleased(false), 2000);
    }
  }, [seekerCountdown]);

  useEffect(() => {
    if (aiPosition === null || seekerCountdown !== null) return;

    const timer = setTimeout(async () => {
      await moveAiToNearbyStreet();
      setAiMovementTimer(10);
    }, 10000);

    return () => clearTimeout(timer);
  }, [aiPosition, seekerCountdown, moveAiToNearbyStreet, findNearbyStreet, fallbackStreetSearch]);

  useEffect(() => {
    if (aiMovementTimer === null) return;

    if (aiMovementTimer > 0) {
      const timer = setTimeout(() => {
        setAiMovementTimer(aiMovementTimer - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setAiMovementTimer(null);
    }
  }, [aiMovementTimer]);

  const handleCitySelect = (city: City) => {
    setSelectedCity(city);
    setSelectedAddress(null);
    setAddressSearchTerm('');
    setAddresses([]);
    setAiPosition(null);
    setAiMovementTimer(null);
    setShowQuestion(false);
    setQuestionDistance(null);
    setAnswerTimer(null);
    setShowAnswerResult(false);
    setIsWithinDistance(null);
    setQuestionDelayTimer(null);
    setAiPositionReady(false);
    setQuestionHistory([]);
    setCoins(0);
    setQuestionType('distance');
    setLetterQuestion(null);
    setIsCorrectLetter(null);
    setZoomLocked(false);
    setIsHiding(false);
    setSeekerCountdown(null);
    setShowSeekerReleased(false);
    console.log(`Selected Location: ${city.display_name} - Lat: ${city.lat}, Lon: ${city.lon}`);
  };

  const handleAddressSelect = (address: Address) => {
    setSelectedAddress(address);
    console.log(`Selected Address: ${address.display_name} - Lat: ${address.lat}, Lon: ${address.lon}`);
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

  const get25MileBounds = (lat: number, lon: number) => {
    const mileRadius = 25 / 69;

    const minLat = lat - mileRadius;
    const maxLat = lat + mileRadius;
    const minLon = lon - mileRadius;
    const maxLon = lon + mileRadius;

    return {
      bbox: `${minLon},${minLat},${maxLon},${maxLat}`,
      zoom: 12
    };
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
    setSelectedAddress(null);
    setAddressSearchTerm('');
    setAddresses([]);
    setAiPosition(null);
    setAiMovementTimer(null);
    setShowQuestion(false);
    setQuestionDistance(null);
    setAnswerTimer(null);
    setShowAnswerResult(false);
    setIsWithinDistance(null);
    setQuestionDelayTimer(null);
    setAiPositionReady(false);
    setQuestionHistory([]);
    setCoins(0);
    setQuestionType('distance');
    setLetterQuestion(null);
    setIsCorrectLetter(null);
    setZoomLocked(false);
    setIsHiding(false);
    setSeekerCountdown(null);
    setShowSeekerReleased(false);
    console.log(`Selected Popular Location: ${location.display_name} - Lat: ${location.lat}, Lon: ${location.lon}`);
  };
  return (
    <>
      <style dangerouslySetInnerHTML={{__html: '@keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }'}} />
      <div className="h-screen bg-black flex">
      <div className="w-80 bg-gray-900 border-r border-gray-700 flex flex-col relative">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-xl text-white mb-2" style={{ fontFamily: "'Bitcount Grid Double', monospace" }}>
            {isHiding ? "You are hiding at" : selectedCity ? "Address Search" : "Location Search"}
          </h1>
          <p className="text-gray-300 text-sm" style={{ fontFamily: "'Rubik', sans-serif" }}>
            {showQuestion
              ? `You are hiding at ${selectedAddress?.display_name.split(',')[0] || selectedCity?.display_name.split(',')[0]}`
              : isHiding
                ? `${selectedAddress?.display_name.split(',')[0] || selectedCity?.display_name.split(',')[0]}`
                : selectedCity
                  ? `Select an address in ${selectedCity.display_name.split(',')[0]}`
                  : "Select a location for your hideout"
            }
          </p>
        </div>


        {showQuestion && aiPosition && seekerCountdown === null && (
          <div className="px-6 py-4 bg-purple-900 bg-opacity-50 border-b border-purple-700">
            <div className="text-center">
              <div className="text-purple-400 text-sm font-medium mb-3" style={{ fontFamily: "'Rubik', sans-serif" }}>
                The seeker has asked a question
              </div>
              <div className="text-purple-300 text-base mb-4" style={{ fontFamily: "'Rubik', sans-serif" }}>
                {questionType === 'distance'
                  ? `Are you within ${questionDistance} mile${questionDistance === 1 ? '' : 's'}?`
                  : `Is the ${letterQuestion!.position}${letterQuestion!.position === 1 ? 'st' : letterQuestion!.position === 2 ? 'nd' : 'rd'} letter of your street name '${letterQuestion!.letter}'?`
                }
              </div>
              <div className="flex justify-center mb-2">
                <button
                  onClick={() => {
                    if (!aiPosition) {
                      console.log('AI position not ready yet');
                      return;
                    }

                    if (questionType === 'distance') {
                      const playerLat = parseFloat(selectedAddress!.lat);
                      const playerLon = parseFloat(selectedAddress!.lon);
                      const aiLat = parseFloat(aiPosition.lat);
                      const aiLon = parseFloat(aiPosition.lon);
                      const actualDistance = calculateDistance(playerLat, playerLon, aiLat, aiLon);
                      const isWithin = actualDistance <= questionDistance!;

                      recordQuestionAnswer(questionDistance!, isWithin);
                      setIsWithinDistance(isWithin);
                      setIsCorrectLetter(null);
                    } else if (questionType === 'letter') {
                      const streetName = selectedAddress!.display_name.split(',')[0].toUpperCase();
                      const letter = letterQuestion!.letter.toUpperCase();
                      const position = letterQuestion!.position - 1;

                      const isCorrect = position < streetName.length && streetName[position] === letter;
                      setIsCorrectLetter(isCorrect);
                      setIsWithinDistance(null);
                    }

                    setShowAnswerResult(true);
                    setShowQuestion(false);
                    setAnswerTimer(null);

                    setTimeout(() => {
                      setShowAnswerResult(false);
                      setSeekerCountdown(5);
                    }, 3000);
                  }}
                  disabled={!aiPosition}
                  className={`px-4 py-2 text-sm rounded font-medium ${
                    aiPosition
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  } transition-colors`}
                  style={{ fontFamily: "'Rubik', sans-serif" }}
                >
                  Answer
                </button>
              </div>
              {answerTimer !== null && (
                <div className="text-purple-500 text-xs" style={{ fontFamily: "'Rubik', sans-serif" }}>
                  Answer in: {answerTimer}s
                </div>
              )}
            </div>
          </div>
        )}

        {isHiding && seekerCountdown === null && (
          aiPosition && aiPosition.display_name !== selectedCity?.display_name ? (
            <div className="px-6 py-4 bg-red-900 bg-opacity-50 border-b border-red-700">
              <div className="text-center">
                <div className="text-red-400 text-sm font-medium mb-3" style={{ fontFamily: "'Rubik', sans-serif" }}>
                  Seeker Position
                </div>
                <div className="text-red-300 text-base mb-2" style={{ fontFamily: "'Rubik', sans-serif" }}>
                  {aiPosition.display_name.split(',')[0]}
                </div>
                <div className="text-red-400 text-xs opacity-75 mb-2" style={{ fontFamily: "'Rubik', sans-serif" }}>
                  {aiPosition.display_name.split(',').slice(1, 3).join(', ')}
                </div>
                {aiMovementTimer !== null && (
                  <div className="text-red-500 text-xs mt-2" style={{ fontFamily: "'Rubik', sans-serif" }}>
                    Next move: {aiMovementTimer}s
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="px-6 py-4 bg-red-900 bg-opacity-50 border-b border-red-700">
              <div className="text-center">
                <div className="text-red-400 text-sm font-medium" style={{ fontFamily: "'Rubik', sans-serif" }}>
                  The seeker has not responded
                </div>
              </div>
            </div>
          )
        )}

        {!isHiding && !selectedCity && (
          <div className="p-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search locations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                style={{ fontFamily: "'Rubik', sans-serif" }}
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <svg
                  className="w-4 h-4"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
              </div>
            </div>

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
        )}

        {!isHiding && selectedCity && !selectedAddress && (
          <div className="p-4">
            <button
              onClick={() => {
                setSelectedCity(null);
                setSearchTerm('');
                setCities([]);
              }}
              className="mb-3 px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
              style={{ fontFamily: "'Rubik', sans-serif" }}
            >
              ← Back to city selection
            </button>
            <div className="relative">
              <input
                type="text"
                placeholder={`Search addresses in ${selectedCity.display_name.split(',')[0]}...`}
                value={addressSearchTerm}
                onChange={(e) => setAddressSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                style={{ fontFamily: "'Rubik', sans-serif" }}
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <svg
                  className="w-4 h-4"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
              </div>
            </div>
          </div>
        )}

        {!isHiding && !selectedCity && (
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

              {!isLoading && cities.map((city, index) => (
                <button
                  key={`${city.place_id}-${index}`}
                  onClick={() => handleCitySelect(city)}
                  className={`w-full text-left p-3 mb-1 rounded transition-colors ${
                    (selectedCity as City | null)?.place_id === city.place_id
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
        )}

        {!isHiding && selectedCity && !selectedAddress && (
          <div
            className="flex-1 overflow-y-auto custom-scrollbar"
          >
            <div className="p-2">
              {isAddressLoading && (
                <div className="text-center text-gray-400 py-4" style={{ fontFamily: "'Rubik', sans-serif" }}>
                  Searching addresses...
                </div>
              )}

              {!isAddressLoading && addresses.length === 0 && addressSearchTerm && (
                <div className="text-center text-gray-400 py-4" style={{ fontFamily: "'Rubik', sans-serif" }}>
                  No addresses found in this area
                </div>
              )}

              {!isAddressLoading && !addressSearchTerm && (
                <div className="text-center text-gray-400 py-4" style={{ fontFamily: "'Rubik', sans-serif" }}>
                  Start typing to search for addresses
                </div>
              )}

              {!isAddressLoading && addresses.map((address, index) => (
                <button
                  key={`${address.place_id}-${index}`}
                  onClick={() => handleAddressSelect(address)}
                  className={`w-full text-left p-3 mb-1 rounded transition-colors ${
                    (selectedAddress as Address | null)?.place_id === address.place_id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                  style={{ fontFamily: "'Rubik', sans-serif" }}
                >
                  <div className="font-medium">{address.display_name.split(',')[0]}</div>
                  <div className="text-sm opacity-75">{address.display_name.split(',').slice(1, 3).join(',')}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedCity && selectedAddress && !isHiding && (
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
            selectedAddress && zoomLocked
              ? get25MileBounds(parseFloat(selectedAddress.lat), parseFloat(selectedAddress.lon)).bbox
              : selectedCity && zoomLocked
                ? get25MileBounds(parseFloat(selectedCity.lat), parseFloat(selectedCity.lon)).bbox
                : selectedCity
                  ? getRegionBounds(selectedCity.display_name).bbox
                  : '-125,24,-65,50'
          }&layer=mapnik&zoom=${
            selectedAddress && zoomLocked
              ? get25MileBounds(parseFloat(selectedAddress.lat), parseFloat(selectedAddress.lon)).zoom
              : selectedCity && zoomLocked
                ? get25MileBounds(parseFloat(selectedCity.lat), parseFloat(selectedCity.lon)).zoom
                : selectedCity
                  ? getRegionBounds(selectedCity.display_name).zoom
                  : 6
          }${
            selectedAddress ? `&marker=${selectedAddress.lat},${selectedAddress.lon}` :
            selectedCity ? `&marker=${selectedCity.lat},${selectedCity.lon}` : ''
          }${
            aiPosition && aiPosition.display_name !== selectedCity?.display_name ? `&marker=${aiPosition.lat},${aiPosition.lon}` : ''
          }`}
          className="w-full h-full"
          title="OpenStreetMap"
          style={{ border: 'none', pointerEvents: zoomLocked ? 'none' : 'auto' }}
        />
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-black opacity-90 pointer-events-none" />
      </div>

      {showAnswerResult && (
        <div className="fixed inset-0 flex items-center justify-center z-40 pointer-events-none">
          <div className="text-center">
            <div className={`text-6xl font-bold animate-pulse mb-4 ${
              (questionType === 'distance' && isWithinDistance) || (questionType === 'letter' && isCorrectLetter) ? 'text-green-400' : 'text-red-400'
            }`} style={{ fontFamily: "'Bitcount Grid Double', monospace" }}>
              {(questionType === 'distance' && isWithinDistance) || (questionType === 'letter' && isCorrectLetter) ? '✓ CORRECT' : '✗ INCORRECT'}
            </div>
            <div className="text-white text-xl" style={{ fontFamily: "'Rubik', sans-serif" }}>
              {questionType === 'distance'
                ? `You ${isWithinDistance ? 'are' : 'are not'} within ${questionDistance} mile${questionDistance === 1 ? '' : 's'}`
                : `The ${letterQuestion!.position}${letterQuestion!.position === 1 ? 'st' : letterQuestion!.position === 2 ? 'nd' : 'rd'} letter ${isCorrectLetter ? 'is' : 'is not'} '${letterQuestion!.letter}'`
              }
            </div>
          </div>
        </div>
      )}

      {showSeekerReleased && (
        <div className="fixed inset-0 flex items-center justify-center z-40 pointer-events-none">
          <div className="text-red-400 text-4xl font-bold animate-pulse" style={{ fontFamily: "'Bitcount Grid Double', monospace", animation: 'fadeOut 2s ease-out forwards' }}>
            The seeker has been released
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-gray-900 border-4 border-yellow-400 p-6 max-w-md w-full mx-4"
               style={{
                 backgroundImage: 'linear-gradient(45deg, #1f2937 25%, transparent 25%), linear-gradient(-45deg, #1f2937 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1f2937 75%), linear-gradient(-45deg, transparent 75%, #1f2937 75%)',
                 backgroundSize: '4px 4px',
                 backgroundPosition: '0 0, 0 2px, 2px -2px, -2px 0px'
               }}>
            <div className="text-center">
              {countdown !== null ? (
                <>
                  <div className="text-yellow-400 text-6xl mb-4 animate-pulse" style={{ fontFamily: "'Bitcount Grid Double', monospace" }}>
                    {countdown}
                  </div>
                  <div className="text-white text-lg" style={{ fontFamily: "'Bitcount Grid Double', monospace" }}>
                    HIDING AT:<br/>
                    <span className="text-yellow-400 text-xl">
                      {selectedAddress?.display_name.split(',')[0] || selectedCity?.display_name.split(',')[0]}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-yellow-400 text-2xl mb-4" style={{ fontFamily: "'Bitcount Grid Double', monospace" }}>
                    ⚠ WARNING ⚠
                  </div>

                  <div className="text-white text-lg mb-6" style={{ fontFamily: "'Bitcount Grid Double', monospace" }}>
                    ARE YOU SURE YOU WANT TO<br/>
                    HIDE AT:<br/>
                    <span className="text-yellow-400 text-xl">
                      {selectedAddress?.display_name.split(',')[0] || selectedCity?.display_name.split(',')[0]}
                    </span>
                  </div>

                  <div className="flex gap-4 justify-center">
                    <button
                  onClick={() => {
                    setCountdown(3);
                    setZoomLocked(true);
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
                      onClick={() => {
                        setShowModal(false);
                        setCountdown(null);
                      }}
                      className="px-6 py-3 bg-red-600 text-white border-2 border-red-400 hover:bg-red-700 transition-colors font-bold"
                      style={{
                        fontFamily: "'Bitcount Grid Double', monospace",
                        textShadow: '2px 2px 0px rgba(0,0,0,0.8)'
                      }}
                    >
                      NO
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Coin Display - Bottom Left */}
      <div className="absolute bottom-4 left-4 bg-yellow-600 bg-opacity-90 text-yellow-100 px-3 py-2 rounded-lg border-2 border-yellow-400 shadow-lg">
        <div className="flex items-center space-x-2">
          <div className="text-yellow-300 text-xl">🪙</div>
          <div className="font-bold text-lg" style={{ fontFamily: "'Bitcount Grid Double', monospace" }}>
            {coins}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
