YUI.add('inputex-datatable', function (Y, NAME) {

/*global Y:true,confirm:true*/

/**
 * The inputex-datatable module provides the inputEx.Plugin.InputExDataTable class which is a plugin.
 * @module inputex-datatable
 */

var inputEx = Y.inputEx;

Y.namespace('inputEx.Plugin');

/**
* Provide add/modify/delete functionalities on a dataTable as a plugin
* @class inputEx.Plugin.InputExDataTable
* @extends Plugin.Base
* @constructor
* @param {Object} configuration object
*/
inputEx.Plugin.InputExDataTable = function (config) {
   inputEx.Plugin.InputExDataTable.superclass.constructor.call(this, config);
};

inputEx.Plugin.InputExDataTable.NS = "InputExDataTable";

Y.extend(inputEx.Plugin.InputExDataTable, Y.Plugin.Base, {
   
   /**
    * @method initializer
    */
   initializer: function () {

      var host = this.get("host");

      // enrich data (Model instance) with modify and delete attributs
      this.enrichData();
      
      // enrich DataTable with modify and delete columns
      this.enrichColumns();

      // add a button called "add" in order to add record in the DataTable
      this.addAddButton();
        
      if(!this.get("disableModifyFunc")) {
         // handle row modification
         host.delegate("click",this.modifyRecord, "td."+host.getClassName('cell-modify'), this);
      }

      if(!this.get("disableDeleteFunc")) {
         // handle row removal
         host.delegate("click",this.deleteRecord, "td."+host.getClassName('cell-delete'), this);
      }
      

      if(this.get("inplaceedit")) {
         host.get('contentBox').addClass( host.getClassName('inplaceedit') );
         this.setupInplaceEditing();
      }

    },


   setupInplaceEditing: function() {
      var host = this.get('host');

      // Delegate click event to make the inplace editor appear
      this.cellClickHandler = host.delegate("click", this.onCellClick, "."+host.getClassName('cell'), this);

   },

   onCellClick: function(e) {

      var findTd = function(n) { return n.get('tagName') === 'TD' && n.hasClass('yui3-datatable-cell'); },
          td = findTd(e.target) ? e.target : e.target.ancestor(findTd), // this might be a DIV because of a formatter (see color)
          host = this.get('host'),
          colIndex = td.get('parentNode').get('children').indexOf(td),
          column = host.getColumn(colIndex),
          record = host.getRecord(td),
          key = column.key,
          value = record.get(key),

          overlay = this.get('inplaceOverlay'),

          // inputEx Field config
          fieldConf = Y.Array.find(this.get('inputEx').fields, function(i) { return i.name === key; }),
          conf = Y.mix({
            parentEl: this.overlayFieldContainer.getDOMNode()
          }, fieldConf),
          field;

      // When we changed the value of an overlay but click on another cell, it doesn't save automatically
      // since the event is stopped. So we do it manually here.
      // TODO: this can have strange effects if you're editing to fast because of the this._inplaceeditCell collision
      if( overlay.get('visible') && !overlay.get('boundingBox').contains(e.target) ) {
         this.onOverlaySave();
      }

      e.stopPropagation();

      if( !fieldConf ||
          fieldConf.type === "uneditable" ||
          td.hasClass('yui3-datatable-cell-delete') ||
          td.hasClass('yui3-datatable-cell-modify') ) {
         return;
      }

      // Align
      overlay.align(td, ["tl", "tl"]);
      overlay.show();

      // Render field
      this.overlayFieldContainer.set('innerHTML', '');
      field = new Y.inputEx(conf);
      field.setValue(value);
      field.focus();

      this._inplaceeditCell = {
         record: record,
         key: column.key,
         field: field,
         td: td
      };
   },


   _initInplaceOverlay: function() {

      var o = new Y.Overlay({
            zIndex: 5
          }),
          contentBox = o.get('contentBox'),
          overlayFieldContainer = Y.Node.create("<div />"),
          saveButton,
          cancelButton;

      contentBox.appendChild(overlayFieldContainer);
      this.overlayFieldContainer = overlayFieldContainer;

      // Overlay save and cancel buttons
      saveButton = Y.Node.create('<button>Sauver</button>');
      contentBox.appendChild(saveButton);
      cancelButton = Y.Node.create('<button>Annuler</button>');
      contentBox.appendChild(cancelButton);
      saveButton.on('click', this.onOverlaySave, this);
      cancelButton.on('click', this.onOverlayCancel, this);

      // Close overlay if click outside of the overlay
      this.docClickHandler = Y.on('click', Y.bind(function(e) {
         var overlay = this.get('inplaceOverlay');

         if( overlay.get('visible') && !overlay.get('boundingBox').contains(e.target) ) {
            this.onOverlaySave();
         }
      }, this), Y.config.doc);

      contentBox.addClass(this.get('host').getClassName('inplaceOverlay'));

      o.hide();
      o.render();
      return o;
   },

   onOverlaySave: function() {

      // Call the updateMethod async method
      var updateMethod = this.get('updateMethod'),
          field = this._inplaceeditCell.field,
          newValue = field.getValue(),
          record = this._inplaceeditCell.record,
          key = this._inplaceeditCell.key,
          oldValue = record.get(key),
          fieldValues = {},
          id = record.get('id'),
          host = this.get('host'),
          td = this._inplaceeditCell.td;

      if(!field.validate()) {
         return;
      }

      // has not changed => don't do anything
      if(   (Y.Lang.isDate(newValue) && Y.Lang.isDate(oldValue) && newValue.getTime() === oldValue.getTime() ) ||
            (newValue === oldValue) ) {
         this.get('inplaceOverlay').hide();
         return;
      }

      fieldValues[key] = newValue;

      td.addClass( host.getClassName('cell-edited') );

      updateMethod.call(this, id, fieldValues, Y.bind(function(success) {
         if (success) {
            // on success, update the record in the datatable
            host.get("data").getById(id).setAttrs(fieldValues);
            td.removeClass( host.getClassName('cell-edited') );
         }
      },this));

      this.get('inplaceOverlay').hide();
   },

   onOverlayCancel: function() {
      this.get('inplaceOverlay').hide();
   },

   /**
    * add Attributes on the data model depending on the plugin configuration
    *
    * @method enrichData
    */
   enrichData: function () {

      var that = this,
          data = this.get("host").get("data");

      data.each(function (model) {
         if(!this.get("disableModifyFunc")) {
            that.addModifyAttr(model);
         }
         if(!this.get("disableDeleteFunc")){
            that.addDeleteAttr(model);
         }
      });

   },

   /**
    * add Columns on the DataTable depending on the plugin configuration
    *
    * @method enrichColumns
    */
   enrichColumns: function () {

      if(!this.get("disableModifyFunc")) {
         this.addModifyColumn();
      }
      
      if(!this.get("disableDeleteFunc")) {
         this.addDeleteColumn();
      }
   },

   /**
    * Provide the add button in order to add record on the DataTable
    *
    * @method addAddButton
    */
   addAddButton: function() {

      if(!this.get("disableAddFunc")) {
      
         var buttonHtml = "<button>"+this.get("strings").addButtonText+"</button>",
             button = Y.Node.create(buttonHtml),
             panel = this.get("panel");

         this.addButton = button;

         this.get("host").get("contentBox").append(button);
         
         button.on("click", function(e) {
            
            e.stopPropagation();

            panel.set("headerContent",this.get("strings").addItemHeader);
            panel.get("field").clear();
            panel.show();
         },this);
      }
   
   },

   /**
    *
    * @method modifyRecord
    */
   modifyRecord: function(e) {
      
      e.stopPropagation();
      
      var record = this.get("host").getRecord(e.currentTarget),
          panel = this.get("panel");

      panel.set("headerContent",this.get("strings").modifyItemHeader);
      panel.get('field').setValue(record.getAttrs());
      panel.show();
   },

   /**
    * Called when the user clicked on a link to delete a record
    * @method deleteRecord
    */
   deleteRecord: function(e) {
      e.stopPropagation();
      var deleteMethod,
          host = this.get('host'),
          record = host.getRecord(e.currentTarget),
          row;
      if (!this.get("confirmDelete") || confirm(this.get("strings").confirmDeletion)) {

         // Call the deleteMethod async method
         deleteMethod = this.get('deleteMethod');

         row = host.getRow(record);
         row.addClass( host.getClassName('row-edited') );

         deleteMethod.call(this, record, Y.bind(function(success) {
            if (success) {
               // on success, remove the record from the datatable
               host.get("data").remove(record);
            }
         },this));

      }
   },

   /**
    *
    * @method deleteExtraColumns
    */
   deleteExtraColumns: function() {
      
      if(!this.get("disableModifyFunc")) {
         this.removeModifyColumn();
      }
      if(!this.get("disableDeleteFunc")) {
         this.removeDeleteColumn();
      }
   },

   /**
    *
    * @method _initPanel
    * @private
    */
   _initPanel: function () {

      var panel = new Y.inputEx.Panel({
         centered: true,
         width: 500,
         modal: true,
         zIndex: 5,
         visible: false,
         inputEx: this.get("inputEx"),
         buttons: [
            {
               value: this.get("strings").cancelText,
               action: Y.bind(this.onPanelCancelButton, this)
            },
            {
               value: this.get("strings").saveText,
               action: Y.bind(this.onPanelSaveButton, this)
            }
         ]
      });

      // first the panel needs to be "render" then "show"
      panel.render();
      return panel;
   },

   onPanelCancelButton: function (e) {
      e.preventDefault();
      this.get('panel').hide();
   },

   onPanelSaveButton: function (e) {
      e.preventDefault();

      var field = this.get("panel").get("field"),
         fieldValues = field.getValue(),
         host = this.get("host"),
         record,
         RecordType,
         updateMethod,
         row,
         addMethod;

      if (!field.validate()) {
         return;
      }

      // Modification
      if (fieldValues.id) {

         // Call the updateMethod async method
         updateMethod = this.get('updateMethod');

         record = host.get("data").getById(fieldValues.id);
         row = host.getRow(record);
         row.addClass( host.getClassName('row-edited') );

         updateMethod.call(this, fieldValues.id, fieldValues, Y.bind(function(success) {
            if (success) {
               // on success, update the record in the datatable
               host.get("data").getById(fieldValues.id).setAttrs(fieldValues);
               this.get('panel').hide();
               row.removeClass( host.getClassName('row-edited') );
            }
         },this));

      }
      // Creation
      else {

         fieldValues.id = this.generateId(this.get("idSize"));
         RecordType = host.get("recordType");
         record = new RecordType();
         record.setAttrs(fieldValues);
         this.addModifyAttr(record);
         this.addDeleteAttr(record);

         // call the async method to create a record
         addMethod = this.get('addMethod');
         addMethod.call(this, record, Y.bind(function(success) {
            if (success) {
               // if success, add the record in the datatable
               host.get("data").add(record);
               this.get('panel').hide();
            }
         },this));

      }

   },

   /**
    *
    * @method destructor
    */
   destructor: function() {

      var that = this,
          host = this.get('host'),
          data = host.get("data");

      data.each(function (model) {

         if(!this.get("disableModifyFunc")) {
            that.delModifyAttr(model);
         }
         if(!this.get("disableDeleteFunc")) {
            that.delDeleteAttr(model);
         }

      });
      
      this.deleteExtraColumns();
      
      if(!this.get("disableAddFunc")) {
         this.addButton.remove();
      }

      if(this.get("inplaceedit")) {
         host.get('contentBox').removeClass( host.getClassName('inplaceedit') );
         this.cellClickHandler.detach();

         if (this.docClickHandler) {
            this.docClickHandler.detach();
         }
      }

      this.get("panel").destroy();
   },


   /**
    * Add the modify attribute on the data model
    *
    * @method addModifyAttr
    */
   addModifyAttr: function(model) {
      model.addAttr("modify");
   },

   /**
    * Add the delete attribute on the data model
    *
    * @method addDeleteAttr
    */
   addDeleteAttr: function (model) {
      model.addAttr("delete");
   },

   /**
    * Remove the modify attribute from the data model
    *
    * @method delModifyAttr
    */
   delModifyAttr: function(model) {
      model.removeAttr("modify");
   },

   /**
    * Remove the modify attribute from the data model
    *
    * @method delDeleteAttr
    */
   delDeleteAttr: function (model) {
      model.removeAttr("delete");
   },

   /**
    * Add the modify column on the DataTable
    *
    * @method addModifyColumn
    */
   addModifyColumn: function() {

      var host = this.get('host');
         
      host.addColumn({
         label: ' ',
         key: this.get("strings").modifyText,
         className: host.getClassName('cell-modify'),
         formatter: this.get('modifyColumnFormatter')
      });

   },
   
   /**
    * Add the delete column on the DataTable
    *
    * @method addDeleteColumn
    */
   addDeleteColumn: function() {
      
      var host = this.get('host');
         
      host.addColumn({
         label: ' ',
         key: this.get("strings").deleteText,
         className: host.getClassName('cell-delete'),
         formatter: this.get('deleteColumnFormatter')
      });
   },

   /**
    * Remove the modify column from the DataTable
    *
    * @method removeModifyColumn
    */
   removeModifyColumn: function() {
      this.get("host").removeColumn("modify");
   },

   /**
    * Remove the delete column from the DataTable
    *
    * @method removeDeleteColumn
    */
   removeDeleteColumn: function() {
      this.get("host").removeColumn("delete");
   },


   generateId : function(size) {
      var prefixId = this.get("prefixId"),
          s = size ? size : 5;
      prefixId = prefixId ? prefixId : "";
      return prefixId + Math.floor(Math.random()*Math.pow(10,s));
   },
   
   _initStrings : function() {
      return Y.Intl.get("inputex-datatable");
   }

}, {

/**
 * Static property used to define the default attribute configuration of
 * the Plugin.
 *
 * @property ATTRS
 * @type {Object}
 * @static
 */
ATTRS: {

   /**
    * This is an inputEx field definition. This is used when a user try to create/modify a record
    *
    * @attribute inputEx
    */
   inputEx: {},


   /**
    * This string is inserted before the generated id
    *
    * @attribute prefixId
    * @type String
    * @example prefixId : "po-" --> id = po-1342561
    */
   prefixId: {
     value: ""
   },

   /**
    * This represents the number of digits used in the id generation
    *
    * @attribute idSize
    * @type Number
    */
   idSize: {
     value: 5
   },

   /**
    * If true the add functionality is disabled
    *
    * @attribute disableAddFunc
    * @type boolean
    */
   disableAddFunc: {
     value: false
   },

   /**
    * If true the modify functionality is disabled
    * @attribute disableModifyFunc
    * @type boolean
    */
   disableModifyFunc: {
     value: false
   },

   /**
    * If true the delete functionality is disabled
    *
    * @attribute disableDeleteFunc
    * @type boolean
    */
   disableDeleteFunc: {
     value: false
   },

   /**
    * Labels of the plugin
    *
    * @attribute modifyColumnLabel
    */
   strings : {
     value : null,
     valueFn : '_initStrings'
   },

   /**
    * If true a confirmation will be asked to the user when a delete attempt appear
    *
    * @attribute confirmDelete
    * @type boolean
    */
   confirmDelete: {
     value: true
   },

   /**
    * This panel will be displayed on record creation/modication
    * @attribute panel
    * @type Y.inputEx.Panel
    */
   panel: {
     valueFn: '_initPanel',
     lazyAdd: true
   },


   /**
    * Set to true if you want to activate in-cell editing (ALPHA)
    * @attribute inplaceedit
    * @atype boolean
    */
   inplaceedit: {
      value: false
   },

   /**
    * Overlay used for the inplace editing
    * @attribute inplaceOverlay
    * @type Y.Overlay
    */
   inplaceOverlay: {
     valueFn: '_initInplaceOverlay',
     lazyAdd: true
   },

   /**
    * Function used to confirm the creation of a new record.
    * You can perform validation and/or ajax creation.
    * addMethod must be a function(record, cb) which calls 'cb' with success status as first argument
    * @attribute addMethod
    * @type function
    */
   addMethod: {
      value: function(record, cb) {
         cb(true);
      }
   },

   /**
    * Function used to confirm the modification of an existing record.
    * You can perform validation and/or ajax update.
    * updateMethod must be a function(id, newValues, cb) which calls 'cb' with success status as first argument
    * @attribute updateMethod
    * @type function
    */
   updateMethod: {
      value: function(id, newValues, cb) {
         cb(true);
      }
   },

   /**
    * Function used to confirm the deletion of an existing record.
    * You can perform validation and/or ajax deletion.
    * deleteMethod must be a function(record, cb) which calls 'cb' with success status as first argument
    * @attribute deleteMethod
    * @type function
    */
   deleteMethod: {
      value: function(record, cb) {
         cb(true);
      }
   },


   modifyColumnFormatter: {
      value: null
   },

   deleteColumnFormatter: {
      value: null
   }


}

});


}, '@VERSION@', {
    "requires": [
        "inputex-group",
        "inputex-panel",
        "datatable",
        "overlay",
        "intl"
    ],
    "skinnable": true,
    "lang": [
        "en",
        "fr",
        "de",
        "ca",
        "es",
        "fr",
        "it",
        "nl"
    ]
});
