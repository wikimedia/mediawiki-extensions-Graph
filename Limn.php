<?php
/**
 * Limn extension, visualizes arbitrary datasets in arbitrary ways in MediaWiki.
 *
 * @license MIT
 * @file
 * @ingroup Extensions
 *
 * @author Dan Andreescu
 * @see DataPages.example https://github.com/wikimedia/mediawiki-extensions-examples/blob/master/DataPages/DataPages.example.php
 * @see DataPages https://github.com/wikimedia/mediawiki-extensions-examples/blob/master/DataPages/DataPages.php
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
    'name' => 'Limn',
    'author' => array(
        'Dan Andreescu',
        'Édouard Lopez'
    ),
);

// TODO: find the right range to put this namespace number in
define( 'NS_LIMN', 44 );
define( 'NS_LIMN_TALK', NS_LIMN +1 );
$wgExtraNamespaces[NS_LIMN] = "Limn";
$wgExtraNamespaces[NS_LIMN_TALK] = "Limn_talk";

$wgAutoloadClasses['LimnContentHandler'] = __DIR__ . '/includes/LimnContentHandler.php';
$wgAutoloadClasses['LimnContent'] = __DIR__ . '/includes/LimnContent.php';

// Define a constant for the identifier of our custom content model...
define( 'CONTENT_MODEL_LIMN_DATA', 'LIMN_DATA' );

// ...and register a handler for that content model.
$wgContentHandlers[CONTENT_MODEL_LIMN_DATA] = 'LimnContentHandler';

$wgNamespaceContentModels[ NS_LIMN ] = CONTENT_MODEL_LIMN_DATA;

// ResourceLoader modules
/**
 * A boilerplate for resource loader modules
 */
$extLimnBoilerplate = array(
    'localBasePath' => __DIR__,
    'remoteExtPath' => 'Limn',
    'targets' => array( 'mobile', 'desktop' ),
);

// TODO: do not minify because Resource Loader does it for me
$wgResourceModules['mediawiki.libs.d3'] = array(
    'scripts' => array(
        'resources/scripts/d3.v3.min.js',
        'resources/scripts/d3.geo.projection.min.js',
    ),
) + $extLimnBoilerplate;
$wgResourceModules['mediawiki.libs.topojson'] = array(
    'scripts' => array(
        'resources/scripts/topojson.js',
    ),
) + $extLimnBoilerplate;
$wgResourceModules['mediawiki.libs.vega'] = array(
    'dependencies' => array(
        'mediawiki.libs.d3',
        'mediawiki.libs.topojson',
    ),
    'scripts' => array(
        'resources/scripts/vega.js',
    ),
) + $extLimnBoilerplate;
$wgResourceModules['ext.limn'] = array(
    // TODO: dependencies don't work.  Symptoms:
    // * Firefox works
    // * Chrome works in debug mode
    // * Chrome does not work in production mode (debug=false)
    //'dependencies' => array(
        //'mediawiki.libs.vega',
    //),
    'scripts' => array(
        'resources/scripts/d3.v3.min.js',
        'resources/scripts/d3.geo.projection.min.js',
        'resources/scripts/topojson.js',
        'resources/scripts/vega.min.js',
        'resources/scripts/limn.js',
    ),
    'styles' => array(
        'resources/styles/common.less',
    ),
) + $extLimnBoilerplate;
