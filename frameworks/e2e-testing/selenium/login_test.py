"""
Login Test with Selenium WebDriver

This script demonstrates how to implement login tests using Selenium WebDriver
with the Page Object Model pattern in Python.
"""
import unittest
import json
import os
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


class LoginPage:
    """Page Object representing the login page"""

    def __init__(self, driver):
        self.driver = driver
        self.url = "https://example.com/login"
        
        # Define selectors
        self.email_input = (By.ID, "email")
        self.password_input = (By.ID, "password")
        self.remember_me_checkbox = (By.ID, "rememberMe")
        self.login_button = (By.CSS_SELECTOR, "button[type='submit']")
        self.error_message = (By.CLASS_NAME, "error-message")
        self.forgot_password_link = (By.PARTIAL_LINK_TEXT, "Forgot Password")
        
    def navigate(self):
        """Navigate to the login page"""
        self.driver.get(self.url)
        return self
        
    def login(self, email, password, remember_me=False):
        """Enter login credentials and submit the form"""
        # Clear and fill email field
        email_element = self.driver.find_element(*self.email_input)
        email_element.clear()
        email_element.send_keys(email)
        
        # Clear and fill password field
        password_element = self.driver.find_element(*self.password_input)
        password_element.clear()
        password_element.send_keys(password)
        
        # Check Remember Me if requested
        if remember_me:
            remember_me_element = self.driver.find_element(*self.remember_me_checkbox)
            if not remember_me_element.is_selected():
                remember_me_element.click()
                
        # Submit the form
        self.driver.find_element(*self.login_button).click()
        return self
        
    def get_error_message(self):
        """Get the error message text if present"""
        try:
            error_element = WebDriverWait(self.driver, 5).until(
                EC.visibility_of_element_located(self.error_message)
            )
            return error_element.text
        except:
            return None
            
    def click_forgot_password(self):
        """Click the forgot password link"""
        self.driver.find_element(*self.forgot_password_link).click()
        return self
        
    def is_on_login_page(self):
        """Check if we're on the login page"""
        return "/login" in self.driver.current_url and \
               WebDriverWait(self.driver, 5).until(
                   EC.visibility_of_element_located(self.login_button)
               )


class DashboardPage:
    """Page Object representing the dashboard page"""
    
    def __init__(self, driver):
        self.driver = driver
        self.url = "https://example.com/dashboard"
        
        # Define selectors
        self.user_greeting = (By.CLASS_NAME, "user-greeting")
        self.logout_button = (By.ID, "logout-button")
        
    def is_on_dashboard(self):
        """Check if we're on the dashboard page"""
        return "/dashboard" in self.driver.current_url and \
               WebDriverWait(self.driver, 5).until(
                   EC.visibility_of_element_located(self.user_greeting)
               )
               
    def get_user_greeting(self):
        """Get the user greeting text"""
        greeting_element = self.driver.find_element(*self.user_greeting)
        return greeting_element.text
        
    def logout(self):
        """Click the logout button"""
        self.driver.find_element(*self.logout_button).click()
        return self


