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
	'descriptionmsg' => 'graph-desc',
	'license-name' => 'MIT',
);

$wgMessagesDirs['Graph'] = __DIR__ . DIRECTORY_SEPARATOR . 'i18n';

$graphBodyFile = __DIR__ . DIRECTORY_SEPARATOR . 'Graph.body.php';
$wgAutoloadClasses['Graph\Singleton'] = $graphBodyFile;
$wgAutoloadClasses['Graph\Content'] = $graphBodyFile;
unset( $graphBodyFile );

/** @var false|string[] $wgGraphDataDomains a list of domains that the vega code is allowed to pull data from.
 * If false, there are no restrictions. An empty list disables any external data (inline only).
 * NOTE: Setting this value to anything other than 'false' will also enable safe mode formula/filter evaluation
 */
$wgGraphDataDomains = array();

/** @var string|false $wgGraphImgServiceUrl A format string to form a backend service request for the img.
 * For example:
 * 		/api/v1/%1$s/pages/%2$s/graph/%3$s/%4$s.png
 * 		http://graph.wmflabs.org:8080?server=%1$s&title=%2$s&revid=%3$s&id=%4$s.png
 * Parameters will be supplied in this order: server, title, revid, graph-hash-id
 * All parameters will be escaped with rawurlencode()
 * If the value is false, no <noscript> urls will be generated
 */
$wgGraphImgServiceUrl = false;

$wgHooks['ParserFirstCallInit'][] = 'Graph\Singleton::onParserFirstCallInit';
$wgHooks['EditPage::showEditForm:initial'][] = 'Graph\Singleton::editPageShowEditFormInitial';
$wgHooks['ParserAfterParse'][] = 'Graph\Singleton::onParserAfterParse';

$extGraphBoilerplate = array(
    'localBasePath' => __DIR__,
    'remoteExtPath' => 'Graph',
    'targets' => array( 'mobile', 'desktop' ),
);

$wgResourceModules['ext.graph'] = array(
    'scripts' => array(
        'lib/d3.js',
        'lib/topojson.js',
        'lib/vega.js',
        'js/graph.js',
    ),
    'styles' => array(
        'styles/common.less',
    ),
) + $extGraphBoilerplate;

$wgResourceModules['ext.graph.editor'] = array(
    'scripts' => array(
        'js/graph.editor.js',
    )
) + $extGraphBoilerplate;

unset( $extGraphBoilerplate );
