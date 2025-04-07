/**
 * Login Page Object
 * 
 * This class encapsulates all the operations and assertions related to the login page.
 * Using Page Object pattern improves test maintainability by separating page interaction
 * logic from test logic.
 */
class LoginPage {
  /**
   * Selectors used on the login page
   * Centralizing selectors makes it easier to update them if the UI changes
   */
  selectors = {
    emailInput: '#email',
    passwordInput: '#password',
    rememberMeCheckbox: '#rememberMe',
    loginButton: 'button[type="submit"]',
    errorMessage: '.error-message',
    infoMessage: '.info-message',
    forgotPasswordLink: 'a[href*="forgot-password"]',
    registerLink: 'a[href*="register"]',
    form: 'form',
    googleLoginButton: '.social-login-google',
    facebookLoginButton: '.social-login-facebook',
    csrfToken: 'input[name="csrf_token"]'
  };

  /**
   * Navigate to the login page
   */
  visit() {
    cy.visit('/login');
    this.assertIsVisible(); // Verify the page loaded correctly
    return this;
  }

  /**
   * Fill in login credentials and submit the form
   * @param {string} email - User's email
   * @param {string} password - User's password
   * @param {boolean} rememberMe - Whether to check "Remember Me" box
   */
  login(email, password, rememberMe = false) {
    // Fill in the email field
    cy.get(this.selectors.emailInput)
      .clear()
      .type(email);
    
    // Fill in the password field
    cy.get(this.selectors.passwordInput)
      .clear()
      .type(password);
    
    // Check "Remember Me" if requested
    if (rememberMe) {
      cy.get(this.selectors.rememberMeCheckbox)
        .check();
    }
    
    // Submit the form
    cy.get(this.selectors.loginButton)
      .click();
    
    // Return this for method chaining
    return this;
  }

  /**
   * Clear the login form fields
   */
  clearForm() {
    cy.get(this.selectors.emailInput).clear();
    cy.get(this.selectors.passwordInput).clear();
    cy.get(this.selectors.rememberMeCheckbox).uncheck();
    return this;
  }

  /**
   * Click the "Forgot Password" link
   */
  clickForgotPassword() {
    cy.get(this.selectors.forgotPasswordLink).click();
    return this;
  }

  /**
   * Click the registration link to go to signup page
   */
  goToRegister() {
    cy.get(this.selectors.registerLink).click();
    return this;
  }

  /**
   * Click the Google login button
   */
  clickGoogleLogin() {
    cy.get(this.selectors.googleLoginButton).click();
    return this;
  }

  /**
   * Click the Facebook login button
   */
  clickFacebookLogin() {
    cy.get(this.selectors.facebookLoginButton).click();
    return this;
  }

  /**
   * Assert that the login page is visible
   */
  assertIsVisible() {
    cy.get(this.selectors.form).should('be.visible');
    cy.get(this.selectors.loginButton).should('be.visible');
    cy.url().should('include', '/login');
    cy.title().should('include', 'Login');
    return this;
  }

  /**
   * Assert that an error message is displayed
   */
  assertErrorMessageIsVisible() {
    cy.get(this.selectors.errorMessage).should('be.visible');
    return this;
  }

  /**
   * Assert that the error message contains specific text
   * @param {string} text - Text to check for in the error message
   */
  assertErrorMessageContains(text) {
    cy.get(this.selectors.errorMessage)
      .should('be.visible')
      .and('contain', text);
    return this;
  }

  /**
   * Assert that an info message is displayed
   */
  assertInfoMessageIsVisible() {
    cy.get(this.selectors.infoMessage).should('be.visible');
    return this;
  }

  /**
   * Assert that the info message contains specific text
   * @param {string} text - Text to check for in the info message
   */
  assertInfoMessageContains(text) {
    cy.get(this.selectors.infoMessage)
      .should('be.visible')
      .and('contain', text);
    return this;
  }

  /**
   * Assert that the login button is disabled
   */
  assertLoginButtonIsDisabled() {
    cy.get(this.selectors.loginButton).should('be.disabled');
    return this;
  }

  /**
   * Assert that the form is visible (for responsive testing)
   */
  assertFormIsVisible() {
    cy.get(this.selectors.form).should('be.visible');
    cy.get(this.selectors.emailInput).should('be.visible');
    cy.get(this.selectors.passwordInput).should('be.visible');
    cy.get(this.selectors.loginButton).should('be.visible');
    return this;
  }

  /**
   * Assert that the Google login button exists
   */
  assertGoogleLoginButtonExists() {
    cy.get(this.selectors.googleLoginButton).should('exist');
    return this;
  }

  /**
   * Assert that the Facebook login button exists
   */
  assertFacebookLoginButtonExists() {
    cy.get(this.selectors.facebookLoginButton).should('exist');
    return this;
  }

  /**
   * Get the current value of the CSRF token
   * @returns {Cypress.Chainable<string>} The CSRF token value
   */
  getCsrfToken() {
    return cy.get(this.selectors.csrfToken)
      .invoke('attr', 'value');
  }

  /**
   * Helper method to test form submission with an invalid CSRF token
   * Useful for testing CSRF protection
   */
  submitWithInvalidCsrfToken(email, password) {
    // First intercept the form submission
    cy.intercept('POST', '/api/login').as('loginRequest');
    
    // Then modify the CSRF token
    cy.get(this.selectors.csrfToken)
      .invoke('attr', 'value', 'invalid-token');
    
    // Submit the form with valid credentials
    this.login(email, password);
    
    // Wait for the request and check it was rejected
    cy.wait('@loginRequest')
      .its('response.statusCode')
      .should('eq', 403);
    
    return this;
  }
}

export default LoginPage;
