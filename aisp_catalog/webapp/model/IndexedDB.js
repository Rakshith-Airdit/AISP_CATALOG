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
          this.getView().setModel(new JSONModel(config.data), config.name);
        });
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
        const oData = oFormModel.getData();

        if (!this._validateForm(oData)) return;

        const aTerms = this._getSearchTerms("searchTermsInput");
        if (!aTerms.length) {
          MessageBox.error("Please add at least one Search Term");
          return;
        }

        const oItem = {
          productName: oData.productName,
          commodityCode: oData.commodityCode,
          category: oData.category,
          searchTerms: aTerms,
          unitPrice: parseFloat(oData.unitPrice),
          currency: oData.currency,
          unitOfMeasure: oData.unitOfMeasure,
          leadTime: parseInt(oData.leadTime),
          partNumber: oData.partNumber,
          additionalLink: oData.additionalLink,
          productDescription: oData.productDescription,
          ProductImage: oData.productImage,
          ProductSpecification: oData.productSpecification,
          selectedImageFile: oData.selectedImageFile,
          selectedPdfFile: oData.selectedPdfFile,
          timestamp: Date.now(),
          id: "temp_" + Date.now(),
        };

        this.getOwnerComponent().getModel("catalog").addCatalogItem(oItem);
        this._oCreateCatalogDialog.close();
        this._resetCreateForm();
        this._navigateToCatalogReview();
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

      _handleValueHelpOk: function (oEvent, sInputId, sFormPropertyPath) {
        const aSelectedTokens = oEvent.getParameter("tokens") || [];
        const oInput = this.byId(sInputId);

        if (aSelectedTokens.length > 0 && oInput) {
          const oSelectedToken = aSelectedTokens[0];
          oInput.setValue(oSelectedToken.getKey());

          if (sFormPropertyPath && this._oCreateCatalogDialog) {
            const oFormModel =
              this._oCreateCatalogDialog.getModel("oCreateFormModel");
            oFormModel.setProperty(
              sFormPropertyPath,
              oSelectedToken.getText().split(" ")[0]
            );
          }
        }
        this._closeValueHelpDialog(
          this._getDialogVariableFromInputId(sInputId)
        );
      },

      _getDialogVariableFromInputId: function (sInputId) {
        const dialogMap = {
          commodityCodeInput: "_oCommodityVHDialog",
          currencyInput: "_oCurrencyVHDialog",
          unitOfMeasureInput: "_oUomVHDialog",
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
        const sNewValue = oEvent.getParameter("value");
        const oDialog = this._oCreateCatalogDialog || this._oEditCatalogDialog;

        if ((!sNewValue || sNewValue.trim() === "") && oDialog) {
          const oFormModel = oDialog.getModel("oCreateFormModel");
          oFormModel.setProperty("/category", "");
        }
      },

      /* ------------------------------------------------------------------ */
      /*  SEARCH TERMS (MultiInput)                                        */
      /* ------------------------------------------------------------------ */
      onSearchTermChange: function (oEvent) {
        const sValue = oEvent.getParameter("value").trim();
        if (!sValue) return;

        const oDialog = this._oCreateCatalogDialog || this._oEditCatalogDialog;
        if (!oDialog) return;

        const oForm = oDialog.getModel("oCreateFormModel");
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
          selectedImageFile: oProduct.selectedImageFile,
          selectedPdfFile: oProduct.selectedPdfFile,
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
        const uploadedProductImg = this.getView().byId(
          "editProductImageUploader"
        );
        const uploadedProductFile = this.getView().byId(
          "editProductSpecUploader"
        );
        if (oProduct.selectedImageFile && uploadedProductImg) {
          uploadedProductImg.setName(oProduct.selectedImageFile);
        }
        if (oProduct.selectedPdfFile && uploadedProductFile) {
          uploadedProductFile.setName(oProduct.selectedPdfFile);
        }
      },

      onUpdateCatalogItem: function () {
        const oForm = this._oEditCatalogDialog.getModel("oEditFormModel");
        const oData = oForm.getData();

        if (!this._validateForm(oData)) return;

        const aTerms = this._getSearchTerms("editSearchTermsInput");
        if (!aTerms.length) {
          MessageBox.error("Please add at least one Search Term");
          return;
        }

        const oUpdatedItem = {
          productName: oData.productName,
          commodityCode: oData.commodityCode,
          category: oData.category,
          searchTerms: aTerms,
          unitPrice: parseFloat(oData.unitPrice),
          currency: oData.currency,
          unitOfMeasure: oData.unitOfMeasure,
          leadTime: parseInt(oData.leadTime),
          partNumber: oData.partNumber,
          additionalLink: oData.additionalLink,
          productDescription: oData.productDescription,
          ProductImage: oData.productImage,
          ProductSpecification: oData.productSpecification,
          timestamp: Date.now(),
          id: oData.editingProductId,
        };

        const oCatalog = this.getOwnerComponent().getModel("catalog");
        const aItems = oCatalog.getProperty("/items") || [];
        const iIndex = aItems.findIndex((item) => item.id === oUpdatedItem.id);

        if (iIndex > -1) {
          aItems[iIndex] = oUpdatedItem;
          oCatalog.setProperty("/items", aItems);
          this._oEditCatalogDialog.close();
          MessageToast.show("Product updated successfully");
          this._refreshCatalogReview();
        } else {
          MessageBox.error("Product not found");
        }
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
        const oDlg = bEdit
          ? this._oEditCatalogDialog
          : this._oCreateCatalogDialog;
        const sBtn = bEdit ? "editPreviewImageButton" : "previewImageButton";
        const sPrev = bEdit ? "editImagePreview" : "imagePreview";
        const oModel = bEdit ? "oEditFormModel" : "oCreateFormModel";

        if (oFile) {
          this.getView().byId(sBtn).setEnabled(true);
          this._convertFileToBase64(oFile).then((sB64) => {
            oDlg.getModel(oModel).setProperty("/productImage", sB64);
            oDlg.getModel(oModel).setProperty("/selectedImageFile", oFile);
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
        const oDlg = bEdit
          ? this._oEditCatalogDialog
          : this._oCreateCatalogDialog;
        const sBtn = bEdit ? "editPreviewPdfButton" : "previewPdfButton";
        const oModel = bEdit ? "oEditFormModel" : "oCreateFormModel";

        if (oFile) {
          this.getView().byId(sBtn).setEnabled(true);
          this._convertFileToBase64(oFile).then((sB64) => {
            oDlg.getModel(oModel).setProperty("/productSpecification", sB64);
            oDlg.getModel(oModel).setProperty("/selectedPdfFile", oFile);
          });
        }
      },

      onRemoveImage(oEvent) {
        const bEdit = oEvent.getSource().getId().includes("edit");
        const oDlg = bEdit
          ? this._oEditCatalogDialog
          : this._oCreateCatalogDialog;
        const sPrev = bEdit ? "editImagePreview" : "imagePreview";
        const sBtn = bEdit ? "editPreviewImageButton" : "previewImageButton";
        const sUp = bEdit ? "editProductImageUploader" : "productImageUploader";
        const oModel = bEdit ? "oEditFormModel" : "oCreateFormModel";

        oDlg.getModel(oModel).setProperty("/productImage", "");
        oDlg.getModel(oModel).setProperty("/selectedImageFile", null);
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
        const oDlg = bEdit
          ? this._oEditCatalogDialog
          : this._oCreateCatalogDialog;
        const sBtn = bEdit ? "editPreviewPdfButton" : "previewPdfButton";
        const sUp = bEdit ? "editProductSpecUploader" : "productSpecUploader";
        const oModel = bEdit ? "oEditFormModel" : "oCreateFormModel";

        oDlg.getModel(oModel).setProperty("/productSpecification", "");
        oDlg.getModel(oModel).setProperty("/selectedPdfFile", null);
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
          const r = new FileReader();
          r.onload = (e) => res(e.target.result);
          r.onerror = rej;
          r.readAsDataURL(oFile);
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

      onPreviewPdf(oEvent) {
        const bEdit = oEvent.getSource().getId().includes("edit");
        const oDlg = bEdit
          ? this._oEditCatalogDialog
          : this._oCreateCatalogDialog;
        const oModel = bEdit ? "oEditFormModel" : "oCreateFormModel";

        const oFile = oDlg.getModel(oModel).getProperty("/selectedPdfFile");
        const sB64 = oDlg.getModel(oModel).getProperty("/productSpecification");
        let url = null;

        if (oFile instanceof Blob) url = URL.createObjectURL(oFile);
        else if (sB64) {
          const a = sB64.split(",");
          if (a.length === 2)
            url = this._base64ToBlobUrl(a[1], "application/pdf");
        }

        if (url) window.open(url, "_blank");
        else MessageToast.show("No PDF available for preview.");
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
    });
  }
);
