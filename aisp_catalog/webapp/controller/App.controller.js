sap.ui.define(
  [
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Fragment",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
  ],
  function (
    Controller,
    JSONModel,
    Fragment,
    MessageToast,
    MessageBox
  ) {
    "use strict";

    return Controller.extend("com.catalog.aispcatalog.controller.App", {
      /* ------------------------------------------------------------------ */
      /*  INITIALISATION                                                    */
      /* ------------------------------------------------------------------ */
      onInit: function () {
        const oComponent = this.getOwnerComponent();

        this._router = oComponent.getRouter();

        const oViewModel = new JSONModel({
          busy: true,
          delay: 0,
          layout: "TwoColumnsMidExpanded",
          smallScreenMode: true,
        });

        this.setModel(oViewModel, "appView");

        this._initModels([
          { name: "oCommodityCodesModel", data: { commodityCodes: [] } },
          { name: "oUnitsOfMeasureModel", data: { unitsOfMeasure: [] } },
          { name: "oCurrencyModel", data: { currencies: [] } },
        ]);

        const iOriginalBusyDelay = this.getView().getBusyIndicatorDelay();

        const fnSetAppNotBusy = () => {
          oViewModel.setProperty("/busy", false);
          oViewModel.setProperty("/delay", iOriginalBusyDelay);
        };

        this._loadMasterData();

        this.getOwnerComponent()
          .getModel()
          .metadataLoaded()
          .then(fnSetAppNotBusy);

        this.getOwnerComponent()
          .getModel()
          .attachMetadataFailed(fnSetAppNotBusy);
      },

      _initModels: function (aModelConfigs) {
        aModelConfigs.forEach((config) => {
          this.setModel(new JSONModel(config.data), config.name);
        });
      },

      onCreateCatalog: function (params) {
        this.getRouter().navTo("RouteCreateCatalog");
      },

      /* ------------------------------------------------------------------ */
      /*  MASTER DATA                                                       */
      /* ------------------------------------------------------------------ */
      _loadMasterData: function () {
        const aDataConfigs = [
          {
            path: "/ProductCatalogCommodityCodes",
            model: "oCommodityCodesModel",
            property: "commodityCodes",
            name: "Commodity Codes",
          },
          {
            path: "/Currencies",
            model: "oCurrencyModel",
            property: "currencies",
            name: "Currencies",
          },
          {
            path: "/UnitsOfMeasure",
            model: "oUnitsOfMeasureModel",
            property: "unitsOfMeasure",
            name: "Units of Measure",
          },
        ];

        aDataConfigs.forEach((config) => {
          this._fetchDataWithErrorHandling(
            config.path,
            config.model,
            config.property,
            config.name
          );
        });
      },

      _fetchDataWithErrorHandling: function (
        sEntityPath,
        sModelName,
        sProperty,
        sDisplayName
      ) {
        const oModel = this.getOwnerComponent().getModel();

        oModel.read(sEntityPath, {
          success: (data) => {
            this.getModel(sModelName).setProperty(
              `/${sProperty}`,
              data.results || []
            );
          },
          error: (oError) => {
            console.error(`Failed to load ${sDisplayName}:`, oError);
            MessageBox.error(
              `Could not load ${sDisplayName}. Please try again later.`
            );
            this.getModel(sModelName).setProperty(`/${sProperty}`, []);
          },
        });
      },

      _navigateToCatalogReview: function () {
        // this.getModel("appView").setProperty(
        //   "/layout",
        //   "TwoColumnsBeginExpanded"
        // );

        this.getRouter().navTo("RouteCatalogReview");
      },

      _refreshCatalogReview: function () {
        this.getOwnerComponent().getModel("catalog").refresh();
      },

      /* ------------------------------------------------------------------ */
      /*  MASS UPLOAD                                                       */
      /* ------------------------------------------------------------------ */

      onOpenBulkUploadDialog: function () {
        if (!this._oBulkUploadDialog) {
          Fragment.load({
            id: this.getView().getId(),
            name: "com.catalog.aispcatalog.view.fragments.BulkProductUpload",
            controller: this,
          }).then(
            function (oDialog) {
              this._oBulkUploadDialog = oDialog;

              this.getView().addDependent(this._oBulkUploadDialog);

              // Create a local JSON model for the dialog's state
              const oBulkUploadModel = new JSONModel({
                selectedBulkFile: null,
                selectedBulkFileName: "",
              });

              this._oBulkUploadDialog.setModel(
                oBulkUploadModel,
                "bulkUploadView"
              );

              // Initially disable the "Process File" button
              this.getView().byId("processFileButton").setEnabled(false);

              this._oBulkUploadDialog.open();
            }.bind(this)
          );
        } else {
          this._resetBulkUploadForm();
          this._oBulkUploadDialog.open();
        }
      },

      onDownloadTemplate: function () {
        MessageToast.show("Initiating template download...");
        window.open(sTemplatePath, "_blank");
      },

      onFileChange: function (oEvent) {
        const oUploader = oEvent.getSource();
        const oFile = oEvent.getParameter("files")[0];
        if (oFile) {
          this.getView()
            .getModel("upload")
            .setProperty("/fileName", oFile.name);
        }
      },

      onProcessFile: function () {
        const oUploader = this.byId("fileUploader");
        if (oUploader.getFileList().length > 0) {
          oUploader.upload(); // triggers uploadComplete
        } else {
          MessageToast.show("Please select a file.");
        }
      },

      onUploadComplete: function (oEvent) {
        const iStatus = oEvent.getParameter("status");
        if (iStatus >= 200 && iStatus < 300) {
          MessageToast.show("Upload successful!");
          this.byId("bulkUploadDialog").close();
        } else {
          MessageToast.show("Upload failed.");
        }
      },

      onCloseBulkUploadDialog: function () {
        if (this._oBulkUploadDialog) {
          this._oBulkUploadDialog.close();
          this._resetBulkUploadForm(); // Reset the form fields for next open
        }
      },

      _resetBulkUploadForm: function () {
        if (this._oBulkUploadDialog) {
          const oBulkUploadViewModel =
            this._oBulkUploadDialog.getModel("bulkUploadView");
          if (oBulkUploadViewModel) {
            oBulkUploadViewModel.setProperty("/selectedBulkFile", null);
            oBulkUploadViewModel.setProperty("/selectedBulkFileName", "");
          }
          const oFileUploader = this.getView().byId("bulkFileUploader");
          if (oFileUploader) {
            oFileUploader.clear(); // Clears the file uploader's internal state
          }
          // Ensure the process button is disabled until a new file is selected
          this.getView().byId("processFileButton").setEnabled(false);
        }
      },

      /* ------------------------------------------------------------------ */
      /*  EXIT                                                              */
      /* ------------------------------------------------------------------ */
      onExit: function () {
        [
          "_oCreateCatalogDialog",
          "_oEditCatalogDialog",
          "_oCommodityVHDialog",
          "_oCurrencyVHDialog",
          "_oUomVHDialog",
          "_oImagePreviewDialog",
          "_oBulkUploadDialog",
        ].forEach((sDialog) => {
          if (this[sDialog]) {
            this[sDialog].destroy();
            this[sDialog] = null;
          }
        });
      },
    });
  }
);
