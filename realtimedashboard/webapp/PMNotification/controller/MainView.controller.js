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
], function (jQuery, PluginViewController, JSONModel, Column, Text, Filter, FilterOperator, MessageBox, MessageToast) {
    "use strict";

    return PluginViewController.extend("company.custom.plugins.realtimedashboard.PMNotification.controller.MainView", {
        onInit: function () {
            PluginViewController.prototype.onInit.apply(this, arguments);
            var oModel = new JSONModel({
                isresourceSelected: false,
                controls: {
                    resourceInput: {
                        valueState: "None",
                        valueStateText: ""
                    }

                },
                FormData: {
                    resource: "",
                    // status: ""

                }
            });

            this.getView().setModel(oModel, "data");

            // Fetch data from API
            this._fetchData();
        },


        _fetchData: function () {
            var that = this;
            var sUrl = this.getPublicApiRestDataSourceUri() + '/resource/v2/resources';
            var oParameters = {
                plant: 'M206'
            };

            this.ajaxGetRequest(sUrl, oParameters, function (oResponseData) {
                that.handleResponse(oResponseData);
            }, function (oError, sHttpErrorMessage) {
                that.handleErrorMessage(oError, sHttpErrorMessage);
            });
        },

        handleResponse: function (oResponseData) {
            console.log("Data received:", oResponseData);
            var oModel = this.getView().getModel("data");
            oModel.setData(oResponseData);
            console.log("Data set in model:", oModel.getData());

        },
        onResourceValueHelpRequest: function () {
            var oView = this.getView(),
                oViewModel = oView.getModel("data");

            if (!this.oresourceVHDia) {
                //Load the fragment
                //!Change the namespace for fragment
                this.oresourceVHDia = sap.ui.xmlfragment(
                    "company.custom.plugins.realtimedashboard.PMNotification.view.fragments.ResourceValueHelpDialog",
                    this
                );
                this.oresourceVHDia.getTableAsync().then(function (oTable) {
                    //Add columns to the table
                    oTable.addColumn(
                        new Column({
                            label: new Text({ text: "Equipment" }),
                            template: new Text({ text: "{data>resource}" }),
                            width: "170px"
                        })
                    );
                    oTable.addColumn(
                        new Column({
                            label: new Text({ text: "Description" }),
                            template: new Text({ text: "{data>description}" }),
                            width: "200px"
                        })
                    );

                    oTable.addColumn(
                        new Column({
                            label: new Text({ text: "status" }),
                            template: new Text({ text: "{data>status}" }),
                            width: "150px"
                        })
                    );
                    //  Bind data to the table
                    oTable.setModel(oViewModel, "data");
                    oTable.bindRows("data>/");
                });
            }
            this.oresourceVHDia.open();



        },
        onresourceVHDiaSearch: function (oEvent) {
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
            this.oresourceVHDia.getTableAsync().then(oTable => {
                var oRowBindingCtx = oTable.getBinding("rows");
                oRowBindingCtx.filter(aFilters);
            });
        },

        onresourceVHDiaOkPress: function (oEvent) {
            var aSelectedItems = oEvent.getParameter("tokens");

            //No resource selected
            if (aSelectedItems.length < 1) {
                return;
            }

            //Close dialog
            this.oresourceVHDia.close();

            //Get Batch info for selected resource
            var sSelectedresource = aSelectedItems[0].getKey();

            //Set the selected resource to model
            var oViewModel = this.getView().getModel("data");
            oViewModel.setProperty("/resource", sSelectedresource);
            oViewModel.setProperty("/isresourceSelected", true);



        },

        onresourceVHDiaCancelPress: function (oEvent) {
            this.oresourceVHDia.close();
        },

        _validateForm: function () {
            var oView = this.getView(),
                oViewModel = oView.getModel("data"),
                bFormHasError = false;

            //Validate resource input
            if (!oViewModel.getProperty("/FormData/resource")) {
                oViewModel.setProperty(
                    "/controls/resourceInput/valueState",
                    "Error"
                );
                oViewModel.setProperty(
                    "/controls/resourceInput/valueStateText",
                    "Please fill required field"
                );
                bFormHasError = true;

            } else {
                oViewModel.setProperty(
                    "/controls/resourceInput/valueState",
                    "None"
                );
                oViewModel.setProperty("/controls/resourceInput/valueStateText", "");
            }
                return bFormHasError; //Return true if there's an error
            
        },
// Modified onCreateNotification function to handle validation

        onCreateNotification: function () {
            var oView = this.getView(),
                oViewModel = oView.getModel("data"),
                oFormData = oViewModel.getProperty("/FormData");
    // Run validation and halt if there are errors

            if (this._validateForm()) {
                //TODO: Show error to user
                // MessageToast.show("Please correct errors before submitting.");

                return; //Stop execution if validation fails
            }

            var oPayload = {
                plant: "M206",
                resource: oFormData.resource,
                batch: oFormData.batchNumber,
                expiryCurr: oDateInstance.format(oFormData.expiryDate),
                expiryNew: oDateInstance.format(oFormData.expiryDateCorrection)
            };
            var sURL = this.getPublicApiRestDataSourceUri() + '/pe/api/v1/process/processDefinitions/start?key=REG_925fdf75-b56d-4c23-a734-ed5d38b2b97e';

            this.ajaxPostRequest(
                sURL,
                oPayload,
                function (oResponseData) {
                    console.log("POST service success:", oPayload, oResponseData);
                    MessageToast.show("Data successfully submitted!");
                    // this.onClearForm(); //clear input after successfull
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
            var oViewModel = this.getView().getModel("data");
                oViewModel.setProperty("/formData/resource", "");
                oViewModel.setProperty("/isresourceSelected", false);

        },

        
    onFileChange: function (oEvent) {
        var oFileUploader = this.getView().byId("fileUploader");

        //Validate file size (optional, for example max 5MB)
        var iFileSizeLimit = 5 * 1024 * 1024;  //5MB
        var oFile = oEvent.getParameter("files") && oEvent.getParameter("files")[0];
        console.log("Selected file:", oFile);

        if (oFile && oFile.size > iFileSizeLimit) {
            MessageBox.error("File size mst be 5MB or less.");
            oFileUploader.clear(); //Clear the selection if invalid
            return;
        }

        //Optional: Check file Type
        var aAllowedTypes = ["image/jpeg", "image/png"];
        if (oFile && !aAllowedTypes.includes(oFile.type)) {
            MessageBox.error("Only JPG and PNG files are allowed.");
            oFileUploader.clear();
            return;
        }

        //Start Upload
        oFileUploader.upload();
    },
    onUploadComplete: function (oEvent) {
        var sResponse = oEvent.getParameter("response");

        if (sResponse) {
            MessageToast.show("Photo uploaded successfully");
        }
        else {
            MessageBox.error("Photo upload failed.Please try again");
        }
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