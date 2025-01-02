sap.ui.define([

    'jquery.sap.global',

    "sap/dm/dme/podfoundation/controller/PluginViewController",

    "sap/ui/model/json/JSONModel",

    "sap/m/ColumnListItem",

    "sap/m/Column",

    "sap/m/Text",

    'sap/m/Label',

    "sap/m/SelectDialog",

    "sap/m/StandardListItem",

    'sap/ui/model/Filter',

    'sap/ui/model/FilterOperator',

    'sap/ui/comp/smartvariants/PersonalizableInfo',

    "sap/ui/core/Fragment",

    "sap/ui/core/Control",

    "sap/m/MessageBox",

    "sap/m/LoadState",

    "sap/viz/ui5/format/ChartFormatter",

    "sap/viz/ui5/api/env/Format",

    "sap/m/Popover",

    "sap/m/VBox",

    "sap/m/Dialog"

], function (jQuery, PluginViewController, JSONModel, ColumnListItem, Column, Text, Label, SelectDialog, StandardListItem, Filter, FilterOperator, PersonalizableInfo, Fragment, Control, MessageBox, LoadState, ChartFormatter, Format, Popover, VBox, Dialog) {

    "use strict";



    return PluginViewController.extend("company.custom.plugins.realtimedashboard.realtimedashboard.controller.MainView", {

        onInit: function () {
            PluginViewController.prototype.onInit.apply(this, arguments);
            var oModel = new JSONModel({

                isOperatorEnabled: false,
                workCenter: "",
                userId: "",
                workCenters: [],
                operators: [],
                items: [],
            });




            this.getView().setModel(oModel, "data");





            // Fetch data from API

            this._fetchData();

            this._fetchworkCenterData();
        

            // Set up auto-refresh every 10 seconds
            this._autoRefreshInterval = setInterval(function () {
                this._fetchData();
            }.bind(this), 10000);
        },

        onExit: function () {
            // Clear the auto-refresh interval when the view is destroyed
            if (this._autoRefreshInterval) {
                clearInterval(this._autoRefreshInterval);
                this._autoRefreshInterval = null;
            }
        },

        // Optional cleanup in case the lifecycle uses onDestroy
        onDestroy: function () {
            // Clear the auto-refresh interval when the view is destroyed
            if (this._autoRefreshInterval) {
                clearInterval(this._autoRefreshInterval);
                this._autoRefreshInterval = null;
            }
        },
        handleResponseData: function (oData) {
            var oViewModel = this.getView().getModel("data");
            var oResourceData = {};
            var aUnassignedResources = []; // Array to hold unassigned resources

            for (var i = 0; i < oData.length; i++) {
                // Ignore resource if not of type PORTIONING or FORMULATION
                if (!oData[i].types.find(value => value.type === 'PORTIONING' || value.type === 'FORMULATION')) {
                    continue;
                }

                // Convert customValues array to customData object
                var oCustomData = oData[i].customValues.reduce((acc, val) => {
                    acc[val.attribute] = val.value;
                    return acc;
                }, {});
                oData[i].customData = oCustomData;

                var oResourceItem = oData[i];

                // Check if the resource is assigned to a work center
                if (!oResourceItem.customData.WORK_CENTER) {
                    // If not assigned, add to the unassigned array
                    aUnassignedResources.push(oResourceItem);
                    continue;
                }

                // Group resources by WORK_CENTER
                if (!oResourceData[oResourceItem.customData.WORK_CENTER]) {
                    oResourceData[oResourceItem.customData.WORK_CENTER] = {
                        workcenter: oResourceItem.customData.WORK_CENTER,
                        workcenterDesc: oResourceItem.customData.WORK_CENTER,
                        resources: [] // Use "resources" to store grouped resources
                    };
                }

                // Add the resource to the corresponding work center
                oResourceData[oResourceItem.customData.WORK_CENTER].resources.push(oResourceItem);
            }

            // Combine grouped data and unassigned resources
            var aFinalResourceData = Object.values(oResourceData);
            if (aUnassignedResources.length > 0) {
                aFinalResourceData.push({
                    workcenter: null,
                    workcenterDesc: "Resources not assigned to workcenter",
                    resources: aUnassignedResources
                });
            }

            // Set the grouped and sorted data to the view model
            oViewModel.setProperty("/items", aFinalResourceData);
            console.log("Transformed Resource Data:", aFinalResourceData);
        },




        panelHeaderFormatter: function (sValue) {

            return sValue || "Resources not assigned to workcenter";

        },







        _fetchData: function () {
            var that = this;
            var sUrl = this.getPublicApiRestDataSourceUri() + '/resource/v2/resources';
            var oParameters = {
                plant: this.getPodController().getUserPlant()
            };

            this.ajaxGetRequest(sUrl, oParameters, function (oResponseData) {
                that.handleResponseData(oResponseData);

                if (oResponseData && oResponseData.length) {
                    // Filter resources to include only those of type PORTIONING or FORMULATION
                    var aFilteredResources = oResponseData.filter(function (oResource) {
                        return oResource.types.some(function (typeObj) {
                            return typeObj.type === 'PORTIONING' || typeObj.type === 'FORMULATION';
                        });
                    });

                    // Update the data model with the filtered resources
                    that.getView().getModel("data").setProperty("/resources", aFilteredResources);
                } else {
                    MessageBox.warning("No resource data available.");
                }

            });
        },








        handleResponseworkCenters: function (oResponseData) {

            var oModel = this.getView().getModel("data");

            oModel.setProperty("/workCenters", oResponseData);

            console.log("WorkCenter data:", oResponseData);



        },



        _fetchworkCenterData: function () {

            return new Promise((resolve, reject) => {

                var sUrl = this.getPublicApiRestDataSourceUri() + '/workcenter/v2/workcenters';

                var oParameters = {

                    plant: this.getPodController().getUserPlant(),

                    page: "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30",

                    size: "1500"

                };



                this.ajaxGetRequest(sUrl, oParameters, (oResponseData) => {

                    if (oResponseData && oResponseData.length) {

                        this.handleResponseworkCenters(oResponseData);

                        resolve();

                    } else {

                        MessageBox.warning("No WorkCenter data available.");

                        resolve(); // Resolve to avoid breaking the chain

                    }

                }, (oError) => {

                    MessageBox.error("Failed to fetch WorkCenter data. Please try again.");

                    reject(oError);

                });

            });

        },









        handleErrorMessage: function (oError) {

            MessageBox.error("An error occurred while fetching data.");

        },

















        //For operators



        _fetchOperatorsForWorkCenter: function (sWorkCenter) {

            var oViewModel = this.getView().getModel("data");

            var aWorkCenters = oViewModel.getProperty("/workCenters");



            // Find the selected work center

            var oSelectedWorkCenter = aWorkCenters.find(function (oWorkCenter) {

                return oWorkCenter.workCenter === sWorkCenter;

            });



            if (oSelectedWorkCenter && oSelectedWorkCenter.userAssignments) {

                // Bind the user IDs (operators) to the model

                oViewModel.setProperty("/operators", oSelectedWorkCenter.userAssignments);

            } else {

                // Clear operators if none are found

                oViewModel.setProperty("/operators", []);

            }

        },



























        onCardTitlePress: function (oEvent) {

            var oSource = oEvent.getSource(),

                oContext = oSource.getBindingContext('data'),

                oSelectedResource = oContext.getObject(),

                oPodSelectionModel = this.getPodSelectionModel();



            //Set the selected resource data to the PodSelectionModel

            oPodSelectionModel.stelSelectedResourceData = oSelectedResource;



            this.navigateToPage('CHARTPAGE');

        },

        onworkCenterValueHelpRequest: function () {

            var oView = this.getView()



            var oViewModel = oView.getModel("data");

            var aWorkCenters = oViewModel.getProperty("/workCenters");



            if (!aWorkCenters || aWorkCenters.length === 0) {

                this._fetchworkCenterData().then(() => {

                    this._openWorkCenterVHD();

                });

            } else {

                this._openWorkCenterVHD();

            }

        },



        _openWorkCenterVHD: function () {

            var oViewModel = this.getView().getModel("data"); // Correctly get the model from the view



            if (!this.oworkCenterVHDia) {

                // Load the fragment

                this.oworkCenterVHDia = sap.ui.xmlfragment(

                    "company.custom.plugins.realtimedashboardPlugin.realtimedashboardPlugin.view.fragments.workCenterValueHelpRequest",

                    this

                );



                this.oworkCenterVHDia.getTableAsync().then(function (oTable) {

                    // Add columns to the table

                    oTable.addColumn(

                        new sap.ui.table.Column({

                            label: new sap.m.Text({ text: "workCenter" }),

                            template: new sap.m.Text({ text: "{data>workCenter}" }),

                            width: "170px"

                        })

                    );

                    oTable.addColumn(

                        new sap.ui.table.Column({

                            label: new sap.m.Text({ text: "description" }),

                            template: new sap.m.Text({ text: "{data>description}" }),

                            width: "170px"

                        })

                    );

                    oTable.addColumn(

                        new sap.ui.table.Column({

                            label: new sap.m.Text({ text: "status" }),

                            template: new sap.m.Text({ text: "{data>status}" }),

                            width: "170px"

                        })

                    );

                    // Bind data to the table

                    oTable.setModel(oViewModel, "data");

                    oTable.bindRows("data>/workCenters");

                });

            }

            this.oworkCenterVHDia.open();

        },



        onworkCenterVHDiaSearch: function (oEvent) {
            var oFilterBar = oEvent.getSource(),
                aFilterGroupItems = oFilterBar.getFilterGroupItems(),
                aFilters = [];

            // Loop through filter group items and create filters
            aFilters = aFilterGroupItems.map(function (oFGI) {
                var oControl = oFGI.getControl();
                if (oControl && oControl.getValue) {
                    var sPath = oFGI.getName(); // Example: "description"
                    var sValue = oControl.getValue();
                    if (sValue) {
                        return new sap.ui.model.Filter({
                            path: sPath,
                            operator: sap.ui.model.FilterOperator.Contains,
                            value1: sValue
                        });
                    }
                }
            }).filter(Boolean); // Remove undefined filters

            // Apply filters to the table rows
            this.oworkCenterVHDia.getTableAsync().then(function (oTable) {
                var oRowBinding = oTable.getBinding("rows");
                if (oRowBinding) {
                    oRowBinding.filter(aFilters);
                }
            });
        },



        onworkCenterVHDiaOKPress: function (oEvent) {

            var aSelectedItems = oEvent.getParameter("tokens");



            // No WorkCenter selected

            if (aSelectedItems.length < 1) {

                return;

            }



            // Close dialog

            this.oworkCenterVHDia.close();



            // Get the selected WorkCenter

            var sSelectedWorkCenter = aSelectedItems[0].getKey();



            // Set the selected WorkCenter in the model

            var oViewModel = this.getView().getModel("data");

            oViewModel.setProperty("/workCenter", sSelectedWorkCenter);



            // Enable the Operator input field

            oViewModel.setProperty("/isOperatorEnabled", true);



            // Fetch user IDs (operators) for the selected WorkCenter

            this._fetchOperatorsForWorkCenter(sSelectedWorkCenter);

        },



        onworkCenterVHDiaCancelPress: function () {

            var oViewModel = this.getView().getModel("data");

            this.oworkCenterVHDia.close();



            // Reset Operator and disable the Operator input field

            oViewModel.setProperty("/userId", "");

            oViewModel.setProperty("/operators", []);

            oViewModel.setProperty("/isOperatorEnabled", false);

        },





        onOperatorValueHelpRequest: function () {

            if (!this.oOperatorVHDia) {

                // Load the fragment for Operator VHD

                this.oOperatorVHDia = sap.ui.xmlfragment(

                    "company.custom.plugins.realtimedashboardPlugin.realtimedashboardPlugin.view.fragments.OperatorValueHelpRequest",

                    this

                );

                this.getView().addDependent(this.oOperatorVHDia);



                // Configure table columns in the dialog

                this.oOperatorVHDia.getTableAsync().then(function (oTable) {

                    oTable.addColumn(

                        new sap.ui.table.Column({

                            label: new sap.m.Text({ text: "User ID" }),

                            template: new sap.m.Text({ text: "{data>userId}" }),

                        })

                    );



                    // Bind data to the dialog

                    oTable.setModel(this.getView().getModel("data"), "data");

                    oTable.bindRows("data>/operators");

                }.bind(this));

            }



            this.oOperatorVHDia.open();

        },





        onOperatorVHDiaSearch: function (oEvent) {

            var oFilterBar = oEvent.getSource(),

                aFilterGroupItems = oFilterBar.getFilterGroupItems(),

                aFilters = [];



            //Create filters based on selected input Values

            aFilters = aFilterGroupItems.map(function (oFGI) {

                var oControl = oFGI.getControl();

                if (oControl && oControl.getValue) {

                    return new Filter({

                        path: oFGI.getName(),

                        operator: FilterOperator.Contains,

                        value1: oControl.getValue()

                    });

                }

            })

                .filter(Boolean); //Filter out empty values



            //Get the table for dialog and apply filter

            this.oOperatorVHDia.getTableAsync().then(oTable => {

                var oRowBindingCtx = oTable.getBinding("rows");

                //    oRowBindingCtx = oTable.getBinding("rows");

                oRowBindingCtx.filter(aFilters);

            });

        },

        onOperatorVHDiaOKPress: function (oEvent) {

            var aSelectedItems = oEvent.getParameter("tokens");



            //No order selected

            if (aSelectedItems.length < 1) {

                return;

            }



            //Close dialog

            this.oOperatorVHDia.close();



            //Get Batch info for selected resource

            var sSelectedOperator = aSelectedItems[0].getKey();



            //Set the selected order to model

            var oViewModel = this.getView().getModel("data");

            oViewModel.setProperty("/userId", sSelectedOperator);

            oViewModel.setProperty("/isOperatorSelected", true);

        },











        onOperatorVHDiaCancelPress: function (oEvent) {

            this.oOperatorVHDia.close();

        },









        onResourceValueHelpRequest: function () {

            var oView = this.getView(),

                oViewModel = oView.getModel("data");



            if (!this.oResourceVHDia) {

                // Load the fragment

                this.oResourceVHDia = sap.ui.xmlfragment(

                    "company.custom.plugins.realtimedashboardPlugin.realtimedashboardPlugin.view.fragments.ResourceValueHelpRequest",

                    this

                );



                this.oResourceVHDia.getTableAsync().then(function (oTable) {

                    // Add columns to the table

                    oTable.addColumn(

                        new sap.ui.table.Column({

                            label: new sap.m.Text({ text: "Resource" }),

                            template: new sap.m.Text({ text: "{data>resource}" }),

                            width: "170px"

                        })

                    );

                    oTable.addColumn(

                        new sap.ui.table.Column({

                            label: new sap.m.Text({ text: "Description" }),

                            template: new sap.m.Text({ text: "{data>description}" }),

                            width: "170px"

                        })

                    );

                    oTable.addColumn(

                        new sap.ui.table.Column({

                            label: new sap.m.Text({ text: "Status" }),

                            template: new sap.m.Text({ text: "{data>status}" }),

                            width: "170px"

                        })

                    );



                    // Bind data to the table

                    oTable.setModel(oViewModel, "data");

                    oTable.bindRows("data>/resources");
                });
            }









            this.oResourceVHDia.open();

        },




        onResourceVHDiaSearch: function (oEvent) {
            var oFilterBar = oEvent.getSource(),
                aFilterGroupItems = oFilterBar.getFilterGroupItems(),
                aFilters = [];

            // Create filters based on selected input values
            aFilters = aFilterGroupItems.map(function (oFGI) {
                var oControl = oFGI.getControl();
                if (oControl && oControl.getValue) {
                    return new Filter({
                        path: oFGI.getName(),
                        operator: FilterOperator.Contains,
                        value1: oControl.getValue()
                    });
                }
            }).filter(Boolean);

            // Get the table for dialog and apply filter
            this.oResourceVHDia.getTableAsync().then(oTable => {
                var oRowBindingCtx = oTable.getBinding("rows");

                // Apply filters without overwriting the original data
                oRowBindingCtx.filter(aFilters);
            });
        },


        onResourceVHDiaOKPress: function (oEvent) {
            var aSelectedItems = oEvent.getParameter("tokens");

            // No Resource selected
            if (aSelectedItems.length < 1) {
                return;
            }

            // Close dialog
            this.oResourceVHDia.close();

            // Get Batch info for selected resource
            var sSelectedResource = aSelectedItems[0].getKey();

            // Store the selected Resource in a separate property
            var oViewModel = this.getView().getModel("data");
            oViewModel.setProperty("/selectedResource", sSelectedResource); // Store selected resource separately
            oViewModel.setProperty("/isresourceSelected", true);
        },









        onResourceVHDiaCancelPress: function (oEvent) {

            this.oResourceVHDia.close();

        },











        onSearch: function () {

            var oView = this.getView();

            var aFilters = [];



            // Get values directly from the input fields

            var sResource = oView.byId("IdResourceInput").getValue();

            var sOperator = oView.byId("IdOperatorInput").getValue();

            var sOrder = oView.byId("IdOrderInput").getValue();

            var sComponent = oView.byId("IdComponentInput").getValue();

            var sWorkCenter = oView.byId("IdworkCenterInput").getValue();





            // Add filters based on the input values

            if (sResource) {

                aFilters.push(new sap.ui.model.Filter("resource", sap.ui.model.FilterOperator.Contains, sResource));

            }

            if (sOperator) {

                aFilters.push(new sap.ui.model.Filter("customData/OPERATOR", sap.ui.model.FilterOperator.Contains, sOperator));

            }

            if (sOrder) {

                aFilters.push(new sap.ui.model.Filter("customData/ORDER", sap.ui.model.FilterOperator.Contains, sOrder));

            }

            if (sComponent) {

                aFilters.push(new sap.ui.model.Filter("customData/MATERIAL", sap.ui.model.FilterOperator.Contains, sComponent));

            }

            if (sWorkCenter) {

                aFilters.push(new sap.ui.model.Filter("customData/WORK_CENTER", sap.ui.model.FilterOperator.Contains, sWorkCenter));

            }



            var oPanelContainer = oView.byId('tileContainer');

            oPanelContainer.getItems().forEach(item => item.getBinding('content').filter(aFilters));

            oView.getModel('data').refresh(true);

        },





        onClearFilters: function () {

            var oView = this.getView();



            // Clear the values in the input fields

            oView.byId("IdResourceInput").setValue("");

            oView.byId("IdOperatorInput").setValue("");

            oView.byId("IdOrderInput").setValue("");

            oView.byId("IdComponentInput").setValue("");

            oView.byId("IdworkCenterInput").setValue("");





            // Reset any additional model properties

            var oModel = oView.getModel("data");
            // Clear any filters applied to cards
            oModel.setProperty("/items", []);

            if (oModel) {

                oModel.setProperty("/selectedResource", "");

                oModel.setProperty("/isResourceSelected", false);

                oModel.setProperty("/controls/OperatorInput/valueState", "None");

                oModel.setProperty("/controls/orderInput/valueState", "None");

                oModel.setProperty("/controls/ResourceInput/valueState", "None");



            }

            this._fetchData();

            // this._fetchworkCenterData();







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