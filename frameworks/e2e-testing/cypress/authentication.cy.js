/**
 * Authentication End-to-End Tests
 * 
 * These tests verify the complete user authentication flow from the user's perspective,
 * including login, registration, password reset, and logout functionality.
 * 
 * Using Page Object pattern for better maintainability and test structure.
 */

// Import Page Objects
import LoginPage from '../support/pages/LoginPage';
import RegisterPage from '../support/pages/RegisterPage';
import DashboardPage from '../support/pages/DashboardPage';
import PasswordResetPage from '../support/pages/PasswordResetPage';

// Import test data
import { users } from '../fixtures/users.json';

describe('Authentication Flows', () => {
  // Initialize Page Objects
  const loginPage = new LoginPage();
  const registerPage = new RegisterPage();
  const dashboardPage = new DashboardPage();
  const passwordResetPage = new PasswordResetPage();
  
  // Test valid user can login
  it('should allow a valid user to login successfully', () => {
    // Arrange
    const validUser = users.valid;
    
    // Act - Visit login page and submit credentials
    loginPage.visit();
    loginPage.login(validUser.email, validUser.password);
    
    // Assert - User should be redirected to dashboard
    dashboardPage.assertIsVisible();
    dashboardPage.assertUserNameIsDisplayed(validUser.name);
  });
  
  // Test invalid credentials are rejected
  it('should show an error message for invalid credentials', () => {
    // Arrange
    const invalidUser = {
      email: 'wrong@example.com',
      password: 'incorrect'
    };
    
    // Act - Visit login page and submit invalid credentials
    loginPage.visit();
    loginPage.login(invalidUser.email, invalidUser.password);
    
    // Assert - User should see error message
    loginPage.assertErrorMessageIsVisible();
    loginPage.assertErrorMessageContains('Invalid email or password');
  });
  
  // Test user registration
  it('should allow new user registration', () => {
    // Arrange - Generate a unique email to avoid duplicates
    const newUser = {
      name: 'New Test User',
      email: `test.user.${Date.now()}@example.com`,
      password: 'SecurePassword123!'
    };
    
    // Act - Visit registration page and submit form
    registerPage.visit();
    registerPage.fillRegistrationForm(newUser.name, newUser.email, newUser.password);
    registerPage.submitRegistrationForm();
    
    // Assert - User should be redirected to dashboard
    dashboardPage.assertIsVisible();
    dashboardPage.assertUserNameIsDisplayed(newUser.name);
    dashboardPage.assertWelcomeMessageIsDisplayed();
  });
  
  // Test registration validation
  it('should validate registration form fields', () => {
    // Arrange - Invalid data for testing validation
    const invalidData = {
      name: '',  // Empty name
      email: 'not-an-email', // Invalid email format
      password: '123' // Too short password
    };
    
    // Act - Visit registration page and submit invalid form
    registerPage.visit();
    registerPage.fillRegistrationForm(invalidData.name, invalidData.email, invalidData.password);
    registerPage.submitRegistrationForm();
    
    // Assert - Form should show validation errors
    registerPage.assertFormValidationErrors();
    registerPage.assertNameValidationError('Name is required');
    registerPage.assertEmailValidationError('Valid email is required');
    registerPage.assertPasswordValidationError('Password must be at least 8 characters');
  });
  
  // Test password reset flow
  it('should allow user to request password reset', () => {
    // Arrange
    const user = users.valid;
    
    // Act - Visit login page and click forgot password
    loginPage.visit();
    loginPage.clickForgotPassword();
    
    // Verify redirect to password reset page
    passwordResetPage.assertIsVisible();
    
    // Submit email for password reset
    passwordResetPage.submitPasswordResetRequest(user.email);
    
    // Assert confirmation message
    passwordResetPage.assertConfirmationMessageIsDisplayed();
    passwordResetPage.assertConfirmationMessageContains(user.email);
  });
  
  // Test user logout
  it('should allow user to logout', () => {
    // Arrange - First login with valid user
    const validUser = users.valid;
    loginPage.visit();
    loginPage.login(validUser.email, validUser.password);
    dashboardPage.assertIsVisible();
    
    // Act - Click logout
    dashboardPage.logout();
    
    // Assert - User should be redirected to login page
    loginPage.assertIsVisible();
  });
  
  // Test "remember me" functionality
  it('should keep user logged in when "Remember Me" is checked', () => {
    // Arrange
    const validUser = users.valid;
    
    // Act - Login with "Remember Me" checked
    loginPage.visit();
    loginPage.login(validUser.email, validUser.password, true);
    dashboardPage.assertIsVisible();
    
    // Simulate browser restart by reloading
    cy.reload();
    
    // Assert - User should still be logged in
    dashboardPage.assertIsVisible();
    
    // Cleanup - Logout for next tests
    dashboardPage.logout();
  });
  
  // Test session expiration - requires intercepting requests
  it('should handle session expiration gracefully', () => {
    // Arrange - Login first
    const validUser = users.valid;
    loginPage.visit();
    loginPage.login(validUser.email, validUser.password);
    dashboardPage.assertIsVisible();
    
    // Act - Simulate session expiration by intercepting API calls
    cy.intercept('GET', '/api/user/profile', {
      statusCode: 401,
      body: {
        message: 'Session expired'
      }
    }).as('expiredSession');
    
    // Trigger an action that would call the API
    dashboardPage.clickProfileButton();
    
    // Wait for the intercepted request
    cy.wait('@expiredSession');
    
    // Assert - User should be redirected to login page with a message
    loginPage.assertIsVisible();
    loginPage.assertInfoMessageContains('Your session has expired');
  });
});

