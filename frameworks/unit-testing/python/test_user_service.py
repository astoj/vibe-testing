"""
User Service Unit Tests using pytest

This file demonstrates how to structure and write effective PyTest unit tests
for a user service module.
"""
import pytest
from unittest.mock import MagicMock, patch

# Import the service to test
from app.services.user_service import UserService
from app.models.user import User
from app.exceptions import AuthenticationError, UserExistsError, ValidationError


# Fixtures
@pytest.fixture
def user_repo_mock():
    """Create a mock user repository"""
    mock = MagicMock()
    return mock


@pytest.fixture
def email_service_mock():
    """Create a mock email service"""
    mock = MagicMock()
    return mock


@pytest.fixture
def token_service_mock():
    """Create a mock token service"""
    mock = MagicMock()
    return mock


@pytest.fixture
def user_service(user_repo_mock, email_service_mock, token_service_mock):
    """Create a UserService instance with mocked dependencies"""
    return UserService(
        user_repository=user_repo_mock,
        email_service=email_service_mock,
        token_service=token_service_mock
    )


@pytest.fixture
def valid_user():
    """Create a valid user object for testing"""
    return User(
        id="user-123",
        email="user@example.com",
        name="Test User",
        password_hash="hashed_password",
        role="user",
    )


# Test classes
class TestUserAuthentication:
    """Tests for user authentication functionality"""

    def test_authenticate_with_valid_credentials(self, user_service, user_repo_mock, valid_user):
        """Should return user when credentials are valid"""
        # Arrange
        email = "user@example.com"
        password = "correct-password"
        user_repo_mock.find_by_credentials.return_value = valid_user

        # Act
        result = user_service.authenticate(email, password)

        # Assert
        assert result == valid_user
        user_repo_mock.find_by_credentials.assert_called_once_with(email, password)

    def test_authenticate_with_invalid_credentials(self, user_service, user_repo_mock):
        """Should raise AuthenticationError when credentials are invalid"""
        # Arrange
        email = "user@example.com"
        password = "wrong-password"
        user_repo_mock.find_by_credentials.return_value = None

        # Act/Assert
        with pytest.raises(AuthenticationError) as excinfo:
            user_service.authenticate(email, password)

        # Verify the error message
        assert "Invalid credentials" in str(excinfo.value)
        user_repo_mock.find_by_credentials.assert_called_once_with(email, password)

    def test_authenticate_handles_repository_errors(self, user_service, user_repo_mock):
        """Should handle repository errors gracefully"""
        # Arrange
        email = "user@example.com"
        password = "password"
        user_repo_mock.find_by_credentials.side_effect = Exception("Database error")

        # Act/Assert
        with pytest.raises(AuthenticationError) as excinfo:
            user_service.authenticate(email, password)

        # Verify the error message is user-friendly
        assert "Authentication failed. Please try again later" in str(excinfo.value)

    @pytest.mark.parametrize("email,password", [
        ("", "password"),  # Empty email
        ("user@example.com", ""),  # Empty password
        (None, "password"),  # None email
        ("user@example.com", None),  # None password
    ])
    def test_authenticate_with_missing_credentials(self, user_service, email, password):
        """Should validate that credentials are provided"""
        # Act/Assert
        with pytest.raises(ValidationError) as excinfo:
            user_service.authenticate(email, password)

        # Verify the error message
        assert "Email and password are required" in str(excinfo.value)


class TestUserRegistration:
    """Tests for user registration functionality"""

    def test_register_new_user_with_valid_data(self, user_service, user_repo_mock, 
                                               email_service_mock, valid_user):
        """Should create new user when data is valid"""
        # Arrange
        user_data = {
            "email": "newuser@example.com",
            "name": "New User",
            "password": "secure-password",
        }
        user_repo_mock.find_by_email.return_value = None
        user_repo_mock.create.return_value = valid_user

        # Act
        result = user_service.register(user_data)

        # Assert
        assert result == valid_user
        user_repo_mock.find_by_email.assert_called_once_with(user_data["email"])
        user_repo_mock.create.assert_called_once()
        email_service_mock.send_welcome_email.assert_called_once_with(
            user_data["email"], user_data["name"]
        )

    def test_register_with_existing_email(self, user_service, user_repo_mock, valid_user):
        """Should raise UserExistsError when email already exists"""
        # Arrange
        user_data = {
            "email": "existing@example.com",
            "name": "Existing User",
            "password": "secure-password",
        }
        user_repo_mock.find_by_email.return_value = valid_user

        # Act/Assert
        with pytest.raises(UserExistsError) as excinfo:
            user_service.register(user_data)

        # Verify the error message
        assert "Email already exists" in str(excinfo.value)
        user_repo_mock.find_by_email.assert_called_once_with(user_data["email"])
        user_repo_mock.create.assert_not_called()

    @pytest.mark.parametrize("user_data,expected_message", [
        (
            {"name": "Test User", "password": "secure-password"}, 
            "Email is required"
        ),  # Missing email
        (
            {"email": "user@example.com", "password": "secure-password"}, 
            "Name is required"
        ),  # Missing name
        (
            {"email": "user@example.com", "name": "Test User"}, 
            "Password is required"
        ),  # Missing password
        (
            {"email": "not-an-email", "name": "Test User", "password": "secure-password"}, 
            "Invalid email format"
        ),  # Invalid email
        (
            {"email": "user@example.com", "name": "Test User", "password": "123"}, 
            "Password must be at least 8 characters"
        ),  # Short password
    ])
    def test_register_with_invalid_data(self, user_service, user_repo_mock, user_data, expected_message):
        """Should validate user data before registration"""
        # Arrange
        user_repo_mock.find_by_email.return_value = None

        # Act/Assert
        with pytest.raises(ValidationError) as excinfo:
            user_service.register(user_data)

        # Verify the error message
        assert expected_message in str(excinfo.value)
        user_repo_mock.create.assert_not_called()


class TestPasswordReset:
    """Tests for password reset functionality"""

    def test_reset_password_request_for_existing_user(self, user_service, user_repo_mock, 
                                                    token_service_mock, email_service_mock, valid_user):
        """Should send reset email when user exists"""
        # Arrange
        email = "user@example.com"
        reset_token = "random-token-123"
        user_repo_mock.find_by_email.return_value = valid_user
        token_service_mock.generate_reset_token.return_value = reset_token

        # Act
        user_service.request_password_reset(email)

        # Assert
        user_repo_mock.find_by_email.assert_called_once_with(email)
        token_service_mock.generate_reset_token.assert_called_once_with(valid_user.id)
        email_service_mock.send_password_reset_email.assert_called_once_with(
            email, valid_user.name, reset_token
        )

    def test_reset_password_request_for_nonexistent_user(self, user_service, user_repo_mock, 
                                                      token_service_mock, email_service_mock):
        """Should not throw error when user does not exist (security measure)"""
        # Arrange
        email = "nonexistent@example.com"
        user_repo_mock.find_by_email.return_value = None

        # Act
        user_service.request_password_reset(email)

        # Assert - we don't raise an error for security reasons
        user_repo_mock.find_by_email.assert_called_once_with(email)
        token_service_mock.generate_reset_token.assert_not_called()
        email_service_mock.send_password_reset_email.assert_not_called()

    def test_complete_password_reset_with_valid_token(self, user_service, token_service_mock, user_repo_mock):
        """Should update password when token is valid"""
        # Arrange
        token = "valid-token"
        new_password = "new-secure-password"
        user_id = "user-123"
        token_service_mock.verify_reset_token.return_value = user_id

        # Act
        user_service.complete_password_reset(token, new_password)

        # Assert
        token_service_mock.verify_reset_token.assert_called_once_with(token)
        user_repo_mock.update_password.assert_called_once_with(user_id, new_password)
        token_service_mock.invalidate_reset_token.assert_called_once_with(token)

    def test_complete_password_reset_with_invalid_token(self, user_service, token_service_mock, user_repo_mock):
        """Should raise error when token is invalid"""
        # Arrange
        token = "invalid-token"
        new_password = "new-secure-password"
        token_service_mock.verify_reset_token.return_value = None

        # Act/Assert
        with pytest.raises(ValidationError) as excinfo:
            user_service.complete_password_reset(token, new_password)

        # Verify the error message
        assert "Invalid or expired reset token" in str(excinfo.value)
        user_repo_mock.update_password.assert_not_called()

    def test_complete_password_reset_with_weak_password(self, user_service, token_service_mock):
        """Should validate password strength during reset"""
        # Arrange
        token = "valid-token"
        weak_password = "123"  # Too short
        user_id = "user-123"
        token_service_mock.verify_reset_token.return_value = user_id

        # Act/Assert
        with pytest.raises(ValidationError) as excinfo:
            user_service.complete_password_reset(token, weak_password)

        # Verify the error message
        assert "Password must be at least 8 characters" in str(excinfo.value)


class TestUserProfileManagement:
    """Tests for user profile management functionality"""

    def test_update_profile_with_valid_data(self, user_service, user_repo_mock, valid_user):
        """Should update user profile with valid data"""
        # Arrange
        user_id = "user-123"
        update_data = {
            "name": "Updated Name",
            "bio": "New bio information"
        }
        user_repo_mock.find_by_id.return_value = valid_user
        updated_user = valid_user.copy()
        updated_user.name = update_data["name"]
        updated_user.bio = update_data["bio"]
        user_repo_mock.update.return_value = updated_user

        # Act
        result = user_service.update_profile(user_id, update_data)

        # Assert
        assert result == updated_user
        user_repo_mock.find_by_id.assert_called_once_with(user_id)
        user_repo_mock.update.assert_called_once_with(user_id, update_data)

    def test_update_profile_for_nonexistent_user(self, user_service, user_repo_mock):
        """Should raise error when updating non-existent user"""
        # Arrange
        user_id = "nonexistent-user"
        update_data = {"name": "New Name"}
        user_repo_mock.find_by_id.return_value = None

        # Act/Assert
        with pytest.raises(ValidationError) as excinfo:
            user_service.update_profile(user_id, update_data)

        # Verify the error message
        assert "User not found" in str(excinfo.value)
        user_repo_mock.update.assert_not_called()

    def test_update_profile_with_email_change_attempt(self, user_service, user_repo_mock, valid_user):
        """Should prevent email changes through profile update"""
        # Arrange
        user_id = "user-123"
        update_data = {
            "name": "Updated Name",
            "email": "newemail@example.com"  # Attempting to change email
        }
        user_repo_mock.find_by_id.return_value = valid_user

        # Act/Assert
        with pytest.raises(ValidationError) as excinfo:
            user_service.update_profile(user_id, update_data)

        # Verify the error message
        assert "Email cannot be updated through this endpoint" in str(excinfo.value)
        user_repo_mock.update.assert_not_called()


if __name__ == "__main__":
    pytest.main()
