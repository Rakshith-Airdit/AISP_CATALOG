sap.ui.define(
  [
    "sap/ui/core/UIComponent",
    "com/catalog/aispcatalog/model/models",
    "com/catalog/aispcatalog/model/LocalStorageModel",
  ],
  (UIComponent, models, LocalStorageModel) => {
    "use strict";

    return UIComponent.extend("com.catalog.aispcatalog.Component", {
      metadata: {
        manifest: "json",
        interfaces: ["sap.ui.core.IAsyncContentCreation"],
      },

      init() {
        // call the base component's init function
        UIComponent.prototype.init.apply(this, arguments);

        // set the device model
        this.setModel(models.createDeviceModel(), "device");

        // Create LocalStorage model for catalog items
        const oCatalogModel = new LocalStorageModel("PRODUCT_CATALOG_STORAGE", {
          catalogItems: [],
          selectedProduct: null,
        });
        this.setModel(oCatalogModel, "catalog");

        // enable routing
        this.getRouter().initialize();
      },
    });
  }
);