// Test specific edge cases or security concerns
describe('Authentication Security', () => {
  const loginPage = new LoginPage();
  
  beforeEach(() => {
    // Clear cookies and local storage before each test
    cy.clearCookies();
    cy.clearLocalStorage();
  });
  
  // Test brute force protection
  it('should implement brute force protection', () => {
    // Arrange
    const invalidAttempts = 5; // Assuming 5 failures triggers protection
    const invalidUser = {
      email: 'test@example.com',
      password: 'wrong-password'
    };
    
    // Act - Repeatedly attempt login with invalid credentials
    loginPage.visit();
    
    for (let i = 0; i < invalidAttempts; i++) {
      loginPage.login(invalidUser.email, invalidUser.password);
      loginPage.assertErrorMessageIsVisible();
      
      // If not the last attempt, clear the form for the next attempt
      if (i < invalidAttempts - 1) {
        loginPage.clearForm();
      }
    }
    
    // Try one more time to trigger lockout
    loginPage.clearForm();
    loginPage.login(invalidUser.email, invalidUser.password);
    
    // Assert - Account should be temporarily locked
    loginPage.assertErrorMessageContains('account has been temporarily locked');
    loginPage.assertLoginButtonIsDisabled();
  });
  
  // Test CSRF protection
  it('should include CSRF token in forms', () => {
    // Visit login page and check for CSRF token
    loginPage.visit();
    
    // Check if CSRF token exists in the form
    cy.get('input[name="csrf_token"]').should('exist');
    
    // Ensure the token has a value
    cy.get('input[name="csrf_token"]').should('have.attr', 'value').and('not.be.empty');
  });
  
  // Test password strength requirements
  it('should enforce password strength requirements', () => {
    // Arrange - Visit registration page
    registerPage.visit();
    
    // Act & Assert - Try different password strengths
    
    // Test 1: Too short
    registerPage.fillRegistrationForm('Test User', 'test@example.com', '123');
    registerPage.assertPasswordStrengthIndicator('weak');
    registerPage.assertPasswordValidationError('Password must be at least 8 characters');
    
    // Test 2: Only letters - medium strength
    registerPage.clearForm();
    registerPage.fillRegistrationForm('Test User', 'test@example.com', 'passwordonly');
    registerPage.assertPasswordStrengthIndicator('medium');
    registerPage.assertPasswordValidationError('Password should include numbers and special characters');
    
    // Test 3: Letters and numbers - better
    registerPage.clearForm();
    registerPage.fillRegistrationForm('Test User', 'test@example.com', 'password123');
    registerPage.assertPasswordStrengthIndicator('good');
    
    // Test 4: Strong password with special characters
    registerPage.clearForm();
    registerPage.fillRegistrationForm('Test User', 'test@example.com', 'P@ssw0rd!123');
    registerPage.assertPasswordStrengthIndicator('strong');
    registerPage.assertNoPasswordValidationErrors();
  });
  
  // Test account lockout persistence
  it('should maintain account lockout across sessions', () => {
    // Arrange
    const lockedUser = users.locked;
    
    // Act - Try to login with a locked account
    loginPage.visit();
    loginPage.login(lockedUser.email, lockedUser.password);
    
    // Assert - Account should still be locked
    loginPage.assertErrorMessageContains('account has been locked');
    
    // Clear browser session
    cy.clearCookies();
    cy.clearLocalStorage();
    
    // Try again after clearing session - should still be locked
    loginPage.visit();
    loginPage.login(lockedUser.email, lockedUser.password);
    loginPage.assertErrorMessageContains('account has been locked');
  });
  
  // Test redirect to original destination after login
  it('should redirect to intended page after login', () => {
    // Arrange - Set up a protected page intercept
    cy.intercept('GET', '/dashboard/settings', (req) => {
      // Redirect to login if not authenticated
      req.redirect('/login?redirect=/dashboard/settings');
    }).as('settingsRequest');
    
    // Act - Try to access protected page
    cy.visit('/dashboard/settings');
    
    // Should be redirected to login page
    loginPage.assertIsVisible();
    
    // Login with valid credentials
    const validUser = users.valid;
    loginPage.login(validUser.email, validUser.password);
    
    // Assert - Should be redirected to the originally requested page
    cy.url().should('include', '/dashboard/settings');
  });

  // Test password reset token validation
  it('should validate password reset tokens properly', () => {
    // Arrange - Setup intercepts for invalid and valid token
    cy.intercept('GET', '/reset-password?token=invalid-token', {
      statusCode: 200,
      fixture: 'reset-password-invalid-token.html'
    }).as('invalidToken');
    
    cy.intercept('GET', '/reset-password?token=valid-token', {
      statusCode: 200,
      fixture: 'reset-password-valid-token.html'
    }).as('validToken');
    
    // Act & Assert - Try with invalid token
    cy.visit('/reset-password?token=invalid-token');
    cy.wait('@invalidToken');
    passwordResetPage.assertTokenErrorIsDisplayed();
    passwordResetPage.assertResetFormIsNotVisible();
    
    // Try with valid token
    cy.visit('/reset-password?token=valid-token');
    cy.wait('@validToken');
    passwordResetPage.assertResetFormIsVisible();
    
    // Complete password reset with valid token
    const newPassword = 'NewSecureP@ss123';
    passwordResetPage.submitNewPassword(newPassword, newPassword);
    passwordResetPage.assertSuccessMessageIsDisplayed();
    
    // Should be able to login with new password
    loginPage.visit();
    loginPage.login(users.resetPassword.email, newPassword);
    dashboardPage.assertIsVisible();
  });
});

