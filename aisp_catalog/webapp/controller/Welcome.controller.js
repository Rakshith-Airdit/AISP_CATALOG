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
        // Initialize view model for products
        const oProductsData = new JSONModel({
          products: [],
        });

        this.setModel(oProductsData, "oProductsModel");

        this.getRouter().attachRouteMatched(this._onRouteMatched, this);
      },

      _onRouteMatched: function (oEvent) {
        const sRouteName = oEvent.getParameter("name");

        // Always display two columns for home screen
        if (sRouteName === "RouteHome") {
          this.getModel("appView").setProperty(
            "/layout",
            "TwoColumnsMidExpanded"
          );
        }

        // Load all products if not already loaded
        const aProductsData = this.getView()
          .getModel("oProductsModel")
          .getProperty("/products");

        this._loadProductsData();
      },

      _loadProductsData: function () {
        const oModel = this.getOwnerComponent().getModel();
        this.getView().setBusy(true);

        oModel.read("/ProductCatalogItems", {
          success: (oData) => {
            const results = oData.results || oData;
            this.getModel("oProductsModel").setProperty("/products", results);
            this.getView().setBusy(false);
          },
          error: (oError) => {
            console.error("Error loading products:", oError);
            this.getView().setBusy(false);
          },
        });
      },

      onSelectProduct: function (oEvent) {
        const oContext = oEvent.getSource().getBindingContext("oProductsModel");
        if (oContext) {
          const oProduct = oContext.getObject();
          const sCategoryId = oProduct.CommodityCode;
          const sProductId = oProduct.ProductId || oProduct.ID;

          this.getRouter().navTo("RouteProduct", {
            id: sCategoryId,
            productId: sProductId,
          });
        }
      },
    });
  }
);
