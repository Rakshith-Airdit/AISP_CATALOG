sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/Device",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel",
  ],
  function (Controller, Filter, FilterOperator, Device, MessageBox, JSONModel) {
    "use strict";

    return Controller.extend("com.catalog.aispcatalog.controller.Category", {
      onInit: function () {
        this._router = this.getOwnerComponent().getRouter();
        this._router
          .getRoute("RouteCategory")
          .attachPatternMatched(this._onRouteMatched, this);

        this._router
          .getRoute("RouteProduct")
          .attachPatternMatched(this._onRouteMatched, this);

        // Initialize the model for category data
        this.getView().setModel(
          new JSONModel({
            CategoryName: "",
            Products: [],
          }),
          "categoryModel"
        );
      },

      _onRouteMatched: function (oEvent) {
        const oArgs = oEvent.getParameter("arguments");
        const sCategoryId = oArgs.id;
        const sCategoryName = oArgs.categoryName;

        // Set page title
        this.getView()
          .byId("categoryPage")
          .setTitle(sCategoryName || "Category");

        // Load products for this category
        this._loadCategoryProducts(sCategoryId);
      },

      _loadCategoryProducts: function (sCategoryId) {
        const oView = this.getView();
        oView.setBusy(true);

        const oModel = this.getOwnerComponent().getModel();
        let aFilters = [];

        if (sCategoryId !== "0") {
          aFilters = [
            new Filter("CommodityCode", FilterOperator.EQ, sCategoryId),
          ];
        }

        oModel.read("/ProductCatalogItems", {
          filters: aFilters,
          success: (oData) => {
            const results = oData.results || oData;

            // Update the category model
            const oCategoryModel = oView.getModel("categoryModel");
            oCategoryModel.setProperty("/Products", results);
            oCategoryModel.setProperty("/CategoryName", results[0]?.Category);

            oView.setBusy(false);

            // Update info toolbar
            this._updateInfoToolbar(results.length);
          },
          error: (oError) => {
            console.error("Failed to load category products:", oError);
            oView.setBusy(false);
            MessageBox.error(
              "Failed to load products for this category. Please try again."
            );
          },
        });
      },

      // _getCategoryName: function (sCategoryId) {
      //   // You might want to load this from your categories model or cache it
      //   const oCategoriesModel = this.getOwnerComponent().getModel(
      //     "oProductCategoriesModel"
      //   );
      //   if (oCategoriesModel) {
      //     const aCategories = oCategoriesModel.getData();
      //     const oCategory = aCategories.find(
      //       (cat) => cat.Category === sCategoryId
      //     );
      //     return oCategory ? oCategory.CategoryName : "Category";
      //   }
      //   return "Category";
      // },

      _updateInfoToolbar: function (iProductCount) {
        const oInfoToolbar = this.byId("categoryInfoToolbar");
        const oInfoTitle = this.byId("categoryInfoToolbarTitle");

        if (iProductCount > 0) {
          oInfoTitle.setText(
            iProductCount + " product" + (iProductCount !== 1 ? "s" : "")
          );
          oInfoToolbar.setVisible(true);
        } else {
          oInfoToolbar.setVisible(false);
        }
      },

      onBack: function () {
        this._router.navTo("RouteHome");
      },

      onFilter: function () {
        // Implement filter functionality if needed
        MessageBox.information("Filter functionality will be implemented here");
      },

      onProductDetails: function (oEvent) {
        const oItem = oEvent.getParameter("listItem");
        const oContext = oItem.getBindingContext("categoryModel");
        const oProduct = oContext.getObject();

        this._router.navTo(
          "RouteProduct",
          {
            id: oProduct.CommodityCode,
            productId: oProduct.ProductId,
          },
          !Device.system.phone
        );
      },

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
