sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
  ],
  (BaseController, JSONModel, MessageToast, MessageBox) => {
    "use strict";

    const BADGE_MAX_VALUE = 999;

    return BaseController.extend(
      "com.aisp.buyercatalog.aispbuyercatalog.controller.App",
      {
        onInit() {
          const oViewModel = new JSONModel({
            busy: true,
            delay: 0,
            layout: "OneColumn",
            smallScreenMode: true,
          });

          this.getView().setModel(oViewModel, "appView");

          // Initialize Cart Model
          this._initCartModel();

          const iOriginalBusyDelay = this.getView().getBusyIndicatorDelay();

          const fnSetAppNotBusy = () => {
            oViewModel.setProperty("/busy", false);
            oViewModel.setProperty("/delay", iOriginalBusyDelay);
          };

          this.getOwnerComponent()
            .getModel()
            .metadataLoaded()
            .then(fnSetAppNotBusy);

          this.getOwnerComponent()
            .getModel()
            .attachMetadataFailed(fnSetAppNotBusy);

          // Subscribe to cart events
          this._subscribeToCartEvents();
        },

        _initCartModel: function () {
          // Load cart from localStorage or create empty
          const oCartData = this._loadCartFromStorage() || {
            items: [],
            totalItems: 0,
            totalPrice: 0,
            currency: "INR",
          };

          const oCartModel = new JSONModel(oCartData);

          this.getView().setModel(oCartModel, "cartModel");
        },

        _loadCartFromStorage: function () {
          try {
            const sCartData = localStorage.getItem("cartItems");
            return sCartData ? JSON.parse(sCartData) : null;
          } catch (oError) {
            console.error("Error loading cart from storage:", oError);
            return null;
          }
        },

        _saveCartToStorage: function () {
          try {
            const oCartData = this.getView().getModel("cartModel").getData();
            localStorage.setItem("cartItems", JSON.stringify(oCartData));
          } catch (oError) {
            console.error("Error saving cart to storage:", oError);
          }
        },

        _subscribeToCartEvents: function () {
          this.getOwnerComponent()
            .getEventBus()
            .subscribe("cart", "addItem", this.onAddToCart, this);
          this.getOwnerComponent()
            .getEventBus()
            .subscribe("cart", "removeItem", this.onRemoveFromCart, this);
          this.getOwnerComponent()
            .getEventBus()
            .subscribe("cart", "updateItem", this.onUpdateCart, this);
          this.getOwnerComponent()
            .getEventBus()
            .subscribe("cart", "clearCart", this.onClearCart, this);
        },

        onAddToCart: function (sChannel, sEvent, oData) {
          const oCartModel = this.getView().getModel("cartModel");
          const aCartItems = oCartModel.getProperty("/items");
          const oProduct = oData.product;

          const oExistingItem = aCartItems.find(
            (item) => item.ProductId === oProduct.ProductId
          );

          if (oExistingItem) {
            oExistingItem.quantity += 1;
            oExistingItem.totalPrice =
              oExistingItem.quantity * oProduct.UnitPrice;
          } else {
            // Add new item to cart
            aCartItems.push({
              ProductId: oProduct.ProductId,
              ProductName: oProduct.ProductName,
              ProductDescription: oProduct.ProductDescription,
              ProductImage: oProduct.ProductImage,
              ProductSpecification: oProduct.ProductSpecification,
              UnitPrice: oProduct.UnitPrice,
              PartNumber: oProduct.PartNumber,
              UnitOfMeasure: oProduct.UnitOfMeasure,
              CurrencyCode: oProduct.CurrencyCode,
              CommodityCode: oProduct.CommodityCode,
              Category: oProduct.Category,
              LeadTimeDays: oProduct.LeadTimeDays,
              quantity: oData.quantity || 1,
              totalPrice: (oData.quantity || 1) * oProduct.UnitPrice,
            });
          }

          this._updateCartTotals(aCartItems);
          this._saveCartToStorage();

          MessageToast.show(`Added ${oProduct.ProductName} to cart`);
        },

        onRemoveFromCart: function (sChannel, sEvent, oData) {
          const oCartModel = this.getView().getModel("cartModel");
          const aCartItems = oCartModel.getProperty("/items");
          const productId = oData.productId;

          const filteredItems = aCartItems.filter(
            (item) => item.ProductId !== productId
          );
          oCartModel.setProperty("/items", filteredItems);

          this._updateCartTotals(filteredItems);
          this._saveCartToStorage();
          MessageToast.show("Item removed from cart");
        },

        onUpdateCart: function (sChannel, sEvent, oData) {
          const oCartModel = this.getView().getModel("cartModel");
          const aCartItems = oCartModel.getProperty("/items");
          this._updateCartTotals(aCartItems);
          // Force badge update
          this._updateBadgeDisplay();
        },

        _updateCartTotals: function (aCartItems) {
          const oCartModel = this.getView().getModel("cartModel");

          const totalItems = aCartItems.reduce(
            (sum, item) => sum + item.quantity,
            0
          );

          const totalPrice = aCartItems.reduce(
            (sum, item) => sum + item.totalPrice,
            0
          );

          oCartModel.setProperty("/totalItems", totalItems);
          oCartModel.setProperty("/totalPrice", totalPrice);
          oCartModel.setProperty("/badgeCurrent", totalItems);

          // Update badge display
          this._updateBadgeDisplay();
          this._saveCartToStorage();
        },

        _updateBadgeDisplay: function () {
          const oCartModel = this.getView().getModel("cartModel");
          const iTotalItems = oCartModel.getProperty("/totalItems");
          const oCartButton = this.byId("cartButton");

          if (oCartButton) {
            // Get the badge custom data
            const aCustomData = oCartButton.getCustomData();
            const oBadgeData = aCustomData.find(function (oData) {
              return oData.getKey() === "badge";
            });

            if (oBadgeData) {
              // Update badge value and visibility
              oBadgeData.setValue(this._formatBadgeValue(iTotalItems));
              oBadgeData.setVisible(iTotalItems > 0);
            }
          }
        },

        onClearCart: function (sChannel, sEvent, oData) {
          const oCartModel = this.getView().getModel("cartModel");

          // Clear all cart items
          oCartModel.setData({
            items: [],
            totalItems: 0,
            totalPrice: 0,
            currency: "INR",
          });

          this._saveCartToStorage(); // ✅ Save to localStorage
          MessageToast.show("Cart cleared successfully");

          // Update badge display
          this._updateBadgeDisplay();
        },

        _formatBadgeValue: function (iValue) {
          if (iValue <= 0) {
            return "0";
          } else if (iValue > this.BADGE_MAX_VALUE) {
            return "999+";
          } else {
            return iValue.toString();
          }
        },

        // Method to clear cart badge
        clearCartBadge: function () {
          const oCartModel = this.getView().getModel("cartModel");
          oCartModel.setProperty("/totalItems", 0);
          oCartModel.setProperty("/badgeCurrent", 0);
          this._updateBadgeDisplay();
          this._saveCartToStorage();
        },

        onPressCart: function () {
          this.getOwnerComponent().getRouter().navTo("RouteCart");
        },

        onLogoPressed: function () {
          this.getOwnerComponent().getRouter().navTo("home");
        },
      }
    );
  }
);
