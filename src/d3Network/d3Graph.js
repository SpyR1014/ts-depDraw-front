import {hashNodeToString} from './util/hashNode';
import * as actions from '../actions';
import * as reducers from '../reducers';

import './d3styles.css';

let d3 = require("d3");


let cola = window.cola;



module.exports = (()=> {
    /** Helper functions for display */

    // Thanks http://stackoverflow.com/a/3426956/6421793
    const strToRGB = s => {
        var hash = 0;
        for (var i = 0; i < s.length; i++) {
            hash = s.charCodeAt(i) + ((hash << 5) - hash);
        }
        var c = (hash & 0x00FFFFFF)
            .toString(16)
            .toUpperCase();

        return "#" + "00000".substring(0, 6 - c.length) + c;
    }


    /**
     * These are used to help the removal of nodes and edges.
     * They keep a modal of the state of the mutable store.
     */
    let hashNodes = [],
        hashLinks = [];
    
    const width = 900,
          height = 500;

    var svg = d3.select("#graph").append("svg")
                .attr("width", width)
                .attr("height", height)
                .attr("pointer-events", "all")
                .on("mouseenter", () => {window.cursorInD3 = true;})
                .on("mouseleave", () => {window.cursorInD3 = false;});
    
    // Define the div for the tooltip
    var div = d3.select("body").append("div")	
        .attr("class", "tooltip")
        .attr("position", "absolute")	
        .attr("display", "block")		
        .style("opacity", 0);

    /**
     * Add the arrow heads for the lines.
     */
    svg.append('svg:defs').append('svg:marker')
        .attr("id", "end-arrow")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 20)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
          .append('svg:path')
            .attr("d", "M0,-5L10,0L0,5L2,0")
            .attr("stroke-width", "0px")
            .attr("fill", "#000");

    var nodes = [],
        links = [];
    
    var simulation = cola.d3adaptor(d3)
        .avoidOverlaps(true)
        .flowLayout('x', 50)
        .jaccardLinkLengths(50)
        .handleDisconnected(false)
        .size([width, height])
        .nodes(nodes)
        .links(links)
        .on("tick", ticked);

    var g = svg.append("g"),
        link = g.append("g")
            .attr("stroke", "#bbb")
            .attr("stroke-width", 1.5)
            .selectAll(".link"),
        node = g.append("g")
            .attr("stroke", "#fff")
            .attr("stroke-width", 1.5)
            .selectAll(".node"),
        text = g.append("g")
                .attr("class", "text-label-group")
                .selectAll('.text');

    function ticked() {
            node.attr("x", d => d.x - 10)
                .attr("y", d => d.y - 5);
            text.attr("x", d => d.x - 7)
                .attr("y", d => d.y - 4);
            link.attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);
    }

    function localRemove(nodeHashToRemove){
        let i = hashNodes.indexOf(nodeHashToRemove);
        hashNodes.splice(i, 1);
        nodes.splice(i, 1);
        /**
         * Here we remove any edge that contains the node hash we are removing.
         * We mutate the links array and build up a new hash list to keep the state
         * of the mutated links array.
         */
        let _tempHashLinks = [];
        hashLinks.reduce((i, val) => {
            if (val.source === nodeHashToRemove || val.target === nodeHashToRemove){
                // Remove this edge.
                links.splice(i, 1);
                return i
            }
            _tempHashLinks.push(val)
            return i + 1
        }, 0)

        hashLinks = _tempHashLinks;
        localRestart();
        return true
    }

    function dblclickHandler(d) {
        const nodeHash = hashNodeToString(d);
        // localRemove(nodeHash);
        window.store.dispatch(actions.removeNode(nodeHash));
    }

    function localRestart(){
        
        //////////////////////////// NODE ////////////////////////////

        node = node.data(nodes, d => d.index);
        node.exit().remove();


        node = node.enter()
                .append("rect")
                .attr("fill", d => strToRGB(d.file))
                .attr("width", d => d.width)
                .attr("height", d => d.height)
                .on("mousedown", clickOnNode)
                .on("dblclick", dblclickHandler)
                .on("mouseover", function(d) {		
                    div.transition()		
                        .duration(200)		
                        .style("opacity", .9);		
                    div.html(`<span>${JSON.stringify(removeCircularReferenceNode(d))}</span>`)	
                        .style("left", (d3.event.pageX) + "px")		
                        .style("top", (d3.event.pageY - 28) + "px");	
                    })					
                .on("mouseout", function(d) {		
                    div.transition()		
                        .duration(500)		
                        .style("opacity", 0);	
                })
                .call(simulation.drag)
                .merge(node);
        

        //////////////////////////// LINK ////////////////////////////

        link = link.data(links, d => d.source.index + '-' + d.target.index);
        link.exit().remove();

        link = link.enter()
                    .append("line")
                    .attr("class", "line")
                    .merge(link);
        
        //////////////////////////// TEXT ////////////////////////////
        text = text.data(nodes, d => d.index);
        text.exit().remove();

        text = text.enter()
                    .append("text")
                    .attr("alignment-baseline", "hanging")
                    .attr("cursor", "default")
                    .attr("pointer-events", "none")
                    .text(d => d.kind[0])
                    .merge(text);




        //////////////////// RESTART SIMULATION /////////////////////

        // simulation.nodes(nodes);
        // simulation.links(links);
        simulation.start(10, 15, 20);
    }

    return {
        restart: localRestart,
        ticked: ticked,
        /**
         * Use an external hash map. Push the node object in here, but you'll
         * need a hash to remove the node.
         */
        pushNode: function(node) {
            node.width = 16;
            node.height = 16;
            nodes.push(node);
            hashNodes.push(hashNodeToString(node))
            this.restart();
        },
        /**
         * It is recommended to use an external hash map to keep track of the objects.
         * Pass them in here, and use the hash to remove them.
         */
        pushLink: function(link){
            if (hashNodeToString(link.source) === hashNodeToString(link.target)){
                return false
            }
            links.push(link);
            hashLinks.push({source: hashNodeToString(link.source),
                            target: hashNodeToString(link.target)});
            this.restart();
        },
        /**
         * links are traversed and all links with the given node hash are destroyed.
         * Try to only use removeNode.
         */
        removeLink: function(nodeHash){
            links.pop();
            this.restart();
        },
        /**
         * Pass in the hash code of the node, and it'll splice the correct one based on
         * the hashing function.
         * 
         * Returns true if everything completed successfully
         */
        removeNode: localRemove,


    }
})()


function removeCircularReferenceNode (node) {
    return {
        displayString: node.displayString,
        documentation: node.documentation,
        file: node.file,
        kind: node.kind,
        kindModifiers: node.kindModifiers,
        start: {line: node.start.line,
                offset: node.start.offset},
    }
}


function clickOnNode(d) {
    const openFile = reducers.getOpenFilename(window.store.getState());
    const codeMirror = window.myCodeMirror;
    
    window.store.dispatch(actions.focusTokenClicked(d.file,
        openFile,
        codeMirror,
        JSON.parse(JSON.stringify(d.start)),
        JSON.parse(JSON.stringify(d.end))));  
}