class LoginTest(unittest.TestCase):
    """Test cases for the login functionality"""
    
    @classmethod
    def setUpClass(cls):
        """Set up the WebDriver once for all tests"""
        # Define WebDriver options
        options = webdriver.ChromeOptions()
        if os.environ.get('CI') == 'true':
            # Run in headless mode for CI environments
            options.add_argument('--headless')
            options.add_argument('--no-sandbox')
            options.add_argument('--disable-dev-shm-usage')
        
        # Initialize WebDriver
        service = Service('chromedriver')  # Path to chromedriver
        cls.driver = webdriver.Chrome(service=service, options=options)
        cls.driver.implicitly_wait(10)
        
        # Load test data
        with open('test_data/users.json', 'r') as f:
            cls.test_data = json.load(f)
    
    @classmethod
    def tearDownClass(cls):
        """Clean up after all tests"""
        cls.driver.quit()
        
    def setUp(self):
        """Set up for each test case"""
        self.login_page = LoginPage(self.driver)
        self.dashboard_page = DashboardPage(self.driver)
        
        # Start each test at the login page
        self.login_page.navigate()
        
    def test_valid_login(self):
        """Test that a valid user can log in successfully"""
        # Get a valid user from test data
        valid_user = self.test_data['users']['valid']
        
        # Perform login
        self.login_page.login(valid_user['email'], valid_user['password'])
        
        # Verify redirect to dashboard
        self.assertTrue(self.dashboard_page.is_on_dashboard())
        
        # Close the browser to clear session cookies
        self.driver.quit()
        
        # Re-initialize WebDriver
        options = webdriver.ChromeOptions()
        if os.environ.get('CI') == 'true':
            options.add_argument('--headless')
            options.add_argument('--no-sandbox')
            options.add_argument('--disable-dev-shm-usage')
        
        service = Service('chromedriver')
        self.driver = self.__class__.driver = webdriver.Chrome(service=service, options=options)
        self.driver.implicitly_wait(10)
        
        # Initialize page objects again
        self.login_page = LoginPage(self.driver)
        self.dashboard_page = DashboardPage(self.driver)
        
        # Navigate directly to dashboard
        self.driver.get("https://example.com/dashboard")
        
        # If Remember Me works, we should still be on dashboard
        # Otherwise, we should be redirected to login
        try:
            self.assertTrue(
                self.dashboard_page.is_on_dashboard(),
                "Should remain logged in with Remember Me enabled"
            )
        except:
            self.fail("Remember Me functionality failed - user was logged out")
            
    def test_forgot_password(self):
        """Test that Forgot Password link works"""
        # Click the Forgot Password link
        self.login_page.click_forgot_password()
        
        # Verify redirect to password reset page
        self.assertIn(
            "/forgot-password",
            self.driver.current_url,
            "Should be redirected to forgot password page"
        )
        
        # Verify the reset form is displayed
        reset_form = WebDriverWait(self.driver, 5).until(
            EC.visibility_of_element_located((By.ID, "reset-form"))
        )
        self.assertTrue(reset_form.is_displayed(), "Password reset form should be visible")
        
    def test_logout(self):
        """Test that a user can log out successfully"""
        # First, log in with valid credentials
        valid_user = self.test_data['users']['valid']
        self.login_page.login(valid_user['email'], valid_user['password'])
        
        # Verify redirect to dashboard
        self.assertTrue(self.dashboard_page.is_on_dashboard())
        
        # Log out
        self.dashboard_page.logout()
        
        # Verify redirect to login page
        self.assertTrue(
            self.login_page.is_on_login_page(),
            "Should be redirected to login page after logout"
        )
        
        # Verify cannot access dashboard after logout
        self.driver.get("https://example.com/dashboard")
        self.assertTrue(
            self.login_page.is_on_login_page(),
            "Should not be able to access dashboard after logout"
        )
        
    def test_login_attempts_lockout(self):
        """Test that account gets locked after multiple failed login attempts"""
        # Get test data
        user_email = self.test_data['users']['valid']['email']
        wrong_password = "WrongPassword123!"
        max_attempts = 5  # Assuming 5 is the lockout threshold
        
        # Attempt login with wrong password multiple times
        for i in range(max_attempts):
            self.login_page.navigate()
            self.login_page.login(user_email, wrong_password)
            
            # Verify error message
            error_message = self.login_page.get_error_message()
            self.assertIsNotNone(error_message, f"Should show error message for attempt {i+1}")
            
            # If this is the last attempt before lockout, the error message might change
            if i == max_attempts - 1:
                self.assertIn(
                    "locked",
                    error_message.lower(),
                    "Should indicate account is locked after multiple failed attempts"
                )
                
        # Try one more time to verify account is locked
        self.login_page.navigate()
        self.login_page.login(user_email, wrong_password)
        
        # Verify lockout message
        error_message = self.login_page.get_error_message()
        self.assertIn(
            "locked",
            error_message.lower(),
            "Should show account locked message"
        )
        
        # Verify the login button is disabled or another lockout indicator
        login_button = self.driver.find_element(*self.login_page.login_button)
        self.assertFalse(
            login_button.is_enabled(),
            "Login button should be disabled when account is locked"
        )
        
    def test_csrf_protection(self):
        """Test that CSRF token is included and validated"""
        # Navigate to login page
        self.login_page.navigate()
        
        # Verify CSRF token exists in the form
        csrf_token = self.driver.find_element(By.NAME, "csrf_token")
        self.assertIsNotNone(csrf_token, "CSRF token should exist in the form")
        
        # Get the original token value
        original_token_value = csrf_token.get_attribute("value")
        self.assertIsNotNone(
            original_token_value,
            "CSRF token should have a value"
        )
        
        # Modify the token using JavaScript to simulate a CSRF attack
        self.driver.execute_script(
            "arguments[0].value = 'invalid-token';",
            csrf_token
        )
        
        # Attempt to login with valid credentials but invalid CSRF token
        valid_user = self.test_data['users']['valid']
        self.login_page.login(valid_user['email'], valid_user['password'])
        
        # Check if the login was prevented
        # This could be indicated by an error message or by staying on the login page
        error_message = self.login_page.get_error_message()
        if error_message:
            self.assertIn(
                "security",
                error_message.lower(),
                "Should show security-related error for invalid CSRF token"
            )
        else:
            self.assertTrue(
                self.login_page.is_on_login_page(),
                "Should remain on login page when CSRF token is invalid"
            )
        
    def test_cross_site_scripting_protection(self):
        """Test protection against XSS attacks in login form"""
        # Test with a simple XSS payload in the email field
        xss_payload = '<script>alert("XSS")</script>'
        
        # Enter the XSS payload into the email field
        self.login_page.navigate()
        email_element = self.driver.find_element(*self.login_page.email_input)
        email_element.clear()
        email_element.send_keys(xss_payload)
        
        # Submit the form
        self.driver.find_element(*self.login_page.login_button).click()
        
        # Check if the XSS payload was executed by looking for alerts
        try:
            # If an alert is present, the XSS attack was successful
            WebDriverWait(self.driver, 3).until(EC.alert_is_present())
            self.fail("XSS attack was successful - alert was triggered")
        except:
            # No alert means the XSS was properly sanitized
            pass
        
        # Verify the payload is properly escaped in any error messages
        error_message = self.login_page.get_error_message()
        if error_message and xss_payload in error_message:
            # Check if the script tag is displayed as text rather than executed
            self.assertIn(
                "&lt;script&gt;",
                self.driver.page_source,
                "XSS payload should be escaped in the page"
            )


