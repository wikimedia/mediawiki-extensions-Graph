<?php
/**
 * Graph extension, visualizes arbitrary datasets in arbitrary ways in MediaWiki.
 *
 * @license MIT
 * @file
 * @ingroup Extensions
 *
 * @author Dan Andreescu, Yuri Astrakhan
 */

if ( !defined( 'MEDIAWIKI' ) ) {
    echo( "This file is an extension to the MediaWiki software and cannot be used on its own.\n" );
    die( 1 );
}

if ( version_compare( $wgVersion, '1.21', '<' ) ) {
    die( "This extension requires MediaWiki 1.21+\n" );
}

$wgExtensionCredits['other'][] = array(
    'path' => __FILE__,
    'name' => 'Graph',
    'author' => array( 'Dan Andreescu', 'Yuri Astrakhan' ),
    'url' => 'https://www.mediawiki.org/wiki/Extension:Graph',
);

$graphBodyFile = __DIR__ . DIRECTORY_SEPARATOR . 'Graph.body.php';
$wgAutoloadClasses['Graph\Singleton'] = $graphBodyFile;
$wgAutoloadClasses['Graph\Content'] = $graphBodyFile;
$wgAutoloadClasses['Graph\ContentView'] = $graphBodyFile;
unset( $graphBodyFile );

/**
 * @var bool Set to true to enable <graph> tag in wiki markup
 */
$wgEnableGraphParserTag = false;

/**
 * @var false|string[] a list of domains that the vega code is allowed to pull data from.
 * If false, there are no restrictions. An empty list disables any external data (inline only).
 * NOTE: Setting this value to anything other than 'false' will also enable safe mode formula/filter evaluation
 */
$wgGraphDataDomains = array();

$wgHooks['ParserFirstCallInit'][] = 'Graph\Singleton::onParserFirstCallInit';


// ResourceLoader modules
/**
 * A boilerplate for resource loader modules
 */
$extGraphBoilerplate = array(
    'localBasePath' => __DIR__,
    'remoteExtPath' => 'Graph',
    'targets' => array( 'mobile', 'desktop' ),
);

$wgResourceModules['mediawiki.libs.d3'] = array(
    'scripts' => array(
        'lib/d3.js',
        //'lib/d3.geo.projection.min.js',
    ),
) + $extGraphBoilerplate;
$wgResourceModules['mediawiki.libs.topojson'] = array(
    'scripts' => array(
        'lib/topojson.js',
    ),
) + $extGraphBoilerplate;
$wgResourceModules['mediawiki.libs.vega'] = array(
    'dependencies' => array(
        'mediawiki.libs.d3',
        'mediawiki.libs.topojson',
    ),
    'scripts' => array(
        'lib/vega.js',
    ),
) + $extGraphBoilerplate;
$wgResourceModules['ext.graph'] = array(
    // TODO: dependencies don't work.  Symptoms:
    // * Firefox works
    // * Chrome works in debug mode
    // * Chrome does not work in production mode (debug=false)
    //'dependencies' => array(
        //'mediawiki.libs.vega',
    //),
    'scripts' => array(
        'lib/d3.js',
        // 'lib/d3.geo.projection.min.js',
        'lib/topojson.js',
        'lib/vega.js',
        'js/graph.js',
    ),
    'styles' => array(
        'styles/common.less',
    ),
) + $extGraphBoilerplate;
unset( $extGraphBoilerplate );
