/**
 * User API Service Integration Tests
 * 
 * This file demonstrates testing a RESTful User API service using Jest and Supertest.
 * It covers CRUD operations, authentication, and error handling.
 */

const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/database');
const UserModel = require('../../src/models/user.model');
const { generateToken } = require('../../src/utils/auth');

// Mock data
const testUsers = [
  {
    id: '1',
    username: 'testuser1',
    email: 'test1@example.com',
    password: '$2a$10$XQHGZmWL/aXvCgVYjFPX8eR0sKKJDSVgQ9YU2cxG3ySMgP5wZXXim', // hashed 'password123'
    role: 'user',
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    username: 'testuser2',
    email: 'test2@example.com',
    password: '$2a$10$XQHGZmWL/aXvCgVYjFPX8eR0sKKJDSVgQ9YU2cxG3ySMgP5wZXXim', // hashed 'password123'
    role: 'admin',
    isActive: true,
    createdAt: new Date().toISOString()
  }
];

// Setup and teardown
beforeAll(async () => {
  // Connect to test database
  await db.connect();
  
  // Clear test database before tests
  await UserModel.deleteMany({});
  
  // Seed test data
  await UserModel.insertMany(testUsers);
});

afterAll(async () => {
  // Disconnect from test database
  await db.disconnect();
});

// Helper function to generate a valid token for testing
const getAuthToken = (userId = '1', role = 'user') => {
  return generateToken({ id: userId, role });
};

