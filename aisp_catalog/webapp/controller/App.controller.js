sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Fragment",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/m/Dialog",
    "sap/m/VBox",
    "sap/m/Image",
    "sap/m/Text",
    "sap/m/Button",
    "sap/ui/core/routing/History",
    "sap/m/Token",
  ],
  (
    BaseController,
    JSONModel,
    Fragment,
    MessageToast,
    MessageBox,
    Dialog,
    VBox,
    Image,
    Text,
    Button,
    History,
    Token
  ) => {
    "use strict";

    return BaseController.extend("com.catalog.aispcatalog.controller.App", {
      onInit() {
        const oViewModel = new JSONModel({
          busy: true,
          delay: 0,
          layout: "TwoColumnsMidExpanded",
          smallScreenMode: true,
          commodityCodes: [],
          currencies: [],
          unitsOfMeasure: [],
          catalogItems: [], // Store added catalog items
        });
        this.getView().setModel(oViewModel, "appView");

        const iOriginalBusyDelay = this.getView().getBusyIndicatorDelay();
        const fnSetAppNotBusy = () => {
          oViewModel.setProperty("/busy", false);
          oViewModel.setProperty("/delay", iOriginalBusyDelay);
        };

        // Load master data
        this._loadMasterData();

        this.getOwnerComponent()
          .getModel()
          .metadataLoaded()
          .then(fnSetAppNotBusy);
        this.getOwnerComponent()
          .getModel()
          .attachMetadataFailed(fnSetAppNotBusy);
      },

      _setLayout: function (sLayout) {
        this.getView().getModel("appView").setProperty("/layout", sLayout);
      },

      _loadMasterData: function () {
        this._loadCommodityCodes();
        this._loadCurrencies();
        this._loadUnitsOfMeasure();
      },

      _loadCommodityCodes: function () {
        const oModel = this.getOwnerComponent().getModel();
        oModel.read("/ProductCatalogCommodityCodes", {
          success: (oData) => {
            const aCommodityCodes = oData.results.map((item) => ({
              key: item.Commodity.toString(),
              text: `${item.Commodity} - ${item.CommodityName}`,
            }));
            this.getView()
              .getModel("appView")
              .setProperty("/commodityCodes", aCommodityCodes);
          },
          error: (oError) => {
            MessageToast.show("Error loading commodity codes");
            console.error("Error loading commodity codes:", oError);
          },
        });
      },

      _loadCurrencies: function () {
        const oModel = this.getOwnerComponent().getModel();
        oModel.read("/Currencies", {
          success: (oData) => {
            const aCurrencies = oData.results.map((item) => ({
              key: item.WAERS,
              text: `${item.WAERS} - ${item.LTEXT || item.WAERS}`,
            }));
            this.getView()
              .getModel("appView")
              .setProperty("/currencies", aCurrencies);
          },
          error: (oError) => {
            MessageToast.show("Error loading currencies");
            console.error("Error loading currencies:", oError);
          },
        });
      },

      _loadUnitsOfMeasure: function () {
        const oModel = this.getOwnerComponent().getModel();
        oModel.read("/UnitsOfMeasure", {
          success: (oData) => {
            const aUnits = oData.results.map((item) => ({
              key: item.UnitCode,
              text: `${item.UnitCode} - ${item.UnitName || item.UnitCode}`,
            }));
            this.getView()
              .getModel("appView")
              .setProperty("/unitsOfMeasure", aUnits);
          },
          error: (oError) => {
            MessageToast.show("Error loading units of measure");
            console.error("Error loading units of measure:", oError);
          },
        });
      },

      _getCommodityName: function (commodityCode) {
        const aCommodityCodes = this.getView()
          .getModel("appView")
          .getProperty("/commodityCodes");
        const oCommodity = aCommodityCodes.find(
          (item) => item.key === commodityCode
        );
        return oCommodity ? oCommodity.text.split(" - ")[1] : "";
      },

      onCreateCatalog: function () {
        var oView = this.getView();

        if (!this._oCreateCatalogDialog) {
          Fragment.load({
            id: oView.getId(),
            name: "com.catalog.aispcatalog.view.fragments.CreateCatalogItem",
            controller: this,
          }).then(
            function (oDialog) {
              this._oCreateCatalogDialog = oDialog;
              oView.addDependent(this._oCreateCatalogDialog);

              // Initialize form model
              const oFormModel = new JSONModel({
                productName: "",
                commodityCode: "",
                category: "",
                searchTerms: [],
                unitPrice: 0,
                currency: "USD",
                unitOfMeasure: "Each",
                leadTime: 0,
                partNumber: "",
                additionalLink: "https://example.com",
                productDescription: "",
                productImage: "",
                productSpecification: "",
                selectedImageFile: null,
                selectedPdfFile: null,
                addedItems: [], // Temporary storage for current session
              });
              this._oCreateCatalogDialog.setModel(oFormModel, "form");

              this._oCreateCatalogDialog.open();
            }.bind(this)
          );
        } else {
          this._oCreateCatalogDialog.open();
        }
      },

      onCommodityCodeChange: function (oEvent) {
        const sSelectedKey = oEvent.getSource().getSelectedKey();
        const oDialog = this._oCreateCatalogDialog;

        if (oDialog && sSelectedKey) {
          const sCategory = this._getCommodityName(sSelectedKey);
          oDialog.getModel("form").setProperty("/category", sCategory);
        }
      },

      onSearchTermChange: function (oEvent) {
        const oMultiInput = oEvent.getSource();
        const sValue = oEvent.getParameter("value");

        // If user presses Enter and there's a value, add it as a token
        if (sValue && sValue.trim() !== "") {
          const oFormModel = this._oCreateCatalogDialog.getModel("form");
          const aCurrentSearchTerms =
            oFormModel.getProperty("/searchTerms") || [];

          // Check if the term already exists
          if (!aCurrentSearchTerms.includes(sValue.trim())) {
            // Add the new term to the array
            aCurrentSearchTerms.push(sValue.trim());
            oFormModel.setProperty("/searchTerms", aCurrentSearchTerms);
          }

          // Clear the input field
          oMultiInput.setValue("");
        }
      },

      onSearchTermTokenUpdate: function (oEvent) {
        const sType = oEvent.getParameter("type");
        const aTokens = oEvent.getParameter("removedTokens"); // Contains tokens removed in this action

        if (sType === "removed" || sType === "removedAll") {
          const oFormModel = this._oCreateCatalogDialog.getModel("form");
          let aCurrentSearchTerms =
            oFormModel.getProperty("/searchTerms") || [];

          // Get the keys (the search terms) of the tokens to be removed
          const aKeysToRemove = aTokens.map((oToken) => oToken.getKey());

          // Filter the model array, keeping only terms whose keys are NOT in the removal list
          aCurrentSearchTerms = aCurrentSearchTerms.filter(
            (sTerm) => !aKeysToRemove.includes(sTerm)
          );

          // Update the model property
          oFormModel.setProperty("/searchTerms", aCurrentSearchTerms);
        }
        // Note: 'added' type is typically handled by the 'change' event/logic above,
        // but can be implemented here if using Value Help/Suggestion
      },

      // onImageFileChange: function (oEvent) {
      //   const oFileUploader = oEvent.getSource();
      //   const oFile = oEvent.getParameter("files")[0];
      //   const oView = this.getView();

      //   if (oFile) {
      //     const oPreviewButton = oView.byId("previewImageButton");

      //     const oFileNameText = oView.byId("imageFileName");

      //     if (oPreviewButton) oPreviewButton.setEnabled(true);
      //     if (oFileNameText)
      //       oFileNameText.setText(
      //         `${oFile.name} (${this._formatFileSize(oFile.size)})`
      //       );

      //     if (this._oCreateCatalogDialog) {
      //       this._oCreateCatalogDialog
      //         .getModel("form")
      //         .setProperty("/selectedImageFile", oFile);
      //     }
      //   }
      // },

      // onPdfFileChange: function (oEvent) {
      //   const oFileUploader = oEvent.getSource();
      //   const oFile = oEvent.getParameter("files")[0];
      //   const oView = this.getView();

      //   if (oFile) {
      //     const oPreviewButton = oView.byId("previewPdfButton");
      //     const oFileNameText = Fragment.byId("pdfFileName");

      //     if (oPreviewButton) oPreviewButton.setEnabled(true);
      //     if (oFileNameText)
      //       oFileNameText.setText(
      //         `${oFile.name} (${this._formatFileSize(oFile.size)})`
      //       );

      //     if (this._oCreateCatalogDialog) {
      //       this._oCreateCatalogDialog
      //         .getModel("form")
      //         .setProperty("/selectedPdfFile", oFile);
      //     }
      //   }
      // },

      onImageFileChange: function (oEvent) {
        const oFileUploader = oEvent.getSource();
        const oFile = oEvent.getParameter("files")[0];
        const oView = this.getView();

        if (oFile) {
          const oPreviewButton = oView.byId("previewImageButton");
          const oFileNameText = oView.byId("imageFileName");

          if (oPreviewButton) oPreviewButton.setEnabled(true);
          if (oFileNameText)
            oFileNameText.setText(
              `${oFile.name} (${this._formatFileSize(oFile.size)})`
            );

          // Convert file to Base64 immediately
          this._convertFileToBase64(oFile)
            .then((sBase64) => {
              if (this._oCreateCatalogDialog) {
                this._oCreateCatalogDialog
                  .getModel("form")
                  .setProperty("/productImage", sBase64); // Store Base64 string

                // Also keep the file reference if needed for preview
                this._oCreateCatalogDialog
                  .getModel("form")
                  .setProperty("/selectedImageFile", oFile);
              }
            })
            .catch((oError) => {
              console.error("Error converting image to Base64:", oError);
              MessageToast.show("Error processing image file");
            });
        }
      },

      onPdfFileChange: function (oEvent) {
        const oFileUploader = oEvent.getSource();
        const oFile = oEvent.getParameter("files")[0];
        const oView = this.getView();

        if (oFile) {
          const oPreviewButton = oView.byId("previewPdfButton");
          const oFileNameText = Fragment.byId("pdfFileName");

          if (oPreviewButton) oPreviewButton.setEnabled(true);
          if (oFileNameText)
            oFileNameText.setText(
              `${oFile.name} (${this._formatFileSize(oFile.size)})`
            );

          // Convert file to Base64 immediately
          this._convertFileToBase64(oFile)
            .then((sBase64) => {
              if (this._oCreateCatalogDialog) {
                this._oCreateCatalogDialog
                  .getModel("form")
                  .setProperty("/productSpecification", sBase64); // Store Base64 string

                // Also keep the file reference if needed for preview
                this._oCreateCatalogDialog
                  .getModel("form")
                  .setProperty("/selectedPdfFile", oFile);
              }
            })
            .catch((oError) => {
              console.error("Error converting PDF to Base64:", oError);
              MessageToast.show("Error processing PDF file");
            });
        }
      },

      // Helper function to convert file to Base64
      _convertFileToBase64: function (oFile) {
        return new Promise((resolve, reject) => {
          if (!oFile) {
            resolve("");
            return;
          }
          const reader = new FileReader();
          reader.onload = function (e) {
            resolve(e.target.result); // Base64 string
          };
          reader.onerror = function (error) {
            reject(error);
          };
          reader.readAsDataURL(oFile);
        });
      },

      _formatFileSize: function (bytes) {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
      },

      onPreviewImage: function () {
        const oFormModel = this._oCreateCatalogDialog.getModel("form");
        const oFile = oFormModel.getProperty("/selectedImageFile");

        if (!oFile) {
          MessageToast.show("Please select an image file first");
          return;
        }

        if (!this._oImagePreviewDialog) {
          this._oImagePreviewDialog = new Dialog({
            title: "Image Preview - " + oFile.name,
            contentWidth: "70%",
            contentHeight: "70%",
            content: [
              new VBox({
                alignItems: "Center",
                justifyContent: "Center",
                height: "100%",
                items: [
                  new Image({
                    densityAware: false,
                    decorative: false,
                    width: "100%",
                    height: "100%",
                    backgroundSize: "contain",
                    backgroundPosition: "center",
                  }).addStyleClass("sapUiMediumMargin"),
                ],
              }),
            ],
            endButton: new Button({
              text: "Close",
              press: function () {
                this._oImagePreviewDialog.close();
              }.bind(this),
            }),
          });

          this.getView().addDependent(this._oImagePreviewDialog);
        }

        const sObjectUrl = URL.createObjectURL(oFile);
        const oImage = this._oImagePreviewDialog.getContent()[0].getItems()[0];
        oImage.setSrc(sObjectUrl);

        this._oImagePreviewDialog.open();
      },

      onPreviewPdf: function () {
        const oFormModel = this._oCreateCatalogDialog.getModel("form");
        const oFile = oFormModel.getProperty("/selectedPdfFile");

        if (!oFile) {
          MessageToast.show("Please select a PDF file first");
          return;
        }

        const sObjectUrl = URL.createObjectURL(oFile);
        window.open(sObjectUrl, "_blank");
      },

      // onAddAndViewCatalog: function () {
      //   const oFormModel = this._oCreateCatalogDialog.getModel("form");
      //   const oFormData = oFormModel.getData();

      //   // Validate required fields
      //   if (
      //     !oFormData.productName ||
      //     !oFormData.commodityCode ||
      //     !oFormData.unitPrice
      //   ) {
      //     MessageToast.show("Please fill all required fields");
      //     return;
      //   }

      //   // Get search terms from MultiInput
      //   const oSearchInput = this.getView().byId("searchTermsInput");
      //   const aSearchTerms = oSearchInput
      //     .getTokens()
      //     .map((token) => token.getText());

      //   // Create catalog item object
      //   const oCatalogItem = {
      //     productName: oFormData.productName,
      //     commodityCode: oFormData.commodityCode,
      //     category: oFormData.category,
      //     searchTerms: aSearchTerms,
      //     unitPrice: parseFloat(oFormData.unitPrice),
      //     currency: oFormData.currency,
      //     unitOfMeasure: oFormData.unitOfMeasure,
      //     leadTime: parseInt(oFormData.leadTime),
      //     partNumber: oFormData.partNumber,
      //     additionalLink: oFormData.additionalLink,
      //     productDescription: oFormData.productDescription,
      //     timestamp: new Date().getTime(),
      //     id: "temp_" + new Date().getTime(), // Temporary ID for routing
      //   };

      //   // Add to global catalog items
      //   const aCatalogItems =
      //     this.getView().getModel("appView").getProperty("/catalogItems") || [];

      //   aCatalogItems.push(oCatalogItem);

      //   this.getView()
      //     .getModel("appView")
      //     .setProperty("/catalogItems", aCatalogItems);

      //   // Close dialog and navigate to three column layout
      //   this._oCreateCatalogDialog.close();
      //   this._navigateToCatalogReview(oCatalogItem.id);
      // },

      onAddAndViewCatalog: function () {
        const oFormModel = this._oCreateCatalogDialog.getModel("form");
        const oFormData = oFormModel.getData();
        debugger;
        // Validate required fields
        if (
          !oFormData.productName ||
          !oFormData.category ||
          !oFormData.commodityCode ||
          !oFormData.unitPrice ||
          !oFormData.unitOfMeasure ||
          !oFormData.leadTime ||
          !oFormData.currency ||
          !oFormData.additionalLink ||
          !oFormData.productDescription
        ) {
          MessageBox.error("Please fill all required fields");
          return;
        }

        if (oFormData.unitPrice <= 0) {
          MessageBox.error("Unit Price Cannot be less than or equal to zero");
          return;
        }

        if (oFormData.leadTime <= 0) {
          MessageBox.error("Lead Time Cannot be less than or equal to zero");
          return;
        }

        // Get search terms from MultiInput
        const oSearchInput = this.byId("searchTermsInput");
        const aSearchTerms = oSearchInput
          .getTokens()
          .map((token) => token.getText());

        if (aSearchTerms.length === 0) {
          MessageBox.error("Please add atleast one Search Term");
          return;
        }

        // Create catalog item object
        const oCatalogItem = {
          productName: oFormData.productName,
          commodityCode: oFormData.commodityCode,
          category: oFormData.category,
          searchTerms: aSearchTerms,
          unitPrice: parseFloat(oFormData.unitPrice),
          currency: oFormData.currency,
          unitOfMeasure: oFormData.unitOfMeasure,
          leadTime: parseInt(oFormData.leadTime),
          partNumber: oFormData.partNumber,
          additionalLink: oFormData.additionalLink,
          productDescription: oFormData.productDescription,
          ProductImage: oFormData.productImage,
          ProductSpecification: oFormData.productSpecification,
          timestamp: new Date().getTime(),
          id: "temp_" + new Date().getTime(),
        };

        // Add to Global LocalStorage catalog model
        const oCatalogModel = this.getOwnerComponent().getModel("catalog");
        oCatalogModel.addCatalogItem(oCatalogItem);

        // Close dialog and navigate to three column layout
        this._oCreateCatalogDialog.close();
        this._resetForm();
        this._navigateToCatalogReview(oCatalogItem.id);
      },

      _navigateToCatalogReview: function (sSelectedItemId) {
        // Set three column layout
        this._setLayout("ThreeColumnsMidExpanded");

        // Navigate to catalog review page
        this.getOwnerComponent().getRouter().navTo("catalogReview", {
          selectedItemId: sSelectedItemId,
        });
      },

      onCancelDialog: function () {
        if (this._oCreateCatalogDialog) {
          this._oCreateCatalogDialog.close();
        }
        this._resetForm();
      },

      _resetForm: function () {
        if (
          this._oCreateCatalogDialog &&
          this._oCreateCatalogDialog.getModel("form")
        ) {
          // 1. Reset the JSON Model data
          this._oCreateCatalogDialog.getModel("form").setData({
            productName: "",
            commodityCode: "",
            category: "",
            searchTerms: [], // This resets the data source for the tokens
            unitPrice: 0,
            currency: "USD",
            unitOfMeasure: "Each",
            leadTime: 0,
            partNumber: "",
            additionalLink: "https://example.com",
            productDescription: "",
            productImage: "",
            productSpecification: "",
            selectedImageFile: null,
            selectedPdfFile: null,
            addedItems: [],
          });

          // 2. Clear tokens from the MultiInput control instance itself
          const oSearchInput =
            this.byId("searchTermsInput");

          if (oSearchInput) {
            // Clear the internal tokens array of the MultiInput control
            oSearchInput.destroyTokens();
            // Also clear the input value in case the user typed something but didn't press Enter
            oSearchInput.setValue("");
          }

          // Optionally, reset the FileUploader controls and buttons if they are also not resetting
          // Reset image file uploader
          const oImageUploader = this.byId(
            "productImageUploader"
          );
          if (oImageUploader) oImageUploader.setValue("");
          const oPreviewImageBtn =
            this.byId("previewImageButton");
          if (oPreviewImageBtn) oPreviewImageBtn.setEnabled(false);

          // Reset PDF file uploader
          const oPdfUploader = this.byId(
            "productSpecUploader"
          );
          if (oPdfUploader) oPdfUploader.setValue("");
          const oPreviewPdfBtn =
            this.byId("previewPdfButton");
          if (oPreviewPdfBtn) oPreviewPdfBtn.setEnabled(false);
        }
      },

      onRemoveImage: function () {
        const oDialog = this._oCreateCatalogDialog;
        const oFormModel = oDialog.getModel("form");
        const oFileUploader = this.byId("productImageUploader");
        const oPreviewImageBtn = this.byId("previewImageButton");

        // Clear data in the form model
        oFormModel.setProperty("/productImage", "");
        oFormModel.setProperty("/selectedImageFile", null);
        oPreviewImageBtn.setEnabled(false);

        // Reset the FileUploader control (clears the file name display)
        if (oFileUploader) {
          oFileUploader.setValue("");
        }

        MessageToast.show("Product image removed.");
      },

      onRemovePdf: function () {
        const oDialog = this._oCreateCatalogDialog;
        const oFormModel = oDialog.getModel("form");
        const oFileUploader = this.byId("productSpecUploader");
        const oPreviewPDFBtn = this.byId("previewPdfButton");

        // Clear data in the form model
        oFormModel.setProperty("/productSpecification", "");
        oFormModel.setProperty("/selectedPdfFile", null);
        oPreviewPDFBtn.setEnabled(false);

        // Reset the FileUploader control (clears the file name display)
        if (oFileUploader) {
          oFileUploader.setValue("");
        }

        MessageToast.show("Product specification PDF removed.");
      },

      onExit: function () {
        if (this._oCreateCatalogDialog) {
          this._oCreateCatalogDialog.destroy();
        }
        if (this._oImagePreviewDialog) {
          this._oImagePreviewDialog.destroy();
        }
      },
    });
  }
);
