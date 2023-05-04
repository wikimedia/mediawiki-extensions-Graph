/* eslint-disable no-jquery/no-global-selector */
( function () {
	const isCodeEditorInstalled = mw.loader.getState( 'ext.codeEditor' ) !== null;
	let oldContent, ccw, resizeCodeEditor;
	const graph = require( 'ext.graph.render' );
	const mapSchema = graph.mapSchema;
	const loadGraph = graph.loadGraph;
	const banner = document.createElement( 'div' );
	const GRAPH_CLASS_CLICKABLE = 'mw-graph-clickable';
	const GRAPH_CLASS_ERROR = `${GRAPH_CLASS_CLICKABLE}-error`;
	// Prepopulated graph that is shown when the graph is clicked.
	const exampleGraph = {
		$schema: 'https://vega.github.io/schema/vega/v5.json'
	};

	$( function () {
		const sandbox = document.getElementById( 'mw-graph-sandbox' );
		$( sandbox ).split( {
			orientation: 'vertical',
			limit: 100,
			position: '40%'
		} );
		$( '#mw-graph-left' ).split( {
			orientation: 'horizontal',
			limit: 100,
			position: '50%'
		} );
		banner.classList.add( 'mw-message-box', 'mw-message-box-warning' );
		banner.textContent = mw.msg( 'graph-outdated-schema' );
		sandbox.classList.add( 'mw-graph-sandbox-enabled' );
	} );

	/**
	 * @type {Object} EditSession
	 * @property {() => string} getValue
	 * @property {() => void} on allows binding to change event
	 *
	 * @param {EditSession} session
	 */
	function configure( session ) {
		const $json = $( '#mw-graph-json' )[ 0 ],
			bottomPanel = $json.parentNode,
			$graph = $( '.mw-graph' ),
			$graphEl = $graph[ 0 ];

		/**
		 * Update the json panel with the mapped schema.
		 *
		 * @param {Object} graphData containing the rendered graph.
		 */
		function updateV5Schema( graphData ) {
			const mappedSchema = mapSchema( graphData );
			if ( mappedSchema.$schema !== graphData.$schema ) {
				bottomPanel.prepend( banner );
			} else if ( banner.parentNode ) {
				banner.parentNode.removeChild( banner );
			}
			$json.value = JSON.stringify( mappedSchema, null, 2 );
		}

		/**
		 * Create a callback for when the graph has successfully loaded.
		 *
		 * @param {Object} graphData containing the rendered graph.
		 * @return {Function}
		 */
		function graphLoadedCallback( graphData ) {
			return function ( vegaInfo ) {
				// graph renders successfully
				// eslint-disable-next-line mediawiki/class-doc
				$graphEl.classList.remove(
					GRAPH_CLASS_CLICKABLE, GRAPH_CLASS_ERROR
				);

				updateV5Schema( graphData );

				// Expose debug data, like https://vega.github.io/editor/ does
				window.VEGA_DEBUG = vegaInfo;
			};
		}

		/**
		 * Executes when the graph has loaded with an error.
		 *
		 * @param {Object} graphData containing the rendered graph.
		 * @return {Function}
		 */
		function graphErrorCallback( graphData ) {
			return function ( e ) {
				// eslint-disable-next-line mediawiki/class-doc
				$graphEl.classList.add( GRAPH_CLASS_ERROR );
				$json.value = '';
				if ( graphData ) {
					try {
						updateV5Schema( graphData );
					} catch ( _ignore_ ) {
						/* ignore errors */
					}
				}
				if ( e ) {
					mw.log.error( 'Error loading graph in Special:GraphSandbox', e.exception || e );
				}
			};
		}
		$graphEl.addEventListener( 'click', function () {
			if ( $graphEl.classList.contains( GRAPH_CLASS_CLICKABLE ) ) {
				loadGraph( $graphEl, exampleGraph ).then(
					graphLoadedCallback( exampleGraph ),
					graphErrorCallback( exampleGraph )
				);
			}
		} );
		if ( ccw ) {
			ccw.release();
		}
		ccw = mw.confirmCloseWindow( {
			test: function () {
				return session.getValue().length > 0;
			}
		} );

		resizeCodeEditor = function () {
			if ( $.wikiEditor !== undefined ) {
				$.wikiEditor.instances[ 0 ].data( 'wikiEditor-context' ).codeEditor.resize();
			}
		};

		// I tried to resize on $( window ).resize(), but that didn't work right
		resizeCodeEditor();

		session.on( 'change', OO.ui.debounce( function () {
			const content = session.getValue();

			if ( oldContent === content ) {
				return;
			}
			oldContent = content;
			$graph.empty();

			new mw.Api().post( {
				formatversion: 2,
				action: 'graph',
				text: content
			} ).then( function ( data ) {
				if ( session.getValue() !== content ) {
					// Just in case the content has changed since we made the api call
					return;
				}
				loadGraph( $graphEl, data.graph ).then(
					graphLoadedCallback( data.graph ),
					graphErrorCallback( data.graph )
				);
			}, function ( errCode, error ) {
				graphErrorCallback( null )( error );
			} );
		}, 300 ) );
	}
	if ( isCodeEditorInstalled ) {
		mw.loader.using( 'ext.codeEditor' ).then( () => mw.hook( 'codeEditor.configure' ).add( configure ) );
	} else {
		const textArea = document.getElementById( 'wpTextbox1' );
		configure( {
			getValue: () => textArea.value,
			on: ( eventName, method ) => {
				if ( eventName === 'change' ) {
					textArea.addEventListener( 'input', method );
				}
			}
		} );
	}

}() );
