MediaWiki Limn
==============

Zurich Hackathon.
Limn is a MediaWiki extension that uses Vega JS to visualize almost arbitrary data in almost arbitrary ways.

To install:

* requires JsonConfig extension
* add to your LocalSettings.php:

```
require_once("$IP/extensions/JsonConfig/JsonConfig.php");
require_once("$IP/extensions/Limn/Limn.php");

// To use limn as a tag, enable it with
$wgEnableLimnParserTag = true;
// Allows <limn>{...}</limn> in wiki markup

// To use it on a standalone page, enable it via $wgJsonConfigs
// https://www.mediawiki.org/wiki/Extension:JsonConfig
$wgJsonConfigModels['limn.jsonconfig'] = 'limn\Content';
$wgJsonConfigs['limn.jsonconfig'] = array(
	'namespace' => <PICK-A-NS-NUMBER>,
	'nsName' => 'Limn',
	'isLocal' => true,
);

```
