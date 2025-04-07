/**
 * Database Integration Tests
 * 
 * This example demonstrates how to test database operations
 * using a test database with transaction rollbacks to ensure
 * tests don't leave residual data.
 */
const { expect } = require('chai');
const knex = require('knex');
const { v4: uuidv4 } = require('uuid');

// Repositories to test
const UserRepository = require('../../src/repositories/userRepository');
const PostRepository = require('../../src/repositories/postRepository');

describe('Database Integration Tests', function() {
  // Increase timeout for database operations
  this.timeout(10000);
  
  // Database connection
  let db;
  
  // Repositories
  let userRepo;
  let postRepo;
  
  // Test transaction for isolation and rollback
  let trx;
  
  before(async function() {
    // Initialize database connection
    db = knex({
      client: 'pg',
      connection: {
        host: process.env.TEST_DB_HOST || 'localhost',
        port: process.env.TEST_DB_PORT || 5432,
        user: process.env.TEST_DB_USER || 'testuser',
        password: process.env.TEST_DB_PASSWORD || 'testpassword',
        database: process.env.TEST_DB_NAME || 'testdb'
      },
      // Use a separate pool for tests
      pool: { min: 0, max: 5 }
    });
    
    // Check database connection
    try {
      await db.raw('SELECT 1');
      console.log('Database connection successful');
    } catch (error) {
      console.error('Database connection failed:', error);
      throw error;
    }
    
    // Initialize repositories with db connection
    userRepo = new UserRepository(db);
    postRepo = new PostRepository(db);
  });
  
  after(async function() {
    // Close database connection
    await db.destroy();
    console.log('Database connection closed');
  });
  
  beforeEach(async function() {
    // Start a transaction for test isolation
    trx = await db.transaction();
    
    // Update repositories to use the transaction
    userRepo.setTransaction(trx);
    postRepo.setTransaction(trx);
  });
  
  afterEach(async function() {
    // Rollback the transaction to clean up test data
    await trx.rollback();
    console.log('Transaction rolled back');
  });
  
  // User Repository Tests
  describe('UserRepository', function() {
    describe('create()', function() {
      it('should create a new user', async function() {
        // Arrange
        const userData = {
          email: `test.${uuidv4()}@example.com`,
          name: 'Test User',
          password_hash: 'hashed_password',
          role: 'user'
        };
        
        // Act
        const user = await userRepo.create(userData);
        
        // Assert
        expect(user).to.be.an('object');
        expect(user.id).to.be.a('string');
        expect(user.email).to.equal(userData.email);
        expect(user.name).to.equal(userData.name);
        expect(user.role).to.equal(userData.role);
        expect(user.created_at).to.be.a('date');
        
        // Verify the user exists in the database
        const dbUser = await userRepo.findById(user.id);
        expect(dbUser).to.be.an('object');
        expect(dbUser.id).to.equal(user.id);
      });
      
      it('should enforce unique email constraint', async function() {
        // Arrange
        const email = `duplicate.${uuidv4()}@example.com`;
        
        const userData1 = {
          email,
          name: 'First User',
          password_hash: 'hashed_password',
          role: 'user'
        };
        
        const userData2 = {
          email, // Same email
          name: 'Second User',
          password_hash: 'different_hash',
          role: 'user'
        };
        
        // Act & Assert
        await userRepo.create(userData1); // First creation should succeed
        
        // Second creation should fail with constraint error
        try {
          await userRepo.create(userData2);
          // If we get here, the test failed
          expect.fail('Should have thrown a unique constraint error');
        } catch (error) {
          expect(error.message).to.include('unique constraint');
        }
      });
    });
    
    describe('findByEmail()', function() {
      it('should return a user when email exists', async function() {
        // Arrange
        const email = `find.${uuidv4()}@example.com`;
        const userData = {
          email,
          name: 'Find Me User',
          password_hash: 'hashed_password',
          role: 'user'
        };
        
        // Create a user first
        await userRepo.create(userData);
        
        // Act
        const foundUser = await userRepo.findByEmail(email);
        
        // Assert
        expect(foundUser).to.be.an('object');
        expect(foundUser.email).to.equal(email);
      });
      
      it('should return null when email does not exist', async function() {
        // Arrange
        const nonExistentEmail = `nonexistent.${uuidv4()}@example.com`;
        
        // Act
        const foundUser = await userRepo.findByEmail(nonExistentEmail);
        
        // Assert
        expect(foundUser).to.be.null;
      });
    });
    
    describe('update()', function() {
      it('should update user properties', async function() {
        // Arrange
        const userData = {
          email: `update.${uuidv4()}@example.com`,
          name: 'Original Name',
          password_hash: 'hashed_password',
          role: 'user'
        };
        
        // Create a user first
        const user = await userRepo.create(userData);
        
        const updateData = {
          name: 'Updated Name',
          bio: 'New bio information'
        };
        
        // Act
        const updatedUser = await userRepo.update(user.id, updateData);
        
        // Assert
        expect(updatedUser).to.be.an('object');
        expect(updatedUser.id).to.equal(user.id);
        expect(updatedUser.name).to.equal(updateData.name);
        expect(updatedUser.bio).to.equal(updateData.bio);
        expect(updatedUser.email).to.equal(userData.email); // Unchanged
        
        // Verify the database was updated
        const dbUser = await userRepo.findById(user.id);
        expect(dbUser.name).to.equal(updateData.name);
        expect(dbUser.bio).to.equal(updateData.bio);
      });
      
      it('should not update email if it already exists', async function() {
        // Arrange
        const email1 = `first.${uuidv4()}@example.com`;
        const email2 = `second.${uuidv4()}@example.com`;
        
        // Create two users
        const userData1 = {
          email: email1,
          name: 'First User',
          password_hash: 'hashed_password1',
          role: 'user'
        };
        
        const userData2 = {
          email: email2,
          name: 'Second User',
          password_hash: 'hashed_password2',
          role: 'user'
        };
        
        const user1 = await userRepo.create(userData1);
        const user2 = await userRepo.create(userData2);
        
        // Try to update user1's email to user2's email
        const updateData = {
          email: email2 // This already exists for user2
        };
        
        // Act & Assert
        try {
          await userRepo.update(user1.id, updateData);
          // If we get here, the test failed
          expect.fail('Should have thrown a unique constraint error');
        } catch (error) {
          expect(error.message).to.include('unique constraint');
        }
      });
    });
    
    describe('delete()', function() {
      it('should delete a user', async function() {
        // Arrange
        const userData = {
          email: `delete.${uuidv4()}@example.com`,
          name: 'Delete Me User',
          password_hash: 'hashed_password',
          role: 'user'
        };
        
        // Create a user first
        const user = await userRepo.create(userData);
        
        // Verify user exists
        const foundUser = await userRepo.findById(user.id);
        expect(foundUser).to.be.an('object');
        
        // Act
        const result = await userRepo.delete(user.id);
        
        // Assert
        expect(result).to.be.true;
        
        // Verify user no longer exists
        const deletedUser = await userRepo.findById(user.id);
        expect(deletedUser).to.be.null;
      });
      
      it('should return false when deleting non-existent user', async function() {
        // Arrange
        const nonExistentId = uuidv4();
        
        // Act
        const result = await userRepo.delete(nonExistentId);
        
        // Assert
        expect(result).to.be.false;
      });
    });
  });
  
  // Post Repository Tests
  describe('PostRepository', function() {
    // We'll need to create a user for these tests
    let testUser;
    
    beforeEach(async function() {
      // Create a test user for post-related tests
      const userData = {
        email: `post-tests.${uuidv4()}@example.com`,
        name: 'Post Test User',
        password_hash: 'hashed_password',
        role: 'user'
      };
      
      testUser = await userRepo.create(userData);
    });
    
    describe('create()', function() {
      it('should create a new post', async function() {
        // Arrange
        const postData = {
          title: 'Test Post',
          content: 'This is a test post content',
          user_id: testUser.id
        };
        
        // Act
        const post = await postRepo.create(postData);
        
        // Assert
        expect(post).to.be.an('object');
        expect(post.id).to.be.a('string');
        expect(post.title).to.equal(postData.title);
        expect(post.content).to.equal(postData.content);
        expect(post.user_id).to.equal(testUser.id);
        expect(post.created_at).to.be.a('date');
        
        // Verify the post exists in the database
        const dbPost = await postRepo.findById(post.id);
        expect(dbPost).to.be.an('object');
        expect(dbPost.id).to.equal(post.id);
      });
      
      it('should enforce foreign key constraint on user_id', async function() {
        // Arrange
        const nonExistentUserId = uuidv4();
        
        const postData = {
          title: 'Invalid Post',
          content: 'This post should not be created',
          user_id: nonExistentUserId
        };
        
        // Act & Assert
        try {
          await postRepo.create(postData);
          // If we get here, the test failed
          expect.fail('Should have thrown a foreign key constraint error');
        } catch (error) {
          expect(error.message).to.include('foreign key constraint');
        }
      });
    });
    
    describe('findByUserId()', function() {
      it('should return posts for a specific user', async function() {
        // Arrange - Create multiple posts for the test user
        const postData1 = {
          title: 'First Test Post',
          content: 'First test content',
          user_id: testUser.id
        };
        
        const postData2 = {
          title: 'Second Test Post',
          content: 'Second test content',
          user_id: testUser.id
        };
        
        await postRepo.create(postData1);
        await postRepo.create(postData2);
        
        // Act
        const userPosts = await postRepo.findByUserId(testUser.id);
        
        // Assert
        expect(userPosts).to.be.an('array');
        expect(userPosts.length).to.be.at.least(2);
        
        // Verify all posts belong to the test user
        userPosts.forEach(post => {
          expect(post.user_id).to.equal(testUser.id);
        });
      });
      
      it('should return empty array for user with no posts', async function() {
        // Arrange - Create a user with no posts
        const emptyUser = await userRepo.create({
          email: `empty.${uuidv4()}@example.com`,
          name: 'Empty User',
          password_hash: 'hashed_password',
          role: 'user'
        });
        
        // Act
        const userPosts = await postRepo.findByUserId(emptyUser.id);
        
        // Assert
        expect(userPosts).to.be.an('array');
        expect(userPosts).to.be.empty;
      });
    });
    
    describe('update()', function() {
      it('should update post properties', async function() {
        // Arrange
        const postData = {
          title: 'Original Title',
          content: 'Original content',
          user_id: testUser.id
        };
        
        // Create a post first
        const post = await postRepo.create(postData);
        
        const updateData = {
          title: 'Updated Title',
          content: 'Updated content'
        };
        
        // Act
        const updatedPost = await postRepo.update(post.id, updateData);
        
        // Assert
        expect(updatedPost).to.be.an('object');
        expect(updatedPost.id).to.equal(post.id);
        expect(updatedPost.title).to.equal(updateData.title);
        expect(updatedPost.content).to.equal(updateData.content);
        expect(updatedPost.user_id).to.equal(testUser.id); // Unchanged
        
        // Verify the database was updated
        const dbPost = await postRepo.findById(post.id);
        expect(dbPost.title).to.equal(updateData.title);
        expect(dbPost.content).to.equal(updateData.content);
      });
      
      it('should not allow changing user_id to non-existent user', async function() {
        // Arrange
        const postData = {
          title: 'Original Title',
          content: 'Original content',
          user_id: testUser.id
        };
        
        // Create a post first
        const post = await postRepo.create(postData);
        
        const nonExistentUserId = uuidv4();
        const updateData = {
          user_id: nonExistentUserId
        };
        
        // Act & Assert
        try {
          await postRepo.update(post.id, updateData);
          // If we get here, the test failed
          expect.fail('Should have thrown a foreign key constraint error');
        } catch (error) {
          expect(error.message).to.include('foreign key constraint');
        }
      });
    });
    
    describe('delete()', function() {
      it('should delete a post', async function() {
        // Arrange
        const postData = {
          title: 'Delete Me Post',
          content: 'This post will be deleted',
          user_id: testUser.id
        };
        
        // Create a post first
        const post = await postRepo.create(postData);
        
        // Verify post exists
        const foundPost = await postRepo.findById(post.id);
        expect(foundPost).to.be.an('object');
        
        // Act
        const result = await postRepo.delete(post.id);
        
        // Assert
        expect(result).to.be.true;
        
        // Verify post no longer exists
        const deletedPost = await postRepo.findById(post.id);
        expect(deletedPost).to.be.null;
      });
      
      it('should return false when deleting non-existent post', async function() {
        // Arrange
        const nonExistentId = uuidv4();
        
        // Act
        const result = await postRepo.delete(nonExistentId);
        
        // Assert
        expect(result).to.be.false;
      });
      
      it('should cascade delete all user posts when user is deleted', async function() {
        // Arrange - Create multiple posts for the test user
        const postData1 = {
          title: 'Cascade Test Post 1',
          content: 'First cascade test content',
          user_id: testUser.id
        };
        
        const postData2 = {
          title: 'Cascade Test Post 2',
          content: 'Second cascade test content',
          user_id: testUser.id
        };
        
        const post1 = await postRepo.create(postData1);
        const post2 = await postRepo.create(postData2);
        
        // Verify posts exist
        expect(await postRepo.findById(post1.id)).to.be.an('object');
        expect(await postRepo.findById(post2.id)).to.be.an('object');
        
        // Act - Delete the user
        await userRepo.delete(testUser.id);
        
        // Assert - Posts should also be deleted (cascade)
        expect(await postRepo.findById(post1.id)).to.be.null;
        expect(await postRepo.findById(post2.id)).to.be.null;
      });
    });
    
    describe('Advanced Queries', function() {
      it('should find posts with pagination', async function() {
        // Arrange - Create multiple posts
        const posts = [];
        for (let i = 0; i < 20; i++) {
          const post = await postRepo.create({
            title: `Pagination Post ${i}`,
            content: `Content for pagination test ${i}`,
            user_id: testUser.id
          });
          posts.push(post);
        }
        
        // Act - Get first page (limit 10)
        const page1 = await postRepo.findWithPagination({ page: 1, pageSize: 10 });
        
        // Get second page (limit 10)
        const page2 = await postRepo.findWithPagination({ page: 2, pageSize: 10 });
        
        // Assert
        expect(page1.data).to.be.an('array');
        expect(page1.data.length).to.equal(10);
        expect(page1.total).to.be.at.least(20);
        expect(page1.page).to.equal(1);
        
        expect(page2.data).to.be.an('array');
        expect(page2.data.length).to.equal(10);
        expect(page2.page).to.equal(2);
        
        // Verify pages contain different posts
        const page1Ids = page1.data.map(p => p.id);
        const page2Ids = page2.data.map(p => p.id);
        const intersection = page1Ids.filter(id => page2Ids.includes(id));
        expect(intersection).to.be.empty;
      });
      
      it('should search posts by title and content', async function() {
        // Arrange - Create posts with specific keywords
        await postRepo.create({
          title: 'Apple Recipe',
          content: 'How to make apple pie',
          user_id: testUser.id
        });
        
        await postRepo.create({
          title: 'Orange Juice Benefits',
          content: 'Why orange juice is good for you',
          user_id: testUser.id
        });
        
        await postRepo.create({
          title: 'Comparing Fruits',
          content: 'Apples and oranges are both good fruits',
          user_id: testUser.id
        });
        
        // Act - Search for posts with 'apple'
        const appleResults = await postRepo.search('apple');
        
        // Search for posts with 'orange'
        const orangeResults = await postRepo.search('orange');
        
        // Search for posts with 'fruit'
        const fruitResults = await postRepo.search('fruit');
        
        // Assert
        expect(appleResults).to.be.an('array');
        expect(appleResults.length).to.be.at.least(2); // Both 'Apple Recipe' and 'Comparing Fruits'
        
        expect(orangeResults).to.be.an('array');
        expect(orangeResults.length).to.be.at.least(2); // Both 'Orange Juice' and 'Comparing Fruits'
        
        expect(fruitResults).to.be.an('array');
        expect(fruitResults.length).to.be.at.least(1); // At least 'Comparing Fruits'
        
        // Verify the search results contain the expected posts
        const appleTitles = appleResults.map(p => p.title);
        expect(appleTitles).to.include('Apple Recipe');
        expect(appleTitles).to.include('Comparing Fruits');
        
        const orangeTitles = orangeResults.map(p => p.title);
        expect(orangeTitles).to.include('Orange Juice Benefits');
        expect(orangeTitles).to.include('Comparing Fruits');
      });
    });
  });
  
  // Test Database Schema
  describe('Database Schema', function() {
    it('should have required tables', async function() {
      // Act
      const tables = await trx.raw(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      
      // Get table names from the result
      const tableNames = tables.rows.map(row => row.table_name);
      
      // Assert
      expect(tableNames).to.include('users');
      expect(tableNames).to.include('posts');
    });
    
    it('should have required columns in users table', async function() {
      // Act
      const columns = await trx.raw(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'users'
      `);
      
      // Create a map of column names to data types
      const columnMap = columns.rows.reduce((map, col) => {
        map[col.column_name] = col.data_type;
        return map;
      }, {});
      
      // Assert
      expect(columnMap).to.have.property('id');
      expect(columnMap).to.have.property('email');
      expect(columnMap).to.have.property('name');
      expect(columnMap).to.have.property('password_hash');
      expect(columnMap).to.have.property('role');
      expect(columnMap).to.have.property('created_at');
      
      // Verify data types
      expect(columnMap.email).to.equal('character varying');
      expect(columnMap.created_at).to.include('timestamp');
    });
    
    it('should have required foreign keys', async function() {
      // Act
      const foreignKeys = await trx.raw(`
        SELECT
          tc.table_name, 
          kcu.column_name, 
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name 
        FROM 
          information_schema.table_constraints AS tc 
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
          JOIN information_schema.constraint_column_usage AS ccu 
            ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
      `);
      
      // Find the foreign key from posts to users
      const postUserFk = foreignKeys.rows.find(
        fk => fk.table_name === 'posts' && 
             fk.column_name === 'user_id' && 
             fk.foreign_table_name === 'users'
      );
      
      // Assert
      expect(postUserFk).to.be.an('object');
      expect(postUserFk.foreign_column_name).to.equal('id');
    });
  });
});
