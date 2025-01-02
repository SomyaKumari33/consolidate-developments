sap.ui.define([

    'jquery.sap.global',

    "sap/dm/dme/podfoundation/controller/PluginViewController",

    "sap/ui/model/json/JSONModel",

    "sap/ui/model/Filter",

    "sap/ui/model/FilterOperator",

    "sap/m/MessageBox",

    "sap/ui/comp/valuehelpdialog/ValueHelpDialog",

    "sap/m/MessageToast",

    "sap/ui/comp/filterbar/FilterBar",

    "sap/m/Input",   // Import the Input control

    "sap/m/Text",

    "sap/ui/table/Table",

    "sap/ui/table/Column"





], function (jQuery, PluginViewController, JSONModel, Filter, FilterOperator, MessageBox, ValueHelpDialog, MessageToast, FilterBar, Input, Text, Table, Column) {

    "use strict";



    return PluginViewController.extend("company.custom.plugins.realtimedashboard.stockrequestPlugin.controller.MainView", {

        onInit: function () {

            PluginViewController.prototype.onInit.apply(this, arguments);

            var oModel = new JSONModel();
            this.getView().setModel(oModel, "viewModel");

            // Fetch data from APIs
            this._getMaterials();
            this._getStorageLocations();
        },

        onValueHelpRequest: function (oEvent) {
            var oInput = oEvent.getSource();

            // Destroy existing dialog if it exists
            if (this.oValueHelpDialog) {
                this.oValueHelpDialog.destroy();
            }

            // Create Value Help Dialog
            this.oValueHelpDialog = new ValueHelpDialog({
                title: "Select Materials",
                supportMultiselect: true, // Allow multiple selection
                key: "material",
                descriptionKey: "description",
                ok: function (oEvent) {
                    var aSelectedItems = oEvent.getParameter("tokens");
                    oInput.setTokens(aSelectedItems);
                    this.oValueHelpDialog.close();
                }.bind(this),
                cancel: function () {
                    this.oValueHelpDialog.close();
                }.bind(this)
            });

            // Create Filter Bar
            var oFilterBar = new FilterBar({
                advancedMode: false,
                search: this.onSearchVHD.bind(this),
                filterGroupItems: [
                    new sap.ui.comp.filterbar.FilterGroupItem({
                        groupName: "group1",
                        visibleInFilterBar: true,
                        name: "material",
                        label: "Material",
                        control: new sap.m.Input({
                            placeholder: "Search for Material...",
                            value: ""
                        })
                    })
                ]
            });

            // Create the table for displaying orders

            this.oTable = new sap.ui.table.Table(this.createId("orderTable"), {
                visibleRowCount: 4,
                selectionMode: "MultiToggle" // Multiple selection mode
            });

            // Add columns to the table

            this.oTable.addColumn(
                new Column({
                    label: new Text({ text: "Material" }),
                    template: new Text({ text: "{viewModel>material}" }),
                    width: "200px"
                })
            );

            this.oTable.addColumn(
                new Column({
                    label: new Text({ text: "Description" }),
                    template: new Text({ text: "{viewModel>description}" }),
                    width: "250px"
                })
            );

            this.oTable.addColumn(
                new Column({
                    label: new Text({ text: "Version" }),
                    template: new Text({ text: "{viewModel>version}" }),
                    width: "150px"
                })
            );

            // Bind data to the table
            this.oTable.setModel(this.getView().getModel("viewModel"), 'viewModel');
            this.oTable.bindRows("viewModel>/materials");

            // Set Filter Bar and Table to the Value Help Dialog
            this.oValueHelpDialog.setFilterBar(oFilterBar);
            this.oValueHelpDialog.setTable(this.oTable);
            this.oValueHelpDialog.setContentWidth("700px");

            // Open the dialog if order data is available

            // if (this.getView().getModel("data").getProperty("/materials")) {

            this.oValueHelpDialog.open();

            // }
        },

        onSearchVHD: function (oEvent) {
            var oFilterBar = oEvent.getSource(),
                aFilterGroupItems = oFilterBar.getFilterGroupItems(),
                aFiltersMaterials = [],
                oView = this.getView(),
                oTable = oView.byId("orderTable"), // The ID of the table in VHD
                sSearchText = ""; // Variable to hold the search text

            // Iterate over filter group items to create filters
            aFilterGroupItems.forEach(function (oFGI) {
                var oControl = oFGI.getControl();

                if (oControl instanceof sap.m.Input) {
                    sSearchText = oControl.getValue(); // Get the value from the input field
                }
            });

            // Create filter based on the search text
            if (sSearchText) {
                var oFilter = new sap.ui.model.Filter(
                    "material",
                    sap.ui.model.FilterOperator.Contains,
                    sSearchText
                );
                aFiltersMaterials.push(oFilter);
            }

            // Apply filters to the table in the VHD
            var oBinding = oTable.getBinding("rows");
            if (oBinding) {
                oBinding.filter(aFiltersMaterials); // Apply the filter for the material column
            }
        },

        handleErrorMessage: function (oError, sHttpErrorMessage) {
            var err = oError || sHttpErrorMessage;
            this.showErrorMessage(err, true, true);
        },

        onSearch: function (oEvent) {
            //     var oView = this.getView(),
            //         oViewModel = oView.getModel("viewModel"),
            //         aTableItems = [];

            //     var aSelectedMaterials = oView.byId("inputOrder").getTokens();

            //     //Create table entry
            //     aSelectedMaterials.forEach(oMaterialToken => {
            //         var oItem = {
            //             material: oMaterialToken.getKey(),
            //             description: oMaterialToken.getText(),
            //             reqQty: 0,
            //             issueStorageLocation: "",
            //             receiveStorageLocation: "",
            //             unitOfMeasure: oMaterialToken.getText()
            //         };

            //         aTableItems.push(oItem);
            //     });

            //     oViewModel.setProperty("/tabItems", aTableItems);
            //     oViewModel.refresh(true);
            // },
            var oView = this.getView(),
                oViewModel = oView.getModel("viewModel"),
                aTableItems = [];

            var aSelectedMaterials = oView.byId("inputOrder").getTokens();

            // Create table entry
            aSelectedMaterials.forEach(oMaterialToken => {
                var materialKey = oMaterialToken.getKey(); // Get the material key

                // Find the corresponding material data in the view model
                var materialData = oViewModel.getProperty("/materials").find(mat => mat.material === materialKey);

                // Create the item if the material data is found
                if (materialData) {
                    var oItem = {
                        material: materialData.material,
                        description: materialData.description,
                        reqQty: 0,
                        issueStorageLocation: "",
                        receiveStorageLocation: "",
                        unitOfMeasure: materialData.unitOfMeasure // Correctly access unitOfMeasure
                    };

                    aTableItems.push(oItem);
                }
            });

            oViewModel.setProperty("/tabItems", aTableItems);
            oViewModel.refresh(true);
        },

        handleStockRequestSubmit: function () {
            var oView = this.getView(),
                oViewModel = oView.getModel("viewModel"),
                oTable = oView.byId("table"),
                aItems = oTable.getSelectedItems(),
                oPayloadData = {
                    plant: "M206",
                    stocklist: []
                };

            if (aItems.length < 1) {
                MessageBox.error("Please select atleast one row");
                return;
            }

            var bIsDataInvalid = false;

            var bValidationError = false;
            var aErrorMessages = [];

            // Flags to track error types
            var bQtyError = false;
            var bLocationError = false;
            var bSameLocationError = false;

            //Validate the data and build payload
            aItems.forEach(oItem => {
                var oContext = oItem.getBindingContext("viewModel"),
                    oItemObject = oContext.getObject();

                //Check quantity
                var sReqQty = oItemObject.reqQty;
                if (!bQtyError && (isNaN(sReqQty) || parseFloat(sReqQty) <= 0)) {
                    aErrorMessages.push("Please ensure Required Quantity is filled for all selected rows.");
                    bValidationError = true;
                    bQtyError = true; // Set flag to avoid duplicate messages
                }

                // Check for empty storage locations
                var sIssueSloc = oItemObject.issueStorageLocation,
                    sRecvSloc = oItemObject.receiveStorageLocation;

                if ((!sIssueSloc || !sRecvSloc) && !bLocationError) {
                    aErrorMessages.push("Please ensure both Issue and Receive Storage Locations are filled for all selected rows.");
                    bValidationError = true;
                    bLocationError = true;
                }

                // Check if issue and receive storage locations are the same
                if (sIssueSloc === sRecvSloc && !bSameLocationError) {
                    aErrorMessages.push("Issue and Receive Storage Locations must not be the same for all selected rows.");
                    bValidationError = true;
                    bSameLocationError = true;
                }

                if (bIsDataInvalid || bValidationError) {
                    return;
                }

                oPayloadData.stocklist.push({
                    receivingSloc: sRecvSloc,
                    unit: oItemObject.unitOfMeasure,
                    material: oItemObject.material,
                    reqQty: sReqQty,
                    issueSloc: sIssueSloc
                });
            });

            if (bIsDataInvalid || bValidationError) {
                MessageBox.error(aErrorMessages.join('\n'));
                return;
            }

            var sUrl =
                this.getPublicApiRestDataSourceUri() +
                "/pe/api/v1/process/processDefinitions/start?key=REG_641eeae5-3c79-437c-b261-bac828001293";

            this.ajaxPostRequest(
                sUrl,
                oPayloadData,
                function (oResponseData) {
                    console.log("POST service success", oPayloadData, oResponseData);
                    MessageToast.show('Stock request raised');
                },
                function (oError, sHttpErrorMessage) {
                    // Check the status code and show an appropriate message
                    if (oError.status === 500) {
                        MessageBox.error(
                            "Internal Server Error: Please contact the administrator."
                        );
                    } else {
                        MessageBox.error(
                            "Error: " + (oError.responseText || sHttpErrorMessage)
                        );
                    }
                }.bind(this)
            );
        },

        onDeleteRows: function (oEvent) {
            // var oView = this.getView(),
            //     oViewModel = oView.getModel("viewModel"),
            //     aTableItems = oViewModel.getProperty("/tabItems"),
            //     oTable = oView.byId("table"),
            //     aSelectedContextPaths = oTable.getSelectedContextPaths();

            // aSelectedContextPaths.forEach(sPath => {
            //     var idx = sPath.match(/[0-9]+$/)[0];
            //     aTableItems.splice(idx, 1);
            // });

            var oView = this.getView(),
                oViewModel = oView.getModel('viewModel'),
                aTableItems = oViewModel.getProperty('/tabItems'),
                oContext = oEvent.getSource().getParent().getParent().getBindingContext('viewModel'),
                sPath = oContext.getPath(),
                idx = sPath.match(/[0-9]+$/)[0];

            aTableItems.splice(idx, 1);

            oViewModel.setProperty("/tabItems", aTableItems);
            oViewModel.refresh(true);
        },

        onClearFilters: function () {
            var oView = this.getView(),
                oMaterialFBI = oView.byId("inputOrder"),
                oViewModel = oView.getModel("viewModel");

            //Remove all tokens from the filterbar input
            oMaterialFBI.removeAllTokens();

            //Clear the table entries
            oViewModel.setProperty("/tabItems", []);
            oViewModel.refresh(true);
        },

        _getMaterials: function () {
            var that = this;

            var oParameters = {
                plant: "M206",
                page:
                    "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30",
                size: "1000"
            };

            // Fetch data from Material API
            var sMaterialUrl =
                this.getPublicApiRestDataSourceUri() + "/material/v2/materials";
            this.ajaxGetRequest(
                sMaterialUrl,
                oParameters,
                function (oMaterialResponseData) {
                    that._parseMaterials(oMaterialResponseData.content);
                },
                function (oError, sHttpErrorMessage) {
                    that.handleErrorMessage(oError, sHttpErrorMessage);
                }
            );
        },

        _parseMaterials: function (aMaterials) {
            var aMaterialParsed = aMaterials.map(oMaterial => {
                return {
                    material: oMaterial.material,
                    description: oMaterial.description,
                    unitOfMeasure: oMaterial.unitOfMeasure
                };
            });

            var oModel = this.getView().getModel("viewModel");
            oModel.setProperty("/materials", aMaterialParsed);
        },

        _getStorageLocations: function () {
            var that = this;

            var oParameters = {
                plant: "M206",
                page:
                    "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30",
                size: "1000"
            };

            // Fetch data from Material API
            var sInventoryUrl =
                this.getPublicApiRestDataSourceUri() +
                "/inventory/v1/storageLocations";

            this.ajaxGetRequest(
                sInventoryUrl,
                oParameters,
                function (oInventoryResponseData) {
                    // that._parseStorageLocations(oInventoryResponseData.content);
                    that
                        .getView()
                        .getModel("viewModel")
                        .setProperty(
                            "/storageLocations",
                            oInventoryResponseData.content
                        );
                },
                function (oError, sHttpErrorMessage) {
                    that.handleErrorMessage(oError, sHttpErrorMessage);
                }
            );
        },

        _parseStorageLocations: function (aStorageLocations) {
            var aStoLocParsed = aStorageLocations.map(oLocation => {
                return {};
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