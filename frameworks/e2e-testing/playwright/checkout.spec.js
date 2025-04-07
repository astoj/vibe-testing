/**
 * Checkout Flow End-to-End Tests
 * 
 * This file demonstrates how to test an e-commerce checkout flow using Playwright.
 * It follows best practices like Page Object Model, test isolation, and visual testing.
 */

// Import Playwright test utilities
const { test, expect } = require('@playwright/test');

// Import Page Objects
const HomePage = require('../pages/HomePage');
const ProductPage = require('../pages/ProductPage');
const CartPage = require('../pages/CartPage');
const CheckoutPage = require('../pages/CheckoutPage');
const OrderConfirmationPage = require('../pages/OrderConfirmationPage');

// Import test data
const { testUsers, testProducts, testPaymentMethods } = require('../fixtures/checkout-data');

test.describe('Checkout Flow', () => {
  // Use a new browser context for each test for isolation
  test.beforeEach(async ({ page, context }) => {
    // Set up user authentication
    // Store authentication state to avoid logging in for each test
    const user = testUsers.standard;
    
    // Go to login page
    await page.goto('/login');
    
    // Fill in login form
    await page.fill('#email', user.email);
    await page.fill('#password', user.password);
    await page.click('#login-button');
    
    // Wait for successful login
    await page.waitForURL('**/account');
    
    // Store authentication state
    await context.storageState({ path: './auth-state.json' });
  });
  
  test('should complete checkout with standard shipping', async ({ page }) => {
    // Initialize page objects
    const homePage = new HomePage(page);
    const productPage = new ProductPage(page);
    const cartPage = new CartPage(page);
    const checkoutPage = new CheckoutPage(page);
    const orderConfirmationPage = new OrderConfirmationPage(page);
    
    // 1. Go to homepage and search for a product
    await homePage.goto();
    await homePage.searchProduct(testProducts.inStock.name);
    
    // 2. Go to product page and add to cart
    await productPage.waitForLoaded();
    await expect(page).toHaveTitle(new RegExp(testProducts.inStock.name));
    
    // Verify product details
    await expect(productPage.productTitle).toContainText(testProducts.inStock.name);
    await expect(productPage.productPrice).toContainText(testProducts.inStock.price.toString());
    await expect(productPage.addToCartButton).toBeEnabled();
    
    // Add to cart
    await productPage.selectSize(testProducts.inStock.size);
    await productPage.selectColor(testProducts.inStock.color);
    await productPage.setQuantity(1);
    await productPage.addToCart();
    
    // Verify cart notification
    await expect(productPage.cartNotification).toBeVisible();
    
    // 3. Go to cart
    await productPage.goToCart();
    await cartPage.waitForLoaded();
    
    // Verify cart contents
    const cartItems = await cartPage.getCartItems();
    expect(cartItems.length).toBe(1);
    
    const cartItem = cartItems[0];
    await expect(cartItem.title).toContainText(testProducts.inStock.name);
    await expect(cartItem.price).toContainText(testProducts.inStock.price.toString());
    
    // Verify cart summary
    await expect(cartPage.subtotal).toContainText(testProducts.inStock.price.toString());
    
    // 4. Proceed to checkout
    await cartPage.proceedToCheckout();
    await checkoutPage.waitForLoaded();
    
    // 5. Fill in shipping information
    await checkoutPage.fillShippingAddress({
      firstName: 'Test',
      lastName: 'User',
      addressLine1: '123 Test St',
      city: 'Test City',
      state: 'CA',
      zipCode: '90210',
      country: 'United States',
      phone: '123-456-7890'
    });
    
    // 6. Select standard shipping method
    await checkoutPage.selectShippingMethod('standard');
    
    // 7. Continue to payment
    await checkoutPage.continueToPayment();
    
    // 8. Fill in payment information
    await checkoutPage.fillPaymentInformation({
      cardNumber: testPaymentMethods.creditCard.number,
      nameOnCard: testPaymentMethods.creditCard.name,
      expiryDate: testPaymentMethods.creditCard.expiry,
      cvv: testPaymentMethods.creditCard.cvv
    });
    
    // Take a screenshot before placing order (for visual regression testing)
    await page.screenshot({ path: 'test-results/checkout-review.png' });
    
    // 9. Place order
    await checkoutPage.placeOrder();
    
    // 10. Verify order confirmation
    await orderConfirmationPage.waitForLoaded();
    
    // Check confirmation message
    await expect(orderConfirmationPage.confirmationMessage).toBeVisible();
    await expect(orderConfirmationPage.confirmationMessage).toContainText('Thank you for your order');
    
    // Verify order number format
    const orderNumber = await orderConfirmationPage.getOrderNumber();
    expect(orderNumber).toMatch(/^ORD-\d{6}$/);
    
    // Verify order summary
    await expect(orderConfirmationPage.orderTotal).toContainText(testProducts.inStock.price.toString());
    
    // Store order number for potential future use
    console.log(`Order created: ${orderNumber}`);
  });
  
  test('should handle out-of-stock products correctly', async ({ page }) => {
    // Initialize page objects
    const homePage = new HomePage(page);
    const productPage = new ProductPage(page);
    
    // 1. Go to homepage and navigate to an out-of-stock product
    await homePage.goto();
    await homePage.searchProduct(testProducts.outOfStock.name);
    
    // 2. Go to product page
    await productPage.waitForLoaded();
    
    // 3. Verify out-of-stock status
    await expect(productPage.outOfStockLabel).toBeVisible();
    await expect(productPage.addToCartButton).toBeDisabled();
    
    // 4. Verify notify button is available
    await expect(productPage.notifyMeButton).toBeVisible();
    await expect(productPage.notifyMeButton).toBeEnabled();
    
    // 5. Click notify me button
    await productPage.notifyMeButton.click();
    
    // 6. Verify notification form appears
    await expect(productPage.notificationEmailInput).toBeVisible();
    
    // 7. Submit notification request
    await productPage.notificationEmailInput.fill(testUsers.standard.email);
    await productPage.submitNotificationRequest();
    
    // 8. Verify confirmation message
    await expect(productPage.notificationConfirmation).toBeVisible();
    await expect(productPage.notificationConfirmation).toContainText('We will notify you');
  });
  
  test('should validate required fields during checkout', async ({ page }) => {
    // Initialize page objects
    const homePage = new HomePage(page);
    const productPage = new ProductPage(page);
    const cartPage = new CartPage(page);
    const checkoutPage = new CheckoutPage(page);
    
    // 1. Set up cart with product
    await homePage.goto();
    await homePage.searchProduct(testProducts.inStock.name);
    await productPage.waitForLoaded();
    await productPage.selectSize(testProducts.inStock.size);
    await productPage.selectColor(testProducts.inStock.color);
    await productPage.addToCart();
    await productPage.goToCart();
    await cartPage.proceedToCheckout();
    await checkoutPage.waitForLoaded();
    
    // 2. Try to continue without filling in shipping information
    await checkoutPage.continueToPayment();
    
    // 3. Verify validation messages
    await expect(checkoutPage.firstNameError).toBeVisible();
    await expect(checkoutPage.lastNameError).toBeVisible();
    await expect(checkoutPage.addressLine1Error).toBeVisible();
    await expect(checkoutPage.cityError).toBeVisible();
    await expect(checkoutPage.zipCodeError).toBeVisible();
    
    // 4. Fill in only some fields and try again
    await checkoutPage.fillShippingAddress({
      firstName: 'Test',
      lastName: 'User',
      // Deliberately omit address
    });
    
    await checkoutPage.continueToPayment();
    
    // 5. Verify remaining validation messages
    await expect(checkoutPage.firstNameError).not.toBeVisible();
    await expect(checkoutPage.lastNameError).not.toBeVisible();
    await expect(checkoutPage.addressLine1Error).toBeVisible();
    await expect(checkoutPage.cityError).toBeVisible();
    await expect(checkoutPage.zipCodeError).toBeVisible();
  });
  
  test('should calculate tax and shipping correctly', async ({ page }) => {
    // Initialize page objects
    const homePage = new HomePage(page);
    const productPage = new ProductPage(page);
    const cartPage = new CartPage(page);
    const checkoutPage = new CheckoutPage(page);
    
    // 1. Add product to cart
    await homePage.goto();
    await homePage.searchProduct(testProducts.inStock.name);
    await productPage.waitForLoaded();
    await productPage.selectSize(testProducts.inStock.size);
    await productPage.selectColor(testProducts.inStock.color);
    await productPage.addToCart();
    await productPage.goToCart();
    
    // 2. Record cart subtotal
    await cartPage.waitForLoaded();
    const subtotalText = await cartPage.subtotal.textContent();
    const subtotal = parseFloat(subtotalText.replace(/[^0-9.]/g, ''));
    
    // 3. Proceed to checkout
    await cartPage.proceedToCheckout();
    await checkoutPage.waitForLoaded();
    
    // 4. Fill shipping address with tax-applicable state
    await checkoutPage.fillShippingAddress({
      firstName: 'Test',
      lastName: 'User',
      addressLine1: '123 Test St',
      city: 'Test City',
      state: 'CA', // California has sales tax
      zipCode: '90210',
      country: 'United States',
      phone: '123-456-7890'
    });
    
    // 5. Verify tax appears
    await expect(checkoutPage.taxAmount).toBeVisible();
    const taxText = await checkoutPage.taxAmount.textContent();
    const tax = parseFloat(taxText.replace(/[^0-9.]/g, ''));
    expect(tax).toBeGreaterThan(0);
    
    // 6. Select different shipping methods and verify changes
    // Standard shipping
    await checkoutPage.selectShippingMethod('standard');
    const standardShippingText = await checkoutPage.shippingAmount.textContent();
    const standardShipping = parseFloat(standardShippingText.replace(/[^0-9.]/g, ''));
    
    // Express shipping (should be more expensive)
    await checkoutPage.selectShippingMethod('express');
    const expressShippingText = await checkoutPage.shippingAmount.textContent();
    const expressShipping = parseFloat(expressShippingText.replace(/[^0-9.]/g, ''));
    
    // Verify express is more expensive than standard
    expect(expressShipping).toBeGreaterThan(standardShipping);
    
    // 7. Verify order total calculation is correct
    const orderTotalText = await checkoutPage.orderTotal.textContent();
    const orderTotal = parseFloat(orderTotalText.replace(/[^0-9.]/g, ''));
    
    // Calculate expected total (subtotal + tax + express shipping)
    const expectedTotal = subtotal + tax + expressShipping;
    
    // Compare with a small tolerance for floating point precision
    expect(Math.abs(orderTotal - expectedTotal)).toBeLessThan(0.01);
  });
  
  test('should allow using saved payment methods', async ({ page }) => {
    // Initialize page objects
    const homePage = new HomePage(page);
    const productPage = new ProductPage(page);
    const cartPage = new CartPage(page);
    const checkoutPage = new CheckoutPage(page);
    
    // 1. Add product to cart and go to checkout
    await homePage.goto();
    await homePage.searchProduct(testProducts.inStock.name);
    await productPage.waitForLoaded();
    await productPage.selectSize(testProducts.inStock.size);
    await productPage.selectColor(testProducts.inStock.color);
    await productPage.addToCart();
    await productPage.goToCart();
    await cartPage.proceedToCheckout();
    
    // 2. Fill shipping details
    await checkoutPage.waitForLoaded();
    await checkoutPage.fillShippingAddress({
      firstName: 'Test',
      lastName: 'User',
      addressLine1: '123 Test St',
      city: 'Test City',
      state: 'CA',
      zipCode: '90210',
      country: 'United States',
      phone: '123-456-7890'
    });
    await checkoutPage.selectShippingMethod('standard');
    await checkoutPage.continueToPayment();
    
    // 3. Check if there are saved payment methods
    const hasSavedPayments = await checkoutPage.hasSavedPaymentMethods();
    
    if (hasSavedPayments) {
      // 4. Select a saved payment method
      await checkoutPage.selectSavedPaymentMethod(0); // First saved payment
      
      // 5. Verify payment details are filled in automatically
      await expect(checkoutPage.paymentMethodLabel).toContainText(/ending in \d{4}/);
      
      // 6. Verify no need to enter CVV again (or that CVV field is still required)
      if (await checkoutPage.isCvvRequired()) {
        await checkoutPage.fillCvv(testPaymentMethods.creditCard.cvv);
      }
    } else {
      // If no saved payments, add a new one and save it
      await checkoutPage.fillPaymentInformation({
        cardNumber: testPaymentMethods.creditCard.number,
        nameOnCard: testPaymentMethods.creditCard.name,
        expiryDate: testPaymentMethods.creditCard.expiry,
        cvv: testPaymentMethods.creditCard.cvv,
        saveForFuture: true // Save for future use
      });
    }
    
    // 7. Place order
    await checkoutPage.placeOrder();
    
    // 8. Verify successful order
    const orderConfirmationPage = new OrderConfirmationPage(page);
    await orderConfirmationPage.waitForLoaded();
    await expect(orderConfirmationPage.confirmationMessage).toBeVisible();
  });
  
  test('should handle promo codes correctly', async ({ page }) => {
    // Initialize page objects
    const homePage = new HomePage(page);
    const productPage = new ProductPage(page);
    const cartPage = new CartPage(page);
    
    // 1. Add product to cart
    await homePage.goto();
    await homePage.searchProduct(testProducts.inStock.name);
    await productPage.waitForLoaded();
    await productPage.selectSize(testProducts.inStock.size);
    await productPage.selectColor(testProducts.inStock.color);
    await productPage.addToCart();
    await productPage.goToCart();
    
    // 2. Record original price
    await cartPage.waitForLoaded();
    const originalSubtotalText = await cartPage.subtotal.textContent();
    const originalSubtotal = parseFloat(originalSubtotalText.replace(/[^0-9.]/g, ''));
    
    // 3. Apply valid promo code
    await cartPage.enterPromoCode('VALID10');
    await cartPage.applyPromoCode();
    
    // 4. Verify discount is applied
    await expect(cartPage.discountAmount).toBeVisible();
    const discountText = await cartPage.discountAmount.textContent();
    const discount = parseFloat(discountText.replace(/[^0-9.]/g, ''));
    expect(discount).toBeGreaterThan(0);
    
    // Verify new total is correct (should be original - discount)
    const newTotalText = await cartPage.subtotal.textContent();
    const newTotal = parseFloat(newTotalText.replace(/[^0-9.]/g, ''));
    expect(Math.abs((originalSubtotal - discount) - newTotal)).toBeLessThan(0.01);
    
    // 5. Try invalid promo code
    await cartPage.removePromoCode(); // Remove existing code
    await cartPage.enterPromoCode('INVALID');
    await cartPage.applyPromoCode();
    
    // 6. Verify error message
    await expect(cartPage.promoCodeError).toBeVisible();
    await expect(cartPage.promoCodeError).toContainText('Invalid promo code');
    
    // 7. Verify original price is restored
    const restoredTotalText = await cartPage.subtotal.textContent();
    const restoredTotal = parseFloat(restoredTotalText.replace(/[^0-9.]/g, ''));
    expect(Math.abs(restoredTotal - originalSubtotal)).toBeLessThan(0.01);
  });
  
  test('should handle different payment methods', async ({ page }) => {
    // Initialize page objects
    const homePage = new HomePage(page);
    const productPage = new ProductPage(page);
    const cartPage = new CartPage(page);
    const checkoutPage = new CheckoutPage(page);
    const orderConfirmationPage = new OrderConfirmationPage(page);
    
    // 1. Add product to cart and go to checkout
    await homePage.goto();
    await homePage.searchProduct(testProducts.inStock.name);
    await productPage.waitForLoaded();
    await productPage.selectSize(testProducts.inStock.size);
    await productPage.selectColor(testProducts.inStock.color);
    await productPage.addToCart();
    await productPage.goToCart();
    await cartPage.proceedToCheckout();
    
    // 2. Fill shipping details
    await checkoutPage.waitForLoaded();
    await checkoutPage.fillShippingAddress({
      firstName: 'Test',
      lastName: 'User',
      addressLine1: '123 Test St',
      city: 'Test City',
      state: 'CA',
      zipCode: '90210',
      country: 'United States',
      phone: '123-456-7890'
    });
    await checkoutPage.selectShippingMethod('standard');
    await checkoutPage.continueToPayment();
    
    // 3. Test PayPal payment method
    if (await checkoutPage.isPaymentMethodAvailable('paypal')) {
      await checkoutPage.selectPaymentMethod('paypal');
      
      // Verify PayPal button is visible
      await expect(checkoutPage.paypalButton).toBeVisible();
      
      // Mock clicking PayPal button and completing external flow
      // (This would normally open a popup or redirect, which we mock for testing)
      await checkoutPage.mockPayPalAuthentication();
      
      // After "returning" from PayPal, verify payment info is set
      await expect(checkoutPage.paymentMethodLabel).toContainText('PayPal');
      
      // Place order with PayPal
      await checkoutPage.placeOrder();
      
      // Verify successful order
      await orderConfirmationPage.waitForLoaded();
      await expect(orderConfirmationPage.confirmationMessage).toBeVisible();
      
      // Record order number for reference
      const orderNumber = await orderConfirmationPage.getOrderNumber();
      console.log(`PayPal order created: ${orderNumber}`);
      
      // Return to homepage for next test
      await homePage.goto();
    } else {
      console.log('PayPal payment method not available, skipping this part of the test');
    }
  });
});

