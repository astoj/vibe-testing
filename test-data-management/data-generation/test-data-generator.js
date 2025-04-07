/**
 * Test Data Generator
 * 
 * This utility generates realistic test data for various testing scenarios.
 * It provides factories for creating users, products, orders, and other domain entities
 * with optional customization.
 */

const fs = require('fs');
const path = require('path');
const { faker } = require('@faker-js/faker');
const { v4: uuidv4 } = require('uuid');

// Configuration options
const DEFAULT_CONFIG = {
  outputDir: path.join(__dirname, '../fixtures'),
  locale: 'en_US',
  seed: 123, // Fixed seed for reproducible data
  counts: {
    users: 50,
    products: 100,
    categories: 10,
    orders: 200,
    reviews: 500
  }
};

/**
 * TestDataGenerator class
 * Generates and manages test data for various entities
 */
class TestDataGenerator {
  /**
   * Constructor
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Set faker locale and seed for reproducibility
    faker.locale = this.config.locale;
    faker.seed(this.config.seed);
    
    // Create output directory if it doesn't exist
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }
    
    // Initialize data stores
    this.users = [];
    this.products = [];
    this.categories = [];
    this.orders = [];
    this.reviews = [];
  }
  
  /**
   * Generate all test data sets
   */
  generateAll() {
    this.generateCategories(this.config.counts.categories);
    this.generateUsers(this.config.counts.users);
    this.generateProducts(this.config.counts.products);
    this.generateOrders(this.config.counts.orders);
    this.generateReviews(this.config.counts.reviews);
    
    // Save all data to files
    this.saveAllToFiles();
  }
  
  /**
   * Generate category data
   * @param {Number} count - Number of categories to generate
   * @returns {Array} Array of category objects
   */
  generateCategories(count = 10) {
    const categories = [];
    
    for (let i = 0; i < count; i++) {
      const category = {
        id: uuidv4(),
        name: faker.commerce.department(),
        description: faker.commerce.productDescription(),
        createdAt: faker.date.past(2).toISOString(),
        updatedAt: faker.date.recent(30).toISOString(),
        imageUrl: faker.image.imageUrl(640, 480, 'fashion', true),
        isActive: faker.datatype.boolean(0.9) // 90% active
      };
      
      categories.push(category);
    }
    
    this.categories = categories;
    return categories;
  }
  
  /**
   * Generate user data
   * @param {Number} count - Number of users to generate
   * @returns {Array} Array of user objects
   */
  generateUsers(count = 50) {
    const users = [];
    
    // Generate admin user
    const adminUser = {
      id: uuidv4(),
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@example.com',
      password: '$2a$10$XQHGZmWL/aXvCgVYjFPX8eR0sKKJDSVgQ9YU2cxG3ySMgP5wZXXim', // hashed 'admin123!'
      role: 'admin',
      createdAt: faker.date.past(2).toISOString(),
      updatedAt: faker.date.recent(30).toISOString(),
      lastLogin: faker.date.recent(7).toISOString(),
      isActive: true,
      address: {
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        zipCode: faker.location.zipCode(),
        country: 'United States'
      },
      phoneNumber: faker.phone.number(),
      preferences: {
        language: 'en',
        currency: 'USD',
        notifications: {
          email: true,
          sms: false,
          marketing: true
        }
      }
    };
    
    users.push(adminUser);
    
    // Generate standard test user
    const testUser = {
      id: uuidv4(),
      firstName: 'Test',
      lastName: 'User',
      email: 'testuser@example.com',
      password: '$2a$10$XQHGZmWL/aXvCgVYjFPX8eR0sKKJDSVgQ9YU2cxG3ySMgP5wZXXim', // hashed 'password123!'
      role: 'user',
      createdAt: faker.date.past(1).toISOString(),
      updatedAt: faker.date.recent(10).toISOString(),
      lastLogin: faker.date.recent(2).toISOString(),
      isActive: true,
      address: {
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        zipCode: faker.location.zipCode(),
        country: 'United States'
      },
      phoneNumber: faker.phone.number(),
      preferences: {
        language: 'en',
        currency: 'USD',
        notifications: {
          email: true,
          sms: true,
          marketing: false
        }
      }
    };
    
    