// Page accessibility tests for authentication-related pages
describe('Authentication Accessibility', () => {
  const loginPage = new LoginPage();
  const registerPage = new RegisterPage();
  const passwordResetPage = new PasswordResetPage();
  
  it('login page should be accessible', () => {
    loginPage.visit();
    cy.injectAxe(); // Inject axe-core for accessibility testing
    cy.checkA11y(); // Run accessibility audit
    
    // Test keyboard navigation
    cy.focused().should('have.attr', 'name', 'email'); // Email should be focused initially
    cy.tab().should('have.attr', 'name', 'password'); // Tab should move to password
    cy.tab().should('have.attr', 'name', 'rememberMe'); // Tab should move to remember me
    cy.tab().should('have.attr', 'type', 'submit'); // Tab should move to submit button
  });
  
  it('registration page should be accessible', () => {
    registerPage.visit();
    cy.injectAxe();
    cy.checkA11y();
    
    // Form labels should be properly associated with inputs
    cy.get('label[for="name"]').should('exist');
    cy.get('label[for="email"]').should('exist');
    cy.get('label[for="password"]').should('exist');
    cy.get('label[for="confirmPassword"]').should('exist');
  });
  
  it('password reset page should be accessible', () => {
    passwordResetPage.visit();
    cy.injectAxe();
    cy.checkA11y();
    
    // Error messages should be associated with form fields
    passwordResetPage.fillInvalidEmail('not-an-email');
    passwordResetPage.submitPasswordResetRequest('not-an-email');
    
    // Error message should be linked to the input with aria-describedby
    cy.get('#email').should('have.attr', 'aria-describedby', 'email-error');
    cy.get('#email-error').should('be.visible');
  });
});

