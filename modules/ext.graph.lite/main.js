const d3 = require( '../../lib/d3.js' );
// Make D3 global
window.d3 = d3;

function loadGraph( el ) {
	const vg = require( '../../lib/vega2/vega.js' );
	const specs = mw.config.get( 'wgGraphSpecs' );
	const id = el.dataset.graphId;
	const graph = id && specs[ id ];
	if ( !graph ) {
		return Promise.reject( `Graph: Unable to find graph with id ${id}` );
	} else if ( graph.signals ) {
		return Promise.reject( 'Graphs using signals key are not currently supported.' );
	} else {
		return new Promise( ( resolve, reject ) => {
			vg.parse.spec( graph, function ( error, chart ) {
				if ( !error ) {
					try {
						chart( { el } ).update();
						return resolve();
					} catch ( e ) {
						// Graphs come from user generated content and may contain errors.
						// When these occur, log them, but do not send them to Wikimedia servers (T274557)
						reject( `Error loading graph with data-graph-id=${id}:${e}` );
					}
				} else {
					reject( error );
				}
			} );
		} );
	}
}

module.exports = loadGraph;
