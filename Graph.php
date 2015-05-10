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

/** @var false|string[] $wgGraphUrlBlacklist a list of regular expressions (JavaScript regex)
 * All data URLs will be matched against this list, and the URL will be used only
 * if it does not match any of the given regexes.
 */
$wgGraphUrlBlacklist = false;

/** @var bool $wgGraphIsTrusted if false, passes Treat-as-Untrusted:1 header with all graph data requests
 */
$wgGraphIsTrusted = false;

/** @var string|false $wgGraphImgServiceUrl A format string to form a backend service request for the img.
 * For example:
 *    $wgGraphImgServiceUrl = "//graphoid.wikimedia.org/%1\$s/v1/png/%2\$s/%3\$s/%4\$s.png";
 * Which would produce this URL:
 *    //graphoid.wikimedia.org/mediawiki.org/v1/png/Extension:Graph/0/be66c7016b9de3188ef6a585950f10dc83239837.png
 *    /{domain}/v1/png/{title}/{revid}/{hash}.png
 * Parameters will be supplied in this order: 1=server, 2=title, 3=revid, 4=graph-hash-id
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
    'dependencies' => array(
        'mediawiki.Uri',
    ),
) + $extGraphBoilerplate;

$wgResourceModules['ext.graph.editor'] = array(
    'scripts' => array(
        'js/graph.editor.js',
    )
) + $extGraphBoilerplate;

unset( $extGraphBoilerplate );
