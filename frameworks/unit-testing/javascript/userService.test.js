/**
 * User Service Unit Tests
 * 
 * These tests verify the functionality of the User Service module,
 * which handles user authentication, registration, and profile management.
 * 
 * Each test follows the AAA pattern (Arrange-Act-Assert) and uses
 * descriptive names that indicate what's being tested.
 */

// Import the service being tested
const userService = require('../services/userService');

// Import mocks
const userRepository = require('../repositories/userRepository');
const emailService = require('../services/emailService');
const tokenService = require('../services/tokenService');

// Mock the dependencies
jest.mock('../repositories/userRepository');
jest.mock('../services/emailService');
jest.mock('../services/tokenService');

// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});

describe('User Service', () => {
  // Group tests by function
  describe('authenticate()', () => {
    test('should return user data when credentials are valid', async () => {
      // Arrange
      const validCredentials = {
        email: 'test@example.com',
        password: 'correct-password'
      };
      
      const expectedUser = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user'
      };
      
      // Set up the mock to return a user with the matching credentials
      userRepository.findByCredentials.mockResolvedValue(expectedUser);
      
      // Act
      const result = await userService.authenticate(validCredentials.email, validCredentials.password);
      
      // Assert
      expect(result).toEqual(expectedUser);
      expect(userRepository.findByCredentials).toHaveBeenCalledWith(
        validCredentials.email,
        validCredentials.password
      );
    });
    
    test('should throw error when credentials are invalid', async () => {
      // Arrange
      const invalidCredentials = {
        email: 'test@example.com',
        password: 'wrong-password'
      };
      
      // Set up the mock to return null (no user found)
      userRepository.findByCredentials.mockResolvedValue(null);
      
      // Act & Assert
      await expect(
        userService.authenticate(invalidCredentials.email, invalidCredentials.password)
      ).rejects.toThrow('Invalid credentials');
      
      expect(userRepository.findByCredentials).toHaveBeenCalledWith(
        invalidCredentials.email,
        invalidCredentials.password
      );
    });
    
    test('should handle repository errors gracefully', async () => {
      // Arrange
      userRepository.findByCredentials.mockRejectedValue(new Error('Database connection error'));
      
      // Act & Assert
      await expect(
        userService.authenticate('test@example.com', 'password')
      ).rejects.toThrow('Authentication failed. Please try again later.');
    });
  });
  
  describe('register()', () => {
    test('should create new user when data is valid', async () => {
      // Arrange
      const userData = {
        email: 'new@example.com',
        password: 'secure-password',
        name: 'New User'
      };
      
      const createdUser = {
        id: '456',
        email: userData.email,
        name: userData.name,
        role: 'user',
        createdAt: new Date()
      };
      
      // Set up mocks
      userRepository.findByEmail.mockResolvedValue(null); // User doesn't exist yet
      userRepository.create.mockResolvedValue(createdUser);
      emailService.sendWelcomeEmail.mockResolvedValue(true);
      
      // Act
      const result = await userService.register(userData);
      
      // Assert
      expect(result).toEqual(createdUser);
      expect(userRepository.findByEmail).toHaveBeenCalledWith(userData.email);
      expect(userRepository.create).toHaveBeenCalledWith({
        email: userData.email,
        password: expect.any(String), // Hashed password
        name: userData.name,
        role: 'user'
      });
      expect(emailService.sendWelcomeEmail).toHaveBeenCalledWith(
        userData.email,
        userData.name
      );
    });
    
    test('should throw error when email already exists', async () => {
      // Arrange
      const userData = {
        email: 'existing@example.com',
        password: 'secure-password',
        name: 'Existing User'
      };
      
      // Set up mock to return an existing user
      userRepository.findByEmail.mockResolvedValue({
        id: '789',
        email: userData.email
      });
      
      // Act & Assert
      await expect(
        userService.register(userData)
      ).rejects.toThrow('Email already exists');
      
      expect(userRepository.findByEmail).toHaveBeenCalledWith(userData.email);
      expect(userRepository.create).not.toHaveBeenCalled();
      expect(emailService.sendWelcomeEmail).not.toHaveBeenCalled();
    });
    
    test('should validate user data before creation', async () => {
      // Arrange
      const invalidUserData = {
        email: 'not-an-email',
        password: '123', // Too short
        name: '' // Empty name
      };
      
      userRepository.findByEmail.mockResolvedValue(null);
      
      // Act & Assert
      await expect(
        userService.register(invalidUserData)
      ).rejects.toThrow('Invalid user data');
      
      expect(userRepository.create).not.toHaveBeenCalled();
    });
    
    // Testing different edge cases
    test.each([
      ['missing email', { password: 'secure-password', name: 'Test User' }],
      ['missing password', { email: 'test@example.com', name: 'Test User' }],
      ['missing name', { email: 'test@example.com', password: 'secure-password' }]
    ])('should reject registration with %s', async (scenario, userData) => {
      // Act & Assert
      await expect(
        userService.register(userData)
      ).rejects.toThrow('Invalid user data');
      
      expect(userRepository.create).not.toHaveBeenCalled();
    });
  });
  
  describe('resetPassword()', () => {
    test('should send reset email when user exists', async () => {
      // Arrange
      const email = 'user@example.com';
      const user = {
        id: '123',
        email,
        name: 'Test User'
      };
      const resetToken = 'random-token-123';
      
      userRepository.findByEmail.mockResolvedValue(user);
      tokenService.generateResetToken.mockResolvedValue(resetToken);
      emailService.sendPasswordResetEmail.mockResolvedValue(true);
      
      // Act
      await userService.resetPassword(email);
      
      // Assert
      expect(userRepository.findByEmail).toHaveBeenCalledWith(email);
      expect(tokenService.generateResetToken).toHaveBeenCalledWith(user.id);
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        email,
        user.name,
        resetToken
      );
    });
    
    test('should not throw error when user does not exist', async () => {
      // Arrange
      const email = 'nonexistent@example.com';
      userRepository.findByEmail.mockResolvedValue(null);
      
      // Act & Assert
      // We don't want to throw an error for security reasons
      // (don't want to reveal which emails are registered)
      await expect(userService.resetPassword(email)).resolves.not.toThrow();
      
      expect(userRepository.findByEmail).toHaveBeenCalledWith(email);
      expect(tokenService.generateResetToken).not.toHaveBeenCalled();
      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
    
    test('should handle email service errors gracefully', async () => {
      // Arrange
      const email = 'user@example.com';
      const user = {
        id: '123',
        email,
        name: 'Test User'
      };
      const resetToken = 'random-token-123';
      
      userRepository.findByEmail.mockResolvedValue(user);
      tokenService.generateResetToken.mockResolvedValue(resetToken);
      emailService.sendPasswordResetEmail.mockRejectedValue(new Error('Email service unavailable'));
      
      // Act & Assert
      await expect(userService.resetPassword(email)).rejects.toThrow(
        'Unable to send password reset email. Please try again later.'
      );
    });
  });
});

