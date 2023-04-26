const d3 = require( '../../lib/d3.js' );
const mapSchema = require( './mapSchema.js' );
// Make D3 global
window.d3 = d3;

/**
 * Render a graph in the provided element
 *
 * @param {HTMLElement} el
 * @param {Object} [graphSpec] if not defined, wgGraphSpecs will be consulted
 *  using the data-graph-id attribute on the element.
 * @return {Promise<{VEGA_VERSION:string,vega:vega,vegaSpec:Object,view:vega.View},Error>}
 *  a promise with the vega view and other information. The object the promise resolves to is
 *  in line with the Vega editor's VEGA_DEBUG.
 */
function loadGraph( el, graphSpec ) {
	const vg = require( '../../lib/vega5/vega.js' );
	const specs = mw.config.get( 'wgGraphSpecs' );
	const id = el.dataset.graphId || 'unknown-graph';
	const graph = graphSpec || specs[ id ];
	if ( !graph ) {
		return Promise.reject( `Graph: Unable to find graph with id ${id}` );
	} else {
		return new Promise( ( resolve, reject ) => {
			try {
				const spec = mapSchema( graph );
				const runtime = vg.parse( spec );
				const view = new vg.View( runtime )
					.initialize( el )
					.run();
				// Remove style attribute and rely on height:auto to enable responsive sizing
				el.style.height = null;
				resolve( {
					VEGA_VERSION: vg.version,
					vega: vg,
					vegaSpec: spec,
					view: view
				} );
			} catch ( e ) {
				reject( {
					graphId: id,
					exception: e
				} );
			}
		} );
	}
}

module.exports = {
	loadGraph,
	mapSchema
};
