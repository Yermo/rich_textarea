<html>
<head>

<!--
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
* DEMO of Rich-TextArea jQuery-UI plugin replacement for HTML TEXTAREAs.
*
* @see http://a-software-guy.com/code/rich_textarea/
*/

-->

<link rel="stylesheet" type="text/css" href="../jquery-1.8.2/css/smoothness/jquery-ui-1.9.0.custom.css">

<!--
// to enable debug trace messages include this and call ddt.on() below.

<script src="ddt.js" type="text/javascript"></script>
-->

<script src="../jquery-1.8.2/js/jquery-1.8.2.js" type="text/javascript"></script>
<script src="../jquery-1.8.2/js/jquery-ui-1.9.0.custom.js" type="text/javascript"></script>

<script src="../rangy-1.3alpha.681/rangy-core.js" type="text/javascript"></script>

<script src="jquery.ui.autocomplete.html.js" type="text/javascript"></script>
<script src="jquery.rich_textarea.js" type="text/javascript"></script>

<script type="text/javascript">

//	ddt.on();

</script>

<!--
/**
* the .highlight class is applied to embedded objects when clicked on or when the cursor is 
* moved next to them primarily to let the user know that if they BACKSPACE over the object it
* will get deleted
* 
* The rest of the styles are just tweaks for this demo. 
*/
-->

<style>

.highlight
	{
	background-color: #CCCCCC;
	}

.content_entry
	{
	width: 700px;
	height: 240px;
	max-height: 240px;
	overflow: auto;
	border: #CCCCCC 1px solid;
	}

.output
	{
	width: 700px;
	height: 200px;
	border: #CCCCCC 1px solid;
	}

.dropdown
	{
	width: 30px;
	height: 18px;
	margin-right: 3px;
	}

.inline
	{
	width: 45px;
	height: 28px;
	vertical-align: middle;
	margin-right: 3px;
	}

.pirate
	{
	font-weight: bold;
	font-size: 14px;
	line-height: 28px;
	height: 28px;
	}

.pirate a
	{
	text-decoration: none;
	}

.angry
	{
	width: 150px;
	height: 136px;
	}

</style>
</head>
<body>

<h1>Rich TextArea jQuery plugin - <a href="http://a-software-guy.com/code/rich_textarea">Homepage</a></h1>

<p>This is a demonstration and test of a jQuery plugin I've built for use on
<a href="http://miles-by-motorcycle.com">Miles By Motorcycle</a> that implements a rich 
replacement for the venerable HTML TEXTAREA.</p>
<p>This is not a WYSIWYG editor. It is designed solely for plain text entry with a few 
enhancements:</p>
<ul>
<li>Supports inserting objects using @mentions, #tags or any other trigger.</li>
<li>Supports inserting objects externally (see below)</li>
<li>Supports moving over (arrow keys), clicking on, backspacing over and deleting inserted objects</li>
<li>Objects are highlighted when clicked on or moved next to using the arrow keys</li>
<li>Supports generating a plain text version with objects marked using [o= ...] notation.</li>
</ul>

<p>Click in the box below and type.</p>

<div class="content_entry" id="RICH_TEXTAREA" contenteditable="true">Click on this -&gt; @ca then on this -&gt; #ta<br>
Move the mouse around. Try entering @ mentions for blackbeard, edward or calico jack. Move the cursor around. <br>
You should be able move the cursor next to an object and have the object highlight. Press the arrow key again <br>
and it should jump over the object. Press one of the buttons below to insert a graphic. Try typing in :beer: 
or adding a link.</div>

<hr>

<button id="angrybutton">Angry</button>

<button id="mbymcbutton">MxMC</button>

<hr>

<p>After entering some content, press the Generate Text button. The value of the 
rich textarea will be displayed in the normal textarea below.</p>

<button id="button">Generate Text</button>
<br>

<textarea class="output" id="output"></textarea>

