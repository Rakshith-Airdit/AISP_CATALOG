/*global QUnit*/

sap.ui.define([
	"com/aisp/buyercatalog/aispbuyercatalog/controller/CatalogList.controller"
], function (Controller) {
	"use strict";

	QUnit.module("CatalogList Controller");

	QUnit.test("I should test the CatalogList controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
