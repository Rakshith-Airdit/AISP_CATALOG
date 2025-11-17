sap.ui.define(
  [
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/Device",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment",
  ],
  function (
    BaseController,
    JSONModel,
    Filter,
    FilterOperator,
    Device,
    MessageBox,
    MessageToast,
    Fragment
  ) {
    "use strict";

    return BaseController.extend("com.catalog.aispcatalog.controller.Home", {
      onInit: function () {
        const oComponent = this.getOwnerComponent();
        this._router = this.getRouter();

        // Initialize models
        this.setModel(new JSONModel([]), "oCommodityCodesModel");
        this.setModel(new JSONModel([]), "oProductItemsModel");

        // Attach route matched event
        this._router
          .getRoute("RouteHome")
          .attachMatched(this._onRouteMatched, this);
      },

      _onRouteMatched: function () {
        // const bSmallScreen =
        //   this.getModel("appView").getProperty("/smallScreenMode");
        // if (bSmallScreen) {
        //   this._setLayout("One");
        // }

        // Load initial data
        this._loadCommodities();
      },

      _loadCommodities: function () {
        this.getView().setBusy(true);

        const oModel = this.getOwnerComponent().getModel();
        oModel.read("/ProductCatalogCommodityCodes", {
          success: (oData) => {
            const results = oData.results || oData;
            this.getModel("oCommodityCodesModel").setData(results);
            this.getView().setBusy(false);
          },
          error: (oError) => {
            console.error("Error loading categories:", oError);
            this.getView().setBusy(false);
            MessageBox.error("Failed to load categories. Please try again.");
          },
        });
      },

      onSearch: function () {
        const oView = this.getView();
        const oCategoryList = oView.byId("categoryList");
        const oProductList = oView.byId("productList");
        const oSearchField = oView.byId("searchField");

        // Switch visibility of lists
        const bShowSearchResults = oSearchField.getValue().length !== 0;
        oProductList.setVisible(bShowSearchResults);
        oCategoryList.setVisible(!bShowSearchResults);

        if (bShowSearchResults) {
          this._loadSearchResults(oSearchField.getValue());
        } else {
          // Clear product list when search is empty
          this.getModel("oProductItemsModel").setData([]);
        }
      },

      // Trigger search again and hide pullToRefresh when data ready
      // onRefresh: function (oEvent) {
      //   const oProductList = this.byId("productList");
      //   const oCategoryList = this.byId("categoryList");
      //   const oBinding = oCategoryList.getBinding("items");
      //   const fnHandler = () => {
      //     this.byId("pullToRefresh").hide();
      //     oBinding.detachDataReceived(fnHandler);
      //   };
      //   oBinding.attachDataReceived(fnHandler);
      //   this.onSearch();
      // },

      _loadSearchResults: function (sQuery) {
        this.getView().setBusy(true);

        const oModel = this.getOwnerComponent().getModel();

        const aFilters = [
          new Filter("ProductName", FilterOperator.Contains, sQuery),
        ];

        oModel.read("/ProductCatalogItems", {
          filters: aFilters,
          success: (oData) => {
            const results = oData.results || oData;
            this.getModel("oProductItemsModel").setData(results);
            this.getView().setBusy(false);
          },
          error: (oError) => {
            console.error("Search failed:", oError);
            this.getView().setBusy(false);
            MessageBox.error("Search failed. Please try again.");
          },
        });
      },

      onCategoryListItemPress: function (oEvent) {
        const oSource = oEvent.getSource();

        const oBindingContext = oSource.getBindingContext(
          "oCommodityCodesModel"
        );

        const sCommdityCode = oBindingContext.getProperty("Commodity");
        const sCategoryName = oBindingContext.getProperty("CommodityName");

        debugger;

        // Navigate to category detail page
        this._router.navTo("RouteCategory", {
          id: sCommdityCode,
          categoryName: sCategoryName,
        });
      },

      onProductListItemPress: function (oEvent) {
        const oSource = oEvent.getSource();
        const oSelectedItem = oSource.getSelectedItem();
        const oBindingContext =
          oSelectedItem.getBindingContext("oProductItemsModel");
        const sCategoryId = oBindingContext.getProperty("Commodity");
        const sProductId = oBindingContext.getProperty("ProductId");

        debugger;

        this._router.navTo(
          "RouteProduct",
          {
            id: sCategoryId,
            productId: sProductId,
          },
          !Device.system.phone
        );
      },

      /**
       * Navigate back to categories from search results
       */
      onBackToCategories: function () {
        const oView = this.getView();
        oView.byId("categoryList").setVisible(true);
        oView.byId("productList").setVisible(false);
        oView.byId("searchField").setValue("");
        this.getView().getModel("oProductItemsModel").setData([]);
      },

      /**
       * Clear search and show categories
       */
      onClearSearch: function () {
        const oSearchField = this.byId("searchField");
        if (oSearchField.getValue()) {
          oSearchField.setValue("");
          this.onSearch();
        }
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
