( function( ) {
    var definition = mw.config.get( 'extWikiVizCurrentViz' );
    function parse(spec) {
        vg.parse.spec(spec, function(chart) { chart({el:'#mw-wiki-viz-main'}).update(); });
    }
    parse(definition);
} ( ) );
