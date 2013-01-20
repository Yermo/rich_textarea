
/**
* Copyright (c) 2013 DTLink, LLC (http://www.a-software-guy.com)
*
* Permission  is  hereby  granted,  free of charge, to any person
* obtaining  a copy of this software and associated documentation
* files  (the  "Software"),  to  deal  in  the  Software  without
* restriction,  including  without  limitation the rights to use,
* copy,  modify,  merge,  publish, distribute, sublicense, and/or
* sell  copies of the Software, and to permit persons to whom the
* Software  is  furnished  to  do  so,  subject  to the following
* conditions:
*
* The  above copyright notice and this permission notice shall be
* included in all copies or substantial portions of the Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
* EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
* OF  MERCHANTABILITY,  FITNESS  FOR  A  PARTICULAR  PURPOSE  AND
* NONINFRINGEMENT.  IN  NO  EVENT  SHALL THE AUTHORS OR COPYRIGHT
* HOLDERS  BE  LIABLE  FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
* WHETHER  IN  AN  ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
* FROM,  OUT  OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
* OTHER DEALINGS IN THE SOFTWARE.
*/

/**
* console.log shim.
*
* A simple shim/hack for console.log and similar. 
*
* @copyright DTLink, LLC
* @author Yermo Lamers
* @package ddt
*
* @link http://whattheheadsaid.com/2011/04/internet-explorer-9s-problematic-console-object
*
* @todo console.log in MSIE is not a function. the bind() solution above does not work as well. Hence the kludge.
* @todo expand this out to be a real general purpose debugging shim.
*/

if ( typeof console == "undefined" )
	{
	logger = { log: function() {}, warn: function() {}, error: function() {} }; 
	}
else if ( typeof console.log == "undefined" ) 
	{
	logger = { log: function() {} }; 
	}
else 
	{
	logger = console;
	}

var ddt = 
	{

	/**
	* Turn on debugging message.
	*/

	on:

		function()
			{		
			ddt.display_messages = true;
			},

	/**
	* turn off debugging messages
	*/

	off:

		function()
			{
			ddt.display_messages = false;
			},

	/**
	* log a message to the console
	*/

	log:

		function()
			{

			if ( ddt.display_messages )
				{

				// temporary total hack. 

				if ( navigator.appName == 'Microsoft Internet Explorer' )
					{
					logger.log( ddt.stringify( arguments ) );
					}
				else
					{
					logger.log.apply( logger, arguments );
					}
				}

			},

	/**
	* log a warning to the console
	*/

	warn:

		function()
			{

			console.warn.apply( console, arguments );

			},

	/**
	* log an error to the console
	*/

	error:

		function()
			{

			console.error.apply( console, arguments );

			},

	stringify:

		function( obj )
			{
			var str = '';
			for ( var p in obj ) 
				{

				if (( typeof obj.hasOwnProperty != 'undefined' ) && ( obj.hasOwnProperty(p) ))
					{

					if ( typeof obj[p] == 'object' )
						{
						str += ddt.stringify( obj[p] );
						}
					else
						{
						str += p + '::' + obj[p] + '\n';
						}

					}
				}
			return str;
			}

	};

// END