describe('User API', () => {
  describe('Authentication', () => {
    test('should authenticate user with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test1@example.com',
          password: 'password123'
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('test1@example.com');
      expect(response.body.user).not.toHaveProperty('password'); // Should not return password
    });
    
    test('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test1@example.com',
          password: 'wrongpassword'
        });
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
    
    test('should reject non-existent users', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });
  
  describe('User Registration', () => {
    test('should register a new user', async () => {
      const newUser = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'securepassword123'
      };
      
      const response = await request(app)
        .post('/api/users/register')
        .send(newUser);
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(newUser.email);
      expect(response.body.user).not.toHaveProperty('password'); // Should not return password
      expect(response.body).toHaveProperty('token');
      
      // Verify user was actually saved in database
      const savedUser = await UserModel.findOne({ email: newUser.email });
      expect(savedUser).not.toBeNull();
      expect(savedUser.username).toBe(newUser.username);
    });
    
    test('should reject registration with existing email', async () => {
      const existingUser = {
        username: 'duplicateuser',
        email: 'test1@example.com', // Already exists
        password: 'securepassword123'
      };
      
      const response = await request(app)
        .post('/api/users/register')
        .send(existingUser);
      
      expect(response.status).toBe(409); // Conflict
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/email already exists/i);
    });
    
    test('should validate registration data', async () => {
      // Invalid email
      let response = await request(app)
        .post('/api/users/register')
        .send({
          username: 'validname',
          email: 'notanemail',
          password: 'validpassword123'
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      
      // Password too short
      response = await request(app)
        .post('/api/users/register')
        .send({
          username: 'validname',
          email: 'valid@example.com',
          password: 'short'
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      
      // Missing fields
      response = await request(app)
        .post('/api/users/register')
        .send({
          username: 'validname',
          // Missing email and password
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });
  
  describe('Get User Profile', () => {
    test('should get own user profile with valid token', async () => {
      const token = getAuthToken('1', 'user');
      
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.id).toBe('1');
      expect(response.body.user.email).toBe('test1@example.com');
      expect(response.body.user).not.toHaveProperty('password');
    });
    
    test('should reject unauthenticated requests', async () => {
      const response = await request(app)
        .get('/api/users/profile');
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
    
    test('should reject invalid tokens', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer invalidtoken123');
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });
  
  describe('User CRUD Operations', () => {
    test('should get user by ID (admin only)', async () => {
      // Admin token
      const adminToken = getAuthToken('2', 'admin');
      
      const response = await request(app)
        .get('/api/users/1')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.id).toBe('1');
      
      // Regular user token (should be rejected)
      const userToken = getAuthToken('1', 'user');
      
      const unauthorizedResponse = await request(app)
        .get('/api/users/2')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(unauthorizedResponse.status).toBe(403); // Forbidden
    });
    
    test('should update own user profile', async () => {
      const token = getAuthToken('1', 'user');
      const updates = {
        username: 'updatedusername',
        bio: 'This is my updated bio'
      };
      
      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .send(updates);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.username).toBe(updates.username);
      expect(response.body.user.bio).toBe(updates.bio);
      
      // Verify actual database update
      const updatedUser = await UserModel.findById('1');
      expect(updatedUser.username).toBe(updates.username);
      expect(updatedUser.bio).toBe(updates.bio);
    });
    
    test('should not allow updating email via profile update', async () => {
      const token = getAuthToken('1', 'user');
      const updates = {
        username: 'validusername',
        email: 'newemail@example.com' // Trying to change email
      };
      
      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .send(updates);
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/cannot update email/i);
    });
    
    test('should allow admin to update any user', async () => {
      const adminToken = getAuthToken('2', 'admin');
      const updates = {
        username: 'adminupdated',
        isActive: false
      };
      
      const response = await request(app)
        .put('/api/users/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updates);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.username).toBe(updates.username);
      expect(response.body.user.isActive).toBe(updates.isActive);
    });
    
    test('should delete user (admin only)', async () => {
      // Create a user to delete
      const userToDelete = await UserModel.create({
        id: '3',
        username: 'deleteuser',
        email: 'delete@example.com',
        password: 'password123',
        role: 'user',
        isActive: true
      });
      
      const adminToken = getAuthToken('2', 'admin');
      
      const response = await request(app)
        .delete(`/api/users/${userToDelete.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/user deleted/i);
      
      // Verify user was actually deleted
      const deletedUser = await UserModel.findById(userToDelete.id);
      expect(deletedUser).toBeNull();
      
      // Regular user should not be able to delete users
      const userToken = getAuthToken('1', 'user');
      
      const unauthorizedResponse = await request(app)
        .delete(`/api/users/1`)
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(unauthorizedResponse.status).toBe(403); // Forbidden
    });
  });
  
  describe('Password Management', () => {
    test('should change password with valid current password', async () => {
      const token = getAuthToken('1', 'user');
      
      const response = await request(app)
        .post('/api/users/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'password123',
          newPassword: 'newpassword456',
          confirmPassword: 'newpassword456'
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/password updated/i);
      
      // Verify new password works for login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test1@example.com',
          password: 'newpassword456'
        });
      
      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body).toHaveProperty('token');
    });
    
    test('should reject password change with wrong current password', async () => {
      const token = getAuthToken('1', 'user');
      
      const response = await request(app)
        .post('/api/users/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword789',
          confirmPassword: 'newpassword789'
        });
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/current password is incorrect/i);
    });
    
    test('should reject password change when passwords do not match', async () => {
      const token = getAuthToken('1', 'user');
      
      const response = await request(app)
        .post('/api/users/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'newpassword456', // From previous test
          newPassword: 'newpassword789',
          confirmPassword: 'differentpassword789' // Does not match
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/passwords do not match/i);
    });
    
    test('should initiate password reset', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'test1@example.com'
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/reset instructions sent/i);
      
      // Should not reveal if email exists or not for security reasons
      const nonExistentResponse = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'nonexistent@example.com'
        });
      
      expect(nonExistentResponse.status).toBe(200);
      expect(nonExistentResponse.body).toHaveProperty('message');
    });
    
    test('should reset password with valid token', async () => {
      // Mock a valid reset token (in a real app, this would be generated and stored)
      const resetToken = 'valid-reset-token-123';
      
      // Update user with reset token
      await UserModel.findByIdAndUpdate('1', {
        resetPasswordToken: resetToken,
        resetPasswordExpires: Date.now() + 3600000 // 1 hour from now
      });
      
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'resetpassword123',
          confirmPassword: 'resetpassword123'
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/password has been reset/i);
      
      // Verify reset token is cleared
      const updatedUser = await UserModel.findById('1');
      expect(updatedUser.resetPasswordToken).toBeUndefined();
      expect(updatedUser.resetPasswordExpires).toBeUndefined();
      
      // Verify new password works for login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test1@example.com',
          password: 'resetpassword123'
        });
      
      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body).toHaveProperty('token');
    });
    
    test('should reject password reset with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid-token',
          newPassword: 'newpassword123',
          confirmPassword: 'newpassword123'
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(/invalid or expired/i);
    });
  });
  
  describe('User Listing and Filtering (Admin Only)', () => {
    test('should list all users for admin', async () => {
      const adminToken = getAuthToken('2', 'admin');
      
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('users');
      expect(Array.isArray(response.body.users)).toBe(true);
      expect(response.body.users.length).toBeGreaterThan(0);
      
      // Regular user should not be able to list all users
      const userToken = getAuthToken('1', 'user');
      
      const unauthorizedResponse = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(unauthorizedResponse.status).toBe(403); // Forbidden
    });
    
    test('should filter users by role', async () => {
      const adminToken = getAuthToken('2', 'admin');
      
      const response = await request(app)
        .get('/api/users?role=admin')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('users');
      expect(Array.isArray(response.body.users)).toBe(true);
      
      // All returned users should have admin role
      response.body.users.forEach(user => {
        expect(user.role).toBe('admin');
      });
      
      // At least user with ID 2 should be in results
      const hasUser2 = response.body.users.some(user => user.id === '2');
      expect(hasUser2).toBe(true);
    });
    
    test('should search users by email or username', async () => {
      const adminToken = getAuthToken('2', 'admin');
      
      // Search by partial email
      const emailResponse = await request(app)
        .get('/api/users?search=test1')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(emailResponse.status).toBe(200);
      expect(emailResponse.body).toHaveProperty('users');
      expect(Array.isArray(emailResponse.body.users)).toBe(true);
      expect(emailResponse.body.users.length).toBeGreaterThan(0);
      
      // At least one result should contain test1@example.com
      const hasEmail = emailResponse.body.users.some(user => user.email === 'test1@example.com');
      expect(hasEmail).toBe(true);
      
      // Search by username (user was updated in previous test)
      const usernameResponse = await request(app)
        .get('/api/users?search=adminupdated')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(usernameResponse.status).toBe(200);
      expect(usernameResponse.body).toHaveProperty('users');
      expect(Array.isArray(usernameResponse.body.users)).toBe(true);
      
      // At least one result should have username adminupdated
      const hasUsername = usernameResponse.body.users.some(user => user.username === 'adminupdated');
      expect(hasUsername).toBe(true);
    });
    
    test('should paginate user results', async () => {
      // Create additional users for pagination testing
      const extraUsers = [];
      for (let i = 0; i < 15; i++) {
        extraUsers.push({
          id: `${i + 10}`,
          username: `paginationuser${i}`,
          email: `pagination${i}@example.com`,
          password: 'password123',
          role: 'user',
          isActive: true
        });
      }
      
      await UserModel.insertMany(extraUsers);
      
      const adminToken = getAuthToken('2', 'admin');
      
      // Get first page (limit 10)
      const page1Response = await request(app)
        .get('/api/users?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(page1Response.status).toBe(200);
      expect(page1Response.body).toHaveProperty('users');
      expect(page1Response.body).toHaveProperty('pagination');
      expect(page1Response.body.pagination).toHaveProperty('total');
      expect(page1Response.body.pagination).toHaveProperty('totalPages');
      expect(page1Response.body.pagination).toHaveProperty('currentPage');
      expect(page1Response.body.users.length).toBe(10);
      
      // Get second page
      const page2Response = await request(app)
        .get('/api/users?page=2&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(page2Response.status).toBe(200);
      expect(page2Response.body).toHaveProperty('users');
      expect(page2Response.body.pagination.currentPage).toBe(2);
      
      // Ensure pages contain different users
      const page1Ids = page1Response.body.users.map(user => user.id);
      const page2Ids = page2Response.body.users.map(user => user.id);
      
      // No overlapping IDs between pages
      const overlap = page1Ids.filter(id => page2Ids.includes(id));
      expect(overlap.length).toBe(0);
    });
  });
  
  describe('API Rate Limiting', () => {
    test('should limit repeated login attempts', async () => {
      // Make multiple login attempts in quick succession
      const loginPromises = [];
      for (let i = 0; i < 20; i++) {
        loginPromises.push(
          request(app)
            .post('/api/auth/login')
            .send({
              email: 'test1@example.com',
              password: 'wrongpassword'
            })
        );
      }
      
      const responses = await Promise.all(loginPromises);
      
      // Some of the later requests should be rate limited (status 429)
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
      
      // Rate limited responses should have a Retry-After header
      rateLimitedResponses.forEach(res => {
        expect(res.headers).toHaveProperty('retry-after');
      });
    });
  });
  
  describe('API Versioning', () => {
    test('should support API versioning', async () => {
      // Test current version endpoint
      const response = await request(app)
        .get('/api/version');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('version');
      
      // Test older version endpoint if available
      // This assumes we have a v1 endpoint for demonstration
      const v1Response = await request(app)
        .get('/api/v1/version');
      
      // Either it exists or returns 404, but shouldn't crash
      expect([200, 404]).toContain(v1Response.status);
      
      if (v1Response.status === 200) {
        expect(v1Response.body).toHaveProperty('version');
        expect(v1Response.body.version).not.toBe(response.body.version);
      }
    });
  });
  
  describe('API Documentation', () => {
    test('should serve API documentation', async () => {
      const response = await request(app)
        .get('/api-docs');
      
      expect(response.status).toBe(200);
      expect(response.type).toMatch(/html/i);
      
      // If using Swagger or OpenAPI
      const swaggerResponse = await request(app)
        .get('/api-docs/swagger.json');
      
      // Should return either JSON or 404 if not implemented
      if (swaggerResponse.status === 200) {
        expect(swaggerResponse.type).toMatch(/json/i);
        expect(swaggerResponse.body).toHaveProperty('paths');
        expect(swaggerResponse.body.paths).toHaveProperty('/api/users');
      }
    });
  });
});