describe('User Profile Management', () => {
  describe('updateProfile()', () => {
    test('should update user profile with valid data', async () => {
      // Arrange
      const userId = '123';
      const updatedData = {
        name: 'Updated Name',
        bio: 'New bio information'
      };
      
      const originalUser = {
        id: userId,
        name: 'Original Name',
        email: 'user@example.com',
        bio: 'Original bio'
      };
      
      const updatedUser = {
        ...originalUser,
        ...updatedData
      };
      
      userRepository.findById.mockResolvedValue(originalUser);
      userRepository.update.mockResolvedValue(updatedUser);
      
      // Act
      const result = await userService.updateProfile(userId, updatedData);
      
      // Assert
      expect(result).toEqual(updatedUser);
      expect(userRepository.findById).toHaveBeenCalledWith(userId);
      expect(userRepository.update).toHaveBeenCalledWith(userId, updatedData);
    });
    
    test('should throw error when updating non-existent user', async () => {
      // Arrange
      const userId = 'nonexistent';
      const updatedData = { name: 'New Name' };
      
      userRepository.findById.mockResolvedValue(null);
      
      // Act & Assert
      await expect(
        userService.updateProfile(userId, updatedData)
      ).rejects.toThrow('User not found');
      
      expect(userRepository.findById).toHaveBeenCalledWith(userId);
      expect(userRepository.update).not.toHaveBeenCalled();
    });
    
    test('should not allow updating email via profile update', async () => {
      // Arrange
      const userId = '123';
      const updatedData = {
        name: 'Updated Name',
        email: 'newemail@example.com' // Attempting to change email
      };
      
      const originalUser = {
        id: userId,
        name: 'Original Name',
        email: 'original@example.com'
      };
      
      userRepository.findById.mockResolvedValue(originalUser);
      
      // Act & Assert
      await expect(
        userService.updateProfile(userId, updatedData)
      ).rejects.toThrow('Email cannot be updated through this endpoint');
      
      expect(userRepository.update).not.toHaveBeenCalled();
    });
  });
});
