sap.ui.define(
  [
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "../model/formatter",
  ],
  function (BaseController, JSONModel, Filter, FilterOperator, formatter) {
    "use strict";

    return BaseController.extend("com.catalog.aispcatalog.controller.Welcome", {
      formatter: formatter,

      onInit: function () {
        // Initialize view model for products and currency
        const oViewModel = new JSONModel({
          AllProducts: [],
          Currency: "EUR",
        });
        this.getView().setModel(oViewModel, "view");

        // Initialize cart model if it doesn't exist at component level
        this._initializeCartModel();

        this.getRouter().attachRouteMatched(this._onRouteMatched, this);
      },

      _initializeCartModel: function () {
        const oComponent = this.getOwnerComponent();
        if (!oComponent.getModel("cart")) {
          // Create cart model at component level so it persists across routes
          const oCartModel = new JSONModel({
            items: [],
            totalItems: 0,
            totalPrice: 0,
          });
          oComponent.setModel(oCartModel, "cart");
        }
      },

      _onRouteMatched: function (oEvent) {
        const sRouteName = oEvent.getParameter("name");

        // Always display two columns for home screen
        if (sRouteName === "RouteHome") {
          this._setLayout("Two");
        }

        // Load all products if not already loaded
        const aProductsData = this.getView()
          .getModel("view")
          .getProperty("/AllProducts");
        if (!aProductsData.length) {
          this._loadAllProducts();
        }
      },

      _loadAllProducts: function () {
        const oModel = this.getOwnerComponent().getModel();

        oModel.read("/ProductCatalogItems", {
          success: (oData) => {
            const results = oData.results || oData;
            this.getModel("view").setProperty("/AllProducts", results);
          },
          error: (oError) => {
            console.error("Error loading products:", oError);
          },
        });
      },

      onSelectProduct: function (oEvent) {
        const oContext = oEvent.getSource().getBindingContext("view");
        if (oContext) {
          const oProduct = oContext.getObject();
          const sCategoryId = oProduct.Category;
          const sProductId = oProduct.ProductId || oProduct.ID;

          this.getRouter().navTo("RouteProduct", {
            id: sCategoryId,
            productId: sProductId,
          });
        }
      },

      onShowCategories: function () {
        // Navigate back to show categories (for small screens)
        this.onBack();
      },

      onAddToCart: function (oEvent) {
        const oButton = oEvent.getSource();
        const oContext = oButton.getBindingContext("view");

        if (oContext) {
          const oProduct = oContext.getObject();
          this._addProductToCart(oProduct);
        }
      },

      _addProductToCart: function (oProduct) {
        const oCartModel = this.getOwnerComponent().getModel("cart");
        const aCartItems = oCartModel.getProperty("/items");

        // Check if product already exists in cart
        const existingItemIndex = aCartItems.findIndex(
          (item) =>
            item.ProductId === oProduct.ProductId || item.ID === oProduct.ID
        );

        if (existingItemIndex >= 0) {
          // Increase quantity if product already in cart
          aCartItems[existingItemIndex].quantity += 1;
        } else {
          // Add new item to cart
          aCartItems.push({
            ProductId: oProduct.ProductId || oProduct.ID,
            Name: oProduct.Name,
            Price: oProduct.Price,
            PictureUrl: oProduct.PictureUrl,
            Category: oProduct.Category,
            quantity: 1,
          });
        }

        // Update cart totals
        this._updateCartTotals(aCartItems);

        // Show confirmation message
        sap.m.MessageToast.show(`Added ${oProduct.Name} to cart`);
      },

      _updateCartTotals: function (aCartItems) {
        const oCartModel = this.getOwnerComponent().getModel("cart");
        const iTotalItems = aCartItems.reduce(
          (total, item) => total + item.quantity,
          0
        );
        const fTotalPrice = aCartItems.reduce(
          (total, item) => total + item.Price * item.quantity,
          0
        );

        oCartModel.setProperty("/totalItems", iTotalItems);
        oCartModel.setProperty("/totalPrice", fTotalPrice.toFixed(2));
        oCartModel.setProperty("/items", aCartItems);
      },

      // onToggleCart: function (oEvent) {
      //   const bPressed = oEvent.getParameter("pressed");
      //   this._setLayout(bPressed ? "Three" : "Two");

      //   if (bPressed) {
      //     this.getRouter().navTo("cart");
      //   } else {
      //    // Hide cart, stay on current page
      //    // The cart model persists so items remain
      //   }
      // },

      onAvatarPress: function () {
        sap.m.MessageToast.show("User profile pressed");
      },
    });
  }
);
