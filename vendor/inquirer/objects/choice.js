'use strict'
let _ = require('lodash')

/**
 * Choice object
 * Normalize input as choice object
 * @constructor
 * @param {Number|String|Object} val  Choice value. If an object is passed, it should contains
 *                                    at least one of `value` or `name` property
 */

module.exports = class Choice{
    constructor(val,answers){
        if(val instanceof Choice || val.type === 'separator') return val;
        
        if(_.isString(val) || _.isNumber(val)){
            this.name = String(val);
            this.value = val;
            this.short = String(val);
        }else{
            _.assignIn(this,val,{
                name: val.name || val.value,
                value: ( 'value' in val ) ? val.value : val.name,
                short: val.short || val.name || val.value
            })
        }
        this.disabled = _.isFunction(val.disabled)
            ? val.disabled(answers)
            : val.disabled ; 
    }
}