// Mobile/responsive testing
test.describe('Checkout Flow on Mobile', () => {
  // Set viewport to mobile size for all tests in this group
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE size
  
  test.beforeEach(async ({ page, context }) => {
    // Set up user authentication
    const user = testUsers.standard;
    await page.goto('/login');
    await page.fill('#email', user.email);
    await page.fill('#password', user.password);
    await page.click('#login-button');
    await page.waitForURL('**/account');
    await context.storageState({ path: './auth-state-mobile.json' });
  });
  
  test('should complete checkout on mobile', async ({ page }) => {
    // Initialize page objects
    const homePage = new HomePage(page);
    const productPage = new ProductPage(page);
    const cartPage = new CartPage(page);
    const checkoutPage = new CheckoutPage(page);
    const orderConfirmationPage = new OrderConfirmationPage(page);
    
    // 1. Go to homepage and search for product
    await homePage.goto();
    
    // Open mobile menu if needed
    if (await homePage.isMobileMenuNeeded()) {
      await homePage.openMobileMenu();
    }
    
    await homePage.searchProduct(testProducts.inStock.name);
    
    // 2. Add to cart
    await productPage.waitForLoaded();
    await productPage.selectSize(testProducts.inStock.size);
    await productPage.selectColor(testProducts.inStock.color);
    await productPage.addToCart();
    
    // 3. Go to cart and checkout
    await productPage.goToCart();
    await cartPage.waitForLoaded();
    await cartPage.proceedToCheckout();
    
    // 4. Complete checkout
    await checkoutPage.waitForLoaded();
    await checkoutPage.fillShippingAddress({
      firstName: 'Mobile',
      lastName: 'User',
      addressLine1: '123 Mobile St',
      city: 'Mobile City',
      state: 'CA',
      zipCode: '90210',
      country: 'United States',
      phone: '123-456-7890'
    });
    await checkoutPage.selectShippingMethod('standard');
    await checkoutPage.continueToPayment();
    await checkoutPage.fillPaymentInformation({
      cardNumber: testPaymentMethods.creditCard.number,
      nameOnCard: testPaymentMethods.creditCard.name,
      expiryDate: testPaymentMethods.creditCard.expiry,
      cvv: testPaymentMethods.creditCard.cvv
    });
    
    // Take screenshot for visual verification on mobile
    await page.screenshot({ path: 'test-results/mobile-checkout.png' });
    
    await checkoutPage.placeOrder();
    
    // 5. Verify order confirmation
    await orderConfirmationPage.waitForLoaded();
    await expect(orderConfirmationPage.confirmationMessage).toBeVisible();
    
    // Verify all important elements are visible on mobile
    await expect(orderConfirmationPage.orderNumber).toBeVisible();
    await expect(orderConfirmationPage.orderSummary).toBeVisible();
  });
});

