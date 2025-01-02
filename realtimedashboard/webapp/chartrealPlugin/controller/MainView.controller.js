sap.ui.define([
    'jquery.sap.global',
	"sap/dm/dme/podfoundation/controller/PluginViewController",
	"sap/ui/model/json/JSONModel",
    'sap/m/MessageToast',
    'sap/viz/ui5/data/FlattenedDataset',
    'sap/viz/ui5/controls/common/feeds/FeedItem',
    'sap/viz/ui5/format/ChartFormatter',
    'sap/ui/model/Filter',
    'sap/ui/model/FilterOperator'
], function (jQuery, PluginViewController, JSONModel, MessageToast,
    FlattenedDataset,
    FeedItem,
    ChartFormatter,
    Filter,
    FilterOperator) {
	"use strict";

	return PluginViewController.extend("company.custom.plugins.realtimedashboard.chartrealPlugin.controller.MainView", {
	  onInit: function() {
      // Call the base controller's onInit
      PluginViewController.prototype.onInit.apply(this, arguments);

      // Initialize an empty model and set it to the view
      var oModel = new JSONModel();
      this.getView().setModel(oModel, 'data');

      // Initialize the chart and fetch data
      this._initChart();
      this._fetchConsumptionData();
    },

    onRefreshIconPress: function() {
      this._fetchConsumptionData();
    },

    _fetchConsumptionData: function() {
      // var sUrl = 'https://dbapicall.cfapps.eu20-001.hana.ondemand.com/api/get/consumptionData';
      var sUrl = 'https://dbapicall.cfapps.eu20-001.hana.ondemand.com/api/get/realTimeConsumptionData';
      
      //Get the selected resource and create service payload
      var oPodSelectionModel = this.getPodSelectionModel(),
        oSelectedResource = oPodSelectionModel.stelSelectedResourceData;

      var oPayload = {
        plant: this.getPodController().getUserPlant(),
        order: oSelectedResource.customData.ORDER,
        operator: oSelectedResource.customData.OPERATOR,
        component: oSelectedResource.customData.MATERIAL,
        resource: oSelectedResource.resource,
        fromDateAndTime: new Date(Date.now() - 1000*60*30)
      };

      // Perform AJAX POST request
      $.ajax({
        url: sUrl,
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(oPayload),
        success: function(oResponseData) {
          // Log the response to debug its structure
          console.log(oResponseData);

          // Update the "data" model with the fetched data
          var oModel = this.getView().getModel('data');
          oModel.setProperty('/data', oResponseData);

          // Update the chart with the new data
          // this._updateChart();
          sap.m.MessageToast.show('Data successfully fetched and bound to the chart!');
          console.log("REALTIMECONSUMPTION_DATA", oResponseData);
        }.bind(this),
        error: function(oError) {
          console.error('Error in API call:', oError);
          sap.m.MessageBox.error('Failed to fetch data from the server. Please try again.');
        }
      });

      //Add filters to the chart based on the resource selection in pod selection model
      // var oPodSelectionModel = this.getPodSelectionModel(),
      //   oSelectedResource = oPodSelectionModel.stelSelectedResourceData;

      // if (!oSelectedResource) {
      //   return;
      // }

      // var aFilters = [];

      // //Resource filter
      // aFilters.push(new Filter('RESOURCE', FilterOperator.EQ, oSelectedResource.resource));

      // //Operator filter
      // aFilters.push(new Filter('OPERATOR', FilterOperator.EQ, oSelectedResource.customData.OPERATOR));

      // //Order filter
      // aFilters.push(new Filter('ORDER_NO', FilterOperator.EQ, oSelectedResource.customData.ORDER));

      // //Component filter
      // aFilters.push(new Filter('COMPONENT', FilterOperator.EQ, oSelectedResource.customData.MATERIAL));

      // var oVizFrame = this.getView().byId('idVizFrame');
      // oVizFrame.getDataset().getBinding('data').filter(aFilters);
    },

    _initChart: function() {
      var oView = this.getView(),
        oModel = this.getOwnerComponent().getModel('data'),
        oVizFrame = oView.byId('idVizFrame');

      oVizFrame.destroyDataset();
      oVizFrame.destroyFeeds();
      oVizFrame.setModel(oModel);

      //Set type of chart
      //timeseries_bullet
      oVizFrame.setVizType('timeseries_combination');

      //Set VizFrame data set
      var oDataSet = {
        dimensions: [
          {
            name: 'Date',
            value: '{data>CONSUMPTION_DATE}',
            dataType: 'date'
          }
        ],
        measures: [
          {
            name: 'Actual',
            value: '{data>QUANTITY}'
          },
          {
            name: 'TargetUpper',
            value: '{data>UPPER_TOLERANCE}'
          },
          {
            name: 'TargetLower',
            value: '{data>LOWER_TOLERANCE}'
          }
        ],
        data: {
          path: 'data>/data'
        }
      };
      var oDataset = new FlattenedDataset(oDataSet);
      oVizFrame.setDataset(oDataset);

      //Set VizFrame properties
      var oVizProperties = {
        plotArea: {
          window: {
            start: 'firstDataPoint',
            end: 'lastDataPoint'
          },
          dataLabel: {
            visible: false
          }
        },
        valueAxis: {
          visible: true,
          title: {
            visible: false
          }
        },
        valueAxis2: {
          visible: true,
          title: {
            visible: false
          }
        },
        timeAxis: {
          title: {
            visible: false
          },
          interval: {
            unit: ''
          },
          levels: ['second', 'minute', 'hour', 'day', 'month', 'year']
        },
        title: {
          visible: false
        },
        interaction: {
          syncValueAxis: false
        }
      };
      oVizFrame.setVizProperties(oVizProperties);

      //Set data feeds for vizframe
      var feedActualValues = new FeedItem({
        uid: 'actualValues',
        type: 'Measure',
        values: ['Actual', 'TargetUpper']
      });

      var feedTargetValues = new FeedItem({
        uid: 'targetValues',
        type: 'Measure',
        values: ['TargetUpper', 'TargetLower']
      });

      var feedTimeAxis = new FeedItem({
        uid: 'timeAxis',
        type: 'Dimension',
        values: ['Date']
      });

      var feedValueAxis = new FeedItem({
        uid: 'valueAxis',
        type: 'Measure',
        values: ['Actual', 'TargetUpper', 'TargetLower']
      });

      // oVizFrame.addFeed(feedActualValues);
      // oVizFrame.addFeed(feedTargetValues);
      oVizFrame.addFeed(feedTimeAxis);
      oVizFrame.addFeed(feedValueAxis);

      var oPopOver = this.getView().byId('idPopOver');
      oPopOver.connect(oVizFrame.getVizUid());
      oPopOver.setFormatString({
        Date: 'dd/MM/yyyy hh:mm:ss'
      });
    },

    onback: function(oEvent) {
      this.navigateToMainPage();
    },
    onBackButtonPress: function(oEvent) {
      this.navigateToMainPage();
    },

    onAfterRendering: function() {
      // this.getView().byId("backButton").setVisible(this.getConfiguration().backButtonVisible);
      // this.getView().byId("closeButton").setVisible(this.getConfiguration().closeButtonVisible);
      // this.getView().byId("headerTitle").setText(this.getConfiguration().title);
      // this.getView().byId("textPlugin").setText(this.getConfiguration().text);
    },

    onBeforeRenderingPlugin: function() {
      this.subscribe('PageChangeEvent', this.onPageChangeEvent, this);
    },

    isSubscribingToNotifications: function() {
      var bNotificationsEnabled = true;

      return bNotificationsEnabled;
    },

    getCustomNotificationEvents: function(sTopic) {
      //return ["template"];
    },

    getNotificationMessageHandler: function(sTopic) {
      //if (sTopic === "template") {
      //    return this._handleNotificationMessage;
      //}
      return null;
    },

    _handleNotificationMessage: function(oMsg) {
      var sMessage = "Message not found in payload 'message' property";
      if (oMsg && oMsg.parameters && oMsg.parameters.length > 0) {
        for (var i = 0; i < oMsg.parameters.length; i++) {
          switch (oMsg.parameters[i].name) {
            case 'template':
              break;
            case 'template2':
          }
        }
      }
    },

    onExit: function() {
      PluginViewController.prototype.onExit.apply(this, arguments);

      this.unsubscribe('PageChangeEvent', this.onPageChangeEvent, this);
    },

    onPageChangeEvent: function(sChannelId, sEventId, oData) {
      if (oData.page == 'CHARTPAGE') {
        this._fetchConsumptionData();
      }
    }
  });
}
);