if __name__ == "__main__":
    unittest.main()
 dashboard
        self.assertTrue(
            self.dashboard_page.is_on_dashboard(),
            "Should be redirected to dashboard after successful login"
        )
        
        # Verify user name in greeting
        greeting = self.dashboard_page.get_user_greeting()
        self.assertIn(
            valid_user['name'],
            greeting,
            f"Greeting '{greeting}' should contain user name '{valid_user['name']}'"
        )
        
    def test_invalid_credentials(self):
        """Test that invalid credentials are rejected"""
        # Test each invalid credential scenario
        for invalid_case in self.test_data['invalidCredentials']:
            # Reset to login page
            self.login_page.navigate()
            
            # Attempt login with invalid credentials
            self.login_page.login(invalid_case['email'], invalid_case['password'])
            
            # Verify error message
            error_message = self.login_page.get_error_message()
            self.assertIsNotNone(
                error_message,
                f"Should show error message for scenario: {invalid_case['scenario']}"
            )
            self.assertIn(
                invalid_case['expectedError'],
                error_message,
                f"Error message for {invalid_case['scenario']} should contain '{invalid_case['expectedError']}'"
            )
            
            # Verify still on login page
            self.assertTrue(
                self.login_page.is_on_login_page(),
                f"Should remain on login page for scenario: {invalid_case['scenario']}"
            )
            
    def test_remember_me(self):
        """Test that Remember Me functionality works"""
        # Get a valid user from test data
        valid_user = self.test_data['users']['valid']
        
        # Login with Remember Me checked
        self.login_page.login(valid_user['email'], valid_user['password'], remember_me=True)
        
        # Verify redirect to