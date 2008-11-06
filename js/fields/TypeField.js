(function() {

   var inputEx = YAHOO.inputEx, Event = YAHOO.util.Event, Dom = YAHOO.util.Dom, lang = YAHOO.lang;

/**
 * @class TypeField is a field to create fields. The user can create any value he wants by switching fields.
 * @extends inputEx.Field
 * @constructor
 * @param {Object} options  Standard inputEx inputParams definition
 */
inputEx.TypeField = function(options) {
   inputEx.TypeField.superclass.constructor.call(this, options);
};

lang.extend(inputEx.TypeField, inputEx.Field, 
/**
 * @scope inputEx.TypeField.prototype   
 */   
{
   
   /**
    * Render the TypeField: create a button with a property panel that contains the field options
    */
   renderComponent: function() {
      // DIV element to wrap the Field "default value"
      this.fieldValueWrapper = inputEx.cn('div', {className: "inputEx-TypeField-FieldValueWrapper"});
      this.fieldContainer.appendChild( this.fieldValueWrapper );
      
      // Render the popup that will contain the property form
      this.propertyPanel = inputEx.cn('div', {className: "inputEx-TypeField-PropertiesPanel"}, {display: 'none'});
      
      // The list of all inputEx declared types to be used in the "type" selector
      var selectOptions = [];
      for(var key in inputEx.typeClasses) {
         if(inputEx.typeClasses.hasOwnProperty(key)) {
            selectOptions.push( key );  
         }
      }
      this.typeSelect = new inputEx.SelectField({label: "Type", selectOptions: selectOptions, selectValues: selectOptions, parentEl: this.propertyPanel});

      // DIV element to wrap the options group
      this.groupOptionsWrapper = inputEx.cn('div');
      this.propertyPanel.appendChild( this.groupOptionsWrapper );
      
      // Button to switch the panel
      this.button = inputEx.cn('div', {className: "inputEx-TypeField-EditButton"});
      this.button.appendChild(this.propertyPanel);
      this.fieldContainer.appendChild(this.button);
      
      // Build the groupOptions
      this.rebuildGroupOptions();
   },
   
   /**
    * Adds 2 event listeners: 
    *  - on the button to toggel the propertiesPanel
    */
   initEvents: function() {
      inputEx.TypeField.superclass.initEvents.call(this); 
      
      // "Toggle the properties panel" button :
      Event.addListener(this.button, 'click', this.onTogglePropertiesPanel, this, true);
      
      // Prevent the button to receive a "click" event if the propertyPanel doesn't catch it
      Event.addListener(this.propertyPanel, 'click', function(e) { Event.stopPropagation(e);}, this, true);
      
      // Listen the "type" selector to update the groupOptions
      // Hack the type selector to rebuild the group option
      this.typeSelect.updatedEvt.subscribe(this.rebuildGroupOptions, this, true);
   },
   
   /**
    * Regenerate the property form
    */
   rebuildGroupOptions: function() {
      try {
         // Close a previously created group
         if(this.group) {
            this.group.close();
            this.group.destroy();
            this.groupOptionsWrapper.innerHTML = "";
         }
      
         // Get value is directly the class !!
         var classO = inputEx.getFieldClass(this.typeSelect.getValue());
         
         // Instanciate the group
         var groupParams = {fields: classO.groupOptions, parentEl: this.groupOptionsWrapper};
         this.group = new inputEx.Group(groupParams);
         
         // Register the updated event
         this.group.updatedEvt.subscribe(this.onChangeGroupOptions, this, true);
            
         // Create the value field
         this.updateFieldValue();
         
      } catch(ex) {
         console.log("Error while rebuilding the groupOptions", ex);
      }
         
   },
   
   /**
    * Toggle the property panel
    */
   onTogglePropertiesPanel: function() {
      this.propertyPanel.style.display = (this.propertyPanel.style.display == 'none') ? '' : 'none';
   },
   
   /**
    * Update the fieldValue with the changed properties
    */
   onChangeGroupOptions: function() {
      
      // Update the field value 
      this.updateFieldValue();
      
      // Fire updatedEvt
      this.fireUpdatedEvt();
   },
   
   /**
    * Update the fieldValue
    */
   updateFieldValue: function() {
      try {
         // Close previous field
         if(this.fieldValue) {
            this.fieldValue.close();
            this.fieldValue.destroy();
            this.fieldValue = null;
            this.fieldValueWrapper.innerHTML = '';
         }
      
         // Re-build the fieldValue
         var fieldOptions = { type: this.getValue().type, inputParams: this.group.getValue() };
         fieldOptions.inputParams.parentEl = this.fieldValueWrapper;
         this.fieldValue = inputEx(fieldOptions);
      
         // Refire the event when the fieldValue is updated
         this.fieldValue.updatedEvt.subscribe(this.fireUpdatedEvt, this, true);
      }
      catch(ex) {
         console.log("Error while updateFieldValue", ex.message);
      }
   },
   
   
   /**
    * Set the value of the label, typeProperties and group
    * @param {Object} value Type object configuration
    * @param {boolean} [sendUpdatedEvt] (optional) Wether this setValue should fire the updatedEvt or not (default is true, pass false to NOT send the event)
    */
   setValue: function(value, sendUpdatedEvt) {
      
      // Set type in property panel
      this.typeSelect.setValue(value.type, false);
      
      // Rebuild the panel propertues
      this.rebuildGroupOptions();
      
      // Set the parameters value
      this.group.setValue(value.inputParams, false);
      
	   if(sendUpdatedEvt !== false) {
	      // fire update event
         this.fireUpdatedEvt();
      }
   },
   
   /**
    * Return the config for a entry in an Group
    * @return {Object} Type object configuration
    */
   getValue: function() {
      var obj = { 
         // The field type
         type: this.typeSelect.getValue(),
         
         // The field parameters
         // TODO: don't return the default values !!!
         inputParams: this.group.getValue()
      };
      
      // The value defined by the fieldValue
      if(this.fieldValue) obj.inputParams.value = this.fieldValue.getValue();
      
      return obj;
   }
   
});


/**
 * Register this class as "select" type
 */
inputEx.registerType("type", inputEx.TypeField);





/**
 * group Options for each field
 */
inputEx.Field.groupOptions = [
   { type: "string", inputParams:{label: "Label", name: "label", value: ''} },
   { type: "string", inputParams:{label: "Name", name: "name", value: ''} },
   { type: "string", inputParams: {label: "Description",name: "description", value: ''} },
   { type: "boolean", inputParams: {label: "Required?",name: "required", value: false} },
   { type: "boolean", inputParams: {label: "Show messages",name: "showMsg", value: false} }
];

inputEx.StringField.groupOptions = inputEx.StringField.superclass.constructor.groupOptions.concat([
    { type: 'string',  inputParams: { label: 'Type invite', name: 'typeInvite', value: ''}},
    { type: 'integer', inputParams: { label: 'Size', name: 'size', value: 20}},
    { type: 'integer', inputParams: { label: 'Min. length', name: 'minLength', value: 0}}
]);


if(inputEx.CheckBox) {
   inputEx.CheckBox.groupOptions = inputEx.CheckBox.superclass.constructor.groupOptions.concat([ 
      {type: 'string', inputParams: {label: 'Label', name: 'rightLabel'} } 
   ]);
}

if(inputEx.ColorField) {
   inputEx.ColorField.groupOptions = inputEx.ColorField.superclass.constructor.groupOptions.concat([]);
}

if(inputEx.DateField) {
   inputEx.DateField.groupOptions = inputEx.DateField.superclass.constructor.groupOptions.concat([
      {type: 'select', inputParams: {label: 'Date format', name: 'dateFormat', selectOptions: ["m/d/Y", "d/m/Y"], selectValues: ["m/d/Y", "d/m/Y"] } }
   ]);
}

if(inputEx.CombineField) {
   inputEx.CombineField.groupOptions = inputEx.CombineField.superclass.constructor.groupOptions.concat([
      { type: 'list', inputParams: {name: 'fields', label: 'Elements', required: true, elementType: {type: 'type'} } },
      { type: 'list', inputParams: {name: 'separators', label: 'Separators', required: true } }
   ]);
}

if(inputEx.PairField) {
   inputEx.PairField.groupOptions = inputEx.Field.groupOptions.concat([
      { type: 'type', inputParams: {label: 'Left field', name: 'leftFieldOptions', required: true} },
      { type: 'type', inputParams: {label: 'Right field', name: 'rightFieldOptions', required: true} }
   ]);
}

if(inputEx.EmailField) {
   inputEx.EmailField.groupOptions = ([]).concat(inputEx.StringField.groupOptions);
}

if(inputEx.IPv4Field) {
   inputEx.IPv4Field.groupOptions = [];
}

if(inputEx.PasswordField) {
   inputEx.PasswordField.groupOptions = inputEx.PasswordField.superclass.constructor.groupOptions.concat([
      {type: 'boolean', inputParams: {label: 'Strength indicator', name: 'strengthIndicator', value: false} },
      {type: 'boolean', inputParams: {label: 'CapsLock warning', name: 'capsLockWarning', value: false} }
   ]);
}


if(inputEx.RadioField) {
   inputEx.RadioField.groupOptions = inputEx.RadioField.superclass.constructor.groupOptions.concat([
      {type: 'list', inputParams: {label: 'Options', name: 'choices', elementType: {type: 'string'} } },
      {type: 'boolean', inputParams: {label: 'Allow custom value', name: 'allowAny'} }
   ]);
}

if(inputEx.RTEField) {
   inputEx.RTEField.groupOptions = inputEx.RTEField.superclass.constructor.groupOptions.concat([]);
}

if(inputEx.UrlField) {
   inputEx.UrlField.groupOptions = inputEx.UrlField.superclass.constructor.groupOptions.concat([
      {  type: 'boolean', inputParams: {label: 'Display favicon', name:'favicon', value: true}}
   ]);
}

if(inputEx.Textarea) {
   inputEx.Textarea.groupOptions = inputEx.Textarea.superclass.constructor.groupOptions.concat([
      { type: 'integer', inputParams: {label: 'Rows',  name: 'rows', value: 6} },
      { type: 'integer', inputParams: {label: 'Cols', name: 'cols', value: 23} }
   ]);
}
 
if(inputEx.SelectField) {
   inputEx.SelectField.groupOptions = inputEx.SelectField.superclass.constructor.groupOptions.concat([
      {  type: 'list', inputParams: {name: 'selectValues', label: 'Values', elementType: {type: 'string'}, required: true } },
      {  type: 'list', inputParams: {name: 'selectOptions', label: 'Options', elementType: {type: 'string'} } }
   ]);
}


if(inputEx.SliderField) {
   inputEx.SliderField.groupOptions = inputEx.SliderField.superclass.constructor.groupOptions.concat([
      { type: 'integer', inputParams: {label: 'Min. value',  name: 'minValue', value: 0} },
      { type: 'integer', inputParams: {label: 'Max. value', name: 'maxValue', value: 100} }
   ]);
}

if(inputEx.ListField) {
   inputEx.ListField.groupOptions = inputEx.ListField.superclass.constructor.groupOptions.concat([
      { type: 'string', inputParams: {label: 'List label', name: 'listLabel'}},
      { type: 'type', inputParams: {label: 'List element type', required: true, name: 'elementType'} }
   ]);
}
 

if(inputEx.IntegerField) {
   inputEx.IntegerField.groupOptions = inputEx.IntegerField.superclass.constructor.groupOptions.concat([
      { type: 'integer', inputParams: {label: 'Radix', name: 'radix'}}
   ]);
}

if(inputEx.NumberField) {
   inputEx.NumberField.groupOptions = inputEx.NumberField.superclass.constructor.groupOptions.concat([]);
}
 

inputEx.TypeField.groupOptions = inputEx.TypeField.superclass.constructor.groupOptions.concat([]);


inputEx.Group.groupOptions = [
   { type: 'string', inputParams: { label: 'Legend', name:'legend'}},
   { type: 'boolean', inputParams: {label: 'Collapsible', name:'collapsible', value: false}},
   { type: 'list', inputParams:{ label: 'Fields', name: 'fields', elementType: {type: 'type' } } }
];


if(inputEx.Form) {
   inputEx.Form.groupOptions = inputEx.Form.superclass.constructor.groupOptions.concat([
      {type: 'list', inputParams:{ 
         label: 'Buttons', 
         name: 'buttons', 
            elementType: {
               type: 'group', 
               inputParams: { 
                  fields: [
                     { inputParams: {label: 'Label', name: 'value'}},
                     { type: 'select', inputParams: {label: 'Type', name: 'type', selectValues:["button", "submit"]} }
                  ] 
               } 
            } 
         } 
      }
   ]);
}


if(inputEx.InPlaceEdit) {
   inputEx.InPlaceEdit.groupOptions = inputEx.InPlaceEdit.superclass.constructor.groupOptions.concat([
      { type:'type', inputParams: {label: 'Editor', name: 'editorField'} }
   ]);
}


})();