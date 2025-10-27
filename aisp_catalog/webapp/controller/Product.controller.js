sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/Device",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
  ],
  function (Controller, Device, MessageBox, MessageToast) {
    "use strict";

    return Controller.extend("com.catalog.aispcatalog.controller.Product", {
      onInit: function () {
        this._router = this.getOwnerComponent().getRouter();
        this._router
          .getRoute("RouteProduct")
          .attachPatternMatched(this._onRouteMatched, this);
      },

      _onRouteMatched: function (oEvent) {
        const oArgs = oEvent.getParameter("arguments");
        const sCategoryId = oArgs.id;
        const sProductId = oArgs.productId;

        // Load product details
        this._loadProductDetails(sCategoryId, sProductId);
      },

      _loadProductDetails: function (sCategoryId, sProductId) {
        const oView = this.getView();
        oView.setBusy(true);

        const oModel = this.getOwnerComponent().getModel();
        const aFilters = [
          new sap.ui.model.Filter(
            "CommodityCode",
            sap.ui.model.FilterOperator.EQ,
            sCategoryId
          ),
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
              // Set the first product as context
              oView.bindElement({
                path: "/" + 0,
                model: "productModel",
              });

              // Create a model with the product data
              const oProductModel = new sap.ui.model.json.JSONModel(results[0]);
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

      onBack: function () {
        this._router.navTo("category", {
          id: this._getCurrentCategory(),
        });
      },

      _getCurrentCategory: function () {
        // Extract category from current binding context or route
        const oContext = this.getView().getBindingContext("productModel");
        if (oContext) {
          return oContext.getProperty("CommodityCode");
        }
        return "";
      },

      // onAvatarPress: function () {
      //   MessageToast.show("User profile clicked");
      //   // Implement user profile functionality
      // },

      // onToggleCart: function (oEvent) {
      //   const bPressed = oEvent.getParameter("pressed");
      //   MessageToast.show("Cart " + (bPressed ? "opened" : "closed"));
      //   // Implement cart toggle functionality
      // },

      // onAddToCart: function () {
      //   const oProduct = this.getView().getModel("productModel").getData();
      //   MessageToast.show("Added " + oProduct.Name + " to cart");

      //   // Implement add to cart logic here
      //   // You might want to update a cart model or call a service
      // },

      /**
       * Formatter functions
       */
      formatter: {
        pictureUrl: function (sUrl) {
          return sUrl || "sap-icon://product";
        },
        price: function (fPrice) {
          return fPrice ? parseFloat(fPrice).toFixed(2) : "0.00";
        },
        statusText: function (sStatus) {
          const statusMap = {
            Available: "Available",
            OutOfStock: "Out of Stock",
            LowStock: "Low Stock",
            Discontinued: "Discontinued",
          };
          return statusMap[sStatus] || "Available";
        },
        statusState: function (sStatus) {
          const statusMap = {
            Available: "Success",
            OutOfStock: "Error",
            LowStock: "Warning",
            Discontinued: "None",
          };
          return statusMap[sStatus] || "None";
        },
      },
    });
  }
);
