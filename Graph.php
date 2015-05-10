<?php
if ( function_exists( 'wfLoadExtension' ) ) {
	wfLoadExtension( 'Graph' );
	// Keep i18n globals so mergeMessageFileList.php doesn't break
	$wgMessagesDirs['Graph'] = __DIR__ . '/i18n';
	/* wfWarn(
		'Deprecated PHP entry point used for Graph extension. Please use wfLoadExtension instead, ' .
		'see https://www.mediawiki.org/wiki/Extension_registration for more details.'
	); */
	return;
} else {
	die( 'This version of the Graph extension requires MediaWiki 1.25+' );
}
