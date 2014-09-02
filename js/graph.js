( function( $ ) {
    function parse(spec, el) {
        vg.parse.spec(spec, function(chart) { chart({el:el}).update(); });
    }
    $( function() {
	    vg.config.domainWhiteList = mw.config.get('graphDataDomains');
	    if (vg.config.domainWhiteList) {
		    vg.config.safeMode = true;
	    }
	    $('.mw-wiki-graph').each(function () {
		    var definition = $(this).data('spec');
		    parse(definition, this);
	    });
    });
} ( jQuery ) );
