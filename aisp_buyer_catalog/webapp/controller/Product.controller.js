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
      "com.aisp.buyercatalog.aispbuyercatalog.controller.Product",
      {
        onInit() {
          const oProductsData = new JSONModel({
            product: [],
          });

          this.getView().setModel(oProductsData, "oProductsModel");

          this.getOwnerComponent()
            .getRouter()
            .getRoute("RouteProduct")
            .attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function (oEvent) {
          //   this._loadProductsData();
          this.getView()
            .getModel("appView")
            .setProperty("/layout", "TwoColumnsMidExpanded");

          const oArgs = oEvent.getParameter("arguments");
          const sProductId = oArgs.productId;

          // Load product details
          this._loadProductDetails(sProductId);
        },

        _loadProductDetails: function (sProductId) {
          const oView = this.getView();
          oView.setBusy(true);

          const oModel = this.getOwnerComponent().getModel();

          const aFilters = [
            new sap.ui.model.Filter(
              "ProductId",
              sap.ui.model.FilterOperator.EQ,
              sProductId
            ),
          ];

          oModel.read("/ProductCatalogItems", {
            filters: aFilters,
            success: (oData) => {
              const results = oData.results || oData;
              if (results.length > 0) {
                // Create a model with the product data
                const oProductModel = new sap.ui.model.json.JSONModel(
                  results[0]
                );

                oView.setModel(oProductModel, "productModel");
              } else {
                MessageBox.error("Product not found");
                this.onBack();
              }
              oView.setBusy(false);
            },
            error: (oError) => {
              console.error("Failed to load product details:", oError);
              oView.setBusy(false);
              MessageBox.error(
                "Failed to load product details. Please try again."
              );
              this.onBack();
            },
          });
        },

        onAddToCart: function (oEvent) {
          const oButton = oEvent.getSource();
          let oProductModel = this.getView().getModel("productModel")
          const oProductData = oProductModel.getData();

          if (oProductData) {
            // Publish event to add item to cart
            this.getOwnerComponent().getEventBus().publish("cart", "addItem", {
              product: oProductData,
              quantity: 1,
            });

            // Optional: Trigger badge animation
            this.getOwnerComponent()
              .getEventBus()
              .publish("cart", "updateItem", {
                action: "add",
              });
          }
        },
      }
    );
  }
);
