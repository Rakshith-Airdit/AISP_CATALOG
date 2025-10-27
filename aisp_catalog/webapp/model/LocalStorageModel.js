sap.ui.define(
  ["sap/ui/model/json/JSONModel", "sap/ui/util/Storage"],
  function (JSONModel, Storage) {
    "use strict";

    return JSONModel.extend("com.catalog.aispcatalog.model.LocalStorageModel", {
      _STORAGE_KEY: "PRODUCT_CATALOG_DATA",

      _storage: new Storage(Storage.Type.local),

      constructor: function (sStorageKey, oSettings) {
        // Call super constructor
        JSONModel.apply(this, [].slice.call(arguments, 1));
        this.setSizeLimit(1000000);

        // Override default storage key if provided
        if (sStorageKey) {
          this._STORAGE_KEY = sStorageKey;
        }

        // Load data from local storage
        this._loadData();

        return this;
      },

      _loadData: function () {
        const sJSON = this._storage.get(this._STORAGE_KEY);

        if (sJSON) {
          try {
            this.setData(JSON.parse(sJSON));
          } catch (oError) {
            console.error("Error parsing stored data:", oError);
            // Initialize with default data if parsing fails
            this.setData({
              catalogItems: [],
              selectedProduct: null,
            });
          }
        } else {
          // Initialize with default data if no stored data
          this.setData({
            catalogItems: [],
            selectedProduct: null,
          });
        }
        this._bDataLoaded = true;
      },

      _storeData: function () {
        const oData = this.getData();
        const sJSON = JSON.stringify(oData);
        this._storage.put(this._STORAGE_KEY, sJSON);
      },

      setProperty: function () {
        JSONModel.prototype.setProperty.apply(this, arguments);
        this._storeData();
      },

      setData: function () {
        JSONModel.prototype.setData.apply(this, arguments);
        if (this._bDataLoaded) {
          this._storeData();
        }
      },

      refresh: function () {
        JSONModel.prototype.refresh.apply(this, arguments);
        this._storeData();
      },

      // Clear all data from storage
      clearData: function () {
        this.setData({
          catalogItems: [],
          selectedProduct: null,
        });
        this._storeData();
      },

      // Get catalog items
      getCatalogItems: function () {
        return this.getProperty("/catalogItems") || [];
      },

      // Add item to catalog
      addCatalogItem: function (oItem) {
        const aCatalogItems = this.getCatalogItems();
        aCatalogItems.push(oItem);
        this.setProperty("/catalogItems", aCatalogItems);
      },

      // Remove item from catalog
      removeCatalogItem: function (sItemId) {
        const aCatalogItems = this.getCatalogItems();
        const aUpdatedItems = aCatalogItems.filter(
          (item) => item.id !== sItemId
        );
        this.setProperty("/catalogItems", aUpdatedItems);

        // Clear selection if the selected item was removed
        const oSelectedProduct = this.getProperty("/selectedProduct");
        if (oSelectedProduct && oSelectedProduct.id === sItemId) {
          this.setProperty("/selectedProduct", null);
        }
      },

      // Set selected product
      setSelectedProduct: function (oProduct) {
        this.setProperty("/selectedProduct", oProduct);
      },
    });
  }
);
