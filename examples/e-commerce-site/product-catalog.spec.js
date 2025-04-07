/**
 * E-commerce Product Catalog Tests
 * 
 * This file demonstrates testing an e-commerce product catalog using Cypress.
 * It covers product browsing, filtering, sorting, and shopping cart functionality.
 */

import ProductCatalogPage from '../support/pages/ProductCatalogPage';
import ProductDetailPage from '../support/pages/ProductDetailPage';
import CartPage from '../support/pages/CartPage';
import { products } from '../fixtures/products';

describe('E-commerce Product Catalog', () => {
  // Initialize page objects
  const catalogPage = new ProductCatalogPage();
  const productPage = new ProductDetailPage();
  const cartPage = new CartPage();
  
  beforeEach(() => {
    // Visit the product catalog page before each test
    catalogPage.visit();
    
    // Intercept API calls to the products endpoint
    cy.intercept('GET', '**/api/products*').as('getProducts');
    cy.intercept('GET', '**/api/products/*').as('getProduct');
    
    // Wait for the products to load
    cy.wait('@getProducts');
  });
  
  describe('Product Browsing', () => {
    it('should display products in a grid layout', () => {
      // Verify products are displayed
      catalogPage.assertProductsVisible();
      
      // Check if at least 8 products are displayed (assuming pagination with 8+ products)
      catalogPage.assertMinimumProductCount(8);
      
      // Verify product card elements
      catalogPage.assertProductCardElements();
    });
    
    it('should navigate to product detail page when clicking on a product', () => {
      // Click on the first product
      catalogPage.clickFirstProduct();
      
      // Wait for product details to load
      cy.wait('@getProduct');
      
      // Verify we're on the product detail page
      productPage.assertOnProductDetailPage();
      
      // Verify product details are displayed
      productPage.assertProductDetailsVisible();
    });
    
    it('should display product categories in the sidebar', () => {
      // Verify categories are displayed
      catalogPage.assertCategoriesVisible();
      
      // Check if at least 3 categories are displayed
      catalogPage.assertMinimumCategoryCount(3);
    });
    
    it('should allow paginating through products', () => {
      // Verify pagination is visible if there are enough products
      catalogPage.assertPaginationVisible();
      
      // Get products on first page
      const firstPageProducts = [];
      catalogPage.getProductTitles().then(titles => {
        titles.forEach(title => firstPageProducts.push(title));
      });
      
      // Go to second page if available
      catalogPage.goToNextPage();
      
      // Verify new products are loaded
      cy.wait('@getProducts');
      
      // Get products on second page
      catalogPage.getProductTitles().then(titles => {
        // Check that the products on the second page are different
        const secondPageProducts = [];
        titles.forEach(title => secondPageProducts.push(title));
        
        // Verify there's no overlap between pages
        const overlap = firstPageProducts.filter(product => 
          secondPageProducts.includes(product)
        );
        
        expect(overlap.length).to.equal(0);
      });
    });
  });
  
  describe('Product Filtering', () => {
    it('should filter products by category', () => {
      // Select a category
      const category = 'Electronics';
      catalogPage.filterByCategory(category);
      
      // Wait for filtered products to load
      cy.wait('@getProducts');
      
      // Verify category is selected
      catalogPage.assertCategorySelected(category);
      
      // Verify all displayed products belong to the selected category
      catalogPage.assertAllProductsInCategory(category);
    });
    
    it('should filter products by price range', () => {
      // Set price range filter
      const minPrice = 50;
      const maxPrice = 200;
      catalogPage.filterByPriceRange(minPrice, maxPrice);
      
      // Wait for filtered products to load
      cy.wait('@getProducts');
      
      // Verify price filter is applied
      catalogPage.assertPriceFilterApplied(minPrice, maxPrice);
      
      // Verify all displayed products are within the price range
      catalogPage.assertAllProductsInPriceRange(minPrice, maxPrice);
    });
    
    it('should filter products by rating', () => {
      // Filter by minimum rating
      const minRating = 4;
      catalogPage.filterByMinimumRating(minRating);
      
      // Wait for filtered products to load
      cy.wait('@getProducts');
      
      // Verify rating filter is applied
      catalogPage.assertRatingFilterApplied(minRating);
      
      // Verify all displayed products have at least the minimum rating
      catalogPage.assertAllProductsMeetMinimumRating(minRating);
    });
    
    it('should combine multiple filters', () => {
      // Apply multiple filters
      const category = 'Clothing';
      const minPrice = 20;
      const maxPrice = 100;
      const minRating = 4;
      
      catalogPage.filterByCategory(category);
      cy.wait('@getProducts');
      
      catalogPage.filterByPriceRange(minPrice, maxPrice);
      cy.wait('@getProducts');
      
      catalogPage.filterByMinimumRating(minRating);
      cy.wait('@getProducts');
      
      // Verify all filters are applied
      catalogPage.assertCategorySelected(category);
      catalogPage.assertPriceFilterApplied(minPrice, maxPrice);
      catalogPage.assertRatingFilterApplied(minRating);
      
      // Verify displayed products meet all filter criteria
      catalogPage.assertAllProductsMeetAllFilters({
        category,
        minPrice,
        maxPrice,
        minRating
      });
    });
    
    it('should clear all filters', () => {
      // Apply a filter
      catalogPage.filterByCategory('Home');
      cy.wait('@getProducts');
      
      // Verify filter is applied
      catalogPage.assertCategorySelected('Home');
      
      // Clear all filters
      catalogPage.clearAllFilters();
      cy.wait('@getProducts');
      
      // Verify filters are cleared
      catalogPage.assertNoFiltersApplied();
    });
  });
  
  describe('Product Sorting', () => {
    it('should sort products by price low to high', () => {
      // Sort by price low to high
      catalogPage.sortBy('price-asc');
      
      // Wait for sorted products to load
      cy.wait('@getProducts');
      
      // Verify products are sorted by price low to high
      catalogPage.assertProductsSortedByPriceLowToHigh();
    });
    
    it('should sort products by price high to low', () => {
      // Sort by price high to low
      catalogPage.sortBy('price-desc');
      
      // Wait for sorted products to load
      cy.wait('@getProducts');
      
      // Verify products are sorted by price high to low
      catalogPage.assertProductsSortedByPriceHighToLow();
    });
    
    it('should sort products by rating', () => {
      // Sort by rating
      catalogPage.sortBy('rating-desc');
      
      // Wait for sorted products to load
      cy.wait('@getProducts');
      
      // Verify products are sorted by rating high to low
      catalogPage.assertProductsSortedByRatingHighToLow();
    });
    
    it('should sort products by newest', () => {
      // Sort by newest
      catalogPage.sortBy('newest');
      
      // Wait for sorted products to load
      cy.wait('@getProducts');
      
      // Verify products are sorted by newest
      catalogPage.assertProductsSortedByNewest();
    });
  });
  
  describe('Product Search', () => {
    it('should search for products by keyword', () => {
      // Search for a product
      const searchTerm = 'laptop';
      catalogPage.searchForProduct(searchTerm);
      
      // Wait for search results to load
      cy.wait('@getProducts');
      
      // Verify search term is displayed
      catalogPage.assertSearchTermDisplayed(searchTerm);
      
      // Verify search results contain the search term
      catalogPage.assertSearchResultsContainTerm(searchTerm);
    });
    
    it('should display a message when no search results are found', () => {
      // Search for a non-existent product
      const searchTerm = 'xyznonexistentproduct123';
      catalogPage.searchForProduct(searchTerm);
      
      // Wait for search results to load
      cy.wait('@getProducts');
      
      // Verify no results message is displayed
      catalogPage.assertNoResultsMessageDisplayed();
    });
    
    it('should display search suggestions as user types', () => {
      // Type part of a product name
      const partialSearchTerm = 'cam';
      catalogPage.typeInSearchBox(partialSearchTerm);
      
      // Verify search suggestions are displayed
      catalogPage.assertSearchSuggestionsDisplayed();
      
      // Verify search suggestions contain the partial search term
      catalogPage.assertSearchSuggestionsContainTerm(partialSearchTerm);
    });
  });
  
  describe('Shopping Cart', () => {
    it('should add a product to the cart from catalog page', () => {
      // Add first product to cart
      catalogPage.addFirstProductToCart();
      
      // Verify cart notification is displayed
      catalogPage.assertCartNotificationDisplayed();
      
      // Verify cart count is updated
      catalogPage.assertCartCount(1);
    });
    
    it('should add a product to the cart from product detail page', () => {
      // Navigate to product detail page
      catalogPage.clickFirstProduct();
      cy.wait('@getProduct');
      
      // Add product to cart
      productPage.selectSize('Medium');
      productPage.selectColor('Blue');
      productPage.setQuantity(2);
      productPage.addToCart();
      
      // Verify cart notification is displayed
      productPage.assertCartNotificationDisplayed();
      
      // Verify cart count is updated
      productPage.assertCartCount(2);
    });
    
    it('should view the shopping cart', () => {
      // Add a product to the cart
      catalogPage.addFirstProductToCart();
      
      // Go to cart page
      catalogPage.goToCart();
      
      // Verify on cart page
      cartPage.assertOnCartPage();
      
      // Verify cart contains the added product
      cartPage.assertCartContainsItems(1);
    });
    
    it('should update product quantity in the cart', () => {
      // Add a product to the cart
      catalogPage.addFirstProductToCart();
      
      // Go to cart page
      catalogPage.goToCart();
      
      // Get initial subtotal
      let initialSubtotal;
      cartPage.getSubtotal().then(subtotal => {
        initialSubtotal = subtotal;
      });
      
      // Update quantity
      cartPage.updateQuantityOfFirstItem(3);
      
      // Verify quantity is updated
      cartPage.assertFirstItemQuantity(3);
      
      // Verify subtotal is updated
      cartPage.getSubtotal().then(newSubtotal => {
        expect(newSubtotal).to.be.greaterThan(initialSubtotal);
      });
    });
    
    it('should remove a product from the cart', () => {
      // Add a product to the cart
      catalogPage.addFirstProductToCart();
      
      // Go to cart page
      catalogPage.goToCart();
      
      // Remove the product
      cartPage.removeFirstItem();
      
      // Verify cart is empty
      cartPage.assertCartIsEmpty();
    });
  });
  
  describe('Wishlist', () => {
    beforeEach(() => {
      // Ensure user is logged in for wishlist tests
      cy.login('testuser@example.com', 'password123');
      
      // Visit the product catalog page
      catalogPage.visit();
      cy.wait('@getProducts');
    });
    
    it('should add a product to the wishlist', () => {
      // Add first product to wishlist
      catalogPage.addFirstProductToWishlist();
      
      // Verify wishlist notification is displayed
      catalogPage.assertWishlistNotificationDisplayed();
      
      // Verify wishlist count is updated
      catalogPage.assertWishlistCount(1);
    });
    
    it('should view the wishlist', () => {
      // Add a product to the wishlist
      catalogPage.addFirstProductToWishlist();
      
      // Go to wishlist page
      catalogPage.goToWishlist();
      
      // Verify on wishlist page
      cy.url().should('include', '/wishlist');
      
      // Verify wishlist contains the added product
      cy.get('.wishlist-item').should('have.length', 1);
    });
    
    it('should move a product from wishlist to cart', () => {
      // Add a product to the wishlist
      catalogPage.addFirstProductToWishlist();
      
      // Go to wishlist page
      catalogPage.goToWishlist();
      
      // Move product from wishlist to cart
      cy.get('.move-to-cart-button').first().click();
      
      // Verify product is added to cart
      catalogPage.assertCartCount(1);
      
      // Verify product is removed from wishlist
      cy.get('.wishlist-item').should('have.length', 0);
    });
  });
  
  describe('Recently Viewed Products', () => {
    it('should track and display recently viewed products', () => {
      // View first product
      catalogPage.clickFirstProduct();
      cy.wait('@getProduct');
      
      // Go back to catalog
      cy.go('back');
      cy.wait('@getProducts');
      
      // View second product
      catalogPage.clickProductAtIndex(1);
      cy.wait('@getProduct');
      
      // Go back to catalog
      cy.go('back');
      cy.wait('@getProducts');
      
      // Verify recently viewed products section is displayed
      catalogPage.assertRecentlyViewedSectionVisible();
      
      // Verify recently viewed products contains the viewed products
      catalogPage.assertRecentlyViewedProductsCount(2);
    });
  });
  
  describe('Responsive Design', () => {
    it('should display correctly on mobile devices', () => {
      // Set viewport to mobile size
      cy.viewport('iphone-x');
      
      // Verify mobile layout
      catalogPage.assertMobileLayoutCorrect();
      
      // Verify mobile filters button is displayed
      catalogPage.assertMobileFiltersButtonVisible();
      
      // Open mobile filters
      catalogPage.openMobileFilters();
      
      // Verify filters are displayed in a modal/sidebar
      catalogPage.assertMobileFiltersVisible();
    });
    
    it('should display correctly on tablet devices', () => {
      // Set viewport to tablet size
      cy.viewport('ipad-2');
      
      // Verify tablet layout
      catalogPage.assertTabletLayoutCorrect();
    });
  });
  
  describe('Performance', () => {
    it('should lazy load images as user scrolls', () => {
      // Verify initial images are loaded
      catalogPage.assertVisibleImagesLoaded();
      
      // Scroll down
      cy.scrollTo('bottom');
      
      // Verify new images are loaded
      catalogPage.assertAllVisibleImagesLoaded();
    });
  });
  
  describe('Accessibility', () => {
    it('should be accessible', () => {
      // Run accessibility audit
      cy.injectAxe();
      cy.checkA11y(null, {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa']
        }
      });
    });
    
    it('should navigate product grid with keyboard', () => {
      // Focus on first product
      catalogPage.focusOnFirstProduct();
      
      // Navigate with arrow keys
      cy.focused().type('{rightarrow}');
      
      // Verify focus moved to next product
      catalogPage.assertSecondProductIsFocused();
      
      // Activate product with enter key
      cy.focused().type('{enter}');
      
      // Verify navigation to product detail page
      cy.wait('@getProduct');
      productPage.assertOnProductDetailPage();
    });
  });
});
