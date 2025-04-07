/**
 * Todo Page Object
 * 
 * This class encapsulates all interactions with the Todo application UI.
 * Following the Page Object Model pattern, it provides a clean API for tests
 * to interact with the todo application without exposing the details of the UI.
 */
class TodoPage {
  /**
   * Selectors for the Todo application elements
   * Centralizing selectors makes it easier to update them if the UI changes
   */
  selectors = {
    app: '.todoapp',
    title: 'h1',
    newTodoInput: '.new-todo',
    todoList: '.todo-list',
    todoItems: '.todo-list li',
    todoItem: (text) => `.todo-list li:contains("${text}")`,
    todoItemCheckbox: (text) => `.todo-list li:contains("${text}") .toggle`,
    todoItemLabel: (text) => `.todo-list li:contains("${text}") label`,
    todoItemDeleteButton: (text) => `.todo-list li:contains("${text}") .destroy`,
    todoCount: '.todo-count',
    activeCount: '.todo-count strong',
    filters: '.filters',
    filterAll: '.filters li:nth-child(1) a',
    filterActive: '.filters li:nth-child(2) a',
    filterCompleted: '.filters li:nth-child(3) a',
    clearCompletedButton: '.clear-completed'
  };

  /**
   * Navigate to the Todo application
   */
  visit() {
    cy.visit('/');
    return this;
  }

  /**
   * Add a new todo item
   * @param {string} text - Text of the todo item to add
   */
  addTodo(text) {
    cy.get(this.selectors.newTodoInput)
      .type(`${text}{enter}`);
    return this;
  }

  /**
   * Toggle the completion status of a todo item
   * @param {string} text - Text of the todo item to toggle
   */
  toggleTodo(text) {
    cy.get(this.selectors.todoItemCheckbox(text))
      .click();
    return this;
  }

  /**
   * Delete a todo item
   * @param {string} text - Text of the todo item to delete
   */
  deleteTodo(text) {
    // Force is needed because the delete button is only visible on hover
    cy.get(this.selectors.todoItem(text))
      .find('.destroy')
      .click({ force: true });
    return this;
  }

  /**
   * Edit a todo item
   * @param {string} oldText - Current text of the todo item
   * @param {string} newText - New text for the todo item
   */
  editTodo(oldText, newText) {
    // Double-click to activate editing mode
    cy.get(this.selectors.todoItemLabel(oldText))
      .dblclick();
    
    // Clear the input and type new text
    cy.get(this.selectors.todoItem(oldText))
      .find('.edit')
      .clear()
      .type(`${newText}{enter}`);
    
    return this;
  }

  /**
   * Filter todos to show all items
   */
  filterByAll() {
    cy.get(this.selectors.filterAll)
      .click();
    return this;
  }

  /**
   * Filter todos to show only active items
   */
  filterByActive() {
    cy.get(this.selectors.filterActive)
      .click();
    return this;
  }

  /**
   * Filter todos to show only completed items
   */
  filterByCompleted() {
    cy.get(this.selectors.filterCompleted)
      .click();
    return this;
  }

  /**
   * Clear all completed todos
   */
  clearCompleted() {
    cy.get(this.selectors.clearCompletedButton)
      .click();
    return this;
  }

  /**
   * Assert that the app title is visible
   */
  assertTitleIsVisible() {
    cy.get(this.selectors.title)
      .should('be.visible')
      .and('contain', 'todos');
    return this;
  }

  /**
   * Assert that the new todo input is visible
   */
  assertNewTodoInputIsVisible() {
    cy.get(this.selectors.newTodoInput)
      .should('be.visible');
    return this;
  }

  /**
   * Assert that the todo list exists
   */
  assertTodoListExists() {
    cy.get(this.selectors.todoList)
      .should('exist');
    return this;
  }

  /**
   * Assert that a specific todo item exists
   * @param {string} text - Text of the todo item to check
   */
  assertTodoExists(text) {
    cy.get(this.selectors.todoItem(text))
      .should('exist');
    return this;
  }

  /**
   * Assert that a specific todo item does not exist
   * @param {string} text - Text of the todo item to check
   */
  assertTodoDoesNotExist(text) {
    cy.get(this.selectors.todoItem(text))
      .should('not.exist');
    return this;
  }

  /**
   * Assert that a specific todo item is marked as completed
   * @param {string} text - Text of the todo item to check
   */
  assertTodoIsCompleted(text) {
    cy.get(this.selectors.todoItem(text))
      .should('have.class', 'completed');
    return this;
  }

  /**
   * Assert that a specific todo item is not marked as completed
   * @param {string} text - Text of the todo item to check
   */
  assertTodoIsNotCompleted(text) {
    cy.get(this.selectors.todoItem(text))
      .should('not.have.class', 'completed');
    return this;
  }

  /**
   * Assert the total number of todo items
   * @param {number} count - Expected number of todos
   */
  assertTodoCount(count) {
    cy.get(this.selectors.todoItems)
      .should('have.length', count);
    return this;
  }

  /**
   * Assert the number of active (incomplete) todo items
   * @param {number} count - Expected number of active todos
   */
  assertActiveCount(count) {
    cy.get(this.selectors.activeCount)
      .should('contain', count);
    return this;
  }

  /**
   * Wait for the app to load completely
   */
  waitForAppToLoad() {
    cy.get(this.selectors.app).should('be.visible');
    cy.get(this.selectors.newTodoInput).should('be.visible');
    return this;
  }

  /**
   * Check if the UI is showing the correct empty state
   */
  assertEmptyState() {
    cy.get(this.selectors.todoItems).should('not.exist');
    cy.get(this.selectors.todoCount).should('contain', '0 items left');
    return this;
  }

  /**
   * Verify that the filters are working correctly
   */
  assertFiltersWork() {
    // Add active and completed todos
    this.addTodo('Active test todo');
    this.addTodo('Completed test todo');
    this.toggleTodo('Completed test todo');
    
    // Test active filter
    this.filterByActive();
    this.assertTodoExists('Active test todo');
    this.assertTodoDoesNotExist('Completed test todo');
    
    // Test completed filter
    this.filterByCompleted();
    this.assertTodoDoesNotExist('Active test todo');
    this.assertTodoExists('Completed test todo');
    
    // Test all filter
    this.filterByAll();
    this.assertTodoExists('Active test todo');
    this.assertTodoExists('Completed test todo');
    
    return this;
  }
  
  /**
   * Run an accessibility audit
   * @param {string} name - Name to identify this audit in reports
   */
  runAccessibilityAudit(name = 'todo-page') {
    cy.injectAxe();
    cy.checkA11y(null, null, null, name);
    return this;
  }
}

export default TodoPage;
