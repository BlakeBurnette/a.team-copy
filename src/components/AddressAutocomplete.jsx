// src/components/AddressAutocomplete.jsx
import React, { useEffect, useRef, useState } from 'react';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

/**
 * AddressAutocomplete - Using new Places API (2025+)
 *
 * Props:
 * - value: { street, city, state, zip }
 * - onChange: (address) => void
 * - placeholder: string
 * - className: string
 * - countryCode: string (default: 'us')
 */
export default function AddressAutocomplete({
  value,
  onChange,
  placeholder = 'Start typing your address...',
  className = '',
  countryCode = 'us',
}) {
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [placesReady, setPlacesReady] = useState(false);
  const [predictions, setPredictions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [loadError, setLoadError] = useState(false);
  const dropdownRef = useRef(null);
  const placesLibRef = useRef(null);

  // Load Google Maps script with new API
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      console.warn('Missing VITE_GOOGLE_MAPS_API_KEY');
      return;
    }

    if (window.google?.maps?.importLibrary) {
      setScriptLoaded(true);
      return;
    }

    const targetScriptSrc = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&v=weekly`;

    // Check if the correct script already exists
    const correctScript = document.querySelector(
      `script[src="${targetScriptSrc}"]`
    );

    if (correctScript) {
      // Correct script exists, wait for it to load
      if (window.google?.maps?.importLibrary) {
        setScriptLoaded(true);
      } else {
        const checkLoaded = setInterval(() => {
          if (window.google?.maps?.importLibrary) {
            setScriptLoaded(true);
            clearInterval(checkLoaded);
          }
        }, 100);
        return () => clearInterval(checkLoaded);
      }
      return;
    }

    // Remove old scripts with wrong URL (old API)
    const allScripts = document.querySelectorAll(
      `script[src*="maps.googleapis.com/maps/api/js"]`
    );
    allScripts.forEach((script) => {
      if (script.src !== targetScriptSrc) {
        script.remove();
      }
    });

    // Clear google.maps if it exists with old API
    if (window.google?.maps && !window.google.maps.importLibrary) {
      delete window.google.maps;
    }

    // Load the new script
    const script = document.createElement('script');
    script.src = targetScriptSrc;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log('[AddressAutocomplete] Google Maps script loaded');
      setScriptLoaded(true);
    };
    script.onerror = () => {
      console.error('[AddressAutocomplete] Failed to load Google Maps script');
      setLoadError(true);
    };
    document.head.appendChild(script);
  }, []);

  // Import places library
  useEffect(() => {
    if (!scriptLoaded) return;

    const loadPlaces = async () => {
      try {
        console.log('[AddressAutocomplete] Loading places library...');
        placesLibRef.current = await window.google.maps.importLibrary('places');
        console.log('[AddressAutocomplete] Places library loaded successfully');
        setPlacesReady(true);
      } catch (error) {
        console.error('[AddressAutocomplete] Failed to load places library:', error);
        setLoadError(true);
      }
    };

    loadPlaces();
  }, [scriptLoaded]);

  // Sync input with value.street
  useEffect(() => {
    setInputValue(value?.street || '');
  }, [value?.street]);

  // Handle input change and fetch suggestions
  const handleInputChange = async (e) => {
    const val = e.target.value;
    setInputValue(val);

    // Update parent with just street change
    if (onChange) {
      onChange({ ...value, street: val });
    }

    // Get predictions using new API
    if (val.length > 2 && placesLibRef.current) {
      try {
        const { AutocompleteSuggestion } = placesLibRef.current;

        const request = {
          input: val,
          includedRegionCodes: [countryCode.toUpperCase()],
        };

        const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions(request);

        if (suggestions && suggestions.length > 0) {
          setPredictions(suggestions);
          setShowDropdown(true);
        } else {
          setPredictions([]);
          setShowDropdown(false);
        }
      } catch (error) {
        console.error('Error fetching autocomplete suggestions:', error);
        setPredictions([]);
        setShowDropdown(false);
      }
    } else {
      setPredictions([]);
      setShowDropdown(false);
    }
  };

  // Handle suggestion selection
  const handleSelectSuggestion = async (suggestion) => {
    if (!placesLibRef.current) return;

    try {
      const { Place } = placesLibRef.current;

      // Create a Place object from the place ID
      const place = new Place({
        id: suggestion.placePrediction.placeId,
      });

      // Fetch place details
      await place.fetchFields({
        fields: ['addressComponents', 'formattedAddress'],
      });

      if (place.addressComponents) {
        const components = parseAddressComponents(place.addressComponents);

        if (onChange) {
          onChange(components);
        }

        setInputValue(components.street);
        setPredictions([]);
        setShowDropdown(false);
      }
    } catch (error) {
      console.error('Error fetching place details:', error);
    }
  };

  // Parse address components from new API format
  const parseAddressComponents = (components) => {
    const address = {
      street: '',
      city: '',
      state: '',
      zip: '',
    };

    let streetNumber = '';
    let route = '';

    components.forEach((component) => {
      const types = component.types;

      if (types.includes('street_number')) {
        streetNumber = component.longText;
      }
      if (types.includes('route')) {
        route = component.longText;
      }
      if (types.includes('locality')) {
        address.city = component.longText;
      }
      if (types.includes('administrative_area_level_1')) {
        address.state = component.shortText;
      }
      if (types.includes('postal_code')) {
        address.zip = component.longText;
      }
    });

    address.street = `${streetNumber} ${route}`.trim();
    return address;
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div>
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={className}
        />
        <div className="text-xs text-red-600 mt-1">
          Missing VITE_GOOGLE_MAPS_API_KEY environment variable
        </div>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        className={className}
        disabled={!loadError && (!scriptLoaded || !placesReady)}
        onFocus={() => {
          if (predictions.length > 0) {
            setShowDropdown(true);
          }
        }}
      />

      {!loadError && (!scriptLoaded || !placesReady) && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="animate-spin h-4 w-4 border-2 border-amber-600 border-t-transparent rounded-full" />
        </div>
      )}

      {loadError && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="text-xs text-red-600" title="Autocomplete unavailable - please type manually">⚠️</div>
        </div>
      )}

      {showDropdown && predictions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-neutral-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {predictions.map((suggestion, idx) => (
            <button
              key={suggestion.placePrediction.placeId || idx}
              type="button"
              onClick={() => handleSelectSuggestion(suggestion)}
              className="w-full text-left px-3 py-2 hover:bg-neutral-50 text-sm text-neutral-900 border-b border-neutral-100 last:border-b-0"
            >
              {suggestion.placePrediction.text.text}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
