( function( $ ) {
	$( function() {
		var specs = mw.config.get('wgGraphSpecs');
		if (!specs) {
			return;
		}
		vg.config.domainWhiteList = mw.config.get('wgGraphDataDomains');
		vg.config.safeMode = vg.config.domainWhiteList !== false;
		$('.mw-wiki-graph').each(function () {
			var graphId = $(this).data('graph-id'),
				el = this;
			if (!specs[graphId]) {
				mw.log.warn(graphId);
			} else {
				vg.parse.spec(specs[graphId], function (chart) {
					chart({el: el}).update();
				});
			}
		});
	});
} ( jQuery ) );
