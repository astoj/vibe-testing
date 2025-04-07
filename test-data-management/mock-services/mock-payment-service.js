/**
 * Mock Payment Service
 * 
 * This module provides a mock implementation of a payment service for testing.
 * It simulates payment processing with configurable delays and error conditions.
 */

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

// Default configuration
const DEFAULT_CONFIG = {
  port: 3030,
  delay: {
    min: 200,
    max: 1000
  },
  errorRate: 0.05, // 5% of requests will fail randomly
  declineRate: 0.1, // 10% of payments will be declined
  availablePaymentMethods: ['credit_card', 'paypal', 'apple_pay', 'google_pay'],
  testCards: {
    success: '4111111111111111',
    decline: '4000000000000002',
    error: '4000000000000069',
    cvvError: '4000000000000127',
    expiredCard: '4000000000000069',
    insufficientFunds: '4000000000009995',
    invalidCard: '1234567890123456'
  }
};

// Payment transaction storage
const transactions = new Map();

class MockPaymentService {
  /**
   * Constructor
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.app = express();
    this.setupServer();
  }
  
  /**
   * Configure the Express server
   */
  setupServer() {
    this.app.use(cors());
    this.app.use(bodyParser.json());
    
    // Add artificial delay to all requests to simulate network latency
    this.app.use((req, res, next) => {
      const delay = Math.floor(
        Math.random() * (this.config.delay.max - this.config.delay.min) + this.config.delay.min
      );
      
      setTimeout(next, delay);
    });
    
    // Routes
    this.app.get('/health', (req, res) => {
      res.json({ status: 'UP', service: 'mock-payment-service' });
    });
    
    this.app.get('/api/payment-methods', (req, res) => {
      res.json({ 
        paymentMethods: this.config.availablePaymentMethods,
        preferences: {
          defaultMethod: 'credit_card'
        }
      });
    });
    
    this.app.post('/api/payments', this.processPayment.bind(this));
    
    this.app.get('/api/payments/:id', this.getPayment.bind(this));
    
    this.app.post('/api/payments/:id/refund', this.refundPayment.bind(this));
    
    // Error handling middleware
    this.app.use((err, req, res, next) => {
      console.error('Server error:', err);
      res.status(500).json({
        success: false,
        error: {
          code: 'server_error',
          message: 'An unexpected error occurred'
        }
      });
    });
  }
  
  /**
   * Start the server
   * @returns {Promise} Promise that resolves when server starts
   */
  start() {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.config.port, () => {
        console.log(`Mock Payment Service running on port ${this.config.port}`);
        resolve(this);
      });
      
      this.server.on('error', (err) => {
        reject(err);
      });
    });
  }
  
  /**
   * Stop the server
   * @returns {Promise} Promise that resolves when server stops
   */
  stop() {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }
      
      this.server.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        console.log('Mock Payment Service stopped');
        resolve();
      });
    });
  }
  
  /**
   * Process a payment request
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  processPayment(req, res) {
    // Validate required fields
    const { paymentMethod, amount, currency, cardDetails, billingInfo } = req.body;
    
    if (!paymentMethod || !amount || !currency) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'invalid_request',
          message: 'Missing required fields: paymentMethod, amount, and currency are required'
        }
      });
    }
    
    // Validate payment method
    if (!this.config.availablePaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'invalid_payment_method',
          message: `Invalid payment method. Supported methods: ${this.config.availablePaymentMethods.join(', ')}`
        }
      });
    }
    
    // Check for random error condition (for testing resilience)
    if (Math.random() < this.config.errorRate) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'refund_processing_error',
          message: 'An error occurred while processing the refund. Please try again.'
        }
      });
    }
    
    // Update transaction status
    transaction.status = 'refunded';
    transaction.refundedAt = new Date().toISOString();
    transaction.refundAmount = req.body.amount || transaction.amount; // Allow partial refunds
    transaction.refundReason = req.body.reason || 'customer_request';
    
    // Store updated transaction
    transactions.set(transactionId, transaction);
    
    // Return successful response
    res.json({
      success: true,
      data: {
        transactionId: transaction.id,
        status: 'refunded',
        refundAmount: transaction.refundAmount,
        refundedAt: transaction.refundedAt,
        reason: transaction.refundReason
      }
    });
  }
  
  /**
   * Get a list of test credit card numbers
   * @returns {Object} Object containing test card numbers
   */
  getTestCards() {
    return this.config.testCards;
  }
  
  /**
   * Reset all stored transactions (for test cleanup)
   */
  resetTransactions() {
    transactions.clear();
    console.log('All transactions have been cleared');
  }
}

