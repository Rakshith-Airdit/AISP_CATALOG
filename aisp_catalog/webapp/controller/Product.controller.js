sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/Device",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
  ],
  function (Controller, Device, MessageBox, MessageToast) {
    "use strict";

    return Controller.extend("com.catalog.aispcatalog.controller.Product", {
      onInit: function () {
        this._router = this.getOwnerComponent().getRouter();
        this._router
          .getRoute("RouteProduct")
          .attachPatternMatched(this._onRouteMatched, this);
      },

      _onRouteMatched: function (oEvent) {
        const oArgs = oEvent.getParameter("arguments");
        const sCategoryId = oArgs.id;
        const sProductId = oArgs.productId;

        // Load product details
        this._loadProductDetails(sCategoryId, sProductId);
      },

      _loadProductDetails: function (sCategoryId, sProductId) {
        const oView = this.getView();
        oView.setBusy(true);

        const oModel = this.getOwnerComponent().getModel();
        const aFilters = [
          new sap.ui.model.Filter(
            "CommodityCode",
            sap.ui.model.FilterOperator.EQ,
            sCategoryId
          ),
          new sap.ui.model.Filter(
            "ProductId",
            sap.ui.model.FilterOperator.EQ,
            sProductId
          ),
        ];

        oModel.read("/ProductCatalogItems", {
          filters: aFilters,
          success: (oData) => {
            const results = oData.results || oData;
            if (results.length > 0) {
              // Set the first product as context
              oView.bindElement({
                path: "/" + 0,
                model: "productModel",
              });

              // Create a model with the product data
              const oProductModel = new sap.ui.model.json.JSONModel(results[0]);
              oView.setModel(oProductModel, "productModel");
            } else {
              MessageBox.error("Product not found");
              this.onBack();
            }
            oView.setBusy(false);
          },
          error: (oError) => {
            console.error("Failed to load product details:", oError);
            oView.setBusy(false);
            MessageBox.error(
              "Failed to load product details. Please try again."
            );
            this.onBack();
          },
        });
      },

      // In Product.controller.js
      onPreviewSpecification: function () {
        const oModel = this.getView().getModel("productModel");
        const sPdfUrl = oModel.getProperty("/ProductSpecification");

        if (!sPdfUrl) {
          sap.m.MessageToast.show("No product specification available");
          return;
        }

        try {
          // Open the PDF in a new tab
          window.open(sPdfUrl, "_blank", "noopener,noreferrer");
        } catch (oError) {
          console.error("Failed to open PDF:", oError);
          sap.m.MessageToast.show("Failed to open specification document");
        }
      },

      onDownloadSpecification: function () {
        const oModel = this.getView().getModel("productModel");
        const sPdfUrl = oModel.getProperty("/ProductSpecification");

        if (!sPdfUrl) {
          sap.m.MessageToast.show("No product specification available");
          return;
        }

        try {
          // Create a temporary anchor element to trigger download
          const a = document.createElement("a");
          a.href = sPdfUrl;
          a.download = "Product_Specification.pdf";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);

          sap.m.MessageToast.show("Specification download started");
        } catch (oError) {
          console.error("Failed to download PDF:", oError);
          sap.m.MessageToast.show("Failed to download specification document");
        }
      },

      onBack: function () {
        this._router.navTo("category", {
          id: this._getCurrentCategory(),
        });
      },

      _getCurrentCategory: function () {
        // Extract category from current binding context or route
        const oContext = this.getView().getBindingContext("productModel");
        if (oContext) {
          return oContext.getProperty("CommodityCode");
        }
        return "";
      },

      // onAvatarPress: function () {
      //   MessageToast.show("User profile clicked");
      //   // Implement user profile functionality
      // },

      // onToggleCart: function (oEvent) {
      //   const bPressed = oEvent.getParameter("pressed");
      //   MessageToast.show("Cart " + (bPressed ? "opened" : "closed"));
      //   // Implement cart toggle functionality
      // },

      // onAddToCart: function () {
      //   const oProduct = this.getView().getModel("productModel").getData();
      //   MessageToast.show("Added " + oProduct.Name + " to cart");

      //   // Implement add to cart logic here
      //   // You might want to update a cart model or call a service
      // },

      /**
       * Formatter functions
       */
      formatter: {
        pictureUrl: function (sUrl) {
          return sUrl || "sap-icon://product";
        },
        price: function (fPrice) {
          return fPrice ? parseFloat(fPrice).toFixed(2) : "0.00";
        },
        statusText: function (sStatus) {
          const statusMap = {
            Available: "Available",
            OutOfStock: "Out of Stock",
            LowStock: "Low Stock",
            Discontinued: "Discontinued",
          };
          return statusMap[sStatus] || "Available";
        },
        statusState: function (sStatus) {
          const statusMap = {
            Available: "Success",
            OutOfStock: "Error",
            LowStock: "Warning",
            Discontinued: "None",
          };
          return statusMap[sStatus] || "None";
        },
        // In your formatter file
        getFileIcon: function (sUrl) {
          if (!sUrl) return "sap-icon://document";

          try {
            const sFileName = sUrl.toLowerCase();
            if (sFileName.includes(".pdf")) {
              return "sap-icon://pdf-attachment";
            } else if (
              sFileName.includes(".doc") ||
              sFileName.includes(".docx")
            ) {
              return "sap-icon://doc-attachment";
            } else if (
              sFileName.includes(".xls") ||
              sFileName.includes(".xlsx")
            ) {
              return "sap-icon://excel-attachment";
            } else {
              return "sap-icon://document";
            }
          } catch (oError) {
            return "sap-icon://document";
          }
        },

        getFileTypeText: function (sUrl) {
          if (!sUrl) return "Document not available";

          try {
            const sFileName = sUrl.toLowerCase();
            if (sFileName.includes(".pdf")) {
              return "PDF Document";
            } else if (
              sFileName.includes(".doc") ||
              sFileName.includes(".docx")
            ) {
              return "Word Document";
            } else if (
              sFileName.includes(".xls") ||
              sFileName.includes(".xlsx")
            ) {
              return "Excel Spreadsheet";
            } else {
              return "Document File";
            }
          } catch (oError) {
            return "Document File";
          }
        },

        getFileNameFromUrl: function (sUrl) {
          if (!sUrl) return "No specification available";

          try {
            const sFileName = sUrl.split("/").pop();
            if (!sFileName) return "Product Specification";

            // Decode URL-encoded characters and remove query parameters
            let sDecodedName = decodeURIComponent(sFileName);
            sDecodedName = sDecodedName.split("?")[0]; // Remove query parameters

            // If it's a UUID-based filename, provide a friendly name
            if (
              /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_/i.test(
                sDecodedName
              )
            ) {
              // Extract the part after UUID and underscore
              const sFriendlyName = sDecodedName.split("_").pop();
              return sFriendlyName || "Product Specification";
            }

            return sDecodedName;
          } catch (oError) {
            return "Product Specification";
          }
        },

        getFileTypeText: function (sUrl) {
          if (!sUrl) return "Document not available";

          try {
            const sFileName = sUrl.toLowerCase();
            if (sFileName.includes(".pdf")) {
              return "PDF Document";
            } else if (
              sFileName.includes(".doc") ||
              sFileName.includes(".docx")
            ) {
              return "Word Document";
            } else if (
              sFileName.includes(".xls") ||
              sFileName.includes(".xlsx")
            ) {
              return "Excel Spreadsheet";
            } else {
              return "Document File";
            }
          } catch (oError) {
            return "Document File";
          }
        },

        getFileNameFromUrl: function (sUrl) {
          if (!sUrl) return "No specification available";

          try {
            const sFileName = sUrl.split("/").pop();
            if (!sFileName) return "Product Specification";

            // Decode URL-encoded characters and remove query parameters
            let sDecodedName = decodeURIComponent(sFileName);
            sDecodedName = sDecodedName.split("?")[0]; // Remove query parameters

            // If it's a UUID-based filename, provide a friendly name
            if (
              /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_/i.test(
                sDecodedName
              )
            ) {
              // Extract the part after UUID and underscore
              const sFriendlyName = sDecodedName.split("_").pop();
              return sFriendlyName || "Product Specification";
            }

            return sDecodedName;
          } catch (oError) {
            return "Product Specification";
          }
        },
      },
    });
  }
);
