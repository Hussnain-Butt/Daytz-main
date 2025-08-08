// File: components/google-location-autocomplete.tsx (UPDATED WITH DEBUGGING)
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Keyboard,
} from 'react-native';
import axios from 'axios';
import 'react-native-get-random-values'; // Required for uuid
import { v4 as uuidv4 } from 'uuid'; // For generating session tokens

// Interfaces remain the same...
export interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
}

export interface PlaceDetails {
  place_id: string;
  name: string;
  formatted_address: string;
}

interface GooglePlacesInputProps {
  apiKey: string;
  placeholder?: string;
  onPlaceSelected: (details: PlaceDetails | null) => void;
  // ... other props
  textInputProps?: any;
  styles?: any;
  fetchDetails?: boolean;
  query?: any;
  debounce?: number;
}

const GooglePlacesInput: React.FC<GooglePlacesInputProps> = ({
  apiKey,
  placeholder = 'Search for a place',
  onPlaceSelected,
  textInputProps = {},
  styles: customStyles = {},
  fetchDetails = true,
  query: queryParams = {},
  debounce = 400,
}) => {
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showPredictions, setShowPredictions] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | undefined>(undefined);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  const fetchAutocompletePredictions = async (text: string) => {
    // ✅ DEBUG: Log when the function is called
    console.log(`[DEBUG] Fetching predictions for: "${text}"`);

    if (text.length < 3) {
      setPredictions([]);
      setShowPredictions(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json`,
        {
          params: {
            input: text,
            key: apiKey,
            language: queryParams.language || 'en',
            components: queryParams.components,
            sessiontoken: sessionToken,
          },
        }
      );

      // ✅✅✅ CRITICAL DEBUG: Log the entire API response from Google
      console.log(
        '[DEBUG] Google Places API Raw Response:',
        JSON.stringify(response.data, null, 2)
      );

      // ✅ FIX: Improved logic to check response status from Google
      if (response.data.status === 'OK') {
        setPredictions(response.data.predictions);
        setShowPredictions(true);
      } else if (response.data.status === 'ZERO_RESULTS') {
        setPredictions([]); // No results found, clear the list
        setShowPredictions(false);
      } else {
        // Handle other statuses like REQUEST_DENIED, INVALID_REQUEST
        console.error(
          'Google Places API Error:',
          response.data.status,
          response.data.error_message || ''
        );
        setPredictions([]);
        setShowPredictions(false);
      }
    } catch (error) {
      console.error('Failed to fetch places autocomplete (Axios Error):', error);
      setPredictions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQueryChange = (text: string) => {
    setQuery(text);
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    debounceTimeout.current = setTimeout(() => {
      fetchAutocompletePredictions(text);
    }, debounce);
  };

  const handleSelectPlace = async (prediction: PlacePrediction) => {
    // This function remains largely the same
    Keyboard.dismiss();
    setQuery(prediction.description);
    setShowPredictions(false);

    if (fetchDetails && prediction.place_id) {
      setIsLoading(true);
      try {
        const detailsResponse = await axios.get(
          `https://maps.googleapis.com/maps/api/place/details/json`,
          {
            params: {
              place_id: prediction.place_id,
              key: apiKey,
              fields: 'name,formatted_address,place_id',
              sessiontoken: sessionToken,
            },
          }
        );
        if (detailsResponse.data.result) {
          onPlaceSelected(detailsResponse.data.result as PlaceDetails);
        } else {
          onPlaceSelected(null);
        }
      } catch (error) {
        console.error('Error fetching place details:', error);
        onPlaceSelected(null);
      } finally {
        setIsLoading(false);
        setSessionToken(undefined);
      }
    } else {
      onPlaceSelected({
        name: prediction.structured_formatting?.main_text || prediction.description,
        formatted_address: prediction.description,
        place_id: prediction.place_id,
      });
      setSessionToken(undefined);
    }
  };

  const handleFocus = () => {
    if (!sessionToken) {
      setSessionToken(uuidv4());
    }
    setShowPredictions(true);
  };

  return (
    <View style={[styles.container, customStyles.container]}>
      <View style={[styles.textInputContainer, customStyles.textInputContainer]}>
        <TextInput
          placeholder={placeholder}
          style={[styles.textInput, customStyles.textInput]}
          onChangeText={handleQueryChange}
          value={query}
          onFocus={handleFocus}
          onBlur={() => setTimeout(() => setShowPredictions(false), 200)}
          placeholderTextColor="#8E8E93"
          {...textInputProps}
        />
        {isLoading && <ActivityIndicator style={styles.loader} color="#FFF" />}
      </View>
      {showPredictions && predictions.length > 0 && (
        <FlatList
          style={[styles.listView, customStyles.listView]}
          data={predictions}
          keyExtractor={(item) => item.place_id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.row, customStyles.row]}
              onPress={() => handleSelectPlace(item)}>
              <Text style={[styles.description, customStyles.description]}>
                {item.structured_formatting?.main_text}
              </Text>
              <Text style={styles.secondaryText}>{item.structured_formatting?.secondary_text}</Text>
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={[styles.separator, customStyles.separator]} />}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
};

// Styles remain the same...
const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: '100%',
    zIndex: 1000,
  },
  textInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
  },
  textInput: {
    flex: 1,
    height: 52,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#FFFFFF',
  },
  loader: {
    paddingHorizontal: 10,
  },
  listView: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    backgroundColor: '#2C2C2E',
    borderColor: '#3A3A3C',
    borderWidth: 1,
    borderRadius: 8,
    maxHeight: 250,
    zIndex: 1001,
    ...(Platform.OS === 'android' ? { elevation: 5 } : {}),
  },
  row: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  description: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  secondaryText: {
    fontSize: 13,
    color: '#EBEBF599',
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: '#3A3A3C',
  },
});

export default GooglePlacesInput;
