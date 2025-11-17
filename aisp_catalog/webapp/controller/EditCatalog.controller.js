sap.ui.define(
  [
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/Fragment",
    "sap/m/Column",
    "sap/m/ColumnListItem",
    "sap/m/Label",
    "sap/m/Text",
    "sap/m/Table",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/m/Token",
    "sap/m/Dialog",
    "sap/m/VBox",
    "sap/m/Image",
    "sap/m/Button",
  ],
  function (
    BaseController,
    JSONModel,
    Filter,
    FilterOperator,
    Fragment,
    Column,
    ColumnListItem,
    Label,
    Text,
    Table,
    MessageBox,
    MessageToast,
    Token,
    Dialog,
    VBox,
    Image,
    Button
  ) {
    "use strict";

    return BaseController.extend(
      "com.catalog.aispcatalog.controller.EditCatalog",
      {
        onInit: function () {
          this._router = this.getOwnerComponent().getRouter();
          this._router
            .getRoute("RouteEditCatalog")
            .attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function (oEvent) {
          this._setLayout("TwoColumnsBeginExpanded");

          const oArgs = oEvent.getParameter("arguments");
          const sProductId = oArgs?.id;

          this._initEditFormModel(sProductId);
          // Simple debounce storage
          this._searchTimeouts = {};
        },

        /* ------------------------------------------------------------------ */
        /*  EDIT OPERATIONS                                                   */
        /* ------------------------------------------------------------------ */

        _initEditFormModel: function (sProductId) {
          const oRouter = this.getRouter();

          if (!sProductId) {
            MessageBox.error(
              `Couldn't Find the Product, Please Try Again Later!!`,
              {
                title: "Product Not Found",
                onClose: () => {
                  oRouter.navTo("RouteCatalogReview");
                },
              }
            );
            return;
          }

          this._fetchProductDetails(sProductId);

          this.setModel(
            this.getOwnerComponent().getModel("catalog"),
            "catalog"
          );
        },

        _fetchProductDetails: function (sProductId) {
          // Show loading indicator
          sap.ui.core.BusyIndicator.show(0);

          const oModel = this.getOwnerComponent().getModel();

          //Local Model
          const oCatalogModel = this.getView().getModel("catalog");

          // First, get the batchId from localStorage if available
          const oLocalStorageModel =
            this.getOwnerComponent().getModel("catalog");

          const aLocalItems =
            oLocalStorageModel.getProperty("/catalogItems") || [];

          const oLocalProduct = aLocalItems.find(
            (item) => item.DraftId === sProductId
          );

          debugger;

          if (oLocalProduct && oLocalProduct.DraftId) {
            const sDraftId = oLocalProduct.DraftId;
          }

          // Load drafts for this specific batch
          oModel.read("/ProductCatalogDrafts", {
            filters: [new Filter("ID", FilterOperator.EQ, sProductId)],
            success: (oData) => {
              sap.ui.core.BusyIndicator.hide();
              if (oData?.results) {
                this._populateEditForm(oData?.results[0]);
              }
            },
            error: (oError) => {
              sap.ui.core.BusyIndicator.hide();
              console.error("Failed to load draft items:", oError);
            },
          });
        },

        _populateEditForm: function (oProduct) {
          const oFormData = new JSONModel({
            ...this._getEmptyFormData(),
            productName: oProduct.ProductName,
            commodityCode: oProduct.CommodityCode,
            category: oProduct.Category,
            searchTerms: oProduct.SearchTerm || [],
            unitPrice: oProduct.UnitPrice,
            currency: oProduct.CurrencyCode,
            unitOfMeasure: oProduct.UnitOfMeasure,
            leadTime: oProduct.LeadTimeDays,
            partNumber: oProduct.PartNumber || "",
            additionalLink: oProduct.AdditionalLink,
            productDescription: oProduct.ProductDescription,
            productImage: oProduct.ProductImage || "",
            productSpecification: oProduct.ProductSpecification || "",
            productId: oProduct.ID,
          });

          this.setModel(oFormData, "oEditFormModel");

          this._initializeEditFormFields();
        },

        _initializeEditFormFields: function (oProduct) {
          const oModel = this.getModel("oEditFormModel");

          // ----- IMAGE -----
          const oImgUploader = this.getView().byId("editProductImageUploader");
          const oImgPreviewBtn = this.getView().byId("editPreviewImageButton");
          const oImgRemoveBtn = this.getView().byId("editRemoveImageButton");
          const sImgUrl = oModel.getProperty("/productImage");

          //oImgUploader.setValue(""); // clear uploader
          oImgPreviewBtn.setEnabled(!!sImgUrl);
          oImgRemoveBtn.setEnabled(!!sImgUrl);
          oImgUploader.setValue(sImgUrl);

          // ----- PDF -----
          const oPdfUploader = this.getView().byId("editProductSpecUploader");
          const oPdfPreviewBtn = this.getView().byId("editPreviewPdfButton");
          const oPdfRemoveBtn = this.getView().byId("editRemovePdfButton");
          const sPdfUrl = oModel.getProperty("/productSpecification");

          // oPdfUploader.setValue("");
          oPdfPreviewBtn.setEnabled(!!sPdfUrl);
          oPdfRemoveBtn.setEnabled(!!sPdfUrl);
          oPdfUploader.setValue(sPdfUrl);
        },

        _getEmptyFormData: function () {
          return {
            productName: "",
            commodityCode: "",
            category: "",
            searchTerms: [],
            unitPrice: null,
            currency: "",
            unitOfMeasure: "",
            leadTime: null,
            partNumber: "",
            additionalLink: "",
            productDescription: "",
            productImage: "",
            productSpecification: "",
            selectedImageFile: null,
            selectedPdfFile: null,

            // Value state properties for each field
            productNameValueState: "None",
            productNameValueStateText: "",
            commodityCodeValueState: "None",
            commodityCodeValueStateText: "",
            unitPriceValueState: "None",
            unitPriceValueStateText: "",
            currencyValueState: "None",
            currencyValueStateText: "",
            unitOfMeasureValueState: "None",
            unitOfMeasureValueStateText: "",
            leadTimeValueState: "None",
            leadTimeValueStateText: "",
            additionalLinkValueState: "None",
            additionalLinkValueStateText: "",
            productDescriptionValueState: "None",
            productDescriptionValueStateText: "",
            searchTermsValueState: "None",
            searchTermsValueStateText: "",
            productImageValueState: "None",
            productImageValueStateText: "",
            productSpecificationValueState: "None",
            productSpecificationValueStateText: "",
          };
        },

        /* ------------------------------------------------------------------ */
        /*  VALUE HELP - UNIFIED IMPLEMENTATION                               */
        /* ------------------------------------------------------------------ */

        onCommodityCodeValueHelp: function (oEvent) {
          this._openValueHelp(
            oEvent,
            "ValueHelpCommodity",
            "_oCommodityVHDialog",
            "/ProductCatalogCommodityCodes",
            [
              { key: "Commodity", label: "Commodity Code" },
              { key: "CommodityName", label: "Description" },
            ]
          );
        },

        onCurrencyValueHelp: function (oEvent) {
          this._openValueHelp(
            oEvent,
            "ValueHelpCurrency",
            "_oCurrencyVHDialog",
            "/Currencies",
            [
              { key: "WAERS", label: "Currency" },
              { key: "LTEXT", label: "Description" },
            ]
          );
        },

        onUnitOfMeasureValueHelp: function (oEvent) {
          this._openValueHelp(
            oEvent,
            "ValueHelpUom",
            "_oUomVHDialog",
            "/UnitsOfMeasure",
            [
              { key: "UnitCode", label: "Unit" },
              { key: "Text", label: "Description" },
            ]
          );
        },

        _openValueHelp: function (
          oEvent,
          sFragmentName,
          sDialogVariable,
          sEntitySet,
          aColumnsConfig
        ) {
          const oView = this.getView();
          const oInput = oEvent.getSource();

          this._currentInputId = oInput.getId();

          // Show busy indicator only for initial load
          if (!this[sDialogVariable]) {
            this.getView().setBusy(true);
          }

          if (!this[sDialogVariable]) {
            Fragment.load({
              name: `com.catalog.aispcatalog.view.fragments.${sFragmentName}`,
              controller: this,
            })
              .then((oDialog) => {
                this[sDialogVariable] = oDialog;
                oView.addDependent(oDialog);
                oDialog.setModel(this.getOwnerComponent().getModel());
                oDialog.setModel(new JSONModel({ filters: {} }), "filters");
                this._createValueHelpTable(oDialog, sEntitySet, aColumnsConfig);
                this.getView().setBusy(false); // Hide busy indicator after loading
                oDialog.open();
              })
              .catch((oError) => {
                // Always hide busy indicator on error too
                this.getView().setBusy(false);
                console.error("Failed to load value help dialog:", oError);
              });
          } else {
            this._clearDialogSelection(sDialogVariable);
            // For existing dialog, just open it (no busy indicator needed)
            this[sDialogVariable].open();
          }
        },

        _clearDialogSelection: function (sDialogVariable) {
          const oDialog = this[sDialogVariable];
          if (!oDialog) return;

          const oTable = oDialog.getTable();
          if (oTable) {
            oTable.removeSelections(true); // Clear all selections
          }
        },

        /* ------------------------------------------------------------------ */
        /*  VALUE HELP - CREATE TABLE                                         */
        /* ------------------------------------------------------------------ */

        _createValueHelpTable: function (oDialog, sEntitySet, aColumnsConfig) {
          const aColumns = aColumnsConfig.map(
            (oColumn) =>
              new Column({
                header: new Label({ text: oColumn.label }),
              })
          );

          const oTemplate = new ColumnListItem({
            type: "Active",
            press: ".onTableRowPress",
            cells: aColumnsConfig.map(
              (oColumn) => new Text({ text: `{${oColumn.key}}` })
            ),
          });

          const oTable = new Table({
            columns: aColumns,
            mode: "SingleSelectMaster",
            growing: true,
            growingThreshold: 50,
          });

          oTable.bindItems({ path: sEntitySet, template: oTemplate });
          oDialog.setTable(oTable);
        },

        /* ------------------------------------------------------------------ */
        /*  VALUE HELP - CLOSE HANDLERS                                     */
        /* ------------------------------------------------------------------ */

        onCommodityVHCancel: function () {
          this._closeValueHelpDialog("_oCommodityVHDialog");
        },

        onCurrencyVHCancel: function () {
          this._closeValueHelpDialog("_oCurrencyVHDialog");
        },

        onUomVHCancel: function () {
          this._closeValueHelpDialog("_oUomVHDialog");
        },

        _closeValueHelpDialog: function (sDialogVariable) {
          // Ensure busy indicator is cleared when closing dialog
          if (this.getView().getBusy()) {
            this.getView().setBusy(false);
          }

          // Clear table selection when closing
          this._clearDialogSelection(sDialogVariable);

          if (this[sDialogVariable]) {
            this[sDialogVariable].close();
          }
        },

        /* ------------------------------------------------------------------ */
        /*  VALUE HELP - SEARCH HANDLERS                                     */
        /* ------------------------------------------------------------------ */

        onCommodityVHSearch: function (oEvent) {
          this._handleValueHelpSearch(oEvent, "_oCommodityVHDialog", [
            "Commodity",
            "CommodityName",
          ]);
        },

        onCurrencyVHSearch: function (oEvent) {
          this._handleValueHelpSearch(oEvent, "_oCurrencyVHDialog", [
            "WAERS",
            "LTEXT",
          ]);
        },

        onUomVHSearch: function (oEvent) {
          this._handleValueHelpSearch(oEvent, "_oUomVHDialog", [
            "UnitCode",
            "Text",
          ]);
        },

        _handleValueHelpSearch: function (
          oEvent,
          sDialogVariable,
          aSearchFields
        ) {
          const oFilterBar = oEvent.getSource();
          const oDialog = this[sDialogVariable];
          const oTable = oDialog?.getTable();
          const oBinding = oTable?.getBinding("items");

          if (!oBinding) return;

          // Get the search value from the single input field
          const oFilterGroupItems = oFilterBar.getFilterGroupItems();
          const sSearchValue = oFilterGroupItems[0]
            ?.getControl()
            ?.getValue()
            ?.trim();

          if (!sSearchValue) {
            oBinding.filter([]);
            return;
          }

          let aFilters = [];

          if (sDialogVariable === "_oCommodityVHDialog") {
            aFilters = this._createCommodityFilters(
              sSearchValue,
              aSearchFields
            );
          } else {
            aFilters = aSearchFields.map((sField) => {
              return new Filter(sField, FilterOperator.Contains, sSearchValue);
            });
          }

          if (aFilters.length > 0) {
            oBinding.filter(new Filter(aFilters, false));
          } else {
            oBinding.filter([]);
          }
        },

        _createCommodityFilters: function (sSearchValue, aSearchFields) {
          const aFilters = [];
          const nNumericValue = parseInt(sSearchValue);

          // Only search Commodity field if it's a valid number
          if (
            !isNaN(nNumericValue) &&
            sSearchValue === nNumericValue.toString()
          ) {
            aFilters.push(
              new Filter("Commodity", FilterOperator.EQ, nNumericValue)
            );
          }

          // Always search CommodityName field
          aFilters.push(
            new Filter("CommodityName", FilterOperator.Contains, sSearchValue)
          );

          return aFilters;
        },

        /* ------------------------------------------------------------------ */
        /*  VALUE HELP - LIVE CHANGE HANDLERS                               */
        /* ------------------------------------------------------------------ */

        onCommodityVHLiveChange: function (oEvent) {
          this._debounceSearch(oEvent, "_oCommodityVHDialog", [
            "Commodity",
            "CommodityName",
          ]);
        },

        onCurrencyVHLiveChange: function (oEvent) {
          this._debounceSearch(oEvent, "_oCurrencyVHDialog", [
            "WAERS",
            "LTEXT",
          ]);
        },

        onUomVHLiveChange: function (oEvent) {
          this._debounceSearch(oEvent, "_oUomVHDialog", ["UnitCode", "Text"]);
        },

        // Simple debounce function
        _debounceSearch: function (oEvent, sDialog, aFields) {
          const sValue = (oEvent.getParameter("value") || "").trim();

          // Clear previous timeout
          if (this._searchTimeouts[sDialog]) {
            clearTimeout(this._searchTimeouts[sDialog]);
          }

          // Set new timeout (300ms delay)
          this._searchTimeouts[sDialog] = setTimeout(() => {
            this._handleSearch(sValue, sDialog, aFields);
          }, 300);
        },

        _handleSearch: function (sValue, sDialog, aFields) {
          const oDialog = this[sDialog];
          if (!oDialog) return;

          const oBinding = oDialog.getTable()?.getBinding("items");
          if (!oBinding) return;

          // Clear or filter based on value
          if (!sValue) {
            oBinding.filter([]);
          } else {
            let aFilters = [];

            if (sDialog === "_oCommodityVHDialog") {
              aFilters = this._createCommodityFilters(sValue);
            } else {
              aFilters = aFields.map(
                (field) => new Filter(field, FilterOperator.Contains, sValue)
              );
            }

            oBinding.filter(
              aFilters.length > 0 ? new Filter(aFilters, false) : []
            );
          }
        },

        /* ------------------------------------------------------------------ */ /*  SUGGESTIONS - UNIFIED IMPLEMENTATION                             */
        /* ------------------------------------------------------------------ */

        onCommoditySuggestion: function (oEvent) {
          this._handleSuggestion(oEvent, "CommodityName", "Commodity");
        },

        onCurrencySuggestion: function (oEvent) {
          this._handleSuggestion(oEvent, "WAERS", "LTEXT");
        },

        onUnitOfMeasureSuggestion: function (oEvent) {
          this._handleSuggestion(oEvent, "UnitCode", "Text");
        },

        _handleSuggestion: function (oEvent, sPrimaryField, sSecondaryField) {
          const sValue = oEvent.getParameter("suggestValue") || "";
          const oInput = oEvent.getSource();
          const oBinding = oInput.getBinding("suggestionItems");

          if (!oBinding) return;

          if (!sValue) {
            oBinding.filter([]);
            return;
          }

          const aFilters = [
            new Filter(sPrimaryField, FilterOperator.Contains, sValue),
          ];

          if (sSecondaryField) {
            if (sPrimaryField === "CommodityName") {
              const nNumValue = parseInt(sValue);
              if (!isNaN(nNumValue)) {
                aFilters.push(
                  new Filter(sSecondaryField, FilterOperator.EQ, nNumValue)
                );
              }
            } else {
              aFilters.push(
                new Filter(sSecondaryField, FilterOperator.Contains, sValue)
              );
            }
          }

          oBinding.filter(
            aFilters.length > 1 ? new Filter(aFilters, false) : aFilters[0]
          );
        },

        onCommoditySuggestionSelect: function (oEvent) {
          const oSelectedRow = oEvent.getParameter("selectedRow");

          if (oSelectedRow) {
            const aCells = oSelectedRow.getCells();
            const iSelectedCommodityCode = parseInt(aCells[0].getText(), 10);
            const sSelectedCommodityName = aCells[1].getText();

            const oFormModel = this.getModel("oEditFormModel");

            // Set commodity code
            oFormModel.setProperty("/commodityCode", iSelectedCommodityCode);
            // Auto-populate category
            oFormModel.setProperty("/category", sSelectedCommodityName);
          }
        },

        onCurrencySuggestionSelect: function (oEvent) {
          const oSelectedRow = oEvent.getParameter("selectedRow");

          if (oSelectedRow) {
            const aCells = oSelectedRow.getCells();
            const sSelectedCurrencyCode = aCells[0].getText();

            const oFormModel = this.getModel("oEditFormModel");

            // Set commodity code
            oFormModel.setProperty("/currency", sSelectedCurrencyCode);
          }
        },

        onUOMSuggestionSelect: function (oEvent) {
          const oSelectedRow = oEvent.getParameter("selectedRow");

          if (oSelectedRow) {
            const aCells = oSelectedRow.getCells();
            const sSelectedUOM = aCells[0].getText();

            const oFormModel = this.getModel("oEditFormModel");

            // Set commodity code
            oFormModel.setProperty("/unitOfMeasure", sSelectedUOM);
          }
        },

        onCommodityCodeChange: function (oEvent) {
          const oSource = oEvent.getSource();
          const sNewValue = oEvent.getParameter("value");

          if (!sNewValue || sNewValue.trim() === "") {
            const oFormModel = this.getModel("oEditFormModel");
            oFormModel.setProperty("/category", "");
          }

          this._validateSingleField("commodityCode", sNewValue);
        },

        /* ------------------------------------------------------------------ */
        /*  SEARCH TERMS (MultiInput)                                        */
        /* ------------------------------------------------------------------ */

        onSearchTermChange: function (oEvent) {
          const oSource = oEvent.getSource();
          const sValue = oEvent.getParameter("value").trim();
          if (!sValue) return;

          const oModel = this.getModel("oEditFormModel");
          const aSearchTerms = oModel.getProperty("/searchTerms") || [];

          if (!aSearchTerms.includes(sValue)) {
            aSearchTerms.push(sValue);
            oModel.setProperty("/searchTerms", aSearchTerms);
          }
          oEvent.getSource().setValue("");
        },

        onSearchTermTokenUpdate: function (oEvent) {
          const sType = oEvent.getParameter("type");
          if (sType !== "removed" && sType !== "removedAll") return;

          const oModel = this.getModel("oEditFormModel");
          let aSearchTerms = oModel.getProperty("/searchTerms") || [];

          const aRemovedTokens = oEvent
            .getParameter("removedTokens")
            .map((t) => t.getKey());

          aSearchTerms = aSearchTerms.filter(
            (t) => !aRemovedTokens.includes(t)
          );

          oModel.setProperty("/searchTerms", aSearchTerms);

          // Validate search terms after removal
          this._validateSingleField("searchTerms", aSearchTerms);
        },

        // Special handler for search terms live validation
        onSearchTermLiveChange: function (oEvent) {
          // For MultiInput, we validate based on current tokens
          const aTokens = this._getSearchTerms("editSearchTermsInput");
          this._validateSingleField("searchTerms", aTokens);
        },

        _getSearchTerms: function (sInputId) {
          const oSearch = this.getView().byId(sInputId);
          return oSearch ? oSearch.getTokens().map((t) => t.getText()) : [];
        },

        /* ------------------------------------------------------------------ */
        /*  FILE UPLOAD & PREVIEW                                            */
        /* ------------------------------------------------------------------ */

        onImageFileChange(oEvent) {
          const oUp = oEvent.getSource();
          const oFile = oEvent.getParameter("files")[0];

          const oPreviewImgBtn = this.byId("editPreviewImageButton");
          const oImg = this.byId("editImagePreview");
          const oModel = this.getModel("oEditFormModel");

          if (oFile) {
            oPreviewImgBtn.setEnabled(true);
            this._convertFileToBase64(oFile).then((sB64) => {
              oModel.setProperty("/productImage", sB64);
              oModel.setProperty("/selectedImageFile", oFile);

              if (oImg) {
                oImg.setSrc(sB64);
                oImg.setVisible(true);
              }

              // Clear validation error
              oModel.setProperty("/productImageValueState", "None");
              oModel.setProperty("/productImageValueStateText", "");
            });
          } else {
            // Set validation error
            oModel.setProperty("/productImageValueState", "Error");
            oModel.setProperty(
              "/productImageValueStateText",
              "Please select a valid image file (JPEG, PNG, max 5MB)"
            );
          }
        },

        onPdfFileChange(oEvent) {
          const oUp = oEvent.getSource();
          const oFile = oEvent.getParameter("files")[0];
          const oPreviewPDFBtn = this.byId("editPreviewPdfButton");
          const oModel = this.getModel("oEditFormModel");

          if (oFile) {
            oPreviewPDFBtn.setEnabled(true);

            this._convertFileToBase64(oFile).then((sB64) => {
              oModel.setProperty("/productSpecification", sB64);
              oModel.setProperty("/selectedPdfFile", oFile);
            });

            // Clear validation error
            oModel.setProperty("/productSpecificationValueState", "None");
            oModel.setProperty("/productSpecificationValueStateText", "");
          } else {
            // Set validation error
            oModel.setProperty("/productSpecificationValueState", "Error");
            oModel.setProperty(
              "/productSpecificationValueStateText",
              "Please select a valid PDF file (max 5MB)"
            );
            oUp.setValue(""); // Clear the file uploader
          }
        },

        onRemoveImage(oEvent) {
          const oPreviewImgBtn = this.byId("editPreviewImageButton");
          const oImg = this.byId("editImagePreview");
          const oImgUploader = this.byId("editProductImageUploader");
          const oModel = this.getModel("oEditFormModel");

          oModel.setProperty("/productImage", "");
          oModel.setProperty("/selectedImageFile", null);

          oPreviewImgBtn.setEnabled(false);
          if (oImg) {
            oImg.setSrc("");
            oImg.setVisible(false);
          }

          // Set validation error since file is required
          oModel.setProperty("/productImageValueState", "Error");
          oModel.setProperty(
            "/productImageValueStateText",
            "Product image is required"
          );

          oImgUploader.setValue("");
          MessageToast.show("Product image removed.");
        },

        onRemovePdf(oEvent) {
          const oPreviewPDFBtn = this.byId("editPreviewPdfButton");
          const oPDFUploader = this.byId("editProductSpecUploader");
          const oModel = this.getModel("oEditFormModel");

          oModel.setProperty("/productSpecification", "");
          oModel.setProperty("/selectedPdfFile", null);

          // Set validation error since file is required
          oModel.setProperty("/productSpecificationValueState", "Error");
          oModel.setProperty(
            "/productSpecificationValueStateText",
            "Product specification PDF is required"
          );

          oPreviewPDFBtn.setEnabled(false);
          oPDFUploader.setValue("");

          MessageToast.show("Product specification PDF removed.");
        },

        onFileSizeExceeded: function () {
          MessageBox.error(
            "File Size is Exceeding the limit of 5mb!! Re-upload the File to continue"
          );
        },

        _convertFileToBase64(oFile) {
          return new Promise((res, rej) => {
            if (!oFile) {
              res("");
              return;
            }
            const reader = new FileReader();
            reader.onload = (e) => res(e.target.result);
            reader.onerror = rej;
            reader.readAsDataURL(oFile);
          });
        },

        _base64ToBlobUrl(sBase64, sMime) {
          const bin = atob(sBase64);
          const len = bin.length;
          const arr = new Uint8Array(len);
          for (let i = 0; i < len; i++) arr[i] = bin.charCodeAt(i);
          return URL.createObjectURL(new Blob([arr], { type: sMime }));
        },

        onPreviewImage(oEvent) {
          const sB64 =
            this.getModel("oEditFormModel").getProperty("/productImage");

          if (!sB64) {
            MessageToast.show("Please select an image first");
            return;
          }

          if (!this._oImagePreviewDialog) {
            this._oImagePreviewDialog = new Dialog({
              title: "Image Preview",
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
                press: () => this._oImagePreviewDialog.close(),
              }),
            });
            this.getView().addDependent(this._oImagePreviewDialog);
          }
          this._oImagePreviewDialog.getContent()[0].getItems()[0].setSrc(sB64);
          this._oImagePreviewDialog.open();
        },

        onPreviewPdf: function (oEvent) {
          const oModel = this.getModel("oEditFormModel");

          const oFile = oModel.getProperty("/selectedPdfFile"); // Blob (new upload)
          const sSpec = oModel.getProperty("/productSpecification"); // Base64 OR Azure URL

          let sUrl = null;

          // 1. New file uploaded → use Blob
          if (oFile instanceof Blob) {
            sUrl = URL.createObjectURL(oFile);
          }
          // 2. Azure URL (http/https) → use directly
          else if (sSpec && /^https?:\/\//i.test(sSpec)) {
            sUrl = sSpec;
          }
          // 3. Base64 string → convert to Blob URL
          else if (sSpec) {
            const a = sSpec.split(",");
            if (a.length === 2) {
              sUrl = this._base64ToBlobUrl(a[1], "application/pdf");
            }
          }

          if (sUrl) {
            window.open(sUrl, "_blank");
          } else {
            MessageToast.show("No PDF available for preview.");
          }
        },

        /* ------------------------------------------------------------------ */
        /*  DATA SUBMISSION                                                   */
        /* ------------------------------------------------------------------ */

        onEditCatalog: function () {
          const oFormModel = this.getModel("oEditFormModel");
          const oCatalogModel = this.getOwnerComponent().getModel("catalog");
          const oData = oFormModel.getData();

          if (!this._validateForm(oData)) return;

          const aTerms = this._getSearchTerms("editSearchTermsInput");

          if (!aTerms.length) {
            MessageBox.error("Please add at least one Search Term");
            return;
          }

          // Check if we have an existing batch
          const aExistingItems =
            oCatalogModel.getProperty("/catalogItems") || [];

          let sExistingBatchId = null;

          if (aExistingItems.length > 0) {
            // Use the batch ID from the first item
            sExistingBatchId = aExistingItems[0].BatchID;
          }

          // Show busy indicator
          sap.ui.core.BusyIndicator.show(0);

          // Create draft item directly
          const oDraftItem = {
            ProductName: oData.productName,
            CommodityCode: parseInt(oData.commodityCode),
            Category: oData.category,
            SearchTerm: aTerms, // This will be converted to string in backend
            UnitPrice: parseFloat(oData.unitPrice),
            CurrencyCode: oData.currency,
            UnitOfMeasure: oData.unitOfMeasure,
            LeadTimeDays: parseInt(oData.leadTime),
            PartNumber: oData.partNumber || "",
            AdditionalLink: oData.additionalLink,
            ProductDescription: oData.productDescription,
            ProductImage: oData.productImage || "",
            ProductSpecification: oData.productSpecification || "",
            DraftStatus: "draft",
          };

          // If we have an existing batch, include the BatchID
          if (sExistingBatchId) {
            oDraftItem.BatchID = sExistingBatchId;
          }

          const oPayload = {
            ProductName: oData.productName,
            CommodityCode: parseInt(oData.commodityCode),
            Category: oData.category,
            SearchTerm: aTerms,
            UnitPrice: parseFloat(oData.unitPrice),
            CurrencyCode: oData.currency,
            UnitOfMeasure: oData.unitOfMeasure,
            LeadTimeDays: parseInt(oData.leadTime),
            PartNumber: oData.partNumber || "",
            AdditionalLink: oData.additionalLink,
            ProductDescription: oData.productDescription,
            ProductImage: oData.productImage,
            ProductSpecification: oData.productSpecification,
            DraftStatus: "draft",
            BatchID: oData.BatchID,
          };

          const {
            ProductImage,
            ProductSpecification,
            DraftStatus,
            ...oCatalogItem
          } = oPayload;

          oCatalogItem["DraftId"] = oData.productId;

          const sDraftKey = `/ProductCatalogDrafts(guid'${oData.productId}')`;

          sap.ui.core.BusyIndicator.show(0);

          const oModel = this.getOwnerComponent().getModel();

          oModel.update(sDraftKey, oPayload, {
            success: () => {
              sap.ui.core.BusyIndicator.hide();

              // --- ALSO update local catalog model (for review list) ---
              const oCatalog = this.getOwnerComponent().getModel("catalog");

              const aItems = oCatalog.getProperty("/catalogItems") || [];

              const iIndex = aItems.findIndex(
                (item) => item.DraftId === oData.editingProductId
              );

              if (iIndex > -1) {
                aItems[iIndex] = {
                  ...aItems[iIndex],
                  ...oPayload,
                  DraftId: oData.editingProductId,
                };
                oCatalog.setProperty("/catalogItems", aItems);
              }

              MessageToast.show("Product updated successfully");
              this._publishCatalogRefresh();
            },
            error: (oError) => {
              sap.ui.core.BusyIndicator.hide();
              MessageBox.error(
                "Failed to update: " + (oError.message || "Unknown error")
              );
            },
          });
        },

        _publishCatalogRefresh: function () {
          this.getOwnerComponent().publishCatalogRefresh();
        },

        onCancelCatalog: function () {
          this.getRouter().navTo("RouteHome");
        },

        /* ------------------------------------------------------------------ */
        /*  VALUE HELP - SELECTION & CLOSE HANDLERS                          */
        /* ------------------------------------------------------------------ */

        onTableRowPress: function (oEvent) {
          const oBindingContext = oEvent.getSource().getBindingContext();
          if (oBindingContext) {
            this._selectedValueHelpItem = oBindingContext.getObject();
          }
        },

        onCommodityVHOk: function (oEvent) {
          this._handleValueHelpOk(
            oEvent,
            "editCommodityCodeInput",
            "/category"
          );
        },

        onCurrencyVHOk: function (oEvent) {
          this._handleValueHelpOk(oEvent, "editCurrencyInput");
        },

        onUomVHOk: function (oEvent) {
          this._handleValueHelpOk(oEvent, "editUnitOfMeasureInput");
        },

        _handleValueHelpOk: function (oEvent, sEditInputId, sFormPropertyPath) {
          const oFormModel = this.getModel("oEditFormModel");
          const aSelectedTokens = oEvent.getParameter("tokens") || [];
          const oInput = this.byId(sEditInputId);

          if (aSelectedTokens.length > 0 && oInput) {
            const oSelectedToken = aSelectedTokens[0];
            oInput.setValue(oSelectedToken.getKey());

            if (sFormPropertyPath) {
              oFormModel.setProperty(
                sFormPropertyPath,
                oSelectedToken.getText().split(" (")[0]
              );
            }
          }

          this._closeValueHelpDialog(
            this._getDialogVariableFromInputId(sEditInputId)
          );
        },

        _getDialogVariableFromInputId: function (sInputId) {
          const dialogMap = {
            editCommodityCodeInput: "_oCommodityVHDialog",
            editCurrencyInput: "_oCurrencyVHDialog",
            editUnitOfMeasureInput: "_oUomVHDialog",
          };
          return dialogMap[sInputId];
        },

        /* ------------------------------------------------------------------ */
        /*  VALUE HELP - CLEANUP HANDLERS                                    */
        /* ------------------------------------------------------------------ */

        onCommodityVHAfterClose: function () {
          this._selectedValueHelpItem = null;
          this._clearValueHelpFilters("_oCommodityVHDialog");
        },

        onCurrencyVHAfterClose: function () {
          this._selectedValueHelpItem = null;
          this._clearValueHelpFilters("_oCurrencyVHDialog");
        },

        onUomVHAfterClose: function () {
          this._selectedValueHelpItem = null;
          this._clearValueHelpFilters("_oUomVHDialog");
        },

        _clearValueHelpFilters: function (sDialogVariable) {
          const oDialog = this[sDialogVariable];
          if (!oDialog) return;

          // Clear the filter bar input
          const oFilterBar = oDialog.getFilterBar();
          if (oFilterBar) {
            const oFilterGroupItems = oFilterBar.getFilterGroupItems();
            const oSearchInput = oFilterGroupItems[0]?.getControl();
            if (oSearchInput) {
              oSearchInput.setValue("");
            }

            // Clear the filters model
            const oFiltersModel = oDialog.getModel("filters");
            if (oFiltersModel) {
              oFiltersModel.setProperty("/search", "");
            }
          }

          // Clear table filters
          const oTable = oDialog.getTable();
          if (oTable) {
            const oBinding = oTable.getBinding("items");
            if (oBinding) {
              oBinding.filter([]);
            }
          }
        },

        // Generic live change handler for most fields
        onFieldLiveChange: function (oEvent) {
          const sValue = oEvent.getParameter("value") || "";
          const sFieldPath = oEvent.getSource().getBindingPath("value");

          // Extract field name from binding path (e.g., "/productName" -> "productName")
          const sFieldName = sFieldPath.replace("/", "");

          this._validateSingleField(sFieldName, sValue);
        },

        _validateSingleField: function (sFieldName, value) {
          const oFormModel = this.getModel("oEditFormModel");
          const sValueStatePath = `/${sFieldName}ValueState`;
          const sValueStateTextPath = `/${sFieldName}ValueStateText`;

          let bIsValid = true;
          let sErrorText = "";

          switch (sFieldName) {
            case "productName":
              bIsValid = !!value && value.trim().length > 0;
              sErrorText = bIsValid ? "" : "Product Name is required";
              break;

            case "commodityCode":
              bIsValid = !!value && value.toString().trim().length > 0;
              sErrorText = bIsValid ? "" : "Commodity Code is required";
              break;

            case "category":
              bIsValid = !!value && value.trim().length > 0;
              sErrorText = bIsValid ? "" : "Category is required";
              break;

            case "unitPrice":
              bIsValid =
                value !== null && value !== "" && parseFloat(value) > 0;
              sErrorText = bIsValid ? "" : "Unit Price must be greater than 0";
              break;

            case "currency":
              bIsValid = !!value && value.trim().length > 0;
              sErrorText = bIsValid ? "" : "Currency is required";
              break;

            case "unitOfMeasure":
              bIsValid = !!value && value.trim().length > 0;
              sErrorText = bIsValid ? "" : "Unit of Measure is required";
              break;

            case "leadTime":
              bIsValid = value !== null && value !== "" && parseInt(value) > 0;
              sErrorText = bIsValid ? "" : "Lead Time must be greater than 0";
              break;

            case "additionalLink":
              bIsValid =
                !!value && value.trim().length > 0 && this._isValidUrl(value);
              sErrorText = bIsValid ? "" : "Please enter a valid URL";
              break;

            case "productDescription":
              bIsValid = !!value && value.trim().length > 0;
              sErrorText = bIsValid ? "" : "Product Description is required";
              break;

            case "searchTerms":
              bIsValid = Array.isArray(value) && value.length > 0;
              sErrorText = bIsValid
                ? ""
                : "At least one search term is required";
              break;

            case "productImage":
              bIsValid = !!value && value.length > 0;
              sErrorText = bIsValid ? "" : "Product image is required";
              break;

            case "productSpecification":
              bIsValid = !!value && value.length > 0;
              sErrorText = bIsValid
                ? ""
                : "Product specification PDF is required";
              break;
          }

          // Update value state
          oFormModel.setProperty(sValueStatePath, bIsValid ? "None" : "Error");
          oFormModel.setProperty(sValueStateTextPath, sErrorText);
        },

        // URL validation helper
        _isValidUrl: function (sUrl) {
          if (!sUrl) return false;
          try {
            new URL(sUrl);
            return true;
          } catch (e) {
            return false;
          }
        },

        // File validation helpers
        _validateImageFile: function (oFile) {
          if (!oFile) return false;

          // Check file type
          const aAllowedTypes = ["image/jpeg", "image/jpg", "image/png"];
          if (!aAllowedTypes.includes(oFile.type)) {
            return false;
          }

          // Check file size (5MB in bytes)
          if (oFile.size > 5 * 1024 * 1024) {
            return false;
          }

          return true;
        },

        _validatePdfFile: function (oFile) {
          if (!oFile) return false;

          // Check file type
          if (oFile.type !== "application/pdf") {
            return false;
          }

          // Check file size (5MB in bytes)
          if (oFile.size > 5 * 1024 * 1024) {
            return false;
          }

          return true;
        },

        _validateForm: function (oData) {
          const aErrors = [];

          // Validate each field individually (this will update value states)
          this._validateSingleField("productName", oData.productName);
          this._validateSingleField("commodityCode", oData.commodityCode);
          this._validateSingleField("category", oData.category);
          this._validateSingleField("unitPrice", oData.unitPrice);
          this._validateSingleField("currency", oData.currency);
          this._validateSingleField("unitOfMeasure", oData.unitOfMeasure);
          this._validateSingleField("leadTime", oData.leadTime);
          this._validateSingleField("additionalLink", oData.additionalLink);
          this._validateSingleField(
            "productDescription",
            oData.productDescription
          );

          // Validate search terms
          const aTerms = this._getSearchTerms("editSearchTermsInput");
          this._validateSingleField("searchTerms", aTerms);

          // Validate files
          this._validateSingleField("productImage", oData.productImage);
          this._validateSingleField(
            "productSpecification",
            oData.productSpecification
          );

          // Collect error messages from value states
          const oFormModel = this.getModel("oEditFormModel");
          const aFieldNames = [
            "productName",
            "commodityCode",
            "category",
            "unitPrice",
            "currency",
            "unitOfMeasure",
            "leadTime",
            "additionalLink",
            "productDescription",
            "searchTerms",
            "productImage",
            "productSpecification",
          ];

          aFieldNames.forEach((sFieldName) => {
            const sErrorText = oFormModel.getProperty(
              `/${sFieldName}ValueStateText`
            );
            if (sErrorText) {
              aErrors.push(sErrorText);
            }
          });

          // If there are errors, show them all at once
          if (aErrors.length > 0) {
            this._showValidationErrors(aErrors);
            return false;
          }

          return true;
        },

        // Show all validation errors in a single message
        _showValidationErrors: function (aErrors) {
          if (aErrors.length === 0) return;

          let sErrorMessage = "Please fix the following errors:\n\n";

          aErrors.forEach((sError, index) => {
            sErrorMessage += `${index + 1}. ${sError}\n`;
          });

          MessageBox.error(sErrorMessage, {
            title: "Validation Errors",
            styleClass: "sapUiSizeCompact",
          });
        },

        _clearAllValidationErrors: function () {
          const oFormModel = this.getModel("oEditFormModel");
          const aFieldNames = [
            "productName",
            "commodityCode",
            "category",
            "unitPrice",
            "currency",
            "unitOfMeasure",
            "leadTime",
            "additionalLink",
            "productDescription",
            "searchTerms",
            "productImage",
            "productSpecification",
          ];

          aFieldNames.forEach((sFieldName) => {
            oFormModel.setProperty(`/${sFieldName}ValueState`, "None");
            oFormModel.setProperty(`/${sFieldName}ValueStateText`, "");
          });
        },

        onNavigateBack: function (params) {
          this._navigateToCatalogReview();
        },

        _navigateToCatalogReview: function () {
          this.getRouter().navTo("catalogReview");
        },

        _refreshCatalogReview: function () {
          this.getOwnerComponent().getModel("catalog").refresh();
        },

        /* ------------------------------------------------------------------ */
        /*  EXIT - Clean up resources to prevent memory leaks                */
        /* ------------------------------------------------------------------ */
        onExit: function () {
          // 1. Clear all pending search timeouts
          if (this._searchTimeouts) {
            Object.values(this._searchTimeouts).forEach((timeoutId) => {
              if (timeoutId) {
                clearTimeout(timeoutId);
              }
            });
            this._searchTimeouts = null;
          }

          // 2. Destroy all value help dialogs
          const aValueHelpDialogs = [
            "_oCommodityVHDialog",
            "_oCurrencyVHDialog",
            "_oUomVHDialog",
          ];
          aValueHelpDialogs.forEach((sDialogVar) => {
            if (this[sDialogVar]) {
              this[sDialogVar].destroy();
              this[sDialogVar] = null;
            }
          });

          // 3. Destroy image preview dialog
          if (this._oImagePreviewDialog) {
            this._oImagePreviewDialog.destroy();
            this._oImagePreviewDialog = null;
          }

          // 4. Clean up file references (if any files were selected but not uploaded)
          const oFormModel = this.getModel("oEditFormModel");
          if (oFormModel) {
            const oData = oFormModel.getData();
            // Clean up any blob URLs that might have been created for previews
            if (
              oData.selectedImageFile &&
              oData.selectedImageFile instanceof Blob
            ) {
              // If we created any blob URLs for preview, revoke them here
              // URL.revokeObjectURL(blobUrl);
            }
            if (
              oData.selectedPdfFile &&
              oData.selectedPdfFile instanceof Blob
            ) {
              // URL.revokeObjectURL(blobUrl);
            }
          }

          // 5. Clear other instance variables
          this._selectedValueHelpItem = null;
          this._currentInputId = null;
          this._router = null;

          // 6. Call parent onExit if exists (good practice)
          if (BaseController.prototype.onExit) {
            BaseController.prototype.onExit.apply(this, arguments);
          }
        },
      }
    );
  }
);