// Mobile responsiveness tests
describe('Authentication on Mobile Devices', () => {
  const loginPage = new LoginPage();
  const registerPage = new RegisterPage();
  
  beforeEach(() => {
    // Set viewport to mobile size
    cy.viewport('iphone-x');
  });
  
  it('login form should be usable on mobile', () => {
    loginPage.visit();
    
    // Form should be properly visible
    loginPage.assertFormIsVisible();
    
    // Fields should be properly sized for mobile
    cy.get('#email').should('have.css', 'width', '100%');
    
    // Test login functionality works on mobile
    const validUser = users.valid;
    loginPage.login(validUser.email, validUser.password);
    dashboardPage.assertIsVisible();
  });
  
  it('registration form should be usable on mobile', () => {
    registerPage.visit();
    
    // Form should be properly visible and not cut off
    registerPage.assertFormIsVisible();
    
    // All fields should be accessible
    cy.get('#name').should('be.visible');
    cy.get('#email').should('be.visible');
    cy.get('#password').should('be.visible');
    cy.get('#confirmPassword').should('be.visible');
    cy.get('button[type="submit"]').should('be.visible');
  });
});

// Social login integration tests
describe('Social Authentication', () => {
  const loginPage = new LoginPage();
  
  beforeEach(() => {
    // Clear cookies and local storage before each test
    cy.clearCookies();
    cy.clearLocalStorage();
  });
  
  // Mock the OAuth providers since we can't actually test against them directly
  it('should have working social login buttons', () => {
    loginPage.visit();
    
    // Verify social login buttons exist
    loginPage.assertGoogleLoginButtonExists();
    loginPage.assertFacebookLoginButtonExists();
    
    // Mock the click event
    cy.window().then((win) => {
      cy.stub(win, 'open').as('windowOpen');
    });
    
    // Click Google login
    loginPage.clickGoogleLogin();
    
    // Verify Google OAuth URL would be opened
    cy.get('@windowOpen').should('be.calledWith', Cypress.sinon.match(/accounts\.google\.com/));
    
    // Click Facebook login
    loginPage.clickFacebookLogin();
    
    // Verify Facebook OAuth URL would be opened
    cy.get('@windowOpen').should('be.calledWith', Cypress.sinon.match(/facebook\.com/));
  });
  
  // Test OAuth callback handling with mock data
  it('should handle OAuth callback correctly', () => {
    // Mock the OAuth callback endpoint
    cy.intercept('GET', '/auth/callback/google*', {
      statusCode: 302,
      headers: {
        'Location': '/dashboard'
      }
    }).as('googleCallback');
    
    // Visit the callback URL that would be redirected to after Google auth
    cy.visit('/auth/callback/google?code=mock_auth_code');
    
    // Wait for our intercepted request
    cy.wait('@googleCallback');
    
    // Should be redirected to dashboard
    cy.url().should('include', '/dashboard');
    dashboardPage.assertIsVisible();
  });
});
