<?php
$modules = array(
	'wikiviz.scripts' => $extWikiVizBoilerplate + array(
		'scripts' => array(
            'resources/scripts/d3.v3.min.js',
            'resources/scripts/d3.geo.projection.min.js',
            'resources/scripts/topojson.js',
            'resources/scripts/vega.js',
            //'vega.min.js',
            'resources/scripts/main.js',
		),
	),
	'wikiviz.styles' => $extWikiVizBoilerplate + array(
		'styles' => array(
			'resources/styles/common.less',
		),
	),
);
$wgResourceModules = array_merge( $wgResourceModules, $modules );
