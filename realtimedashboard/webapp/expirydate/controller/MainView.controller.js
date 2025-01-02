sap.ui.define([
    'jquery.sap.global',
    "sap/dm/dme/podfoundation/controller/PluginViewController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/table/Column",
    "sap/m/Text",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox",
    "sap/m/MessageToast"
], function (jQuery, PluginViewController, JSONModel, Column,
    Text,
    Filter,
    FilterOperator,
    MessageBox,
    MessageToast) {
    "use strict";

    return PluginViewController.extend("company.custom.plugins.realtimedashboard.expirydate.controller.MainView", {
        onInit: function () {
            PluginViewController.prototype.onInit.apply(this, arguments);
            var oView = this.getView();

            //Setup the view model
            var oViewModel = new JSONModel({
                isMaterialSelected: false,
                isBatchSelected: false,
                controls: {
                    materialInput: {
                        valueState: "None",
                        valueStateText: ""
                    },
                    batchInput: {
                        valueState: "None",
                        valueStateText: ""
                    },
                    expDateInput: {
                        valueState: "None",
                        valueStateText: ""
                    }
                },
                formData: {
                    material: "",
                    batchNumber: "",
                    productionDate: undefined,
                    expiryDate: undefined,
                    expiryDateCorrection: undefined
                },
                materials: [],
                batches: []
            });
            oView.setModel(oViewModel, "viewModel");

            //!Mocking data - remove this


            // oViewModel.setProperty(
            //   "/batches",
            //   aBatch.map(item => {
            //     return {
            //       ...item,
            //       productionDate: new Date(item.productionDate),
            //       expiryDate: new Date(item.expiryDate)
            //     };
            //   })
            // );

            //!Uncomment below line in POD
            this._loadMaterials();
        },

        //! onAfterRenderingPlugin?
        onAfterRendering: function () {
            this._bindDataToForm();
        },

        onExit: function () {
            //!Uncomment below line in POD
            PluginViewController.prototype.onExit.apply(this, arguments);
        },

        handleErrorMessage: function (oError, sHttpErrorMessage) {
            // Handle error messages for API calls
            var err = oError || sHttpErrorMessage;
            this.showErrorMessage(err, true, true);
        },

        onMaterialValueHelpRequest: function () {
            var oView = this.getView(),
                oViewModel = oView.getModel("viewModel");

            if (!this.oMaterialVHDia) {
                //Load the fragment
                //! Change the namespace for fragment
                this.oMaterialVHDia = sap.ui.xmlfragment(
                    "company.custom.plugins.realtimedashboard.expirydate.view.fragments.MaterialValueHelpRequest",
                    this
                );

                this.oMaterialVHDia.getTableAsync().then(function (oTable) {
                    // Add columns to the table
                    oTable.addColumn(
                        new Column({
                            label: new Text({ text: "Material" }),
                            template: new Text({ text: "{viewModel>material}" }),
                            width: "170px"
                        })
                    );

                    oTable.addColumn(
                        new Column({
                            label: new Text({ text: "Description" }),
                            template: new Text({ text: "{viewModel>description}" }),
                            width: "200px"
                        })
                    );

                    oTable.addColumn(
                        new Column({
                            label: new Text({ text: "Version" }),
                            template: new Text({ text: "{viewModel>version}" }),
                            width: "150px"
                        })
                    );

                    // Bind data to the table
                    oTable.setModel(oViewModel, "viewModel");
                    oTable.bindRows("viewModel>/materials");
                });
            }

            this.oMaterialVHDia.open();
        },

        onMaterialVHDiaSearch: function (oEvent) {
            var oFilterBar = oEvent.getSource(),
                aFilterGroupItems = oFilterBar.getFilterGroupItems(),
                aFilters = [];

            // Create filters based on selected input values
            aFilters = aFilterGroupItems
                .map(function (oFGI) {
                    var oControl = oFGI.getControl();
                    if (oControl && oControl.getValue) {
                        return new Filter({
                            path: oFGI.getName(),
                            operator: FilterOperator.Contains,
                            value1: oControl.getValue()
                        });
                    }
                })
                .filter(Boolean); // Filter out empty values

            //Get the table for dialog and apply filter
            this.oMaterialVHDia.getTableAsync().then(oTable => {
                var oRowBindingCtx = oTable.getBinding("rows");
                oRowBindingCtx.filter(aFilters);
            });
        },

        onMaterialVHDiaOkPress: function (oEvent) {
            var aSelectedItems = oEvent.getParameter("tokens");

            //No material selected
            if (aSelectedItems.length < 1) {
                return;
            }

            //Close dialog
            this.oMaterialVHDia.close();

            //Get Batch info for selected material
            var sSelectedMaterial = aSelectedItems[0].getKey();
            //!Uncomment below line in POD
            this._loadBatchInfoForMaterial(sSelectedMaterial);

            //Set the selected material to model
            var oViewModel = this.getView().getModel("viewModel");
            oViewModel.setProperty("/formData/material", sSelectedMaterial);
            oViewModel.setProperty("/isMaterialSelected", true);

            this._clearBatchInfo();

            //   //Clear selected batch from view
            //   oViewModel.setProperty("/formData/batchNumber", "");

            //   oViewModel.setProperty("/controls/batchInput/valueState", "None");
            //   oViewModel.setProperty("/controls/materialInput/valueState", "None");
        },

        onMaterialVHDiaCancelPress: function (oEvent) {
            this.oMaterialVHDia.close();
        },

        onBatchValueHelpRequest: function () {
            var oView = this.getView(),
                oViewModel = oView.getModel("viewModel");

            if (!this.oBatchVHDia) {
                //Load the fragment
                //! Change the namespace for fragment
                this.oBatchVHDia = sap.ui.xmlfragment(
                    "company.custom.plugins.realtimedashboard.expirydate.view.fragments.BatchValueHelpRequest",
                    this
                );

                this.oBatchVHDia.getTableAsync().then(function (oTable) {
                    // Add columns to the table
                    oTable.addColumn(
                        new Column({
                            label: new Text({ text: "Batch Number" }),
                            template: new Text({ text: "{viewModel>batchNumber}" }),
                            width: "150px"
                        })
                    );

                    oTable.addColumn(
                        new Column({
                          label: new Text({ text: "Shelf Life Expiration Date" }),
                          template: new Text({
                            text: {
                              path: 'viewModel>shelfLifeExpirationDate',
                              type: "sap.ui.model.type.Date",
                              formatOptions: {
                                pattern: "dd-MM-yyyy"
                              }
                            }
                          }),
                          width: "200px"
                        })
                      );
                      
                    oTable.addColumn(
                        new Column({
                            label: new Text({ text: "Production Date" }),
                            //   template: new Text({ text: "{viewModel>productionDate}" }),
                            template: new Text({
                                text: {
                                    path: "viewModel>productionDate",
                                    type: "sap.ui.model.type.Date",
                                    formatOptions: {
                                        pattern: "dd-MM-yyyy"
                                    }
                                }
                            }),
                            width: "150px"
                        })
                    );

                    // Bind data to the table
                    oTable.setModel(oViewModel, "viewModel");
                    oTable.bindRows("viewModel>/batches");
                });
            }

            this.oBatchVHDia.open();
        },

        onBatchVHDiaSearch: function (oEvent) {
            var oFilterBar = oEvent.getSource(),
                aFilterGroupItems = oFilterBar.getFilterGroupItems(),
                aFilters = [];

            // Create filters based on selected input values
            aFilters = aFilterGroupItems
                .map(function (oFGI) {
                    var oControl = oFGI.getControl();
                    if (oControl && oControl.getValue) {
                        return new Filter({
                            path: oFGI.getName(),
                            operator: FilterOperator.Contains,
                            value1: oControl.getValue()
                        });
                    }
                })
                .filter(Boolean); // Filter out empty values

            //Get the table for dialog and apply filter
            this.oBatchVHDia.getTableAsync().then(oTable => {
                var oRowBindingCtx = oTable.getBinding("rows");
                oRowBindingCtx.filter(aFilters);
            });
        },

        onBatchVHDiaOkPress: function (oEvent) {
            var aSelectedItems = oEvent.getParameter("tokens");

            //No material selected
            if (aSelectedItems.length < 1) {
                return;
            }

            //Close dialog
            this.oBatchVHDia.close();

            //Get Batch info for selected material
            var sSelectedBatch = aSelectedItems[0].getKey();

            //Set the selected batch to model
            var oViewModel = this.getView().getModel("viewModel"),
                aBatches = oViewModel.getProperty("/batches");

            var oBatch = aBatches.find(
                oItem => oItem.batchNumber === sSelectedBatch
            );

            oViewModel.setProperty("/formData/batchNumber", sSelectedBatch);
            oViewModel.setProperty(
                "/formData/productionDate",
                oBatch.productionDate
            );

            //Set expiry date only if value is available
            if (oBatch.shelfLifeExpirationDate) {
                oViewModel.setProperty("/formData/expiryDate", oBatch.shelfLifeExpirationDate);
            }

            oViewModel.setProperty("/formData/expiryDateCorrection", new Date());
            oViewModel.setProperty("/isBatchSelected", true);
            oViewModel.setProperty("/controls/batchInput/valueState", "None");
        },

        onBatchVHDiaCancelPress: function (oEvent) {
            this.oBatchVHDia.close();
        },

        onNewExpiryDateChange: function (oEvent) {
            var oDatePicker = oEvent.getSource();

            if (oEvent.getParameter("valid")) {
                oDatePicker.setValueState("None");
            } else {
                oDatePicker.setValueState("Error");
                oDatePicker.setValueStateText(
                    "Expiry date cannot be less than manufacturing date"
                );
            }
        },

        onSaveExpiryDateChange: function () {
            var oView = this.getView(),
                oViewModel = oView.getModel("viewModel"),
                oFormData = oViewModel.getProperty("/formData");

            if (this._validateForm()) {
                //TODO: Show error to user
                return;
            }

            //Check if expiry date correction has been made
            if (
                oFormData.expiryDate.getTime() ===
                oFormData.expiryDateCorrection.getTime()
            ) {
                MessageToast.show("No change in expiry date");
            }

            var oDateInstance = sap.ui.core.format.DateFormat.getDateInstance({
                pattern: "yyyyMMdd"
            });

            var oPayload = {
                plant: "M206",
                material: oFormData.material,
                batch: oFormData.batchNumber,
                expiryCurr: oDateInstance.format(oFormData.expiryDate),
                expiryNew: oDateInstance.format(oFormData.expiryDateCorrection)
            };

            //!Uncomment below code in POD
            var sURL = this.getPublicApiRestDataSourceUri() + '/pe/api/v1/process/processDefinitions/start?key=REG_aec29e36-fee2-4506-97d8-9dc1f3bc08f7';

            this.ajaxPostRequest(
                sURL,
                oPayload,
                function (oResponseData) {
                    console.log("POST service success:", oPayload, oResponseData);
                    MessageToast.show("Data successfully submitted!");
                    this.onClearForm(); // Clear inputs after submission
                }.bind(this),
                function (oError, sHttpErrorMessage) {
                    console.error("POST service error:", sHttpErrorMessage);

                    // Check the status code and show an appropriate message
                    if (oError.status === 500) {
                        MessageBox.error(
                            "Internal Server Error: Please contact the administrator."
                        );
                    } else {
                        MessageBox.error(
                            "Error: " + oError.responseText || sHttpErrorMessage
                        );
                    }
                }.bind(this)
            );
        },

        onClearForm: function () {
            var oViewModel = this.getView().getModel("viewModel");

            oViewModel.setProperty("/formData/material", "");
            oViewModel.setProperty("/isMaterialSelected", false);

            this._clearBatchInfo();
        },

        _loadMaterials: function () {
            var that = this,
                oView = this.getView(),
                oViewModel = oView.getModel("viewModel");
            var oParameters = {
                plant: "M206",
                page: "1,2,3,4,5,6,7,8,9,10",
                size: "1000"
            }; // Plant parameter for Order API

            // Fetch data from the Order API
            var sOrderUrl =
                this.getPublicApiRestDataSourceUri() + "/material/v2/materials";
            this.ajaxGetRequest(
                sOrderUrl,
                oParameters,
                function (oMaterialResponseData) {
                    //   var aMaterials = oMaterialResponseData.content.map(oMaterial => {
                    //     return {
                    //       material: oMaterial.material,
                    //       description: oMaterial.description,
                    //       version: oMaterial.version
                    //     };
                    //   });

                    oViewModel.setProperty(
                        "/materials",
                        oMaterialResponseData.content
                    );
                    oViewModel.refresh(true);
                },
                function (oError, sHttpErrorMessage) {
                    that.handleErrorMessage(oError, sHttpErrorMessage);
                }
            );
        },

        _loadBatchInfoForMaterial: function (sMaterial) {
            var that = this,
                oView = this.getView(),
                oViewModel = oView.getModel("viewModel");
            var oBatchParams = { plant: "M206", material: sMaterial };
            var sBatchUrl =
                this.getPublicApiRestDataSourceUri() + "/inventory/v1/batches";

            // Fetch data from the Batch API

            this.ajaxGetRequest(
                sBatchUrl,
                oBatchParams,
                function (oBatchResponseData) {
                    var aBatches = oBatchResponseData.content.map(item => {
                        return {
                            ...item,
                            productionDate: new Date(item.productionDate),
                            // expiryDate: new Date(item.expiryDate)
                            shelfLifeExpirationDate: new Date(item.shelfLifeExpirationDate)
                        };
                    });

                    oViewModel.setProperty("/batches", aBatches);
                },
                function (oError, sHttpErrorMessage) {
                    that.handleErrorMessage(oError, sHttpErrorMessage);
                }
            );
        },

        _validateForm: function () {
            var oView = this.getView(),
                oViewModel = oView.getModel("viewModel"),
                bFormHasError = false;

            //Validate material input
            if (!oViewModel.getProperty("/formData/material")) {
                oViewModel.setProperty(
                    "/controls/materialInput/valueState",
                    "Error"
                );
                oViewModel.setProperty(
                    "/controls/materialInput/valueStateText",
                    "Please fill required field"
                );
                bFormHasError = true;
            } else {
                oViewModel.setProperty(
                    "/controls/materialInput/valueState",
                    "None"
                );
            }

            //Validate batch input
            if (!oViewModel.getProperty("/formData/batchNumber")) {
                oViewModel.setProperty("/controls/batchInput/valueState", "Error");
                oViewModel.setProperty(
                    "/controls/batchInput/valueStateText",
                    "Please fill required field"
                );
                bFormHasError = true;
            } else {
                oViewModel.setProperty("/controls/batchInput/valueState", "None");
            }

            return bFormHasError;
        },

        _clearBatchInfo: function () {
            var oView = this.getView(),
                oViewModel = oView.getModel("viewModel");

            //Clear form data
            //   oViewModel.setProperty("/formData/material", "");
            oViewModel.setProperty("/formData/batchNumber", "");
            oViewModel.setProperty("/formData/productionDate", undefined);
            oViewModel.setProperty("/formData/expiryDate", undefined);
            oViewModel.setProperty("/formData/expiryDateCorrection", undefined);

            //Reset control enabled states
            //   oViewModel.setProperty("/isMaterialSelected", false);
            oViewModel.setProperty("/isBatchSelected", false);

            //Clear value states
            oViewModel.setProperty("/controls/materialInput/valueState", "None");
            oViewModel.setProperty("/controls/batchInput/valueState", "None");
            oViewModel.setProperty("/controls/expDateInput/valueState", "None");
        },

        _bindDataToForm: function () {
            var oView = this.getView(),
                oForm = oView.byId("IdReportForm"),
                oViewModel = oView.getModel("viewModel");

            oForm.bindElement("viewModel>/formData", {
                model: "viewModel"
            });








        },




        onAfterRendering: function () {

            // this.getView().byId("backButton").setVisible(this.getConfiguration().backButtonVisible);
            // this.getView().byId("closeButton").setVisible(this.getConfiguration().closeButtonVisible);

            // this.getView().byId("headerTitle").setText(this.getConfiguration().title);
            // this.getView().byId("textPlugin").setText(this.getConfiguration().text); 

        },

        onBeforeRenderingPlugin: function () {



        },

        isSubscribingToNotifications: function () {

            var bNotificationsEnabled = true;

            return bNotificationsEnabled;
        },


        getCustomNotificationEvents: function (sTopic) {
            //return ["template"];
        },


        getNotificationMessageHandler: function (sTopic) {

            //if (sTopic === "template") {
            //    return this._handleNotificationMessage;
            //}
            return null;
        },

        _handleNotificationMessage: function (oMsg) {

            var sMessage = "Message not found in payload 'message' property";
            if (oMsg && oMsg.parameters && oMsg.parameters.length > 0) {
                for (var i = 0; i < oMsg.parameters.length; i++) {

                    switch (oMsg.parameters[i].name) {
                        case "template":

                            break;
                        case "template2":


                    }



                }
            }

        },


        onExit: function () {
            PluginViewController.prototype.onExit.apply(this, arguments);


        }
    });
});