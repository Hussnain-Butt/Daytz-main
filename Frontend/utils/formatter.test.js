// utils/formatter.test.js
import { capitalize } from './formatter';

// 'describe' block group related tests
describe('capitalize function', () => {
  // 'it' ya 'test' ek individual test case hota hai
  it('should capitalize the first letter of a string', () => {
    // Arrange (setup)
    const input = 'hello';
    const expectedOutput = 'Hello';

    // Act (run the function)
    const result = capitalize(input);

    // Assert (check the result)
    expect(result).toBe(expectedOutput);
  });

  it('should return an empty string if input is empty', () => {
    expect(capitalize('')).toBe('');
  });

  it('should handle already capitalized strings', () => {
    expect(capitalize('World')).toBe('World');
  });
});
