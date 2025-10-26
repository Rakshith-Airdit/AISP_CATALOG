sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/UIComponent",
    "sap/ui/core/routing/History",
  ],
  function (Controller, UIComponent, History) {
    "use strict";

    return Controller.extend(
      "com.catalog.aispcatalog.controller.BaseController",
      {
        /**
         * Convenience method for accessing the router.
         * @returns {sap.ui.core.routing.Router} the router for this component
         */
        getRouter: function () {
          return UIComponent.getRouterFor(this);
        },

        /**
         * Convenience method for getting the view model by name.
         * @param {string} [sName] the model name
         * @returns {sap.ui.model.Model} the model instance
         */
        getModel: function (sName) {
          return this.getView().getModel(sName);
        },

        /**
         * Convenience method for setting the view model.
         * @param {sap.ui.model.Model} oModel the model instance
         * @param {string} sName the model name
         * @returns {sap.ui.mvc.View} the view instance
         */
        setModel: function (oModel, sName) {
          return this.getView().setModel(oModel, sName);
        },

        /**
         * Sets the flexible column layout to one, two, or three columns.
         * @param {string} sColumns the target amount of columns
         */
        _setLayout: function (sColumns) {
          if (sColumns) {
            this.getModel("appView").setProperty(
              "/layout",
              sColumns + "Column" + (sColumns === "One" ? "" : "sMidExpanded")
            );
          }
        },

        /**
         * Navigates back in browser history or to the home screen.
         */
        onBack: function () {
          const oHistory = History.getInstance();
          const oPrevHash = oHistory.getPreviousHash();
          if (oPrevHash !== undefined) {
            window.history.go(-1);
          } else {
            this.getRouter().navTo("RouteHome");
          }
        },
      }
    );
  }
);
