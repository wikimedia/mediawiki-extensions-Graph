<?php
/**
 * ResourceLoader module providing extra data to the client-side.
 *
 * @file
 * @ingroup Extensions
 */

namespace Graph;

use ResourceLoader;
use ResourceLoaderContext;
use ResourceLoaderModule;

class DataModule extends ResourceLoaderModule {

	protected $targets = [ 'desktop', 'mobile' ];

	public function getScript( ResourceLoaderContext $context ) {
		$config = $context->getResourceLoader()->getConfig();
		return ResourceLoader::makeConfigSetScript( [
			'wgGraphAllowedDomains' => $config->get( 'GraphAllowedDomains' ),
			'wgGraphIsTrusted' => $config->get( 'GraphIsTrusted' ),
		] );
	}

	public function enableModuleContentVersion() {
		return true;
	}
}