/**
 * Create and start the mock payment service with default config
 * @returns {Promise} Promise that resolves to the running service
 */
function createDefaultService() {
  const service = new MockPaymentService();
  return service.start();
}

// Auto-start if run directly
if (require.main === module) {
  createDefaultService()
    .then(service => {
      console.log('Mock Payment Service started with default configuration');
      console.log('Test cards:', JSON.stringify(service.getTestCards(), null, 2));
      
      // Handle graceful shutdown
      process.on('SIGINT', async () => {
        console.log('Shutting down Mock Payment Service...');
        await service.stop();
        process.exit(0);
      });
    })
    .catch(err => {
      console.error('Failed to start Mock Payment Service:', err);
      process.exit(1);
    });
}

module.exports = {
  MockPaymentService,
  createDefaultService
};
 condition (for testing resilience)
    if (Math.random() < this.config.errorRate) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'processing_error',
          message: 'An error occurred while processing the payment. Please try again.'
        }
      });
    }
    
    // Handle credit card payments with test cards
    if (paymentMethod === 'credit_card') {
      if (!cardDetails || !cardDetails.number) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'invalid_card_details',
            message: 'Card details are required for credit card payments'
          }
        });
      }
      
      // Validate according to test card numbers
      const cardNumber = cardDetails.number.replace(/\s+/g, '');
      
      if (cardNumber === this.config.testCards.decline) {
        return res.status(402).json({
          success: false,
          error: {
            code: 'card_declined',
            message: 'The card was declined. Please try another payment method.'
          }
        });
      }
      
      if (cardNumber === this.config.testCards.error) {
        return res.status(500).json({
          success: false,
          error: {
            code: 'processing_error',
            message: 'An error occurred while processing the card. Please try again.'
          }
        });
      }
      
      if (cardNumber === this.config.testCards.cvvError) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'invalid_cvv',
            message: 'The CVV code is invalid. Please check and try again.'
          }
        });
      }
      
      if (cardNumber === this.config.testCards.expiredCard) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'expired_card',
            message: 'The card has expired. Please use a different card.'
          }
        });
      }
      
      if (cardNumber === this.config.testCards.insufficientFunds) {
        return res.status(402).json({
          success: false,
          error: {
            code: 'insufficient_funds',
            message: 'The card has insufficient funds. Please use a different card.'
          }
        });
      }
      
      if (cardNumber === this.config.testCards.invalidCard) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'invalid_card',
            message: 'The card number is invalid. Please check and try again.'
          }
        });
      }
    }
    
    // Randomly decline payments (for testing error handling)
    if (Math.random() < this.config.declineRate && cardDetails?.number !== this.config.testCards.success) {
      return res.status(402).json({
        success: false,
        error: {
          code: 'payment_declined',
          message: 'The payment was declined. Please try another payment method.'
        }
      });
    }
    
    // Create successful payment transaction
    const transaction = {
      id: uuidv4(),
      paymentMethod,
      amount,
      currency,
      status: 'succeeded',
      createdAt: new Date().toISOString(),
      metadata: req.body.metadata || {},
      billingInfo: billingInfo || {}
    };
    
    // Store transaction
    transactions.set(transaction.id, transaction);
    
    // Return successful response
    res.status(201).json({
      success: true,
      data: {
        transactionId: transaction.id,
        status: transaction.status,
        amount,
        currency,
        createdAt: transaction.createdAt
      }
    });
  }
  
  /**
   * Get payment details
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  getPayment(req, res) {
    const transactionId = req.params.id;
    
    if (!transactions.has(transactionId)) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'transaction_not_found',
          message: 'Transaction not found'
        }
      });
    }
    
    const transaction = transactions.get(transactionId);
    
    res.json({
      success: true,
      data: {
        transactionId: transaction.id,
        paymentMethod: transaction.paymentMethod,
        amount: transaction.amount,
        currency: transaction.currency,
        status: transaction.status,
        createdAt: transaction.createdAt,
        metadata: transaction.metadata
      }
    });
  }
  
  /**
   * Refund a payment
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  refundPayment(req, res) {
    const transactionId = req.params.id;
    
    if (!transactions.has(transactionId)) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'transaction_not_found',
          message: 'Transaction not found'
        }
      });
    }
    
    const transaction = transactions.get(transactionId);
    
    // Can't refund an already refunded transaction
    if (transaction.status === 'refunded') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'already_refunded',
          message: 'This transaction has already been refunded'
        }
      });
    }
    
    // Check for random error