// Accessibility testing for checkout
test.describe('Checkout Accessibility', () => {
  test('checkout flow should be accessible', async ({ page }) => {
    // This test requires the @axe-core/playwright package to be installed
    
    // Initialize page objects
    const homePage = new HomePage(page);
    const productPage = new ProductPage(page);
    const cartPage = new CartPage(page);
    const checkoutPage = new CheckoutPage(page);
    
    // Log in and set up cart with product
    await page.goto('/login');
    await page.fill('#email', testUsers.standard.email);
    await page.fill('#password', testUsers.standard.password);
    await page.click('#login-button');
    
    // Add product to cart
    await homePage.goto();
    await homePage.searchProduct(testProducts.inStock.name);
    await productPage.waitForLoaded();
    await productPage.selectSize(testProducts.inStock.size);
    await productPage.selectColor(testProducts.inStock.color);
    await productPage.addToCart();
    await productPage.goToCart();
    
    // Run accessibility test on cart page
    await cartPage.waitForLoaded();
    await cartPage.runAccessibilityAudit('cart-page');
    
    // Go to checkout and test accessibility
    await cartPage.proceedToCheckout();
    await checkoutPage.waitForLoaded();
    
    // Test shipping form accessibility
    await checkoutPage.runAccessibilityAudit('checkout-shipping');
    
    // Fill shipping details and go to payment
    await checkoutPage.fillShippingAddress({
      firstName: 'Test',
      lastName: 'User',
      addressLine1: '123 Test St',
      city: 'Test City',
      state: 'CA',
      zipCode: '90210',
      country: 'United States',
      phone: '123-456-7890'
    });
    await checkoutPage.selectShippingMethod('standard');
    await checkoutPage.continueToPayment();
    
    // Test payment form accessibility
    await checkoutPage.runAccessibilityAudit('checkout-payment');
  });
});
