sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
  ],
  (Controller, JSONModel, Filter, FilterOperator, MessageBox, MessageToast) => {
    "use strict";

    return Controller.extend(
      "com.aisp.buyercatalog.aispbuyercatalog.controller.Cart",
      {
        onInit() {
          this.getOwnerComponent()
            .getRouter()
            .getRoute("RouteCart")
            .attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function (oEvent) {
          this.getView()
            .getModel("appView")
            .setProperty("/layout", "OneColumn");

          this._loadCartData();
        },

        _loadCartData: function (oEvent) {
          const oCartModel = this.getView().getModel("cartModel");

          // Check if cart model has data, if not load from localStorage
          if (
            !oCartModel ||
            !oCartModel.getProperty("/items") ||
            oCartModel.getProperty("/items").length === 0
          ) {
            this._loadCartFromStorage();
          }
        },

        _loadCartFromStorage: function () {
          try {
            const sCartData = localStorage.getItem("cartItems");
            if (sCartData) {
              const oCartData = JSON.parse(sCartData);
              const oCartModel = this.getView().getModel("cartModel");

              if (oCartModel) {
                oCartModel.setData(oCartData);
                console.log("Cart data loaded from localStorage");
              } else {
                // Create cart model if it doesn't exist
                this.getView().setModel(new JSONModel(oCartData), "cartModel");
              }
            } else {
              console.log("No cart data found in localStorage");
            }
          } catch (oError) {
            console.error("Error loading cart from storage:", oError);
          }
        },

        onRemoveItem: function (oEvent) {
          const oButton = oEvent.getSource();
          const oRow = oButton.getParent();
          const oContext = oRow.getBindingContext("cartModel");

          if (!oContext) {
            MessageBox.error("Unable to remove item");
            return;
          }

          const oProduct = oContext.getObject();
          const oCartModel = this.getView().getModel("cartModel");
          const aItems = oCartModel.getProperty("/items");

          // Check if this is the last item before removing
          const isLastItem = aItems.length === 1;

          this.getOwnerComponent().getEventBus().publish("cart", "removeItem", {
            productId: oProduct.ProductId,
          });

          // If it was the last item, navigate back after removal
          if (isLastItem) {
            // Use setTimeout to ensure the removal is processed first
            setTimeout(() => {
              this.getOwnerComponent().getRouter().navTo("RouteCatalogList");
            }, 100);
          }
        },

        onUpdateQuantity: function (oEvent) {
          const oInput = oEvent.getSource();
          const oRow = oInput.getParent();
          const oContext = oRow.getBindingContext("cartModel");

          if (!oContext) {
            MessageBox.error("Unable to update quantity");
            return;
          }

          const oProduct = oContext.getObject();
          const iNewQuantity = parseInt(oInput.getValue());

          if (iNewQuantity > 0) {
            const oCartModel = this.getView().getModel("cartModel");
            const aItems = oCartModel.getProperty("/items");
            const oCartItem = aItems.find(
              (item) => item.ProductId === oProduct.ProductId
            );

            if (oCartItem) {
              oCartItem.quantity = iNewQuantity;
              oCartItem.totalPrice =
                oCartItem.quantity * parseFloat(oCartItem.UnitPrice);

              this.getOwnerComponent()
                .getEventBus()
                .publish("cart", "updateItem", {});
            }
          } else {
            MessageBox.warning("Quantity must be at least 1");
            oInput.setValue(oProduct.quantity);
          }
        },

        onClearCart: function () {
          MessageBox.confirm(
            "Are you sure you want to clear all items from your cart?",
            {
              title: "Clear Cart",
              onClose: (sAction) => {
                if (sAction === MessageBox.Action.OK) {
                  this.getOwnerComponent()
                    .getEventBus()
                    .publish("cart", "clearCart", {});

                  // Optional: Show confirmation message
                  MessageBox.success("Cart cleared successfully", {
                    title: "Cart Cleared",
                    onClose: (sAction) => {
                      if (sAction === MessageBox.Action.OK) {
                        this.getOwnerComponent()
                          .getRouter()
                          .navTo("RouteCatalogList");
                      }
                    },
                  });
                }
              },
            }
          );
        },

        onSendRequest: function (oEvent) {
          debugger;
          let oModel = this.getOwnerComponent().getModel();
          let oCartModel = this.getView().getModel("cartModel");
          let aSelectedItems = oCartModel.getProperty("/items");

          if (!aSelectedItems || aSelectedItems.length === 0) {
            MessageBox.error("No product items added to cart to send an email!!");
            return;
          }

          // Transform all selected products to match the expected structure
          const aProducts = aSelectedItems.map((oItem) => {
            return {
              "ProductName": oItem.ProductName,
              "ProductDescription": oItem.ProductDescription || "",
              "UnitOfMeasure": oItem.UnitOfMeasure || "PCS", // Default value if missing
              "UnitPrice": parseFloat(oItem.UnitPrice) || 0,
              "PartNo": oItem.PartNumber || "", // Fallback to ProductId if PartNumber missing
              "CommodityCode": oItem.CommodityCode?.toString() || "",
              "CurrencyCode": oItem.CurrencyCode || "USD",
              "quantity": oItem.quantity || 1,
              "totalPrice": (parseFloat(oItem.UnitPrice) || 0) * (oItem.quantity || 1)
            };
          });

          const payload = {
            "receiver": "vibebap807@moondyal.com",
            "SupplierName": "Test Supplier",
            "BuyerCompanyName": "Company XYZ",
            "BuyerName": "Test Buyer",
            "BuyerContactInfo": "+91-1234567890",
            "BuyerEmailAddress": "buyer@gmail.com",
            "Products": aProducts
          };

          this.getView().setBusy(true);

          oModel.create(
            "/triggerProductRequestEmail",
            payload,
            {
              success: (oData) => {
                console.log(oData);
                MessageBox.success(`Email sent successfully for ${aProducts.length} product(s)!`, {
                  title: "Success",
                  onClose: (sAction) => {
                    if (sAction === MessageBox.Action.OK) {
                      this.getView().setBusy(false);
                      this.getOwnerComponent()
                        .getEventBus()
                        .publish("cart", "clearCart", {});
                      this.getOwnerComponent()
                        .getRouter()
                        .navTo("RouteCatalogList");
                    }
                  },
                });

              },
              error: (oError) => {
                console.error("Error sending email:", oError);
                MessageBox.error("Something went wrong, Could not send the email!! Please try again later");
                this.getView().setBusy(false);
              },
            }
          );
        },

        onNavBack: function () {
          this.getOwnerComponent().getRouter().navTo("RouteCatalogList");
        },
      }
    );
  }
);
