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
} from 'react-native';
import axios from 'axios';

// Interface for Autocomplete Predictions
interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
  // Add other fields from prediction if needed
}

// Interface for Place Details (what ProposeDateScreen expects)
interface PlaceDetails {
  place_id?: string;
  name?: string;
  formatted_address?: string;
  vicinity?: string; // vicinity is often available
  // Add other geometry, address_components etc. if needed from Place Details API
}

interface GooglePlacesInputProps {
  placeholder?: string;
  onPlaceSelected: (details: PlaceDetails | null, predictionData: PlacePrediction | null) => void; // Callback with details
  textInputProps?: any; // To pass down other TextInput props like style
  styles?: {
    // Allow custom styling from parent
    container?: object;
    textInputContainer?: object; // If you wrap TextInput
    textInput?: object;
    listView?: object;
    row?: object;
    description?: object;
    separator?: object;
  };
  fetchDetails?: boolean; // To control if details API is called
  query?: {
    // For additional query params like language, components, etc.
    language?: string;
    components?: string; // e.g., 'country:us'
    // Add other Google Places Autocomplete query params if needed
  };
  debounce?: number;
  apiKey: string; // API key should be passed as a prop
}

const GooglePlacesInput: React.FC<GooglePlacesInputProps> = ({
  placeholder = 'Search for a place',
  onPlaceSelected,
  textInputProps = {},
  styles: customStyles = {},
  fetchDetails = true, // Default to true as ProposeDateScreen expects details
  query: queryParams = {},
  debounce = 300,
  apiKey, // Expect API key as a prop
}) => {
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showPredictions, setShowPredictions] = useState(false);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear predictions if query is empty
    if (!query.trim()) {
      setPredictions([]);
      setShowPredictions(false);
      // Potentially call onPlaceSelected with null if input is cleared
      // onPlaceSelected(null, null);
    }
  }, [query]);

  const fetchAutocompletePredictions = async (text: string) => {
    if (text.length < 3) {
      // Only search if query is reasonably long
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
            components: queryParams.components, // e.g., 'country:us'
            // sessiontoken: 'YOUR_SESSION_TOKEN', // Important for billing, generate per session
            ...queryParams, // Spread other query params
          },
        }
      );
      if (response.data.predictions) {
        setPredictions(response.data.predictions);
        setShowPredictions(true);
      } else {
        setPredictions([]);
        setShowPredictions(false);
      }
    } catch (error) {
      console.error('Failed to fetch places autocomplete:', error);
      setPredictions([]);
      setShowPredictions(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQueryChange = (text: string) => {
    setQuery(text);
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    if (text.length > 2) {
      // Only debounce if text is meaningful
      debounceTimeout.current = setTimeout(() => {
        fetchAutocompletePredictions(text);
      }, debounce);
    } else {
      setPredictions([]);
      setShowPredictions(false);
    }
  };

  const handleSelectPlace = async (prediction: PlacePrediction) => {
    setQuery(prediction.description); // Update text input with selected description
    setPredictions([]);
    setShowPredictions(false);
    Keyboard.dismiss();

    if (fetchDetails && prediction.place_id) {
      setIsLoading(true); // Show loader while fetching details
      try {
        const detailsResponse = await axios.get(
          `https://maps.googleapis.com/maps/api/place/details/json`,
          {
            params: {
              place_id: prediction.place_id,
              key: apiKey,
              language: queryParams.language || 'en',
              fields: 'name,formatted_address,place_id,vicinity,geometry', // Customize fields as needed
              // sessiontoken: 'YOUR_SESSION_TOKEN', // Use the same session token
            },
          }
        );
        if (detailsResponse.data.result) {
          const placeDetails: PlaceDetails = detailsResponse.data.result;
          onPlaceSelected(placeDetails, prediction); // Pass full details
        } else {
          console.error('Failed to fetch place details:', detailsResponse.data.status);
          onPlaceSelected(null, prediction); // Pass prediction data even if details fail
        }
      } catch (error) {
        console.error('Error fetching place details:', error);
        onPlaceSelected(null, prediction); // Pass prediction data even on error
      } finally {
        setIsLoading(false);
      }
    } else {
      // If not fetching details, or no place_id, return the prediction itself
      // Adapt this part based on what `onPlaceSelected` expects in this scenario
      const minimalDetails: PlaceDetails = {
        name: prediction.structured_formatting?.main_text || prediction.description,
        formatted_address: prediction.description,
        place_id: prediction.place_id,
      };
      onPlaceSelected(minimalDetails, prediction);
    }
  };

  return (
    <View style={[styles.container, customStyles.container]}>
      <View style={[styles.textInputContainer, customStyles.textInputContainer]}>
        <TextInput
          placeholder={placeholder}
          style={[styles.textInput, customStyles.textInput, textInputProps.style]}
          onChangeText={handleQueryChange}
          value={query}
          onFocus={() => {
            if (query.length > 2 && predictions.length > 0) setShowPredictions(true);
          }}
          // onBlur={() => setTimeout(() => setShowPredictions(false), 100)} // Hide on blur with delay
          {...textInputProps} // Spread other TextInput props
        />
        {isLoading && <ActivityIndicator style={styles.loader} size="small" />}
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
                {item.structured_formatting?.main_text || item.description}
              </Text>
              {item.structured_formatting?.secondary_text && (
                <Text
                  style={[
                    styles.secondaryText,
                    customStyles.predefinedPlacesDescription /* If it exists in parent */,
                  ]}>
                  {item.structured_formatting.secondary_text}
                </Text>
              )}
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={[styles.separator, customStyles.separator]} />}
          keyboardShouldPersistTaps="handled" // Important for TouchableOpacity in FlatList
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // backgroundColor: '#f0f0f0', // Example default background
    width: '100%',
    zIndex: 1, // Default zIndex
    ...(Platform.OS === 'android' ? { elevation: 1 } : {}), // For Android shadow on listView
  },
  textInputContainer: {
    // Wrapper for TextInput and loader
    flexDirection: 'row',
    alignItems: 'center',
    // borderWidth: 1,
    // borderColor: '#ccc',
    // borderRadius: 5,
  },
  textInput: {
    flex: 1,
    height: 40,
    // paddingHorizontal: 10,
    // fontSize: 16,
    // backgroundColor: 'white',
  },
  loader: {
    paddingHorizontal: 5,
  },
  listView: {
    backgroundColor: 'white', // Default list background
    borderColor: '#ccc',
    borderWidth: StyleSheet.hairlineWidth,
    // borderRadius: 5, // If you want rounded corners
    // position: 'absolute', // Make sure it overlays correctly
    // top: '100%', // Position below the input
    // left: 0,
    // right: 0,
    maxHeight: 200, // Limit height
    zIndex: 10, // Ensure it's above other content
    ...(Platform.OS === 'android' ? { elevation: 10 } : {}),
  },
  row: {
    padding: 12,
    backgroundColor: 'white',
  },
  description: {
    fontSize: 15,
    color: '#333',
  },
  secondaryText: {
    fontSize: 13,
    color: '#777',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#ccc',
  },
});

export default GooglePlacesInput;
