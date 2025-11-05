sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Fragment",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/m/Token",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/Dialog",
    "sap/m/VBox",
    "sap/m/Image",
    "sap/m/Button",
  ],
  function (
    Controller,
    JSONModel,
    Fragment,
    MessageToast,
    MessageBox,
    Token,
    Filter,
    FilterOperator,
    Dialog,
    VBox,
    Image,
    Button
  ) {
    "use strict";

    return Controller.extend("com.catalog.aispcatalog.controller.App", {
      /* ------------------------------------------------------------------ */
      /*  INITIALISATION                                                    */
      /* ------------------------------------------------------------------ */
      onInit: function () {
        const oViewModel = new JSONModel({
          busy: true,
          delay: 0,
          layout: "TwoColumnsMidExpanded",
          smallScreenMode: true,
        });

        this.getView().setModel(oViewModel, "appView");

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

        // Listen for catalog model changes to update all components
        this._setupCatalogModelListener();

        this.getOwnerComponent()
          .getModel()
          .metadataLoaded()
          .then(fnSetAppNotBusy);
        this.getOwnerComponent()
          .getModel()
          .attachMetadataFailed(fnSetAppNotBusy);
      },

      _publishCatalogRefresh: function () {
        this.getOwnerComponent().publishCatalogRefresh();
      },

      _initModels: function (aModelConfigs) {
        aModelConfigs.forEach((config) => {
          this.getView().setModel(new JSONModel(config.data), config.name);
        });
      },

      _setupCatalogModelListener: function () {
        const oCatalogModel = this.getOwnerComponent().getModel("catalog");

        // Refresh create dialog when catalog changes
        oCatalogModel.attachPropertyChange(
          "/catalogItems",
          function (oEvent) {
            if (
              this._oCreateCatalogDialog &&
              this._oCreateCatalogDialog.isOpen()
            ) {
              // Force refresh of the dialog binding
              this._oCreateCatalogDialog.getModel("catalog").refresh();
            }
          }.bind(this)
        );
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
          this._loadODataWithErrorHandling(
            config.path,
            config.model,
            config.property,
            config.name
          );
        });
      },

      _loadODataWithErrorHandling: function (
        sEntityPath,
        sModelName,
        sProperty,
        sDisplayName
      ) {
        const oModel = this.getOwnerComponent().getModel();

        oModel.read(sEntityPath, {
          success: (data) => {
            this.getView()
              .getModel(sModelName)
              .setProperty(`/${sProperty}`, data.results || []);
          },
          error: (oError) => {
            console.error(`Failed to load ${sDisplayName}:`, oError);
            MessageBox.error(
              `Could not load ${sDisplayName}. Please try again later.`
            );
            this.getView()
              .getModel(sModelName)
              .setProperty(`/${sProperty}`, []);
          },
        });
      },
      /* ------------------------------------------------------------------ */
      /*  CREATE DIALOG                                                     */
      /* ------------------------------------------------------------------ */
      onCreateCatalog: function () {
        const oView = this.getView();

        if (!this._oCreateCatalogDialog) {
          Fragment.load({
            id: oView.getId(),
            name: "com.catalog.aispcatalog.view.fragments.CreateCatalogItem",
            controller: this,
          }).then((oDialog) => {
            this._oCreateCatalogDialog = oDialog;
            oView.addDependent(oDialog);
            this._initCreateFormModel(oDialog);
            oDialog.open();
          });
        } else {
          this._resetCreateForm();
          this._oCreateCatalogDialog.open();
        }
      },

      _initCreateFormModel: function (oDialog) {
        const oFormData = new JSONModel(this._getEmptyFormData());
        oDialog.setModel(oFormData, "oCreateFormModel");
        oDialog.setModel(
          this.getOwnerComponent().getModel("catalog"),
          "catalog"
        );
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
        };
      },

      onAddAndViewCatalog: function () {
        const oFormModel =
          this._oCreateCatalogDialog.getModel("oCreateFormModel");
        const oCatalogModel = this.getOwnerComponent().getModel("catalog");
        const oData = oFormModel.getData();

        if (!this._validateForm(oData)) return;

        const aTerms = this._getSearchTerms("searchTermsInput");
        if (!aTerms.length) {
          MessageBox.error("Please add at least one Search Term");
          return;
        }

        // Check if we have an existing batch
        const aExistingItems = oCatalogModel.getProperty("/catalogItems") || [];
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

        const {
          ProductImage,
          ProductSpecification,
          DraftStatus,
          ...oCatalogItem
        } = oDraftItem;

        const oModel = this.getOwnerComponent().getModel();

        oModel.create("/ProductCatalogDrafts", oDraftItem, {
          success: (oResult) => {
            sap.ui.core.BusyIndicator.hide();
            MessageToast.show("Product saved as draft successfully");
            oCatalogModel.addCatalogItem({
              ...oCatalogItem,
              // Store backend references
              // id: oResult.ID,
              DraftId: oResult.ID,
              BatchID: oResult.BatchID,
            });
            this._oCreateCatalogDialog.close();
            this._resetCreateForm();
            this._publishCatalogRefresh();
            this._navigateToCatalogReview();
          },
          error: (oError) => {
            sap.ui.core.BusyIndicator.hide();
            console.error("Failed to save draft:", oError);
            MessageBox.error(
              "Failed to save product as draft. Please try again."
            );
          },
        });
      },

      // In CatalogReview.controller.js

      refreshCatalogData: function () {
        this._loadDraftItems();
      },

      onCancelDialog: function () {
        if (this._oCreateCatalogDialog) {
          this._oCreateCatalogDialog.close();
          this._resetCreateForm();
        }
      },

      _resetCreateForm: function () {
        if (!this._oCreateCatalogDialog) return;

        const oForm = this._oCreateCatalogDialog.getModel("oCreateFormModel");
        oForm.setData(this._getEmptyFormData());

        ["commodityCodeInput", "currencyInput", "unitOfMeasureInput"].forEach(
          (id) => {
            const oInput = this.getView().byId(id);
            if (oInput) oInput.setValue("");
          }
        );

        const oSearch = this.getView().byId("searchTermsInput");
        if (oSearch) {
          oSearch.destroyTokens();
          oSearch.setValue("");
        }

        this._resetFileUploaders();
      },

      _resetFileUploaders: function () {
        const uploaders = [
          {
            uploader: "productImageUploader",
            button: "previewImageButton",
            preview: "imagePreview",
          },
          { uploader: "productSpecUploader", button: "previewPdfButton" },
        ];

        uploaders.forEach((config) => {
          const oUploader = this.getView().byId(config.uploader);
          const oButton = this.getView().byId(config.button);
          const oPreview = config.preview
            ? this.getView().byId(config.preview)
            : null;

          if (oUploader) oUploader.setValue("");
          if (oButton) oButton.setEnabled(false);
          if (oPreview) {
            oPreview.setSrc("");
            oPreview.setVisible(false);
          }
        });
      },

      /* ------------------------------------------------------------------ */
      /*  VALUE HELP - UNIFIED IMPLEMENTATION                              */
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

        if (!this[sDialogVariable]) {
          Fragment.load({
            name: `com.catalog.aispcatalog.view.fragments.${sFragmentName}`,
            controller: this,
          }).then((oDialog) => {
            this[sDialogVariable] = oDialog;
            oView.addDependent(oDialog);
            oDialog.setModel(this.getOwnerComponent().getModel());
            oDialog.setModel(new JSONModel({ filters: {} }), "filters");
            this._createValueHelpTable(oDialog, sEntitySet, aColumnsConfig);
            oDialog.open();
          });
        } else {
          this[sDialogVariable].open();
        }
      },

      _createValueHelpTable: function (oDialog, sEntitySet, aColumnsConfig) {
        const aColumns = aColumnsConfig.map(
          (oColumn) =>
            new sap.m.Column({
              header: new sap.m.Label({ text: oColumn.label }),
            })
        );

        const oTemplate = new sap.m.ColumnListItem({
          type: "Active",
          press: ".onTableRowPress",
          cells: aColumnsConfig.map(
            (oColumn) => new sap.m.Text({ text: `{${oColumn.key}}` })
          ),
        });

        const oTable = new sap.m.Table({
          columns: aColumns,
          mode: "SingleSelectMaster",
          growing: true,
          growingThreshold: 50,
        });

        oTable.bindItems({ path: sEntitySet, template: oTemplate });
        oDialog.setTable(oTable);
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

        const aFilters = oFilterBar
          .getFilterGroupItems()
          .map((oFilterGroup) => {
            const sValue = oFilterGroup.getControl().getValue();
            const sField = oFilterGroup.getName();
            return sValue?.trim()
              ? new Filter(sField, FilterOperator.Contains, sValue)
              : null;
          })
          .filter((oFilter) => oFilter !== null);

        oBinding.filter(aFilters.length > 0 ? new Filter(aFilters, false) : []);
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
        this._handleValueHelpOk(oEvent, "commodityCodeInput", "/category");
      },

      onCurrencyVHOk: function (oEvent) {
        this._handleValueHelpOk(oEvent, "currencyInput");
      },

      onUomVHOk: function (oEvent) {
        this._handleValueHelpOk(oEvent, "unitOfMeasureInput");
      },

      _handleValueHelpOk: function (oEvent, sCreateInputId, sFormPropertyPath) {
        const oActiveDialog = this._getActiveDialogAndModel();
        if (!oActiveDialog) return;
        const { dialog: oDialog, modelName: sModelName } = oActiveDialog;
        const sInputId =
          oDialog === this._oCreateCatalogDialog
            ? sCreateInputId
            : this._getEditInputId(sCreateInputId);
        const aSelectedTokens = oEvent.getParameter("tokens") || [];
        const oInput = this.byId(sInputId);

        if (aSelectedTokens.length > 0 && oInput) {
          const oSelectedToken = aSelectedTokens[0];
          oInput.setValue(oSelectedToken.getKey());

          if (sFormPropertyPath && oActiveDialog) {
            const oFormModel = oDialog.getModel(sModelName);
            oFormModel.setProperty(
              sFormPropertyPath,
              oSelectedToken.getText().split(" (")[0]
            );
          }
        }
        this._closeValueHelpDialog(
          this._getDialogVariableFromInputId(sInputId)
        );
      },

      _getActiveDialogAndModel: function () {
        // Check create dialog first with proper existence checks
        if (this._oCreateCatalogDialog && this._oCreateCatalogDialog.isOpen()) {
          const oCreateModel =
            this._oCreateCatalogDialog.getModel("oCreateFormModel");
          if (oCreateModel) {
            return {
              dialog: this._oCreateCatalogDialog,
              modelName: "oCreateFormModel",
              type: "create",
            };
          }
        }

        // Check edit dialog
        if (this._oEditCatalogDialog && this._oEditCatalogDialog.isOpen()) {
          const oEditModel =
            this._oEditCatalogDialog.getModel("oEditFormModel");
          if (oEditModel) {
            return {
              dialog: this._oEditCatalogDialog,
              modelName: "oEditFormModel",
              type: "edit",
            };
          }
        }

        console.warn("No active dialog found with model");
        return null;
      },

      _getEditInputId: function (sCreateId) {
        const map = {
          commodityCodeInput: "editCommodityCodeInput",
          currencyInput: "editCurrencyInput",
          unitOfMeasureInput: "editUnitOfMeasureInput",
        };
        return map[sCreateId] || sCreateId;
      },

      _getDialogVariableFromInputId: function (sInputId) {
        const dialogMap = {
          commodityCodeInput: "_oCommodityVHDialog",
          currencyInput: "_oCurrencyVHDialog",
          unitOfMeasureInput: "_oUomVHDialog",
          editCommodityCodeInput: "_oCommodityVHDialog",
          editCurrencyInput: "_oCurrencyVHDialog",
          editUnitOfMeasureInput: "_oUomVHDialog",
        };
        return dialogMap[sInputId];
      },

      _closeValueHelpDialog: function (sDialogVariable) {
        if (this[sDialogVariable]) {
          this[sDialogVariable].close();
          this._selectedValueHelpItem = null;
        }
      },

      onCommodityVHCancel: function () {
        this._closeValueHelpDialog("_oCommodityVHDialog");
      },

      onCurrencyVHCancel: function () {
        this._closeValueHelpDialog("_oCurrencyVHDialog");
      },

      onUomVHCancel: function () {
        this._closeValueHelpDialog("_oUomVHDialog");
      },

      onCommodityVHAfterClose: function () {
        this._selectedValueHelpItem = null;
      },

      onCurrencyVHAfterClose: function () {
        this._selectedValueHelpItem = null;
      },

      onUomVHAfterClose: function () {
        this._selectedValueHelpItem = null;
      },

      /* ------------------------------------------------------------------ */
      /*  SUGGESTIONS - UNIFIED IMPLEMENTATION                             */
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
        const oSelectedItem = oEvent.getParameter("selectedItem");
        const oSource = oEvent.getSource();
        const bEdit = oSource.getId().includes("edit");
        const oDialog = bEdit
          ? this._oEditCatalogDialog
          : this._oCreateCatalogDialog;
        const sModel = bEdit ? "oEditFormModel" : "oCreateFormModel";

        if (oSelectedItem) {
          const oBindingContext = oSelectedItem.getBindingContext();
          if (oBindingContext) {
            const oSelectedData = oBindingContext.getObject();
            const oFormModel = oDialog.getModel(sModel);

            // Set commodity code
            oFormModel.setProperty("/commodityCode", oSelectedData.Commodity);
            // Auto-populate category
            oFormModel.setProperty("/category", oSelectedData.CommodityName);
          }
        }
      },

      onCurrencySuggestionSelect: function (oEvent) {
        const oSelectedItem = oEvent.getParameter("selectedItem");
        const oSource = oEvent.getSource();
        const bEdit = oSource.getId().includes("edit");
        const oDialog = bEdit
          ? this._oEditCatalogDialog
          : this._oCreateCatalogDialog;
        const sModel = bEdit ? "oEditFormModel" : "oCreateFormModel";

        if (oSelectedItem) {
          const oBindingContext = oSelectedItem.getBindingContext();
          if (oBindingContext) {
            const oSelectedData = oBindingContext.getObject();
            const oFormModel = oDialog.getModel(sModel);

            // Set currency
            oFormModel.setProperty("/currency", oSelectedData.WAERS);
          }
        }
      },

      onUOMSuggestionSelect: function (oEvent) {
        const oSelectedItem = oEvent.getParameter("selectedItem");
        const oSource = oEvent.getSource();
        const bEdit = oSource.getId().includes("edit");
        const oDialog = bEdit
          ? this._oEditCatalogDialog
          : this._oCreateCatalogDialog;
        const sModel = bEdit ? "oEditFormModel" : "oCreateFormModel";

        if (oSelectedItem) {
          const oBindingContext = oSelectedItem.getBindingContext();
          if (oBindingContext) {
            const oSelectedData = oBindingContext.getObject();
            const oFormModel = oDialog.getModel(sModel);

            // Set unit of measure
            oFormModel.setProperty("/unitOfMeasure", oSelectedData.UnitCode);
          }
        }
      },

      onCommodityCodeChange: function (oEvent) {
        const oSource = oEvent.getSource();
        const sNewValue = oEvent.getParameter("value");
        const bEdit = oSource.getId().includes("edit");
        const oDialog = bEdit
          ? this._oEditCatalogDialog
          : this._oCreateCatalogDialog;
        const oModel = bEdit ? "oEditFormModel" : "oCreateFormModel";

        if ((!sNewValue || sNewValue.trim() === "") && oDialog) {
          const oFormModel = oDialog.getModel(oModel);
          oFormModel.setProperty("/category", "");
        }
      },

      /* ------------------------------------------------------------------ */
      /*  SEARCH TERMS (MultiInput)                                        */
      /* ------------------------------------------------------------------ */
      onSearchTermChange: function (oEvent) {
        const oSource = oEvent.getSource();
        const sValue = oEvent.getParameter("value").trim();
        if (!sValue) return;

        const bEdit = oSource.getId().includes("edit");
        const oDialog = bEdit
          ? this._oEditCatalogDialog
          : this._oCreateCatalogDialog;
        const oModel = bEdit ? "oEditFormModel" : "oCreateFormModel";
        if (!oDialog) return;

        const oForm = oDialog.getModel(oModel);
        const aSearchTerms = oForm.getProperty("/searchTerms") || [];

        if (!aSearchTerms.includes(sValue)) {
          aSearchTerms.push(sValue);
          oForm.setProperty("/searchTerms", aSearchTerms);
        }
        oEvent.getSource().setValue("");
      },

      onSearchTermTokenUpdate: function (oEvent) {
        const sType = oEvent.getParameter("type");
        if (sType !== "removed" && sType !== "removedAll") return;

        const oDialog = this._oCreateCatalogDialog || this._oEditCatalogDialog;
        if (!oDialog) return;

        const oForm = oDialog.getModel("oCreateFormModel");
        let aSearchTerms = oForm.getProperty("/searchTerms") || [];
        const aRemovedTokens = oEvent
          .getParameter("removedTokens")
          .map((t) => t.getKey());

        aSearchTerms = aSearchTerms.filter((t) => !aRemovedTokens.includes(t));
        oForm.setProperty("/searchTerms", aSearchTerms);
      },

      _getSearchTerms: function (sInputId) {
        const oSearch = this.getView().byId(sInputId);
        return oSearch ? oSearch.getTokens().map((t) => t.getText()) : [];
      },

      /* ------------------------------------------------------------------ */
      /*  EDIT DIALOG                                                       */
      /* ------------------------------------------------------------------ */
      openEditCatalogDialog: function (oProduct) {
        if (!oProduct) {
          MessageToast.show("Product not found");
          return;
        }

        if (this._oEditCatalogDialog) {
          this._populateEditForm(oProduct);
          this._oEditCatalogDialog.open();
          return;
        }

        Fragment.load({
          id: this.getView().getId(),
          name: "com.catalog.aispcatalog.view.fragments.EditCatalogItem",
          controller: this,
        }).then((oDlg) => {
          this._oEditCatalogDialog = oDlg;
          this.getView().addDependent(oDlg);
          this._populateEditForm(oProduct);
          oDlg.open();
        });
      },

      _populateEditForm: function (oProduct) {
        const oFormData = new JSONModel({
          ...this._getEmptyFormData(),
          productName: oProduct.productName,
          commodityCode: oProduct.commodityCode,
          category: oProduct.category,
          searchTerms: oProduct.searchTerms || [],
          unitPrice: oProduct.unitPrice,
          currency: oProduct.currency,
          unitOfMeasure: oProduct.unitOfMeasure,
          leadTime: oProduct.leadTime,
          partNumber: oProduct.partNumber || "",
          additionalLink: oProduct.additionalLink,
          productDescription: oProduct.productDescription,
          productImage: oProduct.ProductImage || "",
          productSpecification: oProduct.ProductSpecification || "",
          editingProductId: oProduct.id,
        });

        this._oEditCatalogDialog.setModel(oFormData, "oEditFormModel");

        this._oEditCatalogDialog.addEventDelegate({
          onAfterRendering: () => {
            this._initializeEditFormFields(oProduct);
          },
        });
      },

      _initializeEditFormFields: function (oProduct) {
        const oModel = this._oEditCatalogDialog.getModel("oEditFormModel");

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

      onUpdateCatalogItem: function () {
        const oForm = this._oEditCatalogDialog.getModel("oEditFormModel");
        const oData = oForm.getData();
        const oModel = this.getOwnerComponent().getModel();

        if (!this._validateForm(oData)) return;

        const aTerms = this._getSearchTerms("editSearchTermsInput");
        if (!aTerms.length) {
          MessageBox.error("Please add at least one Search Term");
          return;
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

        oCatalogItem["DraftId"] = oData.editingProductId;

        const sDraftKey = `/ProductCatalogDrafts(guid'${oData.editingProductId}')`;

        sap.ui.core.BusyIndicator.show(0);

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

            this._oEditCatalogDialog.close();
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

      onCancelEditDialog: function () {
        if (this._oEditCatalogDialog) this._oEditCatalogDialog.close();
      },

      /* ------------------------------------------------------------------ */
      /*  FILE UPLOAD & PREVIEW                                            */
      /* ------------------------------------------------------------------ */
      onImageFileChange(oEvent) {
        const oUp = oEvent.getSource();
        const oFile = oEvent.getParameter("files")[0];
        const bEdit = oUp.getId().includes("edit");
        const oDialog = bEdit
          ? this._oEditCatalogDialog
          : this._oCreateCatalogDialog;
        const sBtn = bEdit ? "editPreviewImageButton" : "previewImageButton";
        const sPrev = bEdit ? "editImagePreview" : "imagePreview";
        const oModel = bEdit ? "oEditFormModel" : "oCreateFormModel";

        if (oFile) {
          this.getView().byId(sBtn).setEnabled(true);
          this._convertFileToBase64(oFile).then((sB64) => {
            oDialog.getModel(oModel).setProperty("/productImage", sB64);
            oDialog.getModel(oModel).setProperty("/selectedImageFile", oFile);
            const oImg = this.getView().byId(sPrev);
            if (oImg) {
              oImg.setSrc(sB64);
              oImg.setVisible(true);
            }
          });
        }
      },

      onPdfFileChange(oEvent) {
        const oUp = oEvent.getSource();
        const oFile = oEvent.getParameter("files")[0];
        const bEdit = oUp.getId().includes("edit");
        const oDialog = bEdit
          ? this._oEditCatalogDialog
          : this._oCreateCatalogDialog;
        const sBtn = bEdit ? "editPreviewPdfButton" : "previewPdfButton";
        const oModel = bEdit ? "oEditFormModel" : "oCreateFormModel";

        if (oFile) {
          this.getView().byId(sBtn).setEnabled(true);
          this._convertFileToBase64(oFile).then((sB64) => {
            oDialog.getModel(oModel).setProperty("/productSpecification", sB64);
            oDialog.getModel(oModel).setProperty("/selectedPdfFile", oFile);
          });
        }
      },

      onRemoveImage(oEvent) {
        const bEdit = oEvent.getSource().getId().includes("edit");
        const oDialog = bEdit
          ? this._oEditCatalogDialog
          : this._oCreateCatalogDialog;
        const sPrev = bEdit ? "editImagePreview" : "imagePreview";
        const sBtn = bEdit ? "editPreviewImageButton" : "previewImageButton";
        const sUp = bEdit ? "editProductImageUploader" : "productImageUploader";
        const oModel = bEdit ? "oEditFormModel" : "oCreateFormModel";

        oDialog.getModel(oModel).setProperty("/productImage", "");
        oDialog.getModel(oModel).setProperty("/selectedImageFile", null);
        this.getView().byId(sBtn).setEnabled(false);
        const oImg = this.getView().byId(sPrev);
        if (oImg) {
          oImg.setSrc("");
          oImg.setVisible(false);
        }
        this.getView().byId(sUp).setValue("");
        MessageToast.show("Product image removed.");
      },

      onRemovePdf(oEvent) {
        const bEdit = oEvent.getSource().getId().includes("edit");
        const oDialog = bEdit
          ? this._oEditCatalogDialog
          : this._oCreateCatalogDialog;
        const sBtn = bEdit ? "editPreviewPdfButton" : "previewPdfButton";
        const sUp = bEdit ? "editProductSpecUploader" : "productSpecUploader";
        const oModel = bEdit ? "oEditFormModel" : "oCreateFormModel";

        oDialog.getModel(oModel).setProperty("/productSpecification", "");
        oDialog.getModel(oModel).setProperty("/selectedPdfFile", null);
        this.getView().byId(sBtn).setEnabled(false);
        this.getView().byId(sUp).setValue("");
        MessageToast.show("Product specification PDF removed.");
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
        const bEdit = oEvent.getSource().getId().includes("edit");
        const oDlg = bEdit
          ? this._oEditCatalogDialog
          : this._oCreateCatalogDialog;

        const oModel = bEdit ? "oEditFormModel" : "oCreateFormModel";
        const sB64 = oDlg.getModel(oModel).getProperty("/productImage");

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
        const bEdit = oEvent.getSource().getId().includes("edit");
        const oDlg = bEdit
          ? this._oEditCatalogDialog
          : this._oCreateCatalogDialog;
        const sModelName = bEdit ? "oEditFormModel" : "oCreateFormModel";
        const oModel = oDlg.getModel(sModelName);

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
      /*  VALIDATION & NAVIGATION                                           */
      /* ------------------------------------------------------------------ */
      _validateForm: function (oData) {
        const aRequiredFields = [
          { f: "productName", m: "Product Name" },
          { f: "commodityCode", m: "Commodity Code" },
          { f: "category", m: "Category" },
          { f: "unitPrice", m: "Unit Price" },
          { f: "unitOfMeasure", m: "Unit of Measure" },
          { f: "leadTime", m: "Lead Time" },
          { f: "currency", m: "Currency" },
          { f: "additionalLink", m: "Additional Link" },
          { f: "productDescription", m: "Product Description" },
        ];

        for (const field of aRequiredFields) {
          if (!oData[field.f]) {
            MessageBox.error(`${field.m} is required`);
            return false;
          }
        }

        if (oData.unitPrice <= 0) {
          MessageBox.error("Unit Price must be > 0");
          return false;
        }

        if (oData.leadTime <= 0) {
          MessageBox.error("Lead Time must be > 0");
          return false;
        }

        return true;
      },

      _navigateToCatalogReview: function () {
        this.getView()
          .getModel("appView")
          .setProperty("/layout", "ThreeColumnsMidExpanded");

        this.getOwnerComponent().getRouter().navTo("catalogReview");
      },

      _refreshCatalogReview: function () {
        this.getOwnerComponent().getModel("catalog").refresh();
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
    });
  }
);
