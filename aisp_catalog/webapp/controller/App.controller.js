sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Fragment",
  ],
  (BaseController, JSONModel, Fragment) => {
    "use strict";

    return BaseController.extend("com.catalog.aispcatalog.controller.App", {
      onInit() {
        const oViewModel = new JSONModel({
          busy: true,
          delay: 0,
          layout: "TwoColumnsMidExpanded",
          smallScreenMode: true,
        });
        this.getView().setModel(oViewModel, "appView");

        const iOriginalBusyDelay = this.getView().getBusyIndicatorDelay();
        const fnSetAppNotBusy = () => {
          oViewModel.setProperty("/busy", false);
          oViewModel.setProperty("/delay", iOriginalBusyDelay);
        };

        // since then() has no "reject"-path attach to the MetadataFailed-Event to disable the busy indicator in case of an error
        this.getOwnerComponent()
          .getModel()
          .metadataLoaded()
          .then(fnSetAppNotBusy);
        this.getOwnerComponent()
          .getModel()
          .attachMetadataFailed(fnSetAppNotBusy);
      },

      onCreateCatalog: function () {
        var oView = this.getView();

        // Create dialog fragment
        if (!this._oCreateCatalogDialog) {
          Fragment.load({
            id: oView.getId(),
            name: "com.catalog.aispcatalog.view.fragments.CreateCatalogItem",
            controller: this,
          }).then(
            function (oDialog) {
              this._oCreateCatalogDialog = oDialog;
              oView.addDependent(this._oCreateCatalogDialog);
              this._oCreateCatalogDialog.open();
            }.bind(this)
          );
        } else {
          this._oCreateCatalogDialog.open();
        }
      },

      onCancelDialog: function () {
        if (this._oCreateCatalogDialog) {
          this._oCreateCatalogDialog.close();
        }
      },

      onAddCatalogItem: function () {
        // Handle form submission logic here
        // You can access form fields using byId or model binding

        // Example: Get form values
        // var oView = this.getView();
        // var sProductName = Fragment.byId(oView.getId(), "productNameInput").getValue();

        // Close dialog after submission
        if (this._oCreateCatalogDialog) {
          this._oCreateCatalogDialog.close();
        }

        // Show success message
        sap.m.MessageToast.show("Catalog item added successfully");
      },

      onToggleCart: function (oEvent) {
        const bPressed = oEvent.getParameter("pressed");
        this._setLayout(bPressed ? "Three" : "Two");

        if (bPressed) {
          // Show cart in third column
          this.getRouter().navTo("cart");
        } else {
          // Hide cart, stay on current page
          // The cart model persists so items remain
        }
      },

      // Clean up when controller is destroyed
      onExit: function () {
        if (this._oCreateCatalogDialog) {
          this._oCreateCatalogDialog.destroy();
        }
      },
    });
  }
);
