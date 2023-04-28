const mapSchema = require( '../../../modules/ext.graph.render/mapSchema.js' );
const $SCHEMA = 'https://vega.github.io/schema/vega/v5.json';
const DEFAULT_WIDTH = 500;
const DEFAULT_HEIGHT = 500;
const autosize = {
	type: 'fit',
	resize: false,
	contains: 'padding'
};

describe( 'mapSchema', () => {
	test( 'autosize parameter gets added automatically if not defined', () => {
		const customAutosize = {
			type: 'fit',
			resize: true
		};
		const schemaV2 = mapSchema( {
			version: 2
		} );
		const schemaV5 = mapSchema( {
			$schema: $SCHEMA
		} );
		const schemaCustomAutosize = mapSchema( {
			$schema: $SCHEMA,
			autosize: customAutosize
		} );

		expect( schemaV2.autosize ).toStrictEqual( autosize );
		expect( schemaV5.autosize ).toStrictEqual( autosize );
		expect( schemaCustomAutosize.autosize ).toStrictEqual( customAutosize );
	} );

	test( 'refuse to render graphs using version 1 of spec', () => {
		const schema = {
			version: 1
		};
		expect( () => mapSchema( schema ) ).toThrowError();
	} );

	test( '[data] refuse to render graphs from URLs', () => {
		const schema = {
			$schema: $SCHEMA,
			data: {
				url: 'https://vega.github.io/vega/data/wheat.json'
			}
		};
		expect( () => mapSchema( schema ) ).toThrowError();
	} );

	test( 'refuse to render old graphs using signals', () => {
		const schema = {
			version: 2,
			signals: {}
		};
		expect( () => mapSchema( schema ) ).toThrowError();
	} );

	test( 'schemas default to version 5 schema if not specified with width and height', () => {
		const schema = mapSchema( {} );
		expect( schema ).toStrictEqual( {
			$schema: $SCHEMA,
			data: [],
			width: DEFAULT_WIDTH,
			height: DEFAULT_HEIGHT,
			autosize
		} );
	} );

	test( 'schemas without axis properties can be converted', () => {
		const s = mapSchema(
			{
				version: 2,
				axes: [
					{
						type: 'x',
						scale: 'x'
					},
					{
						type: 'y',
						scale: 'y'
					}
				]
			}
		);
		expect( s.axes.encode ).toStrictEqual( undefined );
	} );
	test( '[data] integer types are mapped to number', () => {
		const schema = mapSchema( {
			data: {
				format: {
					parse: {
						x: 'integer',
						y: 'string'
					}
				}
			}
		} );
		expect( schema.data[ 0 ].format.parse ).toStrictEqual( {
			x: 'number',
			y: 'string'
		} );
	} );

	test( '[data] integer types are mapped to number in array type', () => {
		const schema = mapSchema( {
			data: [ {
				name: 'chart',
				format: {
					parse: {
						x: 'integer'
					}
				}
			} ]
		} );
		expect( schema.data[ 0 ].name ).toStrictEqual( 'chart' );
		expect( schema.data[ 0 ].format.parse ).toStrictEqual( {
			x: 'number'
		} );
	} );

	test( '[legends][width][height] no change', () => {
		const schema = mapSchema( {
			legends: [],
			height: 200,
			width: 200
		} );
		expect( schema ).toStrictEqual( {
			$schema: $SCHEMA,
			data: [],
			legends: [],
			height: 200,
			width: 200,
			autosize
		} );
	} );

	test( '[marks] properties are renamed', () => {
		const properties = {
			hover: {
				fill: {
					value: 'red'
				}
			}
		};
		const marks = [ { properties } ];
		const schema = mapSchema( { marks } );
		expect( schema.marks[ 0 ].encode ).toStrictEqual( properties );
		const schema2 = mapSchema( { marks } );
		expect( schema2.marks[ 0 ].encode ).toStrictEqual( properties );
	} );

	test( '[scales] range is mapped to scheme', () => {
		const domain = {
			data: 'chart',
			field: 'series'
		};
		const name = 'color';
		const scales = [
			{
				domain,
				type: 'ordinal',
				name,
				range: 'category10'
			}
		];
		const schema = mapSchema( { scales } );
		expect( schema.scales[ 0 ] ).toStrictEqual( {
			type: 'ordinal',
			domain,
			name,
			range: {
				scheme: 'category10'
			}
		} );
		// Also check for side effects
		const schemaNext = mapSchema( { scales } );
		expect( schemaNext.scales[ 0 ] ).toStrictEqual( {
			type: 'ordinal',
			domain,
			name,
			range: {
				scheme: 'category10'
			}
		} );
	} );

	test( '[scales] use "band" for spatial ordinal scales', () => {
		const scales = [
			{
				type: 'ordinal',
				range: 'height'
			},
			{
				type: 'ordinal',
				range: 'width'
			}
		];
		const schema = mapSchema( { scales } );
		expect( schema.scales[ 0 ] ).toStrictEqual( {
			type: 'band',
			range: 'height'
		} );
		expect( schema.scales[ 1 ] ).toStrictEqual( {
			type: 'band',
			range: 'width'
		} );
	} );

	test( '[scales] use "point" instead of point', () => {
		const scales = [
			{
				type: 'ordinal',
				range: 'width',
				point: true
			}
		];
		const schema = mapSchema( { scales } );
		expect( schema.scales[ 0 ] ).toStrictEqual( {
			type: 'point',
			range: 'width'
		} );
	} );

	test( '[scales] use ordinal for strict lookup tables', () => {
		const scales = [
			{
				type: 'ordinal'
			}
		];
		const schema = mapSchema( { scales } );
		expect( schema.scales[ 0 ].type ).toStrictEqual( 'ordinal' );
	} );

	test( '[version] ignored field', () => {
		const schema = mapSchema( { version: '1' } );
		expect( schema.version ).toBe( undefined );
	} );

	test( '[axes] type is mapped to orient and properties to encode', () => {
		const title = {
			fill: {
				value: '#54595d'
			}
		};
		const grid = {
			stroke: {
				value: '#54595d'
			}
		};
		const ticks = {
			stroke: {
				value: '#54595d'
			}
		};
		const axis = {
			strokeWidth: {
				value: 2
			},
			stroke: {
				value: '#54595d'
			}
		};
		const labels = {
			fill: {
				value: '#54595d'
			}
		};
		const properties = {
			title, grid, ticks,
			axis, labels
		};
		const encode = {
			grid: {
				update: grid
			},
			title: {
				update: title
			},
			ticks: {
				update: ticks
			},
			axis: {
				update: axis
			},
			labels: {
				update: labels
			}
		};
		const schema = mapSchema( {
			axes: [
				{
					type: 'x',
					title: 'X',
					scale: 'x',
					format: 'd',
					properties,
					grid: false
				},
				{
					type: 'y',
					title: 'Y',
					scale: 'y',
					format: 'd',
					properties,
					grid: false
				}
			]
		} );
		expect( schema.axes[ 0 ] ).toStrictEqual( {
			orient: 'bottom',
			title: 'X',
			scale: 'x',
			format: 'd',
			grid: false,
			encode

		} );
		expect( schema.axes[ 1 ] ).toStrictEqual( {
			orient: 'left',
			title: 'Y',
			scale: 'y',
			format: 'd',
			grid: false,
			encode
		} );
	} );

	test( '[scale] domains involving multiple data fields from the same table must now be listed under the "fields" property', () => {
		const scales = [
			{
				type: 'band',
				name: 'x',
				zero: false,
				domain: {
					data: 'chart',
					field: 'x'
				},
				range: 'width',
				nice: true
			}
		];
		const schema = mapSchema( { version: '2', scales } );
		expect( schema.scales[ 0 ] ).toStrictEqual( {
			type: 'band',
			name: 'x',
			domain: {
				data: 'chart',
				fields: [ 'x' ]
			},
			range: 'width'
		} );
		const schema2 = mapSchema( { version: '2', scales } );
		expect( schema2.scales[ 0 ] ).toStrictEqual( {
			type: 'band',
			name: 'x',
			domain: {
				data: 'chart',
				fields: [ 'x' ]
			},
			range: 'width'
		} );
	} );

	test( '[test.json]', () => {
		const schema2 = mapSchema( require( './test.json' ) );
		expect( schema2 ).toStrictEqual( require( './testV5.json' ) );
	} );

	test( '[marks] facets for line graphs (T335454)', () => {
		const schema = require( './T335454.json' );
		const vg = require( '../../../lib/vega/vega.js' );
		const schema2 = mapSchema( schema );
		vg.parse( schema2 ); // should not throw
		expect( schema2 ).toStrictEqual( require( './T335454-V5.json' ) );
	} );

	test( '[marks] embedded transforms and facets', () => {
		const schema = mapSchema( {
			version: 2,
			marks: [
				{
					type: 'group',
					from: {
						data: 'chart',
						// This embedded transform will become a new data
						// element with a unique name.
						transform: [
							{
								field: 'y',
								type: 'stack',
								groupby: [
									'x'
								]
							},
							// This facet will be translated, not hoisted.
							{
								groupby: [
									'series'
								],
								type: 'facet'
							}
						]
					},
					marks: [
						{}
					]
				}
			],
			data: {
				name: 'chart'
			}
		} );
		expect( schema.marks ).toStrictEqual( [ {
			type: 'group',
			// New facet definition here.
			from: {
				facet: {
					data: 'data_0',
					groupby: [ 'series' ],
					name: 'data_1'
				}
			},
			// Reference the new facet name in children.
			marks: [
				{
					from: { data: 'data_1' }
				}
			]
		} ] );
		expect( schema.data ).toStrictEqual( [ {
			name: 'chart'
		}, {
			// The embedded transform becomes a new data clause with
			// a unique name, without the facet transform.
			name: 'data_0',
			source: 'chart',
			transform: [
				{
					field: 'y',
					type: 'stack',
					groupby: [
						'x'
					],
					as: [ 'layout_start', 'layout_end' ]
				}
			]
		} ] );
	} );

	test( '[transform] stacked bar graph (T335539)', () => {
		const schema = require( './T335539.json' );
		const vg = require( '../../../lib/vega/vega.js' );
		const schema2 = mapSchema( schema );
		vg.parse( schema2 ); // should not throw
		expect( schema2 ).toStrictEqual( require( './T335539-V5.json' ) );
	} );

	test( '[marks] aggregate transform', () => {
		const schema = mapSchema( {
			version: 2,
			data: [ {
				name: 'chart'
			}, {
				name: 'stats',
				source: 'chart',
				transform: [ {
					type: 'aggregate',
					summarize: {
						y: 'sum'
					},
					groupby: [ 'x' ]
				} ]
			} ]
		} );
		expect( schema.data ).toStrictEqual( [ {
			name: 'chart'
		}, {
			// Translated aggregate clause
			name: 'stats',
			source: 'chart',
			transform: [
				{
					type: 'aggregate',
					fields: [ 'y' ],
					ops: [ 'sum' ],
					as: [ 'sum_y' ],
					groupby: [ 'x' ]
				}
			]
		} ] );
	} );

	test( '[marks] map to startAngle and endAngle', () => {
		const schema = {
			marks: [
				{
					type: 'arc',
					properties: {
						hover: {
							fill: {
								value: 'red'
							}
						},
						update: {
							fill: {
								scale: 'color',
								field: 'x'
							}
						},
						enter: {
							endAngle: {
								field: 'layout_end'
							},
							innerRadius: {
								value: 0
							},
							outerRadius: {
								value: 100
							},
							startAngle: {
								field: 'layout_start'
							},
							stroke: {
								value: 'white'
							},
							fill: {
								scale: 'color',
								field: 'x'
							},
							strokeWidth: {
								value: 1
							}
						}
					},
					from: {
						data: 'chart',
						transform: [
							{
								type: 'pie',
								field: 'y'
							}
						]
					}
				}
			]
		};
		expect( mapSchema( schema ).marks[ 0 ].encode.enter.startAngle.field ).toBe(
			'startAngle'
		);
		expect( mapSchema( schema ).marks[ 0 ].encode.enter.endAngle.field ).toBe(
			'endAngle'
		);
	} );
} );
