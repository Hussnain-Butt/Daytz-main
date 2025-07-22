import React, { createRef } from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { View } from 'react-native';
import { Button } from '../Button'; // Do dots (..) lagayein // Apni Button file ko import karein

describe('<Button />', () => {
  // Test 1: Check if the button renders with the correct title
  it('should render the button with the correct title', () => {
    const buttonTitle = 'Login Karein';
    render(<Button title={buttonTitle} onPress={() => {}} />);

    // 'screen.getByText' se us text ko dhoondein
    const buttonTextElement = screen.getByText(buttonTitle);

    // 'expect' se check karein ke wo element screen par maujood hai
    expect(buttonTextElement).toBeVisible();
  });

  // Test 2: Check if the onPress function is called when the button is pressed
  it('should call the onPress function when pressed', () => {
    // jest.fn() ek "spy" ya jaali function banata hai
    const mockOnPress = jest.fn();
    const buttonTitle = 'Submit';

    render(<Button title={buttonTitle} onPress={mockOnPress} />);

    const buttonElement = screen.getByText(buttonTitle);

    // 'fireEvent.press' se button par click simulate karein
    fireEvent.press(buttonElement);

    // Check karein ke mock function ek baar call hua
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  // Test 3: Check if the button is disabled
  it('should not call onPress when the button is disabled', () => {
    const mockOnPress = jest.fn();
    const buttonTitle = 'Disabled Button';

    render(<Button title={buttonTitle} onPress={mockOnPress} disabled={true} />);

    const buttonElement = screen.getByText(buttonTitle);
    fireEvent.press(buttonElement);

    // Check karein ke mock function call NAHI hua
    expect(mockOnPress).not.toHaveBeenCalled();
  });

  // Test 4: Check if the forwardRef works correctly
  it('should forward the ref to the underlying TouchableOpacity element', () => {
    // Ek ref object banayein
    const ref = createRef<View>();

    render(<Button title="Ref Test" onPress={() => {}} ref={ref} />);

    // Check karein ke ref ka 'current' value null nahi hai.
    // Iska matlab hai ke ref aagey element se attach ho gaya hai.
    expect(ref.current).not.toBeNull();
  });
});
