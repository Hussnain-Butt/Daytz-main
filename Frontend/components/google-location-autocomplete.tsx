// File: components/google-location-autocomplete.tsx
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

// Interface for Autocomplete Predictions
export interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
}

// Interface for Place Details (what ProposeDateScreen expects)
export interface PlaceDetails {
  place_id: string;
  name: string;
  formatted_address: string;
  // You can add more fields like geometry if needed
}

interface GooglePlacesInputProps {
  apiKey: string;
  placeholder?: string;
  onPlaceSelected: (details: PlaceDetails | null) => void;
  textInputProps?: any;
  styles?: {
    container?: object;
    textInputContainer?: object;
    textInput?: object;
    listView?: object;
    row?: object;
    description?: object;
    separator?: object;
  };
  fetchDetails?: boolean;
  query?: {
    language?: string;
    components?: string;
  };
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

  // ✨ NEW: State for the session token for billing optimization
  const [sessionToken, setSessionToken] = useState<string | undefined>(undefined);

  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  const fetchAutocompletePredictions = async (text: string) => {
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
            // ✨ NEW: Use the session token for grouped billing
            sessiontoken: sessionToken,
          },
        }
      );
      if (response.data.predictions) {
        setPredictions(response.data.predictions);
        setShowPredictions(true);
      } else {
        setPredictions([]);
      }
    } catch (error) {
      console.error('Failed to fetch places autocomplete:', error);
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
              // ✨ NEW: Use the same session token for the details call
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
        // ✨ NEW: End the session by clearing the token
        setSessionToken(undefined);
      }
    } else {
      // Fallback if details are not fetched
      onPlaceSelected({
        name: prediction.structured_formatting?.main_text || prediction.description,
        formatted_address: prediction.description,
        place_id: prediction.place_id,
      });
      // ✨ NEW: End the session by clearing the token
      setSessionToken(undefined);
    }
  };

  // ✨ NEW: Generate a new session token when the input is focused
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
          // Hide predictions with a small delay on blur to allow presses to register
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

// Styles updated for dark theme and absolute positioning
const styles = StyleSheet.create({
  container: {
    position: 'relative', // Parent must have a position for absolute children to work from
    width: '100%',
    zIndex: 1000, // High zIndex for the container to establish stacking context
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
  // The listView MUST be positioned absolutely to float over screen content
  listView: {
    position: 'absolute',
    top: 60, // Position it below the input (52 height + 8 margin)
    left: 0,
    right: 0,
    backgroundColor: '#2C2C2E',
    borderColor: '#3A3A3C',
    borderWidth: 1,
    borderRadius: 8,
    maxHeight: 250,
    zIndex: 1001, // Must be higher than container
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
