module.exports = {
  preset: 'jest-expo',
  resolver: 'react-native-worklets/jest/resolver',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '\\.css$': '<rootDir>/jest.css-mock.js',
  },
};
