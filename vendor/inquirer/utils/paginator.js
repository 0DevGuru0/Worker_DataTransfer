'use strict'
/*
 * The paginator keeps track of a pointer index in a list and returns
 * a subset of the choices if the list is too long.
 */
const _ = require('lodash');
const col = require('chalk');

class Paginator {
    constructor(screen){
        this.pointer    = 0;
        this.lasIndex   = 0;
        this.screen     = screen;
    }
    paginate(output,active,pageSize){
        pageSize = pageSize || 15;
        let middleOfList = Math.floor(pageSize/2);
        let lines = output.split('\n');

        if(this.screen){
            lines = this.screen.breakLines(lines);
            active = _.sum(lines.map(lineParts=>lineParts.length).splice(0,active));
            lines = _.flatten(lines);
        }

        if(lines.length <= pageSize) return output;

        if(
            this.pointer < middleOfList 
            && this.lasIndex < active 
            && active - this.lasIndex < pageSize
        ){ this.pointer = Math.min(middleOfList,this.pointer + active - this.lasIndex) }
        
        this.lasIndex = active;
        // let infinite  = _.flatten([lines,lines,lines]);
        let infinite  = _.flatten([lines]);
        let topIndex  = Math.max(0, active + lines.length - this.pointer );
        
        // let section = infinite.splice(topIndex,pageSize).join('\n');
        let section = infinite.join('\n');
        return section + '\n' + col.dim('(Move up and down to reveal more choices)');
    }
}

module.exports = Paginator;