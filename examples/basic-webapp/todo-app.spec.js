/**
 * Todo Application End-to-End Tests
 * 
 * This is an example of testing a simple todo application using Cypress.
 * It demonstrates common testing patterns and best practices for a basic web application.
 */

// Import Todo Page Object
import TodoPage from '../support/pages/TodoPage';

describe('Todo Application', () => {
  // Initialize Page Object
  const todoPage = new TodoPage();
  
  beforeEach(() => {
    // Visit the todo application before each test
    todoPage.visit();
    
    // Clear local storage to start with a clean state
    cy.clearLocalStorage();
    
    // Reload the page to reflect the cleared state
    cy.reload();
  });
  
  it('should display the todo application', () => {
    // Verify basic elements are present
    todoPage.assertTitleIsVisible();
    todoPage.assertNewTodoInputIsVisible();
    todoPage.assertTodoListExists();
  });
  
  it('should allow adding a new todo', () => {
    // Arrange
    const todoText = 'Buy groceries';
    
    // Act
    todoPage.addTodo(todoText);
    
    // Assert
    todoPage.assertTodoExists(todoText);
  });
  
  it('should allow adding multiple todos', () => {
    // Arrange
    const todos = [
      'Learn Cypress',
      'Write tests',
      'Be productive'
    ];
    
    // Act - Add all todos
    todos.forEach(todo => {
      todoPage.addTodo(todo);
    });
    
    // Assert
    todos.forEach(todo => {
      todoPage.assertTodoExists(todo);
    });
    
    // Verify the count
    todoPage.assertTodoCount(todos.length);
  });
  
  it('should allow marking a todo as completed', () => {
    // Arrange - Add a todo
    const todoText = 'Mark me as completed';
    todoPage.addTodo(todoText);
    
    // Act - Mark as completed
    todoPage.toggleTodo(todoText);
    
    // Assert
    todoPage.assertTodoIsCompleted(todoText);
  });
  
  it('should allow unmarking a completed todo', () => {
    // Arrange - Add a todo and mark it completed
    const todoText = 'Mark and unmark me';
    todoPage.addTodo(todoText);
    todoPage.toggleTodo(todoText);
    
    // Verify it's marked as completed
    todoPage.assertTodoIsCompleted(todoText);
    
    // Act - Unmark the todo
    todoPage.toggleTodo(todoText);
    
    // Assert
    todoPage.assertTodoIsNotCompleted(todoText);
  });
  
  it('should allow deleting a todo', () => {
    // Arrange - Add a todo
    const todoText = 'Delete me';
    todoPage.addTodo(todoText);
    
    // Verify the todo exists
    todoPage.assertTodoExists(todoText);
    
    // Act - Delete the todo
    todoPage.deleteTodo(todoText);
    
    // Assert
    todoPage.assertTodoDoesNotExist(todoText);
  });
  
  it('should display the correct count of incomplete todos', () => {
    // Arrange - Add several todos
    const todos = [
      'Todo 1',
      'Todo 2',
      'Todo 3',
      'Todo 4'
    ];
    
    // Add all todos
    todos.forEach(todo => {
      todoPage.addTodo(todo);
    });
    
    // Complete some todos
    todoPage.toggleTodo(todos[0]);
    todoPage.toggleTodo(todos[2]);
    
    // Act/Assert - Verify the count of active todos
    todoPage.assertActiveCount(2);
  });
  
  it('should allow filtering todos by status', () => {
    // Arrange - Add todos and complete some
    const activeTodos = ['Active 1', 'Active 2'];
    const completedTodos = ['Completed 1', 'Completed 2'];
    
    // Add all todos
    [...activeTodos, ...completedTodos].forEach(todo => {
      todoPage.addTodo(todo);
    });
    
    // Complete some todos
    completedTodos.forEach(todo => {
      todoPage.toggleTodo(todo);
    });
    
    // Act/Assert - Filter by active
    todoPage.filterByActive();
    
    // Verify only active todos are visible
    activeTodos.forEach(todo => {
      todoPage.assertTodoExists(todo);
    });
    completedTodos.forEach(todo => {
      todoPage.assertTodoDoesNotExist(todo);
    });
    
    // Act/Assert - Filter by completed
    todoPage.filterByCompleted();
    
    // Verify only completed todos are visible
    completedTodos.forEach(todo => {
      todoPage.assertTodoExists(todo);
    });
    activeTodos.forEach(todo => {
      todoPage.assertTodoDoesNotExist(todo);
    });
    
    // Act/Assert - Show all todos
    todoPage.filterByAll();
    
    // Verify all todos are visible
    [...activeTodos, ...completedTodos].forEach(todo => {
      todoPage.assertTodoExists(todo);
    });
  });
  
  it('should allow clearing all completed todos', () => {
    // Arrange - Add todos and complete some
    const activeTodos = ['Active 1', 'Active 2'];
    const completedTodos = ['Completed 1', 'Completed 2'];
    
    // Add all todos
    [...activeTodos, ...completedTodos].forEach(todo => {
      todoPage.addTodo(todo);
    });
    
    // Complete some todos
    completedTodos.forEach(todo => {
      todoPage.toggleTodo(todo);
    });
    
    // Act - Clear completed
    todoPage.clearCompleted();
    
    // Assert - Verify completed todos are removed
    completedTodos.forEach(todo => {
      todoPage.assertTodoDoesNotExist(todo);
    });
    
    // Verify active todos still exist
    activeTodos.forEach(todo => {
      todoPage.assertTodoExists(todo);
    });
    
    // Verify count is updated
    todoPage.assertTodoCount(activeTodos.length);
  });
  
  it('should validate input - empty todo', () => {
    // Act - Try to add an empty todo
    todoPage.addTodo('');
    
    // Assert - No todo should be added
    todoPage.assertTodoCount(0);
  });
  
  it('should trim whitespace from entered todos', () => {
    // Arrange
    const todoTextWithSpace = '   Trim my spaces   ';
    const expectedTodoText = 'Trim my spaces';
    
    // Act
    todoPage.addTodo(todoTextWithSpace);
    
    // Assert
    todoPage.assertTodoExists(expectedTodoText);
    todoPage.assertTodoDoesNotExist(todoTextWithSpace);
  });
  
  it('should allow editing a todo', () => {
    // Arrange - Add a todo
    const originalText = 'Original todo';
    const updatedText = 'Updated todo';
    
    todoPage.addTodo(originalText);
    
    // Act - Edit the todo
    todoPage.editTodo(originalText, updatedText);
    
    // Assert
    todoPage.assertTodoDoesNotExist(originalText);
    todoPage.assertTodoExists(updatedText);
  });
  
  it('should save todos between page refreshes', () => {
    // Arrange - Add todos
    const todos = ['Persistent Todo 1', 'Persistent Todo 2'];
    
    // Add todos
    todos.forEach(todo => {
      todoPage.addTodo(todo);
    });
    
    // Mark one as completed
    todoPage.toggleTodo(todos[0]);
    
    // Act - Refresh the page
    cy.reload();
    
    // Assert - Todos should still exist with correct state
    todos.forEach(todo => {
      todoPage.assertTodoExists(todo);
    });
    
    todoPage.assertTodoIsCompleted(todos[0]);
    todoPage.assertTodoIsNotCompleted(todos[1]);
  });
  
  it('should handle special characters in todos', () => {
    // Arrange
    const specialTodo = 'Special characters: !@#$%^&*()_+<>?:"|{}[];\',./';
    
    // Act
    todoPage.addTodo(specialTodo);
    
    // Assert
    todoPage.assertTodoExists(specialTodo);
  });
  
  it('should handle long text in todos', () => {
    // Arrange
    const longTodo = 'This is a very long todo item that should still display properly in the todo application without breaking the layout or causing any issues with the display of other elements on the page.';
    
    // Act
    todoPage.addTodo(longTodo);
    
    // Assert
    todoPage.assertTodoExists(longTodo);
  });
  
  it('should be accessible', () => {
    // Add some todos for a realistic test
    todoPage.addTodo('Accessibility test 1');
    todoPage.addTodo('Accessibility test 2');
    todoPage.toggleTodo('Accessibility test 1');
    
    // Run accessibility audit
    cy.injectAxe();
    cy.checkA11y();
    
    // Check specific elements
    cy.checkA11y('header', {
      runOnly: {
        type: 'tag',
        values: ['wcag2a']
      }
    });
    
    cy.checkA11y('.todo-list', {
      runOnly: {
        type: 'tag',
        values: ['wcag2a']
      }
    });
    
    // Check filter buttons
    cy.checkA11y('.filters', {
      runOnly: {
        type: 'tag',
        values: ['wcag2a']
      }
    });
  });
  
  it('should work with keyboard navigation', () => {
    // Test keyboard accessibility
    
    // Add a todo
    cy.get('.new-todo')
      .focus()
      .type('Keyboard navigation test{enter}');
    
    // Tab to the todo item
    cy.get('.new-todo')
      .tab()
      .should('have.focus');
    
    // Check first todo checkbox with space key
    cy.focused()
      .type(' '); // Space key
      
    // Verify todo is completed
    todoPage.assertTodoIsCompleted('Keyboard navigation test');
    
    // Tab to filters
    cy.get('.filters a')
      .first()
      .focus();
      
    // Activate completed filter
    cy.focused()
      .tab()
      .tab()
      .type('{enter}'); // Enter key
      
    // Verify filter was activated
    cy.url().should('include', 'completed');
  });
  
  // Performance test
  it('should handle a large number of todos', () => {
    // Add a large number of todos
    const todoCount = 100;
    
    for (let i = 1; i <= todoCount; i++) {
      todoPage.addTodo(`Todo item ${i}`);
    }
    
    // Verify all todos were added
    todoPage.assertTodoCount(todoCount);
    
    // Check the first and last todo to verify rendering
    todoPage.assertTodoExists('Todo item 1');
    todoPage.assertTodoExists(`Todo item ${todoCount}`);
    
    // Mark a few todos as completed
    todoPage.toggleTodo('Todo item 5');
    todoPage.toggleTodo('Todo item 10');
    todoPage.toggleTodo('Todo item 15');
    
    // Filter by completed
    todoPage.filterByCompleted();
    
    // Verify filter works with many items
    todoPage.assertTodoCount(3);
  });
});

// Mobile testing
describe('Todo Application on Mobile', () => {
  // Initialize Page Object
  const todoPage = new TodoPage();
  
  beforeEach(() => {
    // Set viewport to mobile size
    cy.viewport('iphone-6');
    
    // Visit the todo application before each test
    todoPage.visit();
    
    // Clear local storage to start with a clean state
    cy.clearLocalStorage();
    
    // Reload the page to reflect the cleared state
    cy.reload();
  });
  
  it('should display correctly on mobile', () => {
    // Verify layout is appropriate
    todoPage.assertTitleIsVisible();
    todoPage.assertNewTodoInputIsVisible();
    
    // Check responsive behavior
    cy.get('.todoapp').should('have.css', 'width', '100%');
  });
  
  it('should function correctly on mobile', () => {
    // Test basic functionality on mobile
    todoPage.addTodo('Mobile Todo 1');
    todoPage.addTodo('Mobile Todo 2');
    
    todoPage.assertTodoExists('Mobile Todo 1');
    todoPage.assertTodoExists('Mobile Todo 2');
    
    todoPage.toggleTodo('Mobile Todo 1');
    todoPage.assertTodoIsCompleted('Mobile Todo 1');
  });
});
