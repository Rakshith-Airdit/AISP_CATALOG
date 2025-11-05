sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
  ],
  function (
    BaseController,
    JSONModel,
    MessageBox,
    MessageToast,
    Filter,
    FilterOperator
  ) {
    "use strict";

    return BaseController.extend(
      "com.catalog.aispcatalog.controller.CatalogReview",
      {
        onInit: function () {
          // Create a local model for the view
          const oLocalModel = new JSONModel({
            items: [],
            total: 0,
            batchId: null,
          });

          this.getView().setModel(oLocalModel, "catalog");

          // Handle route matched event
          this.getRouter()
            .getRoute("catalogReview")
            .attachPatternMatched(this._onRouteMatched, this);

          // Subscribe to the global refresh event
          const oComponent = this.getOwnerComponent();
          oComponent._oCatalogEventBus.subscribe(
            "catalog",
            "refresh",
            this._refreshFromModel,
            this
          );
        },

        _onRouteMatched: function (oEvent) {
          this._loadDraftItems();
          this._setLayout("ThreeColumnsMidExpanded");
        },

        _refreshFromModel: function () {
          this._loadDraftItems();
        },

        _loadDraftItems: function () {
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

          let sBatchId = null;

          if (aLocalItems.length > 0 && aLocalItems[0].BatchID) {
            sBatchId = aLocalItems[0].BatchID;
            oCatalogModel.setProperty("/batchId", sBatchId);
          }

          if (sBatchId) {
            // Load drafts for this specific batch
            oModel.read("/ProductCatalogDrafts", {
              filters: [new Filter("BatchID", FilterOperator.EQ, sBatchId)],
              success: (oData) => {
                sap.ui.core.BusyIndicator.hide();
                this._processDraftData(oData.results || []);
              },
              error: (oError) => {
                sap.ui.core.BusyIndicator.hide();
                console.error("Failed to load draft items:", oError);
                // Fallback to localStorage data
                this._fallbackToLocalStorage();
              },
            });
          } else {
            // No batch ID found, use localStorage data
            this._fallbackToLocalStorage();
            sap.ui.core.BusyIndicator.hide();
          }
        },

        _processDraftData: function (aDrafts) {
          const oCatalogModel = this.getView().getModel("catalog");

          // Convert draft data to the format expected by the view
          const aItems = aDrafts.map((oDraft) => {
            // Handle search terms - they might be stored as string in backend
            let aSearchTerms = [];
            if (Array.isArray(oDraft.SearchTerm)) {
              aSearchTerms = oDraft.SearchTerm;
            } else if (typeof oDraft.SearchTerm === "string") {
              aSearchTerms = oDraft.SearchTerm.split(",")
                .map((term) => term.trim())
                .filter((term) => term);
            }

            return {
              id: oDraft.ID,
              draftId: oDraft.ID,
              batchId: oDraft.BatchID,
              productName: oDraft.ProductName,
              commodityCode: oDraft.CommodityCode,
              category: oDraft.Category,
              searchTerms: aSearchTerms,
              unitPrice: oDraft.UnitPrice,
              currency: oDraft.CurrencyCode,
              unitOfMeasure: oDraft.UnitOfMeasure,
              leadTime: oDraft.LeadTimeDays,
              partNumber: oDraft.PartNumber || "",
              additionalLink: oDraft.AdditionalLink,
              productDescription: oDraft.ProductDescription,
              ProductImage: oDraft.ProductImage,
              ProductSpecification: oDraft.ProductSpecification,
              timestamp: oDraft.CreatedAt || new Date(),
            };
          });

          oCatalogModel.setProperty("/items", aItems);
          this._calculateTotal();
        },

        _fallbackToLocalStorage: function () {
          const oLocalStorageModel =
            this.getOwnerComponent().getModel("catalog");
          const oCatalogModel = this.getView().getModel("catalog");

          const aLocalItems =
            oLocalStorageModel.getProperty("/catalogItems") || [];

          if (aLocalItems.length === 0) {
            MessageToast.show("No draft products found");
          }

          this._processDraftData(aLocalItems);
          this._calculateTotal();
        },

        _setLayout: function (sLayout) {
          this.getView().getModel("appView").setProperty("/layout", sLayout);
        },

        _calculateTotal: function () {
          const oCatalogModel = this.getView().getModel("catalog");
          const aItems = oCatalogModel.getProperty("/items") || [];

          let dTotal = 0;
          aItems.forEach(function (oItem) {
            dTotal += oItem.unitPrice || 0;
          });

          oCatalogModel.setProperty("/total", dTotal);
        },

        onEditCatalogItem: function (oEvent) {
          const oSource = oEvent.getSource();
          const oBindingContext = oSource.getBindingContext("catalog");
          const oProduct = oBindingContext.getObject();

          if (!oProduct) {
            MessageToast.show("Product not found");
            return;
          }

          const oAppController = this.getOwnerComponent()
            .getRootControl()
            .getController();
          oAppController.openEditCatalogDialog(oProduct);
        },

        onDeleteProduct: function (oEvent) {
          const oContext = oEvent.getSource().getBindingContext("catalog");
          const oProduct = oContext.getObject();

          MessageBox.confirm(
            `Are you sure you want to remove "${oProduct.productName}" from drafts?`,
            {
              title: "Remove Draft",
              onClose: (oAction) => {
                if (oAction === MessageBox.Action.OK) {
                  this._deleteDraftItem(oProduct);
                }
              },
            }
          );
        },

        _deleteDraftItem: function (oProduct) {
          sap.ui.core.BusyIndicator.show(0);

          const oModel = this.getOwnerComponent().getModel();
          const oCatalogModel = this.getView().getModel("catalog");
          const oLocalStorageModel =
            this.getOwnerComponent().getModel("catalog");

          // If it has a draftId, delete from backend
          if (oProduct.draftId) {
            oModel.remove(`/ProductCatalogDrafts(${oProduct.draftId})`, {
              success: () => {
                sap.ui.core.BusyIndicator.hide();
                this._removeFromLocalList(oProduct.id);
                oCatalogModel.refresh();
                MessageToast.show("Draft removed successfully");
                // Refresh the view
                this._refreshView();
              },
              error: (oError) => {
                sap.ui.core.BusyIndicator.hide();
                console.error("Failed to delete draft:", oError);
                // Still remove from local list
                // this._removeFromLocalList(oProduct.id);
                MessageBox.error("Failed to delete draft:", oError);
              },
            });
          } else {
            // Just remove from local list
            // this._removeFromLocalList(oProduct.id);
            sap.ui.core.BusyIndicator.hide();
            // MessageToast.show("Draft removed");
          }
        },

        _removeFromLocalList: function (sItemId) {
          const oCatalogModel = this.getView().getModel("catalog");
          const oLocalStorageModel =
            this.getOwnerComponent().getModel("catalog");

          const aItems = oCatalogModel.getProperty("/items") || [];
          const aUpdatedItems = aItems.filter((item) => item.id !== sItemId);

          oCatalogModel.setProperty("/items", aUpdatedItems);
          this._calculateTotal();

          // Also remove from localStorage model
          oLocalStorageModel.removeCatalogItem(sItemId);

          // If no items left, navigate back
          if (aUpdatedItems.length === 0) {
            this.onNavigateBack();
          }
        },

        _refreshView: function () {
          // Force refresh of the view
          const oCatalogModel = this.getView().getModel("catalog");
          oCatalogModel.refresh();

          // Also refresh the list binding
          const oList = this.byId("entryList");
          if (oList) {
            oList.getBinding("items").refresh();
          }
        },

        onSubmitAllCatalogs: function () {
          const oCatalogModel = this.getView().getModel("catalog");
          const aItems = oCatalogModel.getProperty("/items") || [];

          if (aItems.length === 0) {
            MessageToast.show("No products to submit");
            return;
          }

          MessageBox.confirm(
            `Are you sure you want to submit ${aItems.length} product(s) to the catalog?`,
            {
              title: "Submit to Catalog",
              onClose: (oAction) => {
                if (oAction === MessageBox.Action.OK) {
                  this._submitAllToBackend(aItems);
                }
              },
            }
          );
        },

        _submitAllToBackend: function (aItems) {
          const oModel = this.getOwnerComponent().getModel();

          const sBatchID = aItems[0]?.batchId;

          if (!sBatchID) {
            MessageBox.error("No batch ID found for submission");
            return;
          }

          const aResults = [];

          // Show global busy indicator
          sap.ui.core.BusyIndicator.show(0);

          // Create promises for all items
          // const aPromises = aItems.map((oItem) => {
          //   const oCatalogItem = {
          //     ProductName: oItem.productName,
          //     CommodityCode: parseInt(oItem.commodityCode),
          //     Category: oItem.category,
          //     SearchTerm: oItem.searchTerms,
          //     UnitPrice: oItem.unitPrice,
          //     CurrencyCode: oItem.currency,
          //     UnitOfMeasure: oItem.unitOfMeasure,
          //     LeadTimeDays: oItem.leadTime,
          //     PartNumber: oItem.partNumber,
          //     AdditionalLink: oItem.additionalLink,
          //     ProductDescription: oItem.productDescription,
          //     ProductImage: oItem.ProductImage,
          //     ProductSpecification: oItem.ProductSpecification,
          //   };

          //   return new Promise((resolve) => {
          //     oModel.create("/ProductCatalogItems", oCatalogItem, {
          //       success: (oData) => {
          //         // Delete the draft after successful submission if it exists
          //         if (oItem.draftId) {
          //           oModel.remove(`/ProductCatalogDrafts(${oItem.draftId})`, {
          //             success: () => {
          //               aResults.push({
          //                 status: "success",
          //                 name: oItem.productName,
          //                 message: "Successfully submitted to catalog",
          //               });
          //               resolve();
          //             },
          //             error: () => {
          //               aResults.push({
          //                 status: "success",
          //                 name: oItem.productName,
          //                 message: "Submitted to catalog but draft not deleted",
          //               });
          //               resolve();
          //             },
          //           });
          //         } else {
          //           aResults.push({
          //             status: "success",
          //             name: oItem.productName,
          //             message: "Successfully submitted to catalog",
          //           });
          //           resolve();
          //         }
          //       },
          //       error: (oError) => {
          //         let sErrorMessage = "Unknown error";
          //         try {
          //           const oErrorResponse = JSON.parse(oError.responseText);
          //           sErrorMessage =
          //             oErrorResponse.error.message.value || sErrorMessage;
          //         } catch (e) {
          //           sErrorMessage = oError.message || sErrorMessage;
          //         }

          //         aResults.push({
          //           status: "error",
          //           name: oItem.productName,
          //           message: sErrorMessage,
          //         });
          //         resolve();
          //       },
          //     });
          //   });
          // });

          // Promise.allSettled(aPromises)
          //   .then(() => {
          //     sap.ui.core.BusyIndicator.hide();
          //     this._onAllItemsSubmitted(aResults);
          //   })
          //   .catch((oError) => {
          //     sap.ui.core.BusyIndicator.hide();
          //     console.error("Unexpected error during submission:", oError);
          //     MessageBox.error(
          //       "An unexpected error occurred during submission"
          //     );
          //   });

          // Use the submitBatch action with correct format
          oModel.create(
            "/submitBatch",
            {
              BatchID: sBatchID, // Just pass the UUID string, no 'guid' prefix needed
            },
            {
              success: (oResult) => {
                sap.ui.core.BusyIndicator.hide();
                this._onBatchSubmitted(oResult.submitBatch);
              },
              error: (oError) => {
                sap.ui.core.BusyIndicator.hide();
                console.error("Batch submission failed:", oError);

                let sErrorMessage = "Failed to submit batch";
                try {
                  const oErrorResponse = JSON.parse(oError.responseText);
                  sErrorMessage =
                    oErrorResponse.error?.message?.value || sErrorMessage;
                } catch (e) {
                  sErrorMessage = oError.message || sErrorMessage;
                }

                MessageBox.error(sErrorMessage);
              },
            }
          );
        },

        // _onAllItemsSubmitted: function (aResults) {
        //   const iSuccessCount = aResults.filter(
        //     (r) => r.status === "success"
        //   ).length;
        //   const iErrorCount = aResults.filter(
        //     (r) => r.status === "error"
        //   ).length;

        //   let sMessage = `Submission Complete:\n${iSuccessCount} item(s) submitted successfully.\n${iErrorCount} item(s) failed.`;

        //   if (iErrorCount > 0) {
        //     sMessage += "\n\nFailed items:\n";
        //     aResults
        //       .filter((r) => r.status === "error")
        //       .forEach((error) => {
        //         sMessage += `- ${error.name}: ${error.message}\n`;
        //       });
        //   }

        //   MessageBox.show(sMessage, {
        //     icon:
        //       iErrorCount > 0
        //         ? MessageBox.Icon.WARNING
        //         : MessageBox.Icon.SUCCESS,
        //     title: "Submission Result",
        //     actions: [MessageBox.Action.OK],
        //     onClose: () => {
        //       // Clear all data after submission
        //       const oCatalogModel = this.getView().getModel("catalog");
        //       oCatalogModel.setProperty("/items", []);

        //       const oLocalStorageModel =
        //         this.getOwnerComponent().getModel("catalog");
        //       oLocalStorageModel.clearData();

        //       // Navigate back to home
        //       this.onNavigateBack();
        //     },
        //   });
        // },

        _onBatchSubmitted: function (oResult) {
          const iSuccessCount = oResult.successful || 0;
          const iErrorCount = oResult.failed || 0;
          const iTotal = oResult.total || 0;

          let sMessage = `Batch Submission Complete:\n${iSuccessCount} item(s) submitted successfully.\n${iErrorCount} item(s) failed.`;

          // Add details for failed items
          if (iErrorCount > 0 && oResult.details && oResult.details.failed) {
            sMessage += "\n\nFailed items:\n";
            oResult.details.failed.forEach((failedItem) => {
              sMessage += `- ${failedItem.productName}: ${
                failedItem.errors?.join(", ") || "Unknown error"
              }\n`;
            });
          }

          // Add details for successful items (optional)
          if (
            iSuccessCount > 0 &&
            oResult.details &&
            oResult.details.successful
          ) {
            sMessage += "\n\nSuccessful items:\n";
            oResult.details.successful.forEach((successItem, index) => {
              if (index < 5) {
                // Show first 5 successful items
                sMessage += `- ${successItem.productName} (ID: ${successItem.productId})\n`;
              }
            });
            if (iSuccessCount > 5) {
              sMessage += `- ... and ${iSuccessCount - 5} more\n`;
            }
          }

          MessageBox.show(sMessage, {
            icon:
              iErrorCount > 0
                ? MessageBox.Icon.WARNING
                : MessageBox.Icon.SUCCESS,
            title: "Batch Submission Result",
            actions: [MessageBox.Action.OK],
            onClose: () => {
              // Clear all data after submission
              const oCatalogModel = this.getView().getModel("catalog");
              oCatalogModel.setProperty("/items", []);

              const oLocalStorageModel =
                this.getOwnerComponent().getModel("catalog");
              oLocalStorageModel.clearData();

              // Navigate back to home
              this.onNavigateBack();
            },
          });
        },

        onNavigateBack: function () {
          this.getRouter().navTo("RouteHome");
        },

        getRouter: function () {
          return this.getOwnerComponent().getRouter();
        },

        formatter: {
          price: function (fPrice) {
            return fPrice ? parseFloat(fPrice).toFixed(2) : "0.00";
          },
        },
      }
    );
  }
);