<script type="text/javascript">

	// include ddt.js above and uncomment this to turn on debugging trace messages.
	// HEADS UP: There are a ton of messages

	// ddt.on()
	
	// -------------------------------------------------------------------------------------

	/**
	* Initialize rich textarea plugin
	*
	* Currently it accepts one parameter which is an array of trigger objects.
	*
	* Each trigger object consists of:
	*
	*		trigger	a single character trigger. (e.g. #, @, ! etc)
	*
	*		callback	a callback function that accepts on parameter, a trigger word and returns
	*					a set of matches.
	*/

	$( '#RICH_TEXTAREA' ).rich_textarea(
		{	

		/**
		* trigger definitions.
		*
		* rich_textarea supports defining multiple trigger words each with their own
		* autocomplete data source callback
		*
		* It's an array of objects. Each object has keys:
		*
		*	trigger - the trigger character used to invoke the autocomplete
		*	callback - the callback to invoke once a trigger has been identified.
		*/

		triggers: [ 

			/**
			* first trigger entry
			*
			* Some sample tags.
			*/

			{
			trigger: '#',

			/**
			* generates autocomplete list for #tags
			*
			* @param {String} term #tag entered 
			* @param {Function} response jquery ui autocomplete response callback.
			*
			* @see http://api.jqueryui.com/autocomplete/#option-source
			*/

			callback: function( term, response )
				{
				ddt.log( "# callback with term '" + term + "'" );

				var tags = 
					[ 
					{ label: 'tag1', value: { value: 'tag1', content: '<span class="ui-button ui-state-default ui-widget ui-corner-all ui-button-text-only">Tag1</span>' } },
					{ label: 'tag2', value: { value: 'tag2', content: '<span class="ui-button ui-state-default ui-widget ui-corner-all ui-button-text-only">Tag2</span>' } },
					{ label: 'tag3', value: { value: 'tag3', content: '<span class="ui-button ui-state-default ui-widget ui-corner-all ui-button-text-only">Tag3</span>' } },
					{ label: 'tag4', value: { value: 'tag4', content: '<span class="ui-button ui-state-default ui-widget ui-corner-all ui-button-text-only">Tag4</span>' } }
					];

				response( $.ui.autocomplete.filter( tags, term ) );

				}	// end of callback
			},

			/**
			* second trigger entry
			*/

			{

			/**
			* the trigger character
			*/

			trigger: '@',
  			
			/**
			* generates autocomplete list for @mention
			*
			* For demonstration purposes only. In a real application this method
			* would likely do some ajax call to a server to get the autocomplete list
			* based on the term provided. 
			*
			* @param {String} term @term entered 
			* @param {Function} response jquery ui autocomplete response callback.
			*
			* @see http://api.jqueryui.com/autocomplete/#option-source
			*/

			callback: function( term, response )
				{
				ddt.log( '@ callback' );

				var tags = 
					[ 
					{ label: '<img class="dropdown" src="images/Pirate_Flag_of_Jack_Rackham.svg.png">Calico Jack Rackham', value: { value: 'pirate1', content: '<span class="pirate"><a href="http://en.wikipedia.org/wiki/Calico_Jack_Rackham"><img class="inline" src="images/Pirate_Flag_of_Jack_Rackham.svg.png">Calico Jack Rackham</a></span>' } },
					{ label: '<img class="dropdown" src="images/Flag_of_Edward_England.svg.png">Edward England', value: { value: 'pirate2', content: '<span class="pirate"><a href="http://en.wikipedia.org/wiki/Edward_England"><img class="inline" src="images/Flag_of_Edward_England.svg.png">Edward England</a></span>' } },
					{ label: '<img class="dropdown" src="images/Pirate_Flag_of_Blackbeard_(Edward_Teach).svg.png">Blackbeard Edward Teach',	value: { value: 'pirate3', content: '<span class="pirate"><a href="http://en.wikipedia.org/wiki/Blackbeard"><img class="inline" src="images/Pirate_Flag_of_Blackbeard_(Edward_Teach).svg.png">BlackBeard (Edward Teach)</a></span>' } },
					{ label: '<img class="dropdown" src="images/120px-Bartholomew_Roberts_Flag.svg.png">Bartholomew Roberts', value: { value: 'pirate4', content: '<span class="pirate"><a href="http://en.wikipedia.org/wiki/Bartholomew_Roberts"><img class="inline" src="images/120px-Bartholomew_Roberts_Flag.svg.png">Bartholomew Roberts</a></span>' } }
					];

				response( $.ui.autocomplete.filter( tags, term ) );

				}	// end of callback

			}],

		/**
		* regex definition
		*
		* regexes can be defined to invoke callbacks when the user enters certain patterns.
		*
		* callbacks are passed an object with startNode, startOffset, endNode, endOffset and word keys
		*/

		regexes: [ 

			/**
			* a beer smiley face replacement 
			*/

			{

			regex: "^:beer:$",

			callback: function( word_entry )
				{

				ddt.log( "regex: got word_entry :", word_entry );

				$( '#RICH_TEXTAREA' ).rich_textarea( 'replaceWord', word_entry, '<span><img src="images/beer-drinking-smiley.gif"></span>', 'smiley' );

				}

			},
			
			/**
			* recognize and replace URL's. 
			*
			* Could implement a Facebook/LinkedIn style URL querying ajax thing here.
			*/

			{

			regex: /^((http|https):\/\/([\-\w]+\.)+\w{2,5}(\/[%\-\w]+(\.\w{2,})?)*(([\w\-\.\?\\/+@&#;`~=%!]*)(\.\w{2,})?)*\/?)$/i,

			callback: function( word_entry )
				{

				ddt.log( "regex: got word entry:", word_entry );

				$( '#RICH_TEXTAREA' ).rich_textarea( 'replaceWord', word_entry, '<span><a href="' + word_entry.word + '">' + word_entry.word + '</a>', word_entry.word );

				}

			},
			
			/**
			* replace any #tags that have not been selected from a dropdown.
			*
			* In a real application, one might like users to add tags dynamically and not restrict them
			* only to the tags that have already been defined. If the user does not select a tag from the
			* dropdown above, this will theme the tag.
			*/

			{

			regex: "^#.+$",

			callback: function( word_entry )
				{

				ddt.log( "got word_entry:", word_entry );

				// the word will contain the # mark. 

				var word = word_entry.word.substring( 1 );

				$( '#RICH_TEXTAREA' ).rich_textarea( 'replaceWord', word_entry, '<span class="ui-button ui-state-default ui-widget ui-corner-all ui-button-text-only">' + word + '</span>', '#' + word );

				}

			}
			
			]
	
	});	// end of rich_textarea initialization

	// make the editable area has focus. (broken)
	//
	// $( '#RICH_TEXTAREA' ).rich_textarea( 'focus' );

	// demonstrate adding objects to the rich_textarea.
	//
	// parameters are content to insert ( should be wrapping a <span>) and the data-value (i.e. GUID or
	// other value) on the server that it relates to. 
	
	// button to add angry guy.

	$( '#angrybutton' ).bind( 'click', function( event )
		{

		// need this for MSIE. It loses focus when the button is pressed.

		$( '#RICH_TEXTAREA' ).focus();

		$( '#RICH_TEXTAREA' ).rich_textarea( 'insertObject', '<span><img class="angry" src="images/angry-desk-flip-l.png"></span>', 'angry' );
		});

	// button to add MxMC Logo.

	$( '#mbymcbutton' ).bind( 'click', function( event )
		{

		// need this for MSIE. It loses focus when the button is pressed.

		$( '#RICH_TEXTAREA' ).focus();

		$( '#RICH_TEXTAREA' ).rich_textarea( 'insertObject', '<span><img class="mbymc" src="images/MxMC_small.gif"></span>', 'mbymc' );
		});

	// button to get contents

	$( '#button' ).bind( 'click', function( event )
		{
		$( '#output' ).val( $( '#RICH_TEXTAREA' ).rich_textarea( 'getTextContent' ) );
		});

	</script>

</body>
</html>


