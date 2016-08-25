import Node from '../Node.js';
import spread, { isArguments } from '../../utils/spread.js';

export default class CallExpression extends Node {
	initialise ( transforms ) {
		if ( transforms.spreadRest && this.arguments.length > 1 ) {
			const lexicalBoundary = this.findLexicalBoundary();

			let i = this.arguments.length;
			while ( i-- ) {
				const arg = this.arguments[i];
				if ( arg.type === 'SpreadElement' && isArguments( arg.argument ) ) {
					this.argumentsArrayAlias = lexicalBoundary.getArgumentsArrayAlias();
				}
			}
		}

		super.initialise( transforms );
	}

	transpile ( code, transforms ) {
		if ( transforms.spreadRest && this.arguments.length ) {
			let hasSpreadElements = false;
			let context;

			const firstArgument = this.arguments[0];

			if ( this.arguments.length === 1 ) {
				if ( firstArgument.type === 'SpreadElement' ) {
					code.remove( firstArgument.start, firstArgument.argument.start );
					hasSpreadElements = true;
				}
			} else {
				hasSpreadElements = spread( code, this.arguments, firstArgument.start, this.argumentsArrayAlias );
			}

			if ( hasSpreadElements ) {
				if ( this.callee.type === 'MemberExpression' ) {
					if ( this.callee.object.type === 'Identifier' ) {
						context = this.callee.object.name;
					} else {
						context = this.findScope( true ).createIdentifier( 'ref' );
						const callExpression = this.callee.object;
						const enclosure = callExpression.findNearest( /Function/ );
						const block = enclosure ? enclosure.body.body
							: callExpression.findNearest( /^Program$/ ).body;
						const lastStatementInBlock = block[ block.length - 1 ];
						const i0 = lastStatementInBlock.getIndentation();
						code.insertRight( callExpression.start, `(${context} = ` );
						code.insertLeft( callExpression.end, `)` );
						code.insertLeft( lastStatementInBlock.end, `\n${i0}var ${context};` );
					}
				} else {
					context = 'void 0';
				}

				code.insertLeft( this.callee.end, '.apply' );

				// we need to handle `super()` different, because `SuperClass.call.apply`
				// isn't very helpful
				const isSuper = this.callee.type === 'Super';

				if ( isSuper ) {
					this.callee.noCall = true; // bit hacky...

					if ( this.arguments.length > 1 ) {
						if ( firstArgument.type !== 'SpreadElement' ) {
							code.insertRight( firstArgument.start, `[ ` );
						}

						code.insertLeft( this.arguments[ this.arguments.length - 1 ].end, ' )' );
					}
				}

				else if ( this.arguments.length === 1 ) {
					code.insertRight( firstArgument.start, `${context}, ` );
				} else {
					if ( firstArgument.type === 'SpreadElement' ) {
						code.insertLeft( firstArgument.start, `${context}, ` );
					} else {
						code.insertLeft( firstArgument.start, `${context}, [ ` );
					}

					code.insertLeft( this.arguments[ this.arguments.length - 1 ].end, ' )' );
				}
			}
		}

		super.transpile( code, transforms );
	}
}
