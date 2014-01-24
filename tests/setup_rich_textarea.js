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

	function setup_rich_textarea()
		{

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
						{ label: '<img class="dropdown" src="../images/Pirate_Flag_of_Jack_Rackham.svg.png">Calico Jack Rackham', value: { value: 'pirate1', content: '<span class="pirate"><a href="http://en.wikipedia.org/wiki/Calico_Jack_Rackham"><img class="inline" src="../images/Pirate_Flag_of_Jack_Rackham.svg.png">Calico Jack Rackham</a></span>' } },
						{ label: '<img class="dropdown" src="../images/Flag_of_Edward_England.svg.png">Edward England', value: { value: 'pirate2', content: '<span class="pirate"><a href="http://en.wikipedia.org/wiki/Edward_England"><img class="inline" src="../images/Flag_of_Edward_England.svg.png">Edward England</a></span>' } },
						{ label: '<img class="dropdown" src="../images/Pirate_Flag_of_Blackbeard_(Edward_Teach).svg.png">Blackbeard Edward Teach',	value: { value: 'pirate3', content: '<span class="pirate"><a href="http://en.wikipedia.org/wiki/Blackbeard"><img class="inline" src="../images/Pirate_Flag_of_Blackbeard_(Edward_Teach).svg.png">BlackBeard (Edward Teach)</a></span>' } },
						{ label: '<img class="dropdown" src="../images/120px-Bartholomew_Roberts_Flag.svg.png">Bartholomew Roberts', value: { value: 'pirate4', content: '<span class="pirate"><a href="http://en.wikipedia.org/wiki/Bartholomew_Roberts"><img class="inline" src="../images/120px-Bartholomew_Roberts_Flag.svg.png">Bartholomew Roberts</a></span>' } }
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
	
					$( '#RICH_TEXTAREA' ).rich_textarea( 'replaceWord', word_entry, '<span><img src="../images/beer-drinking-smiley.gif"></span>', 'smiley' );
	
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
	
	}	// end of setup_rich_textarea()
