sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox",
  ],
  (Controller, JSONModel, Filter, FilterOperator, MessageBox) => {
    "use strict";

    return Controller.extend(
      "com.aisp.buyercatalog.aispbuyercatalog.controller.CatalogList",
      {
        onInit() {
          const oProductsData = new JSONModel({
            products: [],
          });

          this.getView().setModel(oProductsData, "oProductsModel");

          this.getOwnerComponent()
            .getRouter()
            .getRoute("RouteCatalogList")
            .attachPatternMatched(this._onRouteMatched, this);

          this.getOwnerComponent()
            .getRouter()
            .getRoute("RouteProduct")
            .attachPatternMatched(this._onProductRouteMatched, this);
        },

        _onRouteMatched: function (oEvent) {
          let oSmartFilter = this.byId("smartFilterBar");
          if (oSmartFilter) {
            oSmartFilter.setVisible(true);
          }
          this.getView()
            .getModel("appView")
            .setProperty("/layout", "OneColumn");

          this._loadProductsData();
        },

        _onProductRouteMatched: function (oEvent) {
          let oSmartFilter = this.byId("smartFilterBar");
          if (oSmartFilter) {
            oSmartFilter.setVisible(false);
          }
          this.getView()
            .getModel("appView")
            .setProperty("/layout", "TwoColumnsMidExpanded");

          this._loadProductsData();
        },

        _loadProductsData: function () {
          const oProductModel = this.getView().getModel();
          this.getView().setBusy(true);

          oProductModel.read("/ProductCatalogItems", {
            // urlParameters: {
            //   $orderby: "isFavorite desc",
            // },
            success: (oData) => {
              const results = oData.results || oData;
              this.getView()
                .getModel("oProductsModel")
                .setProperty("/products", results);
              console.log(results);
              this.getView().setBusy(false);
            },
            error: (oError) => {
              console.error("Error loading products:", oError);
              this.getView().setBusy(false);
            },
          });
        },

        onToggleFavorite: function (oEvent) {
          const oSource = oEvent.getSource();
          const oContext = oSource.getBindingContext("oProductsModel");
          const oProductData = oContext.getObject();
          const sProductID = oProductData.ProductId;
          const oProductModel = this.getView().getModel();
          const oGridList = this.byId("gridList");

          this.getView().setBusy(true);

          oProductModel.create(
            "/toggleFavorite",
            {
              productId: sProductID,
            },
            {
              success: (oData) => {
                const results = oData.results || oData;
                console.log(results);
                this._loadProductsData();
                // oGridList.getBinding("items").refresh(true);
                // this.getView().getModel("oProductsModel").refresh();
                this.getView().setBusy(false);
              },
              error: (oError) => {
                console.error("Error loading products:", oError);
                this.getView().setBusy(false);
              },
            }
          );
        },

        onViewChange: function (oEvent) {
          const sSelectedKey = oEvent.getSource().getSelectedKey();
          const oNavContainer = this.byId("catalogNavContainer");

          // Update model
          this.getView()
            .getModel("oProductsModel")
            .setProperty("/currentView", sSelectedKey);

          // Navigate to the selected view with animation
          if (sSelectedKey === "table") {
            oNavContainer.to(this.byId("tablePage"), "slide");
          } else {
            oNavContainer.to(this.byId("gridPage"), "slide");
          }
        },

        onListItemPress: function (oEvent) {
          const oNavContainer = this.byId("catalogNavContainer");
          const oSelectedItem = oEvent.getParameter("listItem");
          const oContext = oSelectedItem.getBindingContext("oProductsModel");
          const oProductData = oContext.getObject();

          let oSmartFilter = this.byId("smartFilterBar");
          if (oSmartFilter) {
            oSmartFilter.setVisible(false);
          }

          this.getOwnerComponent().getRouter().navTo("RouteProduct", {
            productId: oProductData.ProductId,
          });
        },

        onColumnListItemPress: function (oEvent) {
          var oItem = oEvent.getSource();
          var oContext = oItem.getBindingContext("oProductsModel");
          const oProductData = oContext.getObject();

          let oSmartFilter = this.byId("smartFilterBar");
          if (oSmartFilter) {
            oSmartFilter.setVisible(false);
          }

          this.getOwnerComponent().getRouter().navTo("RouteProduct", {
            productId: oProductData.ProductId,
          });
        },

        // This function runs when the "Go" button is pressed
        onSearch: function (oEvent) {
          // 1. Get the SmartFilterBar
          const oSmartFilterBar = this.byId("smartFilterBar");
          if (!oSmartFilterBar) return;

          // 2. Get the array of SAPUI5 Filter objects based on user input
          // Note: The property names in your JSON Model must match the SmartFilterBar keys (e.g., "ProductName")
          const aFilters = oSmartFilterBar.getFilters();

          // 3. Apply to Grid View
          const oGridList = this.byId("gridList");
          const oGridBinding = oGridList.getBinding("items");
          if (oGridBinding) {
            oGridBinding.filter(aFilters);
          }

          // 4. Apply to Table View
          const oTable = this.byId("productsTable");
          const oTableBinding = oTable.getBinding("items");
          if (oTableBinding) {
            oTableBinding.filter(aFilters);
          }
        },

        onAddToCart: function (oEvent) {
          const oButton = oEvent.getSource();
          const oContext = oButton.getBindingContext("oProductsModel");

          if (oContext) {
            const oProductData = oContext.getObject();

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

        onPressSendEmail: function (oEvent) {
          const oSource = oEvent.getSource();
          const oContext = oSource.getBindingContext("oProductsModel")
          const oProduct = oContext.getObject();

          const oPayload = {
            "receiver": "vibebap807@moondyal.com",
            "SupplierName": "Test Supplier",
            "BuyerCompanyName": "Company XYZ",
            "BuyerName": "Test Buyer",
            "BuyerContactInfo": "+91-1234567890",
            "BuyerEmailAddress": "buyer@gmail.com",
            "Products": [{
              "ProductName": oProduct.ProductName,
              "ProductDescription": oProduct.ProductDescription || "",
              "UnitOfMeasure": oProduct.UnitOfMeasure,
              "UnitPrice": parseFloat(oProduct.UnitPrice),
              "PartNo": oProduct.PartNumber,
              "CommodityCode": oProduct.CommodityCode?.toString(),
              "CurrencyCode": oProduct.CurrencyCode,
              "quantity": oProduct.quantity || 1,
              "totalPrice": parseFloat(oProduct.UnitPrice) * (oProduct.quantity || 1)
            }]
          }

          this.sendEmailRequest(oPayload);
        },

        sendEmailRequest: function (oPayload) {
          const oModel = this.getOwnerComponent().getModel();

          console.log("Payload", oPayload)

          this.getView().setBusy(true);

          oModel.create(
            "/triggerProductRequestEmail", oPayload,
            {
              success: (oData) => {
                const successMsg = oData.triggerProductRequestEmail.message || "Email sent successfully!!";
                MessageBox.success(successMsg);
                this.getView().setBusy(false);
              },
              error: (oError) => {
                console.error("Error loading products:", oError);
                MessageBox.error("Something went wrong, Could not send the email!! Please try again later");
                this.getView().setBusy(false);
              },
            }
          );
        }
      }
    );
  }
);
