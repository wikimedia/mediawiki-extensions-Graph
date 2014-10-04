( function( $ ) {
	$( function() {
		vg.config.domainWhiteList = mw.config.get('wgGraphDataDomains');
		vg.config.safeMode = vg.config.domainWhiteList !== false;
		$('.mw-wiki-graph').each(function () {
			var definition = $(this).data('spec'),
				el = this;
			vg.parse.spec(definition, function(chart) { chart({el:el}).update(); });
		});
	});
} ( jQuery ) );
