sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
  ],
  function (BaseController, JSONModel, MessageBox, MessageToast) {
    "use strict";

    return BaseController.extend(
      "com.catalog.aispcatalog.controller.CatalogReview",
      {
        onInit: function () {
          // Use the LocalStorage catalog model
          const oCatalogModel = this.getOwnerComponent().getModel("catalog");
          this.getView().setModel(oCatalogModel, "catalog");

          // Handle route matched event
          this.getRouter()
            .getRoute("catalogReview")
            .attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function (oEvent) {
          const oArgs = oEvent.getParameter("arguments");
          const sSelectedItemId = oArgs.selectedItemId;

          // Load data from LocalStorage model
          const oCatalogModel = this.getOwnerComponent().getModel("catalog");

          // Get items directly from LocalStorage model
          const aCatalogItems = oCatalogModel.getCatalogItems();

          // Set the items to the model for binding
          oCatalogModel.setProperty("/items", aCatalogItems);

          // Calculate total
          this._calculateTotal();

          // Select the product if ID provided
          if (sSelectedItemId) {
            this._selectProductById(sSelectedItemId);
          }

          this._setLayout("ThreeColumnsMidExpanded");
        },

        _setLayout: function (sLayout) {
          this.getView().getModel("appView").setProperty("/layout", sLayout);
        },

        _selectProductById: function (sProductId) {
          const oCatalogModel = this.getOwnerComponent().getModel("catalog");
          const aCatalogItems = oCatalogModel.getCatalogItems();
          const oProduct = aCatalogItems.find((item) => item.id === sProductId);

          if (oProduct) {
            oCatalogModel.setSelectedProduct(oProduct);
          }
        },

        _calculateTotal: function () {
          const oCatalogModel = this.getOwnerComponent().getModel("catalog");
          const aItems = oCatalogModel.getProperty("/items") || [];

          let dTotal = 0;
          aItems.forEach(function (oItem) {
            dTotal += oItem.unitPrice || 0;
          });

          oCatalogModel.setProperty("/total", dTotal);
        },

        onProductCardPress: function (oEvent) {
          const oProduct = oEvent
            .getSource()
            .getBindingContext("catalog")
            .getObject();
          const oCatalogModel = this.getOwnerComponent().getModel("catalog");
          oCatalogModel.setSelectedProduct(oProduct);
        },

        onEditProduct: function (oEvent) {
          const oContext = oEvent.getSource().getBindingContext("catalog");
          const oProduct = oContext.getObject();

          MessageToast.show(`Editing ${oProduct.productName}`);
        },

        onDeleteProduct: function (oEvent) {
          const oContext = oEvent.getSource().getBindingContext("catalog");
          const oProduct = oContext.getObject();

          MessageBox.confirm(
            `Are you sure you want to remove "${oProduct.productName}" from the cart?`,
            {
              title: "Remove Product",
              onClose: function (oAction) {
                if (oAction === MessageBox.Action.OK) {
                  const oCatalogModel =
                    this.getOwnerComponent().getModel("catalog");

                  // Remove from LocalStorage
                  oCatalogModel.removeCatalogItem(oProduct.id);

                  // Update the items list
                  const aCatalogItems = oCatalogModel.getCatalogItems();
                  oCatalogModel.setProperty("/items", aCatalogItems);

                  // Recalculate total
                  this._calculateTotal();

                  MessageToast.show(
                    `"${oProduct.productName}" removed from cart`
                  );

                  // If cart is empty, show empty state
                  if (aCatalogItems.length === 0) {
                    this.onNavBack();
                  }
                }
              }.bind(this),
            }
          );
        },

        onSubmitAllCatalogs: function () {
          const oCatalogModel = this.getOwnerComponent().getModel("catalog");
          const aCatalogItems = oCatalogModel.getCatalogItems();

          if (!aCatalogItems || aCatalogItems.length === 0) {
            MessageToast.show("No products to submit");
            return;
          }

          MessageBox.confirm(
            `Are you sure you want to submit ${aCatalogItems.length} product(s) to the catalog?`,
            {
              title: "Submit to Catalog",
              onClose: function (oAction) {
                if (oAction === MessageBox.Action.OK) {
                  this._submitAllToBackend(aCatalogItems);
                }
              }.bind(this),
            }
          );
        },

        _submitAllToBackend: function (aItems) {
          const oModel = this.getOwnerComponent().getModel();
          const aResults = []; // Store success/error objects

          // Create promises for all items
          const aPromises = aItems.map((oItem) => {
            const oCatalogItem = {
              ProductName: oItem.productName,
              CommodityCode: parseInt(oItem.commodityCode),
              Category: oItem.category,
              SearchTerm: oItem.searchTerms, // Convert array to string for OData payload
              UnitPrice: oItem.unitPrice,
              CurrencyCode: oItem.currency,
              UnitOfMeasure: oItem.unitOfMeasure,
              LeadTimeDays: oItem.leadTime,
              PartNumber: oItem.partNumber,
              AdditionalLink: oItem.additionalLink,
              ProductDescription: oItem.productDescription,
              ProductImage: oItem.ProductImage,
              ProductSpecification: oItem.ProductSpecification,
            };

            return new Promise((resolve, reject) => {
              oModel.create("/ProductCatalogItems", oCatalogItem, {
                success: function (oData, oResponse) {
                  // Capture success message from the response header/body if available
                  aResults.push({
                    status: "success",
                    name: oItem.productName,
                    message: `Successfully created product ID ${
                      oData.ProductID || "N/A"
                    }`, // Use ProductID from response if available
                  });
                  resolve();
                },
                error: function (oError) {
                  // Attempt to parse a meaningful error message
                  let sErrorMessage = "Unknown error";
                  try {
                    const oErrorResponse = JSON.parse(oError.responseText);
                    sErrorMessage =
                      oErrorResponse.error.message.value || sErrorMessage;
                  } catch (e) {
                    sErrorMessage = oError.message || sErrorMessage;
                  }

                  aResults.push({
                    status: "error",
                    name: oItem.productName,
                    message: sErrorMessage,
                  });
                  reject();
                },
              });
            });
          });

          // Wait for all promises to settle (resolve or reject)
          Promise.allSettled(aPromises).then(() => {
            this._onAllItemsSubmitted(aResults);
          });
        },

        _onAllItemsSubmitted: function (aResults) {
          const iSuccessCount = aResults.filter(
            (r) => r.status === "success"
          ).length;
          const iErrorCount = aResults.filter(
            (r) => r.status === "error"
          ).length;

          let sMessageBoxTitle = "Submission Complete";
          let sMessageBoxIcon = MessageBox.Icon.INFORMATION;
          let sMessageBoxMessage = "";

          // Build a detailed message string
          sMessageBoxMessage += `Summary:\n${iSuccessCount} item(s) submitted successfully.\n${iErrorCount} item(s) failed.\n\n`;

          if (iErrorCount > 0) {
            sMessageBoxTitle = "Submission with Errors";
            sMessageBoxIcon = MessageBox.Icon.WARNING;
            sMessageBoxMessage += "Details of failed items:\n";
            aResults
              .filter((r) => r.status === "error")
              .forEach((error) => {
                sMessageBoxMessage += `- ${error.name}: ${error.message}\n`;
              });
          } else if (iSuccessCount > 0) {
            sMessageBoxIcon = MessageBox.Icon.SUCCESS;
            sMessageBoxMessage = `Successfully submitted all ${iSuccessCount} catalog item(s) to the backend.`;
          }

          // Use MessageBox to show the result and control navigation
          MessageBox.show(sMessageBoxMessage, {
            icon: sMessageBoxIcon,
            title: sMessageBoxTitle,
            actions: [MessageBox.Action.OK],
            onClose: function (oAction) {
              // Only clear the data if any submission was successful
              if (iSuccessCount > 0) {
                const oCatalogModel =
                  this.getOwnerComponent().getModel("catalog");
                oCatalogModel.clearData();
              }
              // Navigate back to home after the user clicks OK
              this.onNavigateBack();
            }.bind(this),
          });
        },

        _onAllItemsSubmitted: function (iSuccessCount, iErrorCount) {
          if (iErrorCount === 0) {
            const oCatalogModel = this.getOwnerComponent().getModel("catalog");
            oCatalogModel.clearData();

            MessageBox.success(
              `Successfully submitted ${iSuccessCount} catalog item(s) to the database`,
              {
                title: "Success",
                onClose: function () {
                  this.onNavigateBack();
                }.bind(this),
              }
            );
          } else {
            MessageBox.error(
              `Could not submit the data, ${iErrorCount} item(s) failed`
            );
          }
        },

        onRemoveProduct: function () {
          const oCatalogModel = this.getOwnerComponent().getModel("catalog");
          const oSelectedProduct =
            oCatalogModel.getProperty("/selectedProduct");

          if (!oSelectedProduct) {
            MessageToast.show("Please select a product to remove");
            return;
          }

          MessageBox.confirm(
            `Are you sure you want to remove "${oSelectedProduct.productName}" from the catalog?`,
            {
              title: "Remove Product",
              onClose: function (oAction) {
                if (oAction === MessageBox.Action.OK) {
                  oCatalogModel.removeCatalogItem(oSelectedProduct.id);
                  MessageToast.show(
                    `"${oSelectedProduct.productName}" removed from catalog`
                  );

                  // If no items left, navigate back
                  if (oCatalogModel.getCatalogItems().length === 0) {
                    this.onNavigateBack();
                  }
                }
              }.bind(this),
            }
          );
        },

        onNavigateBack: function () {
          this.getRouter().navTo("home");
        },

        getRouter: function () {
          return this.getOwnerComponent().getRouter();
        },
      }
    );
  }
);
