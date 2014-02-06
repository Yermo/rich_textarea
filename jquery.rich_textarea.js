/**
* Copyright (c) 2014 Flying Brick Software, LLC (http://www.flyingbricksoftware.com)
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

// if ddt is not included add an empty shim.

if ( typeof( ddt ) == 'undefined' )
	{
	var ddt = 
		{

		on: function() {},
		off: function() {},
		log: function() {},
		warn:	function() {},
		error: function() {}

		};

	}

// --------------------------------------------------------------

/**
* A rich textarea with tagged autocomplete. (@mention)
*
* Implements a contenteditable <div> textarea replacement with the ability 
* to include trigger character invoked in-place autocompletes. (e.g. @mentions, #tags, etc)
* in addition to defining callbacks that get triggered as the user types based on an array
* of regexes.
*
* Support is also included to add other rich text objects. Each such object
* is treated as a single character from the perspective of arrow keys, deletes, 
* backspacing, etc.
*
* USAGE:
*
* $( selector ).rich_textarea( trigger_definitions, regex_definitions )
*
* where: 
*
* 	trigger_definitions is an array of objects.
*
*	Each object has keys:
*
*		trigger:		single trigger character that marks the start of a trigger word. (e.g. @, #, etc)
*		callback:	callback invoked on autocomplete. It expects two parameters, the string that
*						triggered the autocomplete and the autcomplete response callback to pass the 
*						autocompletions to per jQuery autocomplete docs. {@link http://api.jqueryui.com/autocomplete/#option-source}
*
*	regex_definitions is an array of objects
*
*		regex:		regular expression to match againt words entered into the area
*		callback:	callback to execute is a patten is matched. Accepts a word_entry object as a 
*						parameter which include startNode, startOffset, endNode, endOffset and word keys.
*
* NOTE: The current version normalizes all browsers to use <BR> for newlines. There is still code left over from the previous
* NOTE: attempt to handle each browser types idiosyncracies. See comments in code.
*
* @author <a href="http://miles-by-motorcycle.com/yermo">Yermo Lamers</a>, Co-Founder, Flying Brick Software, LLC
*
* @copyright Flying Brick Software, LLC
* @license MIT License http://www.opensource.org/licenses/mit-license.php
*
* @version 2014-01 Alpha 2
*
* @see https://github.com/Yermo/rich_textarea
*
* @see http://miles-by-motorcycle.com/static/rich_textarea/index.html
*
* @see http://api.jqueryui.com/jQuery.widget/
*
* @see http://miles-by-motorcycle.com/fv-b-8-664/the-richtextarea-jquery-plugin-----a-relatively-non-technical-description-
* @see http://miles-by-motorcycle.com/fv-b-8-665/you-can---t-select-that-----webkit-browser-selections-and-ranges-in-chrome-and-safari
*
* @see http://stackoverflow.com/questions/14027559/event-keycode-character-pointed-to-by-current-selection-when-typing-fast
* @see http://stackoverflow.com/questions/14098303/how-to-set-caret-cursor-position-in-a-contenteditable-div-between-two-divs
* @see http://stackoverflow.com/questions/14108115/chrome-divs-with-display-inline-block-breaks-up-and-down-arrows
*
* @todo implement skipping over zero space and extending the mult-char range while selecting using SHIFT->ARROW KEY.
*/

(function($) {

	/**
	* placeholder for rangy or native (document) selections.
	*/

//	var RANGE_HANDLER = rangy;
//	var CREATERANGE_HANDLER = rangy;

	var RANGE_HANDLER = document;
	var CREATERANGE_HANDLER = document;

	/**
	* the rich_textarea widget definition 
	*/

	$.widget( 'ui.rich_textarea', 
		{

		options: 
			{

			/**
			* definition of autocomplete triggers.
			*
			* an array of trigger definitions each containing keys:
			*
			* 	trigger: single character to use as a trigger
			*	callback: callback, with the autocomplete trigger word as a parameter, to feed completion list to autocomplete
			*/

			triggers: [],

			/**
			* definition of regexes.
			*
			* an array of regexes each containing keys:
			*
			* 	regex: regex to match entered words against.
			*	callback: callback with a single parameter, word_entry, containing startNode, startOffset, endNode, endOffset, and word keys.
			*/

			regexes: []

			},

		/**
		* jQuery UI widget factory create method.
		*
		* @see http://api.jqueryui.com/jQuery.widget/
		*/

		_create: function() 
			{

			// fun with javascript scoping rules.

			var richtext_widget = this;

			/**
			* the current trigger entry
			*
			* used in the autcomplete select callback to replace the trigger word 
			* with the selected value
			*/

			this.current_trigger = false;

			/**
			* saved copy of current range
			*
			* @see insertObject()
			*/

			this.currentRange = false;

			/**
			* flag used to let onKeyUp know not to process ENTER.
			*
			* @see _insertSelection()
			*/

			this.selectionEntered = false;

			/**
			* flag used to indicate whether or not to do regex replacements
			*
			* there are some chicken and eggs problems with autocomplete and the ENTER key.
			*/

			this.do_regex = true;

			/**
			* whether or not the autocomplete menu is open
			*/

			this.autocomplete_open = false;

			/**
			* make sure we have focus
			*
			* @todo this has negative side effects in too many cases causing the page to scroll when it really shouldn't.
			*/

			// this.element.focus();

			// widget factory style event binding. First is the name of the 
			// event mapped onto the string name of the method to call.

			this._on( 
				{
				keyup: function( event ) { this._onKeyUp( event ); },
				keypress: function( event ) { this._onKeyPress( event ); },
				keydown: function( event ) { this._onKeyDown( event ); },
				mouseup: function( event ) { this._onMouseUp( event ); },
				focus: function( event ) { this._onFocus( event ); },
				paste: function( event ) { this._onPaste( event ); },
				prepaste: function( event ) { this._onPrePaste( event ); },
				postpaste: function( event ) { this._onPostPaste( event ); }
				});

			/**
			* bind the standard jquery-ui autocomplete to our element
			*
			* (not sure if using this.element here is an acceptable way of getting at the element.)
			*/

			this.element.autocomplete(
				{

				/**
				* add support to format dropdown entries in HTML so we can embed images.
				*
				* @see jquery.ui.autocomplete.html.js
				*/

				html: 'html',

				/**
				* blur event
				*/

				blur: function( event, ui )
					{
					ddt.log( "autocompete blur event" );
					},

				/**
				* callback on open
				*/

				open: function( event, ui )
					{
					ddt.log( "autocomplete open: event" );
					richtext_widget.autocomplete_open = true;
					},

				/**
				* callback on close
				*/

				close: function( event, ui )
					{
					ddt.log( "autocomplete close: event" );
					richtext_widget.autocomplete_open = false;
					richtext_widget.do_regex = true;
					},

				/**
				* change event handler
				*/

				change: function( event, ui )
					{
					ddt.log( "autocomplete change event" );
					},

				/**
				* the autocomplete data source
				*
				* uses the source callback in the trigger definition to get the list of 
				* possible completions. As a result, each different trigger character (@,#, et al ) can
				* pull an autocompletion from a different source. 
				*
				* The request value sent as the request parameter by the autocomplete plugin contains 
				* the entire contents of the div so instead we ignore the request and look for the 
				* trigger word in the editable div contents at the current cursor position.
				*
				* @param {String} request (ignored) the request from auto-complete
				* @param {Function} response the autocomplete response callback that expects an array of responses
				*
				* @see http://api.jqueryui.com/autocomplete/#option-source
				* @see _checkForTrigger()
				*
				* @todo make minLength configurable. 
				*/

				source: function( request, response )
					{

					ddt.log( "source(): got source event" );

					// this might be NULL when set in a mouseup event.

					var trigger_entry = richtext_widget._checkForTrigger();

					if (( trigger_entry == false ) || ( trigger_entry == null ))
						{

						ddt.log( "source(): no trigger" );

						return;
						}

					ddt.log( "source(): got source event with trigger ", trigger_entry );

					// we're passing in the trigger term outside the normal autocomplete
					// path, so the minLength option in autocomplete doesn't work. We'll set it 
					// as 2 here for now.

					if (( trigger_entry != false ) &&
						( trigger_entry.word.length >= 2 ))
						{

						ddt.log( "source(): invoking response" );

						// this causes the autocomplete menu to be populated

						trigger_entry.callback( trigger_entry.word, response );

						}
					
					},

				/**
				* focus callback
				*
				* when the user moves through the list of items in the dropdown we don't want
				* the value of the div to be replaced. We selectively replace the trigger word
				* in the select callback.
				*
				* @see http://api.jqueryui.com/autocomplete/#event-focus
				*/

				focus: function( event, ui )
					{

					ddt.log( "focus(): autocomplete got focus event", ui );

					event.preventDefault();

					return false;
					},

				/**
				* select callback
				*
				* By default jQuery autocomplete will replace the entire contents of the DIV with 
				* the selected value. We prevent that behavior and override it with our own approach.
				*
				* Once the user has selected something from the select dropdown we want to replace
				* the current trigger word with the selection. 
				*
				* It's not immediately clear from the jquery ui docs, but the selected value is
				* returned in ui.item.value and ui.item.name.
				*
				* The current start and end offsets for the trigger word are in the current_trigger member.
				*
				* @see http://api.jqueryui.com/autocomplete/#event-select
				*/

				select: function( event, ui )
					{

					ddt.log( "select(): got select event ", event, " and ui element ", ui, " current range is ", this.currentRange );

					// replace the trigger word, including trigger character, with the selected
					// value.

					richtext_widget._insertSelection( richtext_widget.current_trigger, ui.item.value );

					// it's just been inserted so the cursor should be right behind the thing. 

					richtext_widget._highlightObject();

					// prevent jQuery autocomplete from replacing all content in the div.

					event.preventDefault();

					// prevent regexes from running.

					richtext_widget.do_regex = false;

					}

				});	// end of this.element.autocomplete
				
			},	// end of _create()

		/**
		* handle keypresses near inserted objects
		*
		* Handles:
		*
		*	. the case where the user attempts to backspace over an embedded object. 
		*	. the case of using an arrow key to jump over the object
		* 	. the case where the user is using the arrow keys or backspace over a zero width whitespace character.
		*
		* We handle this case in KeyDown in order to intercept the keystroke
		* before it affects the content area. It's important to note that onKeyDown is called BEFORE
		* any changes are made to the content area, so the current selection is the position BEFORE the
		* action of the keystroke is performed.
		*
		* BUG: Chrome will return keyCode 0 if the Delete key is pressed on the number keypad under Fedora Linux.
		*	(it will, however, frustratingly then proceed to delete the character)
		*/

		_onKeyDown: function( event )
			{

			ddt.log( "_onKeyDown(): with key '" + event.keyCode + "' event: ", event );

			var object = null;
			var location = null;
			var sel = null;

			// if the autocomplete menu is open don't do anything with up and down arrow keys

			if ( this.autocomplete_open )
				{

				if (( event.which == $.ui.keyCode.UP ) || ( event.which == $.ui.keyCode.DOWN ) || ( event.which == $.ui.keyCode.ENTER ))
					{
					event.preventDefault();
					return true;
					}
				}

			// we may have a multiple char selection in which case we want to let the browser handle
			// it. (see _onKeyUp)

			sel = RANGE_HANDLER.getSelection();

			if ( sel.rangeCount )
				{

				var range = RANGE_HANDLER.getSelection().getRangeAt(0);

				if ( range.collapsed == false )
					{
					ddt.log( "_onKeyDown(): multi-char range. skipping onKeyDown processing" );
					return;
					}
				}


			switch ( event.which )
				{

				case 0:

					// is i tbetter to have it do nothing than to make the contents of the editable div
					// inconsistent? In my testing with Chrome 17.0.963.56 under Linux, we only get a 0 with 
					// the number pad delete key. Seems to work correctly on other platforms.

					ddt.error( "_onKeyDown(): WEBKIT BUG: Keycode 0 returned. probably delete on Linux keypad but can't be sure" );

					// event.preventDefault();

					break;

				case $.ui.keyCode.BACKSPACE:

					ddt.log( "_onKeyDown(): BACKSPACE pressed" );

					var retval = false;

					if (( retval = this._backspaceZeroSpace()) == 'stop' )
						{
						ddt.log( "_onKeyDown(): BACKSPACE: stop word encountered. stopping" );
						return;
						}

					// is the previous character an embedded object?

					ddt.log( "_onKeyDown(): BACKSPACE: checking to see if we are next to an object" );

					if ( object = this._checkForAdjacentObject( 'left' ))
						{

						ddt.log( "_onKeyDown(): backspacing over an object :", object );

						this.deleteObject( object.dom_node );

						// if we deleted any whitespace characters prevent the browser from
						// deleting whatever the next character is

						if ( object.preventDefault )
							{
							event.preventDefault();
							}

						}

					ddt.log( "_onKeyDown(): BACKSPACE: done" );

					break;

				case $.ui.keyCode.DELETE:

					ddt.log( "_onKeyDown(): DELETE pressed" );

					var retval = false;

					if (( retval = this._deleteZeroSpace()) == 'stop' )
						{
						ddt.log( "_onKeyDown(): DELETEE: stop word encountered. stopping" );
						return;
						}

					// is the next character an embedded object?

					ddt.log( "_onKeyDown(): DELETE: checking to see if we are next to an object" );

					if ( object = this._checkForAdjacentObject( 'right' ))
						{

						ddt.log( "_onKeyDown(): DELETE: deleting an object :", object );

						this.deleteObject( object.dom_node );

						// after the delete we may be edge up against another object. 

						event.preventDefault();

						}

					ddt.log( "_onKeyDown(): DELETE done" );

					break;

				case $.ui.keyCode.LEFT:

					ddt.log( "_onKeyDown(): LEFT pressed" );

					// where is the caret now? 

					var caret = this._getCaretPosition();

					ddt.log( "_onKeyDown(): _getCaretPosition() returned node '" + caret.dom_node + "' with offset '" + caret.offset + "'" );

					// are we immediately next to an object? Jump the cursor over it.

					if ( object = this._isEmbeddedObject( caret.dom_node ) )
						{

						ddt.log( "_onKeyDown(): setting caret before object: ", object );

						// this._setCaretPositionRelative( object, 'before' );

						this._setCaretPositionRelative( object.previousSibling, 'end' )

						// FIXME: prevent the caret from jumping an additional space.
						//
						// In WebKit in the left arrow case without preventDefault() the 
						// caret jumps an additional position. HOWEVER, in the right case
						// with it enabled the caret does not jump over the end of the span
						// even if I select it.

						event.preventDefault();

						break;
						}

					// We are not right next to an object but there may be some number of zero width
					// characters and/or textnodes between the current caret position and the object
					//
					// _moveCaret() may move the cursor into another container in which
					// case we do NOT try to jump over any next object.

					if ( location = this._moveCaret( caret.dom_node, caret.offset, 'left' ) )
						{

						ddt.log( "_onKeyDown(): LEFT: _moveCaret returned:", location );

						// unless we've just moved into a container (i.e. new line) , we want to jump over any
						// embedded objects we've arrived next to.

						if (( location.checkForObjects ) && ( object = this._checkForAdjacentObject( 'left' )))
							{

							ddt.log( "_onKeyDown(): LEFT: jumping over object to the left" );

							this._setCaretPositionRelative( object.dom_node.previousSibling, 'end' )

							event.preventDefault();

							}

						// HACK: special fix for WebKit. When jumping out of containers don't let the 
						// browser do it's thing otherwise it'll jump one too far. Same for Mozilla.

						if ( location.preventDefault )
							{
							ddt.log( "_onKeyDown(): Leaving a container, etc. preventing default" );

							event.preventDefault();
							}

						// If it's a text node we want to let the browser move the cursor for us. 

						}

					ddt.log( "_onKeyDown(): LEFT done" );

					break;

				case $.ui.keyCode.RIGHT:

					ddt.log( "_onKeyDown(): RIGHT pressed" );

					// where is the caret now? 

					var caret = this._getCaretPosition();

					ddt.log( "_onKeyDown(): _getCaretPosition() returned node '" + caret.dom_node + "' with offset '" + caret.offset + "'" );

					// are we next to an object? Jump the cursor over it.

					if ( object = this._isEmbeddedObject( caret.dom_node ) )
						{

						ddt.log( "_onKeyDown(): isEmbedded true. moving to beginning of nextSibling" );

						this._setCaretPositionRelative( object.nextSibling, 'beginning' )

						// FIXME: prevent the caret from jumping an additional space.
						// This does not make sense to me. In the LEFT arrow case without the preventDefault
						// the cursor jumps an additional space in WebKit. However, in the RIGHT arrow case
						// if I preventDefault, the caret cannot be moved outside of the span when jumping over
						// an object. Clearly there is something I do not understand.

						// event.preventDefault();

						break;

						}

					// _moveCaret() may move the cursor into another container in which
					// case we do NOT try to jump over any next object.

					if ( location = this._moveCaret( caret.dom_node, caret.offset, 'right' ) )
						{

						ddt.log( "_onKeyDown(): RIGHT: after skipping over zero space. checking for adjacent objects :", location );

						// if we are right next to an object we want to jump the
						// cursor over it but ONLY if we are not moving onto a new line (i.e. moving into
						// a child container)

						if (( location.checkForObjects ) && ( object = this._checkForAdjacentObject( 'right' )))
							{

							ddt.log( "_onKeyDown(): RIGHT: right arrowing over an object" );

							this._setCaretPositionRelative( object.dom_node.nextSibling, 'beginning' )

							// FIXME: see above. preventingDefault() here breaks jumping across objects.

							// event.preventDefault();
		
							}

						// HACK: special fix for WebKit. When jumping into or out of containers don't let the 
						// browser do it's thing otherwise it'll jump one too far. Same for Mozilla and a BR.

						if ( location.preventDefault )
							{
							ddt.log( "_onKeyDown(): entering or leaving a container. preventing default" );

							event.preventDefault();
							}

						}

					ddt.log( "_onKeyDown(): RIGHT done." );

					break;

				case $.ui.keyCode.ENTER:

					// the trick that took so long to figure out is that we can actually prevent the default
					// behavior of the browser by preventing the default behavior in the onKeyDown event.
					//
					// Without this, each major browser puts different markup in the div. 
					//
					// @see _handleEnter()

					this._handleEnter( event );

					// prevent default behavior

					return false;

					break;

				}	// end of switch

			},	// end of _onKeyDown()

		/**
		* keypress handler
		*
		* There's a conflict between our regex processing and how autocomplete handles kepresses. 
		*
		* We want autocomplete to run first then our stuff, but before the content area has a chance
		* to update.
		*/

		_onKeyPress: function( event )
			{

			ddt.log( "_onKeyPress(): with key '" + event.keyCode + "' event: ", event );

                        // if the autocomplete menu is open don't do anything with up and down arrow keys

                        if ( this.autocomplete_open )
                                {

                                if (( event.which == $.ui.keyCode.UP ) || ( event.which == $.ui.keyCode.DOWN ) || ( event.which == $.ui.keyCode.ENTER ))
                                        {
					event.preventDefault();
                                        return true;
                                        }
                                }

			switch ( event.which )
				{

				case $.ui.keyCode.SPACE:

					// on pressing SPACE check to see if we match any regexes.

					ddt.log( "_onKeyDown(): SPACE pressed. Checking regexes" );

					this._checkRegexes( event );

					break;

				case $.ui.keyCode.ENTER:

					// we have to be careful not to let regexes conflict with the autocomplete
					// dropdown. The dropdown catches the keypress event for ENTER but does not, for 
					// whatever reason, stop propagation so we get that keypress here. 

					ddt.log( "_onKeyDown(): ENTER pressed. Checking regexes" );

					this._checkRegexes( event );

					break;

				}

			},	// end of onKeyPress()

		/**
		* check for spaces and arrow key moves
		*
		* This method manages cancelling any active autocomplete. It also handles the case
		* where the user UP or DOWN arrows into the middle of an embedded object.
		*
		* @see http://api.jquery.com/keyup/
		* @see _insertSelection()
		*/

		_onKeyUp: function( event )
			{

			var caret = null;

			ddt.log( "_onKeyUp(): with key '" + event.which + "':", event );

                        // if the autocomplete menu is open don't do anything with up and down arrow keys

                        if ( this.autocomplete_open )
                                {

                                if (( event.which == $.ui.keyCode.UP ) || ( event.which == $.ui.keyCode.DOWN ) || ( event.which == $.ui.keyCode.ENTER ))
                                        {
					event.preventDefault();
                                        return true;
                                        }
                                }

			// we may have a multiple char selection

			if ( this._handleRangeSelection() )
				{

				// let the user do with the range whatever they want. The browser will 
				// take care of it. 

				return;

				}

			// save the range in case we click out of the div and then want to insert
			// something.

			this._saveRange();

			// if we are at the end of an object, highlight it to indicate 
			// that it'll get deleted on backspace.

			this._highlightObject();

			// we may arrive here because of arrow key and other events.

			switch ( event.which )
				{

				case $.ui.keyCode.ENTER:
					
					ddt.log( "_onKeyUp(): ENTER: pressed. Closing autocomplete menu." );

					// we close the autocomplete menu on any of these keys.

					this.element.autocomplete( 'close' );
					this.current_trigger = false;

					// FIXME: see  _insertSelection(). jQuery (or maybe my) bug where this
					// callback is still getting invoked even when enter is pressed in the autocomplete
					// dropdown.

					if ( this.selectionEntered )
						{
						this.selectionEntered = false;
						break;
						}

					this._onEnterFixUp( event );

					ddt.log( "_onKeyUp(): ENTER. done." );

					break;

				case $.ui.keyCode.SPACE:
				case $.ui.keyCode.TAB:
				case $.ui.keyCode.HOME:
				case $.ui.keyCode.END:

					// we close the autocomplete menu on any of these keys.

					this.element.autocomplete( 'close' );
					this.current_trigger = false;

					ddt.log( "_onKeyUp(): closed autocomplete menu" );

					break;

				case $.ui.keyCode.LEFT:
				case $.ui.keyCode.RIGHT:
				case $.ui.keyCode.BACKSPACE:

					ddt.log( '_onKeyUp(): arrow/backspace pressed' );

					// using CNTRL-LEFT AND RIGHT it's possible to get inside an object. 

					caret = this._getCaretPosition();

					var object_node = this._clickedOnObject( caret.dom_node );

					if ( object_node != false )
						{
						
						ddt.log( "_onKeyUp(): currently in an object. moving caret before object" );

						this._setCaretPositionRelative( object_node, 'before' );
						return;
						}

					// have we moved beyond the limit of a trigger character? 

					if ( ! this._checkForTrigger() ) 
						{

						ddt.log( "_onKeyUp(): outside of trigger" );

						this.element.autocomplete( 'close' );
						this.current_trigger = false;

						}
					else
						{

						ddt.log( '_onKeyUp(): in trigger' );

						// autocomplete BUG? If we do not pass a value for the second argument here
						// search is not invoked.
						//
						// We call this here to force the autocomplete menu open if we move the cursor
						// over a trigger word. autocomplete does not do that automatically.

						this.element.autocomplete( 'search', 'test' );

						}

					break;

				case $.ui.keyCode.UP:
				case $.ui.keyCode.DOWN:

					// it's always something. WebKit, if you delete the newline at the beginning
					// of the line (wrapping div) will delete any embedded contenteditable=false spans
					// when joining the lines. Ugh.
					//
					// So this means everything needs to be contenteditable so we need to enforce NOT
					// moving into the middle of an embedded object ourselves. 
					//
					// So if the user moves up or down into an object move the cursor to the beginning of
					// the object.

					caret = this._getCaretPosition();

					var object_node = this._clickedOnObject( caret.dom_node );

					if ( object_node != false )
						{
						this._setCaretPositionRelative( object_node, 'before' );
						}

					break;

				}	// end of switch over keys.

			},	// end of _onKeyUp()

		/**
		* check to see if mouse click is inside a trigger.
		*
		* check to see if mouse click is inside a trigger or an embedded object. Also
		* handle the case where the user made a click drag selection into the middle of 
		* objects on either end. 
		*/

		_onMouseUp: function( event )
			{

			var trigger_entry;

			// make sure the autocomplete menu is closed.

			this.element.autocomplete( 'close' );

			// scrollbar causes this event to fire so we need to guard against the fact
			// the editable div may not have focus.

			if ( ! $( '#' +  this.element.attr( 'id' ) ).is( ":focus" ) )
				{
				ddt.log( "_onMouseUp(): the div does not have focus" );
				return true;
				}

			if ( this._handleRangeSelection() )
				{

				// let the user do with the range whatever they want. The browser will 
				// take care of it. 

				return;
				}

			// save the range in case we click out of the div and then want to insert
			// something.

			this._saveRange();

			ddt.log( "_onMouseUp(): did we click on an object?:", event.target );

			var object_node = this._clickedOnObject( event.target );
				
			if ( object_node != false )
				{

				ddt.log( "_onMouseUp(): preventing default action" );

				this._setCaretPositionRelative( object_node, 'before' );

				event.preventDefault();
				}

			// if we are at the end of an object, highlight it to indicate 
			// that it'll get deleted on backspace.

			this._highlightObject();

			if ( trigger_entry = this._checkForTrigger() )
				{
				
				ddt.log( "_onMouseUp(): calling autocomplete from onMouseUp handler with term '" + trigger_entry.word + "'" );

				// FIXME: for some reason when _checkForTrigger() is called from the autocomplete source callback
				// the selection is lost. So _checkForTrigger() sets a class level copy which source checks. Ugly.

				this.element.autocomplete( 'search', 'test' );

				}

			},	// end of _onMouseUp()

		/**
		* handle focus event
		*
		* Prevents the selection from becoming invalid if the autocomplete menu is open.
		*/

		_onFocus: function( event )
			{

			ddt.log( "focus(): top" );

			if ( this.autocomplete_open )
				{

				ddt.log( "_onFocus(): autocomplete menu is open" );
				event.preventDefault();
				return false;
				}

			},

		/**
		* handle paste events.
		*
		* Handling paste events is not nearly as straight forward as one would like it 
		* to be.
		*
		* We cannot get the pasted text ahead of time so the algorithm is:
		*
		* Before the paste, tag all existing elements in the div with a unique data attribute.
		* After the paste we can use the data attribute to determine which elements are
		* new in the div.
		*
		* @param {Object} event event object
		* @link http://stackoverflow.com/questions/2176861/javascript-get-clipboard-data-on-paste-event-cross-browser/2177059#2177059
		*/

		_onPaste: function( event )
			{

			ddt.log( "_onPaste(): got paste event ", event );

			//$( this ).trigger("prepaste");

			this._onPrePaste( event );

			var self = this;

			// the callback timeout here is not perfect. If the browser is
			// especially slow this may fail.

			setTimeout( function() 
				{ 
				self._onPostPaste( event ); 
				}, 75);

			// this._checkRegexes( event );

			return true;

    			// return this.replaceWith(this.html().replace(/<\/?[^>]+>/gi, ''));

			},	// end of _onPaste()

		/**
		* synthetic event handler for prepasting
		*/

		_onPrePaste: function( event )
			{

			ddt.log( "_onPrePaste(): top" );

			$(this.element).find("*").each(function()
				{
			        //var tmp=new Date.getTime();
				$(this).data("uid", '123');
				});
			},

		/**
		* synthetic event handler for post pasting
		*
		* strip out html tags. handle regexes.
		*/

		_onPostPaste: function( event )
			{

			ddt.log( "_onPostPaste() top" );

			var rich_textarea = this;

			// replace any html tags but ignore text nodes

			this.element.find("*").each(function()
				{
				if(!$(this).data("uid"))
					{

					ddt.log( "Found a new element '" + $(this).get(0).tagName + "' of type", $(this).get(0).nodeType );

					// KLUDGE: links copied from a browser bar are wrapped in <a> tags but if we strip the
					// a tags the selection is lost. So for the moment we'll leave the a tag in place.

					if (( $(this).get(0).nodeType != 3 ) && ( $(this).get(0).nodeName != 'A' ))
						{

						// This unfortunately messes up the selection.

						$(this).replaceWith( $(this).text() );
						}

					// $(this).removeClass();
					// $(this).removeAttr("style id");
					}
				});

			this._checkRegexes( event );

			},

		/**
		* ensures that spaces before and after elements are still selectable after Enter key pressed.
		*
		* NOTE: The majority of this method is deprecated and can be deleted now that we are normalizing
		* NOTE: the content area to use exclusively <BR>'s for newlines instead of trying to support
		* NOTE: the native markup entered by each browser.
		*
		* Each of the major browser engines handles pressing ENTER in a contenteditable element differently.
		*
		* In WebKit, this often results in unselectable positions. (i.e. you can't select the place between
		* the DIV and SPAN in <div><span>test</span><test>. 
		*
		* Thus, on ENTER we have to make sure that we can still select the beginning and end of both 
		* the previous line and the newly opened one by inserting zero width text nodes.
		*
		* There are apparently a wide number of different scenarios that can arise when pressing ENTER:
		*
		*	. as the first character in the editable area
		*
		*		in WebKit:
		*
		*			<DIV><BR></DIV>
		*			<DIV><BR></DIV>
		*
		*		in FireFox:
		*
		*			<BR _moz_dirty="">
		*			<BR _moz_dirty="">
		*
		*		in MSIE:
		*
		*			<P/>
		*			<P/>	
		*
		*			NOTE: because of the <P>'s MSIE looks like it's double-spacing lines. 
		*
		*	. after opening a new line, going back to the first and entering a character
		*
		*		in WebKit:
		*
		*			<DIV>t</DIV>		-> BR DISAPPEARS
		*			<DIV><BR></DIV> 	
		*
		*		in FireFox:
		*
		*			t
		*			<BR _moz_dirty="">
		*			<BR _moz_dirty="">
		*
		*			NOTE: pressing ENTER once inserts a single BR but does not open a new line. 
		*
		*		in MSIE:
		*
		*			<P>t</P>
		*			<P/>
		*
		*	. after opening a new line And entering a character on the second line
		*
		*		in WebKit:
		*
		*			<DIV><BR></DIV> 	
		*			<DIV>t</DIV>		-> BR DISAPPEARS
		*
		*		in FireFox:
		*
		*			<BR _moz_dirty="">
		*			t
		*			<BR _moz_dirty="">
		*
		*		in MSIE:
		*
		*			<P/>
		*			<P>t</P>
		*
		*	. end of first line with trailing BR
		*
		*		<div contenteditable="true">test<BR></DIV>
		*
		*		in WebKit:
		*
		*			test1<BR>				-> UNEXPECTED
		*			<DIV><BR></DIV>
		*
		*			NOTE: INITIAL CONTENT SHOWS ONE LINE INSTEAD OF TWO.
		*
		*		in FireFox:
		*
		*			test1
		*			<BR _moz_dirty="">
		*			<BR>						-> UNEXPECTED that both BR's would show up.
		*
		*			NOTE: INITIAL CONTENT SHOWS ONE LINE INSTEAD OF TWO.
		*
		*		in MSIE:
		*
		*			<P>test1</P>
		*			<P><BR></P>
		*
		*			NOTE: INITIAL CONTENT SHOWS TWO LINES.
		*			
		*	. end of first line with embedded BR between lines (i.e. initial content test1<BR>test2 )
		*
		*		WebKit:
		*
		*			test1
		*			<DIV><BR>test2</DIV>
		*
		*		FireFox:
		*
		*			test1
		*			<BR _moz_dirty="">
		*			<BR>
		*			test2
		*
		*		MSIE:
		*
		*			<P>test1</P>
		*			<P><BR/>test2</P.
		*
		*	. adding a character to initial content of <DIV><BR></DIV>
		*
		*		in WebKit:
		*
		*	 		<DIV>t</DIV>			-> UNEXPECTED. BR gets removed even though it was not added by WebKit.
		*
		*		in FireFox:
		*
		*			test1
		*			<BR _moz_dirty="">
		*			<BR>
		*			test2
		*
		*		in MSIE:
		*
		*			<P>test1</P>
		*			<P><BR/>test2</P>
		*
		*	. after a line of text
		*
		*		in WebKit:
		*
		*			test
		*			<DIV><BR></DIV>
		*
		*		in FireFox:
		*
		*			test
		*			<BR _moz_dirty=""/>
		*			<BR _moz_dirty="moz"/>		-> DAFUQ??
		*
		*		in MSIE:
		*
		*			<P>test</P>
		*			<P/>
		*
		*	. before a line of text
		*
		*		in WebKit:
		*
		*			<DIV><BR></DIV>
		*			test
		*
		*		in FireFox:
		*
		*			<BR _moz_dirty="">
		*			test
		*
		*		in MSIE:
		*
		*			<P/>
		*			<P>test</p>
		*
		*	. in the middle of a line of text 
		*		
		*		in WebKit:
		*
		*			te
		*			<DIV>st</DIV>		-> UNEXPECTED
		*
		*		in FireFox:
		*
		*			te
		*			<BR _moz_dirty="">
		*			st
		*
		*		in MSIE:
		*
		*			<P>TE</P>
		*			<P>ST</p>
		*
		*	. before an image
		*
		*		in WebKit:
		*
		*			<DIV><BR></DIV>
		*			<IMG SRC="...">
		*
		*		in FireFox:
		*
		*			<BR _moz_dirty="" />
		*			<IMG SRC="...">
		*
		* 		in MSIE:
		*
		*			<P/>
		*			<P><IMG SRC="..."</P>
		*
		*	. after an image
		*
		*		in WebKit:
		*
		*			<img src="...">
		*			<DIV><BR></DIV>
		*
		* 		in FireFox:
		*
		*			<IMG SRC="...">
		*			<BR _moz_dirty="" />
		*			<BR _moz_dirty="" type="_moz" /> 	-> DAFUQ??
		*
		*		in MSIE:
		*
		*			<P><IMG SRC="..."></P>
		*			<P/>
		*
		*	. between two images
		*
		*		in WebKit:
		*
		*			<img src="...">
		*			<DIV><img src="..."></DIV>  -> UNEXPECTED
		*
		*		in FireFox:
		*
		*			<IMG SRC="...">
		*			<BR _moz_dirty="" />
		*			<IMG SRC="...">
		*
		*		in MSIE:
		*
		*			<P><IMG SRC="..."></P>
		*			<P><IMG SRC="..."></P>
		*
		*	. before a span Using <SPAN>test</SPAN> as initial editable content.
		*
		*		in WebKit:
		*
		*			<DIV><SPAN><BR></SPAN></DIV> -> UNEXPECTED
		*
		*			NOTE: can be explained by noting the cursor cannot be moved outside of the span in WebKit
		*
		*		in FireFox:
		*
		*			<SPAN>
		*				<BR _moz_dirty="" />
		*				test
		*			</SPAN>							--> UNEXPECTED
		*
		*		in MSIE:
		*
		*			<P><SPAN/></P>					
		*			<P><SPAN>TEST</SPAN></P>	--> UNEXPECTED
		*
		*	. after a span
		*
		*		in WebKit:
		*
		*			<SPAN>test</SPAN
		*			<DIV><SPAN><BR></SPAN></DIV> -> UNEXPECTED
		*
		*			NOTE: can be explained by noting the cursor cannot be moved outside of the span in WebKit.
		*
		*		in FireFox:
		*
		*			<SPAN>
		*				test
		*				<BR _mod_dirty=""/>
		*				<BR _moz_dirty="" type="_moz" />		--> DAFUQ?? UNEXPECTED
		*			</SPAN>
		*
		*		in MSIE:
		*
		*			<P><SPAN>test</SPAN></P>
		*			<P><SPAN/></P>
		*
		*	. in the middle of a span
		*
		*		in WebKit:
		*
		*			<SPAN>te</SPAN>
		*			<DIV><SPAN>st</SPAN></DIV>
		*
		*		in FireFox:
		*
		*			<SPAN>
		*				te
		*				<BR _moz_dirty=""/>
		*				st
		*			</SPAN>
		*
		*		in MSIE:
		*
		*			<P><SPAN>te</SPAN></P>
		*			<P><SPAN>st</SPAN></P>
		*
		* As soon as any content is entered, WebKit deletes the BR it added to the DIV. /sometimes/ it seems
		* to delete a BR which is present in the initial content. In order to make sure our range 
		* selection code works in WebKit we add a zero width space character. 
		*
		* Strangely, the <DIV><BR></DIV> does not open up two lines as one would expect. Sometimes, for 
		* reasons I haven't yet completely figured out, probably due to a bug in my code, the BR is left hanging
		* around which causes all kinds of selection problems in WebKit. I would like to delete the BR but
		* for some reason if I do, the editable DIV in WebKit becomes confused and starts nesting DIV's on ENTER.
		*
		* Also, if ENTER is pressed at a point on the previous line such that there is no textnode at the
		* end of the line, we patch one in.
		*
		* Note that this method must be called in _onKeyUp. It cannot be called in onKeyDown because the
		* browser needs to update the content before we can manipulate it.
		*
		* @see _onKeyUp()
		* @see http://a-software-guy.com/2013/01/a-summary-of-markup-changes-in-contenteditable-divs-in-webkitfirefox-and-msie/
		*
		* @see _handleEnter()
		*
		* @todo remove deprecated code since we are now normalizing everything to <BR>'s in _handlerEnter()
		*/

		_onEnterFixUp: function( event )
			{

			var caret = this._getCaretPosition();

			ddt.log( "_onEnterFixUp(): current DOM Node is:", caret.dom_node );

			// ---------------------------------------
			// Fixup any previous sibling or container
			// ---------------------------------------

			// in WebKit the previousSibling should always be null since we should be at the beginning
			// of a DIV containing the new line. For this case, we examine the previous sibling of
			// our containing DIV. Chrome is fond of inserting empty <DIV><BR></DIV>'s.
			//
			// FireFox/Mozilla on the other hand inserts <BR _moz_dirty=""> which means there should always
			// be a previousSibling. 

			if ( caret.dom_node.previousSibling == null )
				{

				ddt.log( "_onEnterFixUp(): previous sibling is NULL. Likely a WebKit browser." );

				this._checkSibling( caret.dom_node.parentNode, 'prev' );

				// is our parents previousSibling a container? 

				}
			else if ( caret.dom_node.previousSibling.nodeType != 3 )
				{

				ddt.log( "_onEnterFixUp(): Previous sibling is NOT a text node" );

				// not matter what it is, make sure it's wrapped in empty text nodes. 

				this._insertEmptyNode( caret.dom_node.previousSibling, 'before' );
				this._insertEmptyNode( caret.dom_node.previousSibling, 'after' );

				}

			// ---------------------------------------
			// Fixup nodes moved to the new line
			// ---------------------------------------

			// if we are Mozilla, instead of a <DIV> it adds <BR _moz_dirty="">
			// WebKit is known for adding <DIV><BR></DIV> for a new line.
			//
			// in either case, we'll make sure there are empty text nodes around it for good measure.

			if ( $( caret.dom_node ).filter( '[_moz_dirty]' ).length != 0 )
				{

				ddt.log( "_onEnterFixUp(): mozilla BR. wrapping in textnodes" );

				this._insertEmptyNode( caret.dom_node, 'before' );
				this._insertEmptyNode( caret.dom_node, 'after' );

				}
			else if ( caret.dom_node.nodeName == 'BR' )
				{

				// this is likely webKit. We'll attempt to replace the BR with a space. 

				ddt.log( "_onEnterFixUp(): webkit BR." );

				// this seems to muck up webkit. ENTER keys starts inserting nested DIVs. Not
				// sure why.

				// this._insertEmptyNode( caret.dom_node, 'before' );
				// $( caret.dom_node ).remove();

				}
			else if ( this._isEmbeddedObject( caret.dom_node ) )
				{

				// if we are an object, make sure there's a node in front of us and select it so the cursor
				// doesn't try to get in the span of the object.

				var textnode = this._insertEmptyNode( caret.dom_node, 'before' );
				this._selectTextNode( textnode, 0 );

				}
			else if (( caret.dom_node.nodeName == 'DIV' ) || 
				( caret.dom_node.nodeName == 'SPAN' ) ||
				( caret.dom_node.nodeName == 'P' ))
				{

				// This branch is not likely to happen as most container should have textnodes
				// in front of them, but just in case is this a container? (could maybe be an embedded 
				// object that we have just pressed ENTER immediately before.)
				//
				// else we are webkit or MSIE. webkit adds a DIV, MSIE a P. 
				// make sure the first child is a text node.

				if ( caret.dom_node.childNodes.length == 0 )
					{

					// empty container. 

					ddt.log( "_onEnterFixUp(): adding zero width space to empty container (div/p)" );

					this._insertEmptyNode( caret.dom_node, 'child' );

					}
				else if ( caret.dom_node.childNodes[ 0 ].nodeType != 3 )
					{

					// first node of the container is NOT a textnode.

					ddt.log( "_onEnterFixUp(): first child of container is a '" + caret.dom_node.childNodes[ 0 ].nodeName + "'" );

					// make sure it's wrapped in textnodes

					this._insertEmptyNode( caret.dom_node.childNodes[ 0 ], 'before' );
					this._insertEmptyNode( caret.dom_node.childNodes[ 0 ], 'after' );

					}

				}	// end of the node was a container

//                        $( '.scrollto' ).scrollintoview( { duration: 30 });
//                        $( '.scrollto' ).get(0).scrollIntoView(false);

			// if there is a scrollTo span set in handleEnter() invoke scrollTo.

			if ( $( '.scrollto' ).length  )
				{
				ddt.log( "calling scrollTo" );
				$( '#' +  this.element.attr( 'id' ) ).scrollTo( $( '.scrollto' ), 20 );
        	                $( '.scrollto' ).remove();
				}

			// $( this.tmp_kludge ).scrollintoview();

			},	// end of _onEnterFixUp()

		/**
		* a simpler approach to handling newlines.
		*
		* Instead of attempting to work around all the various contenteditable browser quirks
		* we can force all browsers to use the same markup by preventing default behavior from 
		* onKeyDown. 
		*
		* By hooking the onKeyDown event and preventing the default action we can manually insert
		* the break and adjust the cursor positon. This greatly simplifies traversing of the 
		* content area on delete, backspace, enter and arrow keys.
		*
		* NOTE: on the subject of scrolling we are using the jQuery scrollTo plugin. It does not
		* work with a <BR> so instead we add a temporary <span> which we use as an anchor for
		* scrolling. This anchor is deleted in _onEnterFixUp().
		*
		* @param {Object} event event object
		*
		* @return {Boolean} false on error
		*
		* @see _onEnterFixUp()
		*
		* @todo figure out why sometimes _onEnterFixUp() is not correctly deleting the temporary span.
		*/

		_handleEnter: function( event )
			{
			ddt.log( "top of handleEnter()" );

			event.preventDefault();

			// we insert a <BR> where the cursor currently is. It may, however, be inside a text node
			// which means the text node needs to be split.

                        var sel = RANGE_HANDLER.getSelection();
                        var range = this.currentRange;

			ddt.log( "got range and selection", range );

                        sel.removeAllRanges();

			if ( ! range )
				{

				// chances are someone just clicked ENTER.

				var br = $( '<br>' );

				ddt.log( "_handleEnter(): adding br to id = '" + this.element.attr( 'id' ) + "'" );

				var node = $( '#' + this.element.attr( 'id' ) );

				$( br ).appendTo( node  );

	                        var textnode = this._insertEmptyNode( br.get(0), 'before', true );
	                        var textnode = this._insertEmptyNode( br.get(0), 'after', true );

				// patch in a selection

				range = rangy.createRange();
				sel = rangy.getSelection();

				range.setStart( textnode, 0 );
				range.setEnd( textnode, 0 );
				range.collapse( false );

	                        sel.removeAllRanges();
        	                sel.addRange(range);
				sel.refresh();

				ddt.log( "_handleEnter(): range is ", range );

				this.focus();

				// this._saveRange();

				return false;
				}

                        sel.addRange( range );

			var node = $( '<br>' );
	
			var dom_node = node.get(0);

                        range.insertNode( node.get(0) );
                        range.setStartAfter( node.get(0) );
                        range.setEndAfter( node.get(0) );
                        range.collapse( false );

                        sel.removeAllRanges();
                        sel.addRange(range);

                        ddt.log( "handleEnter(): previousSibling is : ", dom_node.previousSibling );

                        // check siblings before and after us, if any.
                        //
                        // And, in Chome and possibly other browsers, if this is the first element there is,
                        // an entirely empty text node is insert at the first position.

                        ddt.log( "handleEnter(): inserting zero width node before selection" );

                        // FIXME: Not sure why, but if I don't force the inclusion of empty nodes even if
                        // the object is surrounded by text nodes selections break. wtf? (i.e. without this
                        // inserting object into the middle of text lines fails in Webkit)

                        var textnode = this._insertEmptyNode( dom_node, 'before', true );

                        // if there is no sibling after us or if it's not a text node, add a zero width space.

                        ddt.log( "handleEnter(): inserting zero width node after selection" );

                        var textnode2 = this._insertEmptyNode( dom_node, 'after', true );

                        // FIXME: if this is 0, in Chrome it selects a point in the span.

                        this._selectTextNode( textnode2, 1 );

			// scrollintoview doesn't seem to work with a <BR> so insert an empty span,
			// scroll to it and then delete the span. Ugly hack.

			var tmp_span = $( '<span class="scrollto"></span>' );
			
			tmp_span.insertAfter( node );

			return false;

			},	// end of _handleEnter()

		/**
		* handle a range selection
		*
		* Handles case where use has selected potentially multiple nodes. The start and ends of the range
		* are checked and adjusted if they happen to fall within object boundaries.
		*
		* @return {Boolean} true if it's a multi-char range, false otherwise.
		*/

		_handleRangeSelection: function()
			{

			var sel = RANGE_HANDLER.getSelection();

			// if there's no selection, which can happen if we are scrolling, this will throw
			// an exception

			try 
				{
				var range = sel.getRangeAt(0);
				}
			catch( err )
				{
				ddt.log( "getRangeAt() failed - no range?" );

				// no selected range.

				return false;
				}

			var start_node = null;
			var end_node = null;

			ddt.log( "_handleRangeSelection(): checking range for mult-char selection: ", range );

			// did the user click and drag a selection. We /should/ get the final selection
			// here unlike the case with the keyboard lagging. 

			if ( range.collapsed == false )
				{

				ddt.log( "_handleRangeSelection(): we have a multi-character selection" );

				if (( start_node = this._clickedOnObject( range.startContainer )) != false )
					{

					ddt.log( "_handleRangeSelection(): range starts in an object." );

					range.setStartBefore( start_node );

					}

				if (( end_node = this._clickedOnObject( range.endContainer )) != false )
					{

					ddt.log( "_handleRangeSelection(): range ends in an object." );

					range.setEndAfter( end_node );

					}

				if (( start_node != false ) || ( end_node != false ))
					{

					ddt.log( "_handleRangeSelection(): modifying range :", range );

					sel.removeAllRanges();
					sel.addRange( range );
					}

				return true;

				}	// end of if the user selected a multi-char range.

			return false;

			},	// end of _handleRangeSelection()

		/**
		* saves the current range
		*
		* A problem arises when we want to call insertObject when the content editable div 
		* does not have focus. The current range selection gets screwed up and we end up
		* inserting content in the page where-ever the user had clicked last, or not at all. Not
		* good.
		*
		* So the idea is to keep track of the current range whenever the user does anything in 
		* the div. The range is then restored when insertObject is called.
		*
		* @param {Object} range - optional range to set.
		* @see insertObject()
		*/

		_saveRange: function( range )
			{
			ddt.log( "_saveRange(): before save currentRange: ", this.currentRange );

			// we may have been invoked because of a scrollbar move.

			if ( typeof( range ) == 'undefined' )
				{

				try
					{

					ddt.log( "_saveRange(): current selection is", RANGE_HANDLER.getSelection() );

					var range = RANGE_HANDLER.getSelection().getRangeAt(0);
					}
				catch( err )
					{

					ddt.log( "_saveRange(): no range? caught exception:" + err );
					return false;
					}

				}

		        this.currentRange = range.cloneRange();

			ddt.log( "_saveRange(): saving currentRange: ", this.currentRange );
			},

		/**
		* determines if we are in a trigger word
		*
		* checks the current, unreliable, cursor position to see if it is within the boundaries
		* of a trigger word. 
		*
		* The term found is set in the class member 'current_trigger' which communicates back not only
		* the term but also the start and end offsets of the trigger word along with the data source 
		* callback to use to get the autocomplete list. 
		*
		* TECH NOTES:
		*
		* One might be tempted to just use a selection range to determine the current
		* cursor position in order to test for the presence of a trigger character
		* (e.g. '@', '#', etc) in the _onKeyUp handler as it's being typed. Unfortunately, 
		* as fate would have it, when used in a keyup event handler, the range code seems 
		* unable to keep up with an even modest typist causing the incorrect character position 
		* to be returned in the range. (e.g. you type 'this' quickly and the range in the keyup 
		* callback returns four instances of the position of the 's'.)
		*
		* After much research combined with trial and error, it turns out that the selection
		* range is accurate in the KEYDOWN event handler. Go figure.
		*
		* Unfortunately, the keydown handler returns the position of the cursor BEFORE the key
		* is applied. This makes things difficult when you consider handling up arrows and down
		* arrows. (textbox of arbitrary size and newlines. You're on line 4 and press up arrow twice. 
		* What character offset in the box are you?)
		*
		* Most open source code I've seen inadvertently works around this issue in ways that don't
		* work accurately. More times than not once can confuse most triggered entry (@mention) 
		* solutions. Facebook, on the other hand, does do it correctly.
		*
		* So, when searching for whether or not we have encountered a trigger character and should
		* be in autocomplete mode, we have to take the current character position we've received,
		* which is either the position of the character just entered or some number of characters 
		* after it, and search backwards to see if it's the start of a trigger. It should be noted
		* that we may receive multiple keyup events for the same caret position.
		*
		* So, in summary:
		*
		* 	1. get the carent position in the callback, noting that it may or may not represent
		* 		a keypress several characters later. 
		*
		*	2. save the position.
		*
		* 	3. determine whether or not we are in autocomplete mode by looping backwards from the character
		*		position searching for an autocomplete trigger.
		*
		* @return {Boolean|Object} false if no term found otherwise the trigger_entry.
		*/

		_checkForTrigger: function()
			{

			var caret = null;
			var trigger_entry = null;

			caret = this._getCaretPosition();

			if (( ! caret ) || ( caret.offset == -1 ))
				{

				ddt.log( "_checkForTrigger(): we are not inside a text node. No trigger" );

				return false;
				}

			ddt.log( "_checkForTrigger(): current caret position is " + caret.offset );

			// are we inside the bounds of a trigger word that may be interspersed zero width space
			// character and may span multiple text nodes? (thanks WebKit)
			//
			// -1 because the caret position is to the right of the last character entered.

			trigger_entry = this._isTrigger( caret.dom_node, caret.offset - 1 );

			this.current_trigger = trigger_entry;

			return trigger_entry;

			},	// end of _checkForTrigger()

		/**
		* check for regex match
		*
		* An array of regex's may be defined that will invoke a callback if a matching pattern is 
		* entered by the user. For example, ;) might invoke a callback to insert a smiley icon.
		*
		* Callback functions are provided an object identifying the range and word matched that
		* invoked the callback.
		*
		* It is possible to combine trigger character callback and regexes on the same pattern. For
		* instance, consider #tags. On the one hand, once the user types #ta for instnace you want to 
		* display the dropdown but also if the user cancels out you may want to do something with the
		* new tag present in the text such as format it as a tag.
		*
		* Trigger definitions have precedence over regexs. For example we may define
		* a trigger on #tags but also define a regex on #[a-zA-Z0-9]+. If the user does not
		* select an item from the dropdown, the regex callback will be run. 
		*
		* @param {Event} event 
		*
		* @see regexes
		*/

		_checkRegexes: function( event )
			{

			var caret = null;
			var word_entry = null;

			ddt.log( "_checkRegexes(): with event: ", event );

			caret = this._getCaretPosition();

			if ( caret.offset == -1 )
				{

				ddt.log( "_checkRegexes(): we are not inside a text node. No word" );

				return false;
				}

			ddt.log( "_checkRegexes(): current caret position is " + caret.offset + " value is '" + caret.dom_node.nodeValue.charAt( caret.offset - 1 ) + "'" );

			if ( event.type =='keyup' )
				{

				// if the user pressed a space, then we need to start looking two characters back.

				if ( caret.offset < 3 )
					{
					return;
					}

				// we're in keyup so the cursor has moved past the space

		 		caret.offset--;

				}

			// are we inside the bounds of a word that may be interspersed zero width space
			// character and may span multiple text nodes? (thanks WebKit)
			//
			// -1 because the caret position is to the right of the last character entered.

			if ( word_entry = this._getWord( caret.dom_node, caret.offset - 1 ) )
				{

				ddt.log( "_checkRegexes(): found word '" + word_entry.word + "'" );

				// loop through the regex definitions checking each regular expression. If
				// we find a match, run the callback. We only run one match, the first match having
				// precedence.

				for ( var i = 0; i < this.options.regexes.length; i++ )
					{

					ddt.log( "_checkRegexes(): checking against '" + this.options.regexes[i].regex );

					if ( word_entry.word.match( this.options.regexes[i].regex ) )
						{

						ddt.log( "_checkRegexes(): found match at offset '" + i + "'" );

						this.options.regexes[i].callback( word_entry );

						}

					}

				}	// end of if we got a word.

			},	// end of _checkRegexes()

		/**
		* search backwards for start of trigger word.
		*
		* Are we in a trigger word? 
		*
		* WebKit browsers do not merge text nodes. As a result any text operations have to be done
		* taking the possibility of multiple text nodes into account. There's probably an easier way
		* such as just merging text nodes but I fear it's too easy to get out of whack. 
		*
		* Searches backwards over any empty space characters and/or nodes looking for a trigger characters.
		* Once found, checks to see that before it it either finds a space character 
		* or the beginning of a container. False otherwise.
		*
		* It should also be noted that WebKit likes to insert empty text nodes as well.
		*
		* @param {Node} dom_node textnode to start searching in.
		* @param {Integer} caret_position position to start search. 
		*
		* @return {object|Boolean} trigger_entry or false if not a trigger word boundary
		*
		* @see http://api.jquery.com/text/
		*/

		_isTrigger: function( dom_node, caret_position )
			{

			// modes are 'looking_for_trigger' and 'looking_for_space'

			var mode = 'looking_for_trigger';
			var trigger_entry = null;
			var loop_brake = 200;

			// used to remember where the trigger start character is.

			var trigger_start = {};

			// remember that we can inconveniently have zerospace characters anywhere after
			// inserts of lines and objects and subsequent deletes.
			//
			// search backwards for a trigger character.

			while ( true )
				{

				loop_brake--;

				if ( loop_brake <= 0 )
					{

					ddt.error( "_isTrigger(): runaway loop. braking" );

					return false;
					}

				if ( caret_position == -1 )
					{

					ddt.log( "_isTrigger(): top of loop, caret_position is '" + caret_position + "' previousSibling is:", dom_node.previousSibling );
		
					if ( dom_node.previousSibling == null )
						{
					
						ddt.log( "_isTrigger(): beginning of container found." );

						if ( mode == 'looking_for_trigger' )
							{

							ddt.log( "_isTrigger(): not a trigger" );

							return false;
							}

						break;	// out of while loop 
					
						}

  					if ( dom_node.previousSibling.nodeType != 3 )
						{

						ddt.log( "_isTrigger(): previousSibling is NOT a text node." );

						if ( mode == 'looking_for_trigger' )
							{

							ddt.log( "_isTrigger(): not a trigger" );

							return false;
							}

						break;	// out of while loop 

						}

					dom_node = dom_node.previousSibling;

					caret_position = dom_node.nodeValue.length - 1;

					ddt.log( "_isTrigger(): moving to previousSibling length '" + caret_position + "'" );

					if ( caret_position == -1 )
						{

						// empty text nodes seem to be inserted by WebKit randomly.

						ddt.log( "_isTrigger(): zero length textnode encountered" );

						continue;

						}

					}	// end of if we are at the beginning of a textnode.

				// do we have a zero width space character? 

				if ( dom_node.nodeValue.charAt( caret_position ) == '\u200B' )
					{

					ddt.log( "_isTrigger(): skipping zero width space character" );

					caret_position--;

					continue;
						
					}

				ddt.log( "_isTrigger(): Not a zero width space. Is it a space character?" );
								
				if ( ! dom_node.nodeValue.charAt( caret_position ).match( /\s+/ ))
					{

					// it's not a space. If we are still looking for a trigger character check
					// to see if it is one. 

					if ( mode == 'looking_for_trigger' )
						{

						ddt.log( "_isTrigger(): checking '" + dom_node.nodeValue.charAt( caret_position ) + "' for trigger char" );

						if ( trigger_entry = this._isTriggerChar( dom_node.nodeValue.charAt( caret_position ) ))
							{

							ddt.log( "_isTrigger(): found trigger char '" + dom_node.nodeValue.charAt( caret_position ) + "' at caret_position '" + caret_position + "'" );

							mode = 'looking_for_space';

							// make life easy, remember where the trigger start character is. 
							// (It might be a number of zerowidth character before we find a space character or
							// beginning of the container)

							trigger_start.dom_node = dom_node;
							trigger_start.offset = caret_position;

							caret_position--;

							continue;

							}

						ddt.log( "_isTrigger(): '" + dom_node.nodeValue.charAt( caret_position) + "' not a trigger char." );

						caret_position--;

						}
					else
						{

						// we are looking for a space and it's not a zero width character or a space. Thus 
						// the trigger character has something else in front of it. Not a trigger boundary.
			
						ddt.log( "_isTrigger(): character before trigger is not a space" );

						trigger_entry = null;

						return false;

						}

					}	// end of if we found a non-space character.
				else
					{

					// we found a space. IF we were looking for a trigger then we end. 

					if ( mode == 'looking_for_trigger' )
						{

						ddt.log( "_isTrigger(): found a space instead of a trigger char" );

						return false;
						}

					ddt.log( "_isTrigger(): found a space. This is the start of a trigger" );

					break;	// out of while loop

					}

				}	// end of while loop.

			// --------------------------------
			// Arrive here when we've found the beginning of a trigger word taking multiple text nodes
			// and zero width space characters into account.

			ddt.log( "_isTriggerStart(): found a trigger." );

			trigger_entry.startOffset = trigger_start.offset + 1;
			trigger_entry.startNode = trigger_start.dom_node

			// _getWordEnd() expects the node and offset pointing at the trigger character.

			trigger_entry = this._getWordEnd( trigger_entry );

			// need to include the trigger character as well.

			trigger_entry.startOffset = trigger_start.offset;

			this.current_trigger = trigger_entry;

			return trigger_entry;

			},	// end  of _isTrigger()

		/**
		* find the end boundary of a word taking multiple text nodes into account.
		*
		* searches from a given character offset forward to returns the string representing the word.
		* Takes multiple nodes and interspersed zero width characters into account.
		*
		* @param {Object} word_entry object containing startNode and startOffset of start of range to search.
		*
		* @return {Object|Boolean} with keys startNode, startOffset, endNode, endOffset, word or false if not a trigger word boundary
		*/

		_getWordEnd: function( word_entry )
			{
			
			var loop_brake = 200;
			var word = '';

			ddt.log( "_getWordEnd(): top with word_entry :", word_entry );

			var dom_node = word_entry.startNode;
			var caret_position = word_entry.startOffset;

			word_entry.word = '';

			ddt.log( "_getWordEnd(): at start of trigger word with caret_position '" + caret_position + "' and char '" + dom_node.nodeValue.charAt( caret_position ) + "' length '" + dom_node.nodeValue.length + "'" );

			while ( true )
				{

				// for when I make mistakes. avoids locking up the browser.

				if ( loop_brake-- <= 0 )
					{
					ddt.error( "_getWordEnd(): runaway loop" );

					return false;
					}

				ddt.log( "_getWordEnd(): Top of loop '" + caret_position + "'" );

				// can be 0 if we get a 0 length node 

				if ( caret_position >= dom_node.nodeValue.length )
					{

					if ( dom_node.nextSibling == null )
						{
					
						ddt.log( "_getWordEnd(): returning '" + word + "'" );

						word_entry.endNode = dom_node;
						word_entry.endOffset = caret_position - 1;
						word_entry.word = word;

						return word_entry;
					
						}

  					if ( dom_node.nextSibling.nodeType != 3 )
						{

						ddt.log( "_getWordEnd(): nextSibling is NOT a text node. Returning '" + word + "'" );

						word_entry.endNode = dom_node;
						word_entry.endOffset = caret_position - 1;
						word_entry.word = word;

						return word_entry;
						}

					ddt.log( "_getWordEnd(): moving to next sibling of type '" + dom_node.nextSibling.nodeType + "' with length '" + dom_node.nextSibling.nodeValue.length + "' and value '" + dom_node.nextSibling.nodeValue + "'" );

					dom_node = dom_node.nextSibling;
					caret_position = 0;

					// occasionally at the end of a line, zero width text nodes show up in WebKit which are
					// apparently not selectable.
					//
					// FIXME: do these always show up at the end of a line? 

					if ( dom_node.nodeValue.length == 0 )
						{
						
						ddt.log( "_getWordEnd(): empty text node found." );

						continue;

						}

					}	// end of if we were at the end of a text node.

				// do we have a zero width space character? 

				if ( dom_node.nodeValue.charAt( caret_position ) == '\u200B' )
					{

					ddt.log( "_getWordEnd(): skipping zero width space character" );

					caret_position++;

					continue;
						
					}
				
				if ( ! dom_node.nodeValue.charAt( caret_position ).match( /\s+/ ) )
					{

					// it's not a zero width character or a space. add it to the trigger string.
			
					ddt.log( "_getWordEnd(): non-space, adding to string position '" + caret_position + "' char '" + dom_node.nodeValue.charAt( caret_position ) + "' node of length '" + dom_node.nodeValue.length + "':", dom_node );

					word += dom_node.nodeValue.charAt( caret_position );

					caret_position++;

					}
				else 
					{

					ddt.log( "_getWordEnd(): found a space. Returning '" + word + "'" );

					word_entry.endNode = dom_node;

					// current position is a space.

					word_entry.endOffset = caret_position - 1;
					word_entry.word = word;

					return word_entry;

					}

				}	// end of while loop.

			},	// end of _getWordEnd()

		/**
		* is the given character a trigger character?
		*
		* @return object trigger definition.
		*/

		_isTriggerChar: function( char )
			{

			for ( var i in this.options.triggers )
				{

				if ( char == this.options.triggers[i].trigger )
					{

					// ddt.log( "_isTriggerChar(): found trigger char " + char );

					return this.options.triggers[i];
					}

				}

			return false;

			},	// end of _isTriggerChar()

		/**
		* search for the boundaries of a word.
		*
		* given a dom_node and an offset searches backwards then forwards for the boundary of a 
		* word.  
		*
		* Once found, returns the word in addition to the range.
		*
		* @param {Node} dom_node textnode to start searching in.
		* @param {Integer} caret_position position to start search. 
		*
		* @return {object|Boolean} with keys word, startNode, startOffset, endNode, endOffset or false if not a word
		*/

		_getWord: function( dom_node, caret_position )
			{

			var loop_brake = 200;

			// used to return the word, and range.

			var word = {};

			// used to track if we found non-whitespace

			var found_char_flag = false;

			// remember that we can inconveniently have zerospace characters anywhere after
			// inserts of lines and objects and subsequent deletes.
			//
			// search backwards for a space.

			while ( true )
				{

				loop_brake--;

				if ( loop_brake <= 0 )
					{

					ddt.error( "_getWord(): runaway loop. braking" );

					return false;
					}

				if ( caret_position == -1 )
					{

					ddt.log( "_getWord(): top of loop, caret_position is '" + caret_position + "' previousSibling is:", dom_node.previousSibling );
		
					if ( dom_node.previousSibling == null )
						{

						// beginning of container means we've found a word boundary.
											
						ddt.log( "_getWord(): beginning of container found." );

						break;	// out of while loop 
					
						}

  					if ( dom_node.previousSibling.nodeType != 3 )
						{

						// running into a different element also means a word boundary (likely a BR)

						ddt.log( "_getWord(): previousSibling is NOT a text node." );

						break;	// out of while loop 

						}

					dom_node = dom_node.previousSibling;

					caret_position = dom_node.nodeValue.length - 1;

					ddt.log( "_getWord(): moving to previousSibling length '" + caret_position + "'" );

					if ( caret_position == -1 )
						{

						// empty text nodes seem to be inserted by WebKit randomly.

						ddt.log( "_getWord(): zero length textnode encountered" );

						continue;

						}

					}	// end of if we are at the beginning of a textnode.

				// do we have a zero width space character? 

				if ( dom_node.nodeValue.charAt( caret_position ) == '\u200B' )
					{

					ddt.log( "_getWord(): skipping zero width space character" );

					caret_position--;

					continue;
						
					}

				ddt.log( "_getWord(): Not a zero width space. Is it a space character?" );
								
				if ( dom_node.nodeValue.charAt( caret_position ).match( /\s+/ ))
					{

					// we've found a space character and thus the beginning of a word.

					ddt.log( "_getWord(): found a space. This is the start of a word" );

					break;

					}
				else
					{
					// found a normal character

					found_char_flag = true;
					}


				ddt.log( "_getWord(): '" + dom_node.nodeValue.charAt( caret_position) + "' not a space." );

				caret_position--;

				}	// end of while loop.

			// --------------------------------
			// Arrive here when we've found the beginning of a word taking multiple text nodes
			// and zero width space characters into account.

			word.startNode = dom_node;

			// current char is a space. move past it.

			word.startOffset = caret_position + 1 ;

			// if we only matched whitespace, abort.

			if (! found_char_flag )
				{

				ddt.log( "_getWord(): only found whitespace" );

				return false;
				}

			ddt.log( "_getWord(): found a the beginning of a word, now searching for the end." );

			// _getWordEnd() expects the node and offset pointing at the beginning of the word.

			word = this._getWordEnd( word );

			return word;

			},	// end  of _getWord()

		/**
		* check for the presence of an object
		*
		* Checks forward or backwards to see if we are next to an embedded object.
		* If so, returns the node. 
		*
		* NOTE that zero width space characters are present as a work around for the case
		* where two embedded objects are right next to one another. This allows us to form
		* a textnode selection of that space in WebKit browsers. For purposes of this method, 
		* the cursor is right next to an object even if it separated by any number of zerowidth 
		* space characters which may be present in any number of textnodes.
		*
		* As a separate case, webkit browsers seems to randomly add <BR> elements before or after
		* embedded objects (i.e. <SPAN>'s) which mucks up the works. 
		*
		* This is complicated by the fact that browsers will insert various elements into contenteditable
		* divs at their own discretion, notably <BR>'s, <P>'s and <DIV>'s when the users enters a new line. 
		*
		* @param {String} direction 'left' or 'right'
		*
		* @return {Object} with keys dom_node and container_spanned
		*/

		_checkForAdjacentObject: function( direction )
			{

			var location = {};
			var dom_node = null;
			var object = null;
	
			// when the editable div is first loaded and we have not yet 
			// clicked in the window, we may not have a current caret position.

			if ( ! ( location = this._getCaretPosition() ))
				{	
				return false;
				}

			dom_node = location.dom_node;

			ddt.log( "_checkForAdjacentObject(): looking in direction '" + direction + "' current node is :", dom_node );

			// SPECIAL CASE: if the node is clicked on by the mouse, we will, in FireFox, get the embedded object node.

			if ( this._isEmbeddedObject( dom_node ) )
				{
				ddt.log( "_checkForAdjacentObject(): current node is an object. returning" );

				return { dom_node: dom_node, container_spanned: false, preventDefault: true };
				}

			if (( location = this._treeWalker( location.dom_node, location.offset, direction )) == false )
				{
				ddt.log( "_checkForAdjacentObject(): none found" );
				return false;
				}

			ddt.log( "_checkForAdjacentObject(): _treeWalker returned: ", location );

			// SPECIAL HANDLING for Mozilla. If we get a _moz_dirty BR we consider ourselves NOT next to 
			// an object if we are looking to the right. (<BR> is essentially a stop character.)
			//
			// But we should look to the left. 

			if ( $( dom_node ).filter( '[_moz_dirty]' ).length != 0 )
				{

				if ( direction == 'left' )
					{

					// look left for an object. 

					if (( location = this._treeWalker( location.dom_node.previousSibling, location.offset, direction )) == false )
						{
						ddt.log( "_checkForAdjacentObject(): none found" );
						return false;
						}

					}
				else
					{
					ddt.log( "_checkForAdjacentObject(): current node is a moz_dirty filthy BR. don't look right." );

					return false;
					}
				}

			// if we are pointing at the beginning or end of a text node, we might be right beside
			// an embedded object. check the previous/next node

			if ( location.dom_node.nodeType == 3 )
				{

				ddt.log( "_checkForAdjacentObject(): _treeWalker returned a text node with offset '" + location.offset + "'" );

				if (( direction == 'left' ) && ( location.offset == 0 ))
					{

					if ( this._isEmbeddedObject( location.dom_node.previousSibling ) )
						{
						return { dom_node: location.dom_node.previousSibling, container_spanned: ! location.checkForObjects, preventDefault: location.preventDefault };
						}

					}
				else if (( direction == 'right' ) && ( location.offset == location.dom_node.nodeValue.length ))
					{

					if ( this._isEmbeddedObject( location.dom_node.nextSibling ) )
						{
						return { dom_node: location.dom_node.nextSibling, container_spanned: ! location.checkForObjects, preventDefault: location.preventDefault };
						}

					}

				}

			if ( ! this._isEmbeddedObject( location.dom_node ) )
				{
				return false;
				}

			return { dom_node: location.dom_node, container_spanned: ! location.checkForObjects, preventDefault: location.preventDefault };

			},	// end of _checkForAdjacentObject()

		/**
		* have we selected an object with the mouse?
		*
		* If the given node is an object or is inside an object, returns the object. False otherwise.
		*
		* @param {Node} dom_node node that was clicked on, maybe a child node of an embedded object.
		*
		* @return {Node|Boolean} dom_node of object or false if not an object.
		*/

		_clickedOnObject: function( dom_node )
			{

			ddt.log( "_clickedOnObject(): got current node : ", dom_node );

			// it's an object if it or some ancestor in the editable div has 
			// a data-value. 

			while ( $( dom_node ).attr( 'id' ) != this.element.attr( 'id' ) )
				{

				if ( this._isEmbeddedObject( dom_node ) )
					{

					ddt.log( "_clickedOnObject(): found object node '" + dom_node + "'" );

					return dom_node;
					}

				dom_node = dom_node.parentNode;

				ddt.log( "_clickedOnObject(): checking parent node : ", dom_node );

				}

			ddt.log( "_clickedOnObject(): user did not click on an object" );

			return false;

			},	// end of clickedOnObject()

		/**
		* delete an inserted object
		*
		* Called when an object is "backspaced" over or deleted with the DEL key, removes the object
		* and when needed, any wrapping zero width whitespace so that no freestanding zero width spaces
		* are left.
		*
		* @param {Node} dom_node the DOM node representing the embedded object to delete.
		*/

		deleteObject: function( dom_node )
			{

			ddt.log( "deleteObject(): top with node: ", dom_node );

			var sel = RANGE_HANDLER.getSelection();

			var parent = dom_node.parentNode;

			// originally the range included any surrounding zero width characters but no longer. 
			// It's better to have too many than not enough.

			var range = this._getObjectRange( dom_node );

			ddt.log( "deleteObject(): range to delete is : ", range );

			range.deleteContents();
			range.collapse( true );

			sel.removeAllRanges();
			sel.addRange( range );

			// was this object the only remaining object in our parent? 

			if (( $( parent ).attr( 'id' ) != this.element.attr( 'id' ) ) &&
				( parent.childNodes.length == 0 ))
				{

				ddt.log( "deleteObject(): last element of container deleted. Deleting container." );

				range.setStartBefore( parent );
				range.setEndAfter( parent );
				range.deleteContents();
				range.collapse( true );

				sel.removeAllRanges();
				sel.addRange( range );

				}

			this._saveRange();

			return;

			},	// end of deleteObject()

		/**
		* skip over zero width space characters in a textnode.
		*
		* zero width space characters are used in the emptiness between divs so that 
		* they can be selectable using a range. (especially for webkit browsers)
		*
		* Unfortunately, if you use the arrow keys over these zero width spaces, they 
		* consume a keystroke causing the cursor not to move.
		*
		* This method jumps the cursor over any number of zero width space characters, possibly
		* spanning multiple text nodes and adjacent containers. It updates the selection accordingly.
		*
		* @param {Node} dom_node dom_node where to start skipping.
		* @param {Integer} caret_position if dom_node is a text node, offset where to start looking.
		* @param {String} direction may be 'left' or 'right'.
		*
		* @return {Object|Boolean} dom_node, offset, type, checkForObjects, preventDefault or false on error.
		* 
		* @see insertEditableSelection()
		* @see _onMouseUp()
		*/

		_moveCaret: function( dom_node, caret_position, direction )
			{

		 	var loop_count = 0;
			var location = {};

			ddt.log( "_moveCaret(): top with direction '" + direction + "' with node: ", dom_node );

			if (( location = this._treeWalker( dom_node, caret_position, direction )) == false )
				{
				ddt.log( "_moveCaret(): _treeWalker returned false" );

				return false;
				}

			ddt.log( "_moveCaret(): _treeWalker() returned location: ", location );

			// do we have an object?

			if ( location.type == 'object' )
				{

				// position the caret before or behind the object. 
				//
				// NOTE: in this scenario we've just moved the caret towards the object,
				// so we want to stop at the object and not jump over it.

				if ( direction == 'left' )
					{
					this._setCaretPositionRelative( location.dom_node, 'after' );
					}
				else
					{
					this._setCaretPositionRelative( location.dom_node, 'before' );
					}

				return location;

				}

			// special handling if we were in a container and just stepped out.
			
			if ( location.type == 'container' )
				{
				
				ddt.log( "_moveCaret(): we were in a container and have stepped out. Selecting '" + direction + "' side" );

				if ( direction == 'left' )
					{

					// we may have a text node, a container, or some other element as our previousSibling. 
					// If it's a container, we want to select the last child in it. 

					if (( location.dom_node.previousSibling.nodeName == 'DIV' ) ||
						( location.dom_node.previousSibling.nodeName == 'P' ))
						{

						// guard against an empty container

						if ( location.dom_node.previousSibling.childNodes.length == 0 )
							{
							ddt.error( "_moveCaret(): empty container previousSibling" );
							return false;
							}

						ddt.log( "_moveCaret(): moving into container: '" + location.dom_node.previousSibling + "' from '" + location.dom_node + "'" );

						this._setCaretPositionRelative( location.dom_node.previousSibling, 'end' );

						location.dom_node = location.dom_node.previousSibling.childNodes[ location.dom_node.previousSibling.childNodes.length - 1 ];

						return location;

						}	// end of if we had a container.

					// if it's a textnode, to work around issues in FireFox, we want to select the end
					// of the textnode. 

					if ( location.dom_node.previousSibling.nodeType == 3 )
						{

						ddt.log( "_moveCaret(): previousSibling is a textnode" );

						location.dom_node = location.dom_node.previousSibling;

						// Chrome may cause us grief with a 0 width text node here. 

						if	( location.dom_node.nodeValue.length == 0 )
							{

							// FIXME: not sure what to do in this case, if it ever occurs.

							ddt.error( "_moveCaret(): previousSibling is a zero length textnode." );
							return false;
							}

						this._setCaretPositionRelative( location.dom_node, 'end' );

						return location;

						}	// end of if we had a text node.

					location.dom_node = location.dom_node.previousSibling;

					// some other element. 

					ddt.log( "_moveCaret(): moving before element '" + location.dom_node + "'" );

					this._setCaretPositionRelative( location.dom_node, 'before' );

					return location;

					}
				else
					{

					// FIXME: Moving to the right seems less problematic across the board.

					// to avoid errors when we right arrowing at end the of the editable div.

					if ( location.dom_node.nextSibling == null )
						{

						ddt.log( "_moveCaret(): nextSibling is null in container. setting position 'after' with node:", location.dom_node );

						this._setCaretPositionRelative( location.dom_node, 'after' );
						return location;
						}

					// we may have some normal node like a text node or we may have a container 
					// as our nextSibling. We can't select the container, we want to select the
					// end of it. 

					if (( location.dom_node.nextSibling.nodeName == 'DIV' ) ||
						( location.dom_node.nextSibling.nodeName == 'P' ))
						{

						// guard against an empty container

						if ( location.dom_node.nextSibling.childNodes.length == 0 )
							{
							ddt.error( "_moveCaret(): empty container nextSibling" );
							return false;
							}

						location.dom_node = location.dom_node.nextSibling.childNodes[ 0 ];

						}

					this._setCaretPositionRelative( location.dom_node, 'after' );

					}

				return location;
								
				}	// end of if we came out of a container.

			// special handling if we just stepped into a container. WebKit is fond of adding zero 
			// width text nodes at the ends of containers.

			if ( location.type == 'child' )
				{

				ddt.log( "_moveCaret(): handling special stepping into child case" );

				// If we're moving into a text node at the beginning of a container

				if ( location.dom_node.nodeType == 3 ) 
					{

					// FIXME: kept here for posterity as a reminder that we can get 0 length nodes
					// here.

					if ( location.dom_node.nodeValue.length == 0 )
						{
						ddt.log( "_moveCaret(): zero width text node. selecting it." );
					
						this._selectTextNode( location.dom_node, 0 );

						return location;
						}

					ddt.log( "_moveCaret(): text node child with some content. selecting it" );

					this._selectTextNode( location.dom_node, 0 );

					// since this is a text node we want to prevent the default action from happening
					// otherwise we move one character too far to the right. see _onKeyDown(). Since
					// we are a location type of 'child' onKeyDown will not jump over any adjacent objects.

					return location;
					}
															
				// since we just jumped into a container presumably, we don't want to 
				// jump over any objects we happen to be next to.

				return location;

				}	// end of if we moved into a child container.
										
			// text node.

			if ( location.dom_node.nodeType == 3 )
				{

				ddt.log( "_moveCaret(): selecting text node for direction '" + direction + "' :", location );

				this._selectTextNode( location.dom_node, location.offset );

				return location;
				}

			// For mozilla, move the cursor to the far side of a <BR _moz_dirty=""> tag. 

			if ( location.dom_node.nodeName == 'BR' )
				{

				ddt.log( "_moveCaret(): we have a BR" );

				// is this a mozilla _moz_dirty BR? 

				if ( $( location.dom_node ).filter( '[_moz_dirty]' ).length != 0 )
					{

					// we've come up on a BR in mozilla, which is used to mark the end
					// of lines.

					if ( direction == 'left' )
						{

						ddt.log( "_moveCaret(): moving to left side of _moz_dirty BR starting with location:", location );

//						location = this._moveCaret( location.dom_node.previousSibling, -1, 'left' );

						location.type = '_moz_dirty';
						location.preventDefault = true;

						ddt.log( "_moveCaret(): location returned after BR is: ", location );

						this._setCaretPositionRelative( location.dom_node, 'before' );

						return location;

						}
					else
						{
						ddt.log( "_moveCaret(): moving to right side of _moz_dirty BR" );

						// just move to the right of the BR which represents moving down to the 
						// new line. Any additional zero space characters will be consumed the next
						// time the user presses arrow keys

						this._setCaretPositionRelative( location.dom_node, 'after' );

						return location;

						}

					}	// end of if we had a _moz_dirty BR.

				// some other normal BR.

				ddt.log( "_moveCaret(): normal BR" );

				if ( direction == 'left' )
					{
					this._setCaretPositionRelative( location.dom_node, 'before' );
					}
				else
					{
					this._setCaretPositionRelative( location.dom_node, 'after' );
					}

				}

			return location;

			},	// end of _moveCaret()

		/**
		* backspace over zero width space character
		*
		* After editing the content of the div, the situation can arise where
		* zero width spaces are interspersed in the content. Sometimes we want to delete
		* these spaces, such as if they occur between text nodes, or as the final child
		* of a container div, but in other circumstances, such as if it's at the end of 
		* a container div or right next to some embedded objects we want to leave it intact.
		*
		* @return {String|Boolean} true if characters were removed, false if nothing changed, 'stop' if we encountered a stop word
		*/

		_backspaceZeroSpace: function()
			{

			var dom_node = null;
			var delete_flag = false;
			var runaway_brake = 0;
			var caret_position = null;
			var location = {};
			var start_location = {};
			var end_location = {};
			var sel = null;
			var range = null;

			location = this._getCaretPosition();

			dom_node = location.dom_node;

			ddt.log( "_backspaceZeroSpace(): current dom node is :", dom_node );

			if (( dom_node.nodeType != 3 ) && ( dom_node.nodeName != 'BR' ))
				{
				
				ddt.log( "_backspaceZeroSpace(): backspacing over a NON-BR '" + dom_node.nodeName + "' node" );

				return false;
				}
			
			// BR's have to be handled specially.
			
			if ( dom_node.nodeName == 'BR' )
				{

				ddt.log( "_backspaceZeroSpace(): backspacing over BR" );

				// Lines are separated by BR's in Mozilla with the moz_dirty attribute. If we encounter
				// one we consider it a stop word. DO NOT delete any objects in front of it.
				//
				// see _onKeyDown BACKSPACE

				if ( $( dom_node ).filter( '[_moz_dirty]' ).length != 0 )
					{
					ddt.log( "_backspaceZeroSpace(): moz_dirty filthy BR encountered. Stop word" );

					return 'stop';
					}

				// depends on what we find in front of the BR. Could be a textnode, could be some
				// other element or might be the beginning of a container.

				if ( dom_node.previousSibling == null )
					{

					ddt.log( "_backspaceZeroSpace(): beginning of container" );

					this._setCaretPositionRelative( dom_node, 'before' );

					$( dom_node ).remove();

					// tell the caller we moved the cursor.

					return true;
					}

				if ( dom_node.previousSibling.nodeType != 3 )
					{

					ddt.log( "_backspaceZeroSpace(): previous element is NOT a textnode :", dom_node.previousSibling );

					this._setCaretPositionRelative( dom_node, 'before' );

					$( dom_node ).remove();

					// tell the caller we moved the cursor. 

					return true;

					}

				// arrive here if we have a text node. move the cursor to the end of the text node.

				this._setCaretPositionRelative( dom_node.previousSibling, 'end' );
				$( dom_node ).remove();

				}

			// arrive here if we have a text node for an end point.

			end_location = this._getCaretPosition();

			if (( start_location = this._walkTextNode( end_location.dom_node, end_location.offset, 'left' )) == false )
				{
				ddt.error( "_backspaceZeroSpace(): walkTextNode return false" );

				return false;
				}

			ddt.log( "_backspaceZeroSpace(): got start_location: ", start_location );

			sel = RANGE_HANDLER.getSelection();
			range = CREATERANGE_HANDLER.createRange();

			// the start_location may be an element (object) which we do not want to delete here.
			// this method should just delete the zerospace chars.

			if ( start_location.dom_node.nodeType != 3 )
				{
				range.setStartAfter( start_location.dom_node );
				}
			else
				{
				range.setStart( start_location.dom_node, start_location.offset );
				}

			range.setEnd( end_location.dom_node, end_location.offset );
			range.deleteContents();

			sel.removeAllRanges();
			sel.addRange( range );

			this._saveRange();

			return true;

			},	// end of _backspaceZeroSpace()

		/**
		* delete over zero width space character
		*
		* This is the analog to _backspaceZeroSpace for the delete button case.
		* When delete is pressed, we may have any number of non printing whitespace
		* characters between us and the next visible item.
		*
		* @return {String|Boolean} true if characters were removed, false if nothing changed, 'stop' if we encountered a stop word
		*/

		_deleteZeroSpace: function()
			{

			var dom_node = null;
			var delete_flag = false;
			var runaway_brake = 0;
			var caret_position = null;
			var location = {};
			var start_location = {};
			var end_location = {};
			var sel = null;
			var range = null;

			start_location = this._getCaretPosition();

			ddt.log( "_deleteZeroSpace(): current dom node is :", start_location.dom_node );

			// Unlike backspace, all we care about are non-printing text nodes.

			if ( start_location.dom_node.nodeType != 3 )
				{
				
				ddt.log( "_deleteZeroSpace(): deleting NON-TEXT '" + start_location.dom_node.nodeName + "' node" );

				return false;
				}
			
			// we have a text node.

			if (( end_location = this._walkTextNode( start_location.dom_node, start_location.offset, 'right' )) == false )
				{
				ddt.error( "_deleteZeroSpace(): walkTextNode return false" );

				return false;
				}

			ddt.log( "_deleteZeroSpace(): got start and end_location: ", start_location, end_location );

			// if we did not skip over any non-printing characters, do nothing.
			// NOTE: === comparison here checks to see if the two nodes are the same node, not just the same type.

			if (( start_location.dom_node === end_location.dom_node ) && ( start_location.offset == end_location.offset ))
				{

				ddt.log( "_deleteZeroSpace(): _walkTextNode() did not move cursor" );

				return false;
				}

			sel = RANGE_HANDLER.getSelection();
			range = CREATERANGE_HANDLER.createRange();

			range.setStart( start_location.dom_node, start_location.offset );

			// the end_location may be an element (object) which we do not want to delete here.
			// this method should just delete the zerospace chars.

			if ( end_location.dom_node.nodeType != 3 )
				{
				ddt.log( "_deleteZeroSpace(): setting end of range before dom_node" );
				range.setEndBefore( end_location.dom_node );
				}
			else
				{
				ddt.log( "_deleteZeroSpace(): setting end of range at offset '" + end_location.offset + "'" );
				range.setEnd( end_location.dom_node, end_location.offset );
				}

			range.deleteContents();

			sel.removeAllRanges();
			sel.addRange( range );

			this._saveRange();

			return true;

			},	// end of _deleteZeroSpace()


		/**
		* walk through document nodes forwards or backwards searching for text/object boundaries
		*
		* This method walks through DOM nodes in forward or backward directional order searching 
		* for:
		*
		*	an embedded object
		*	a non zero width text node character
		*  a container element
		*	the beginning or end end of a parent container.
		*	a moz_dirty BR
		*
		* During the process of editing the contents of the contenteditable node, browsers can insert
		* a number of different elements in various circumstances. For the purposes of emulating a 
		* textarea, some elements, such as a BR in a <DIV>, are treated as zero width characters.
		*
		* It should also be noted that Chrome especially is fond of deeply nesting DIVs when 
		* breaking an rejoining lines.
		*
		* @param {Node} dom_node dom_node to start searching from
		* @param {Integer} caret_position offset if dom_node is a text_node. -1 otherwise.
		* @param {String} direction direction to search 'left' or 'right'
		*
		* @return {Object|Boolean} with keys dom_node, offset, type, preventDefault, checkForObjects
		*
		* @todo need to handle multiple BRs 
		* @todo only P and DIVs are used as containers in Chrome/MSIE. Need to generalize support for other containers such as bold, lists, etc.
		*/
		
		_treeWalker: function( dom_node, caret_position, direction )
			{

			var location = { type: '' };
			var loop_brake = 100;

			// used to note if we jumped a container at any point and thereby have to prevent the default
			// action on any event callback. 

			var preventDefault_flag = false;
			
			// keeps track of whether or not we've spanned a container. 
			
			var container_spanned_flag = false;
									
			ddt.log( "_treeWalker(): top searching '" + direction + "' caret_position '" + caret_position + "' current node: ", dom_node );

			while ( dom_node != null )
				{

				// to avoid those times I make a mistake and lock the browser.

				if ( loop_brake-- <= 0 )
					{
					ddt.error( "_treeWalker(): runaway loop" );
					return false;
					}

				// if we have a text node that contains anything other than zero width space characters we 
				// return it.

				if ( dom_node.nodeType == 3 )
					{

					ddt.log( "_treeWalker(): we have a text node with contents '" + dom_node.nodeValue + "' and caret_position '" + caret_position + "'" );

					if (( location = this._walkTextNode( dom_node, caret_position, direction )) == false )
						{
						ddt.error( "_treeWalker(): walkTextNode returned false" );
						return false;
						}

					ddt.log( "_treeWalker(): walkTextNode() returned: ", location );

					// there are several cases: 
					//
					//	.	either end of the editable div
					//	.	either end of a container
					//	.	adjacent to an object
					//	.	in a text node with non-zero-width space character.
					
					switch ( location.type )
						{
							
						case 'text':
						
							ddt.log( "_treeWalker(): _walkTextNode() returned a textnode" );

							// if we end up with a zero width textnode, loop around and do it again.

							if ( location.dom_node.nodeValue.length > 0 )
								{
								ddt.log( "_treeWalker(): _walkTextNode() returned a normal text node" );

								location.preventDefault = preventDefault_flag;

								return location;
								}

							ddt.log( "_treeWalker(): _walkTextNode() returned a 0 width text node" );
								
							if ( direction == 'left' )
								{
								dom_node = location.dom_node.previousSibling;
								}
							else
								{
								dom_node = location.dom_node.nextSibling;
								}

							caret_position = -1;

							continue;

							break;

						case 'element':
						case 'object':

							// likely a BR or DIV.

							ddt.log( "_treeWalker(): _walkTextNode() returned an element or object" );

							dom_node = location.dom_node;
							caret_position = -1;

							break;

						// FIXME: should be named 'container_end' or similar. 

						case 'container':

							// we walked to the end of a text node and encountered a container. 
							// We need to move to the previous or next sibling of the container.

							ddt.log( "_treeWalker() _walkTextNode() encountered the end of a container. need to step out." );

							preventDefault_flag = true;
							container_spanned_flag = true;

							caret_position = -1;

							dom_node = location.dom_node;

							break;

						case 'end':

							// end of the editable div reached.

							ddt.log( "_treeWalker(): at end of editable div" );

							return false;

							break;

						}	// end of switching over _walkTextNode() reponses

					}	// end of we were dealing with a text node.
											
				if ( this._isEmbeddedObject( dom_node ))
					{

					// we have an embedded object.

					ddt.log( "_treeWalker(): we have found an object node: ", dom_node );

					// IMPORTANT: in Webkit if we disable the default behavior on moving right, it won't jump
					// over the object correctly.
					//
					// if we have spanned containers we do not want to highlight the object (i.e. we can be
					// called from highlightObject() 'left' or 'right', and only want to highlight the objects
					// if we have not spanned a container.)

					var check_for_objects = true;

					if ( container_spanned_flag )
						{
						check_for_objects = false;
						}

					return { dom_node: dom_node, offset: -1, type: 'object', preventDefault: preventDefault_flag, checkForObjects: check_for_objects };

					}
				
				if ( dom_node.nodeName == 'BR' )
					{

					// we have a BR. skip over it unless it's a moz_dirty which indicates a
					// stopping point.

					ddt.log( "_treeWalker(): we have a BR" );

					if ( $( dom_node ).filter( '[_moz_dirty]' ).length != 0 )
						{

						ddt.log( "_treeWalker(): we have a _moz_dirty BR. stopping" );

						return { dom_node: dom_node, offset: -1, type: 'element', preventDefault: preventDefault_flag, checkForObjects: false };

						}

					// FIXME: Need to check this in all places where we can get BR's. If we have
					// a few BR's in a row the user may press keys multiple times to get over them.

					return { dom_node: dom_node, offset: -1, type: 'element', preventDefault: preventDefault_flag, checkForObjects: false };

					}

				// special handling for a container we encounter. We dive into the container and start
				// from the end based on direction, but only if we haven't just stepped out of the same
				// container as a result of _walkTextNode(). See above. Ugly, I know.

				if (( location.type != 'container' ) &&
					(( dom_node.nodeName == 'DIV' ) ||
					( dom_node.nodeName == 'SPAN' ) ||
					( dom_node.nodeName == 'P' )))
					{

					ddt.log( "_treeWalker(): we have found a container of type '" + dom_node.nodeName + "' :", dom_node );

					preventDefault_flag = true;
					container_spanned_flag = true;

					// we have encountered a container at one end or the other.
					//
					// e.g. something like <div>text<div><span>object</span></div>
					//
					// or <div>text</div><div>text</div>
					//
					// or <div><div><div>test</div></div></div>
					// 
					// in the last case we want to jump into the div's to the end of 'test'
					// regardless of the level of nesting. Chrome, when editing and merging/splitting
					// lines seems to like nesting div's. I haven't had much luck reliably modifying
					// the markup (seems to confuse Chrome), so I'm just treating multiply nested
					// div's as a single newline. (which is who it's actually rendered in the 
					// contenteditable div anyway).
					//
					// However, the container boundary is a stop IF the last/first child node
					// is itself NOT a container (i.e. stop on objects, text but not
					// nested divs or p's)
					// 
					// So, if there is some node we can step into at the end of the container
					// we return the container and let our caller step into it. Otherwise we loop
					//
					// does our container have children?

					if ( dom_node.childNodes.length == 0 )
						{
						ddt.log( "_treeWalker(): container with 0 children. adding text node and returning." );

						var textnode = this._insertEmptyNode( dom_node, 'child' );
						return { dom_node: textnode, offset: 0, type: 'child', preventDefault: preventDefault_flag, checkForObjects: false };
						}

					// inspect the child node at the end.

					var child_node = null;

					if ( direction == 'left' )
						{

						ddt.log( "_treeWalker(): LEFT: getting child of container at position '" + (dom_node.childNodes.length - 1) + "'" );

						child_node = dom_node.childNodes[ dom_node.childNodes.length - 1 ];
						}
					else
						{
						child_node = dom_node.childNodes[ 0 ];
						}

					// guard against the possibility of some other unexpected markup making it 
					// into the DIV.
					//
					// FIXME: in the future we'll probably want to support all kinds of markup to make
					// the editable area more expressive.

					if (( child_node.nodeType != 3 ) &&
						( ! this._isEmbeddedObject( child_node )) &&
						( child_node.nodeName != 'DIV' ) &&
						( child_node.nodeName != 'P' ) &&
						( child_node.nodeName != 'BR' ))
						{
						ddt.log( "_treeWalker(): returning a container that has an element child node '" + child_node.nodeName + "'" );

						return { dom_node: dom_node, offset: -1, type: 'child', preventDefault: preventDefault_flag, checkForObjects: false };
						}

					// HACK: special check for Chrome. Make sure to stop if we enter into a DIV containing
					// just a zero width space character. Otherwise after the user presses enter a bunch of times
					// we may end up skipping lines on moving LEFT or RIGHT.

					if (( child_node.nodeType == 3 ) &&
						( child_node.nodeValue.match( /^[\u200B]+$/ ) != null ))
						{
						ddt.log( "_treeWalker(): webKit hack. empty DIV with zero width space. Stopping" );

						return { dom_node: child_node, offset: 0, type: 'child', preventDefault: preventDefault_flag, checkForObjects: false };

						}

					ddt.log( "_treeWalker(): bottom of loop, container with '" + dom_node.childNodes.length + "' children, child at end of container is:", child_node );

					dom_node = child_node;

					continue;

					}	// end of if we found a container

				// this is not the node you are looking for, move along.
				//
				// Check the previous or next node. If we are at the end of the current
				// container and our parent is not the editable node. move up a level.

				if ((( direction == 'left' ) && ( dom_node.previousSibling == null )) ||
					(( direction == 'right' ) && ( dom_node.nextSibling == null )))
					{

					ddt.log( "_treeWalker(): we have come to an end of a container." );

					// if our parent is the contenteditable div, then we have come to the end and have not 
					// found what we were looking for.

					if ( $( dom_node.parentNode).attr( 'id' ) == this.element.attr( 'id' ) )
						{

						ddt.log( "_treeWalker(): we have come to the beginning or end of the editable div and not found a stopping point" );

						return false;

						}

					// otherwise move up a level and continue walking.

					dom_node = dom_node.parentNode;

					ddt.log( "_treeWalker(): moving up to parent level: ", dom_node );

					}	// end of if we are at the beginning or end of a container

				if ( direction == 'left' )
					{
					dom_node = dom_node.previousSibling;
					}
				else
					{
					dom_node = dom_node.nextSibling;
					}

				// we use location.type as an ugly flag;

				location.type = '';

				}	// end of while loop

			ddt.error( "_treeWalker(): outside of while." );

			return false;

			},	//  end of _treeWalker()

		/**
		* skips zero width space characters
		*
		* WebKit browsers do not seem to merge textnodes together when lines are merged or
		* sections of a line are deleted. This method skips any number of adjacent zero width 
		* spaces in any number of adjacent text nodes.
		*
		* May return types:
		*
		*		a text node and offset - 	type == 'text'
		*		an embedded object - 		type == 'object'
		*		an element (usually br) -	type == 'element'
		*		a parent container			type == 'container'
		*		beginning/end of the div -	type == 'end'
		*
		* @param {Node} dom_node text_node to start search
		* @param {Integer} caret_position offset in node to start search. -1 for beginning or end.
		* @param {String} direction direction to search 'left' or 'right'
		*
		* @return {Object|Boolean} with keys dom_node, offset and type. false on error.
		*/

		_walkTextNode: function( dom_node, caret_position, direction )
			{

			var loop_brake = 200;

			// guard against getting some other node.

			if ( dom_node.nodeType != 3 )
				{
				ddt.error( "_walkTextNode(): called with a '" + dom_node.nodeName + "' node" );
				return false;
				}

			// -1 is a hack to indicate starting from one end or the other depending on direction.

			if ( caret_position == -1 ) 
				{
				if ( direction == 'left' )
					{
					caret_position = dom_node.nodeValue.length;
					}
				else
					{
					caret_position = 0;
					}
				}

			ddt.log( "_walkTextNode(): direction '" + direction + "' starting with char is '" + dom_node.nodeValue.charAt( caret_position ) + "' at position '" + caret_position + "' length '" + dom_node.nodeValue.length + "' parent is :", dom_node.parentNode );

			// remember that we can inconveniently have zerospace characters anywhere after
			// inserts of lines and objects and subsequent deletes.

			switch ( direction )
				{

				case 'left':

					var check_siblings = false;

					if ( caret_position == 0 )
						{
						check_siblings = true;
						}

					while ( true )
						{

						ddt.log( "_walkTextNode(): top of left loop, char is '" + dom_node.nodeValue.charAt( caret_position ) + "' at position '" + caret_position + "' length '" + dom_node.nodeValue.length + "'" );

						// for when I make a mistake and loop endlessly.

						if ( loop_brake-- <= 0 )
							{
							ddt.error( "_walkTextNode(): runaway loop. braking" );
							return false;
							}

						// if the caret is pointing at the first character of the string
						// i.e. offset 0, check the previous node.

						if ( check_siblings )
							{
		
							check_siblings = false;

							ddt.log( "_walkTextNode(): checking previousSibling" );

							// are we at the beginning of a container? 

							if ( dom_node.previousSibling == null )
								{
								ddt.log( "_walkTextNode(): beginning of container found." );

								// we might be at the beginning of the editable div.

								if ( $( dom_node.parentNode ).attr( 'id' ) == this.element.attr( 'id' ) )
									{
									ddt.log( "_walkTextNode(): end of editable div" );

									return { dom_node: dom_node, offset: 0, type: 'end', preventDefault: false, checkForObjects: true };
									}

								// we are at the beginning of a container. 
								// The caller will check the container's previousSibling.

								ddt.log( "_walkTextNode(): stepping out of a container to parent:", dom_node.parentNode );

								return { dom_node: dom_node.parentNode, offset: -1, type: 'container', preventDefault: false, checkForObjects: true };

								}	// end of if we reached the beginning of a container.

							// is the sibling not a text node?

		  					if ( dom_node.previousSibling.nodeType != 3 )
								{

								ddt.log( "_walkTextNode(): previousSibling is NOT a text node:", dom_node.previousSibling );

								dom_node = dom_node.previousSibling;

								return { dom_node: dom_node, offset: -1, type: 'element', preventDefault: false, checkForObjects: true };

								}

							dom_node = dom_node.previousSibling;

							// we always look to the left of the caret. Start past the end of the string.

							if (( caret_position = dom_node.nodeValue.length ) == 0 )
								{

								// should not happen, no?

								ddt.log( "_walkTextNode(): zero length textnode encountered" );

								caret_position = 0;

								check_siblings = true;

								continue;

								}

							}	// end of if we were at the beginning of a text node.

						// the range startOffset returns the offset of the character to the
						// the right of the caret. So, when searching left, we need to examine
						// the previous character. Hence the -1 here.

						if ( dom_node.nodeValue.charAt( caret_position - 1 ) != '\u200B' )
							{

							ddt.log( "_walkTextNode(): Not a zero width space at position '" + caret_position + "' is a '" + dom_node.nodeValue.charCodeAt( caret_position - 1 ) + "'" );

							return { dom_node: dom_node, offset: caret_position, type: 'text', preventDefault: false, checkForObjects: false };

							}

						ddt.log( "_walkTextNode(): found a zero width space char at offset '" + ( caret_position - 1 ) + "'" );

						caret_position--;

						if ( caret_position == 0 )
							{
							check_siblings = true;
							}

						}	// end of while loop.

					ddt.error( "_walkTextNode(): bottom of left loop" );

					return false;

					break;

				// ----------------------------------------------------------

				case 'right':

					while ( true )
						{

						// for when I make a mistake.

						if ( loop_brake-- <= 0 )
							{

							ddt.error( "_walkTextNode(): runaway loop. braking" );

							return false;
							}

						// we search to the end of the string.

						if ( caret_position == dom_node.nodeValue.length )
							{

							ddt.log( "_walkTextNode(): we are at the end of the string." );
		
							if ( dom_node.nextSibling == null )
								{
					
								ddt.log( "_walkTextNode(): end of container found :", dom_node );

								// we might be at the end of the editable div.

								if ( $( dom_node.parentNode ).attr( 'id' ) == this.element.attr( 'id' ) )
									{
									ddt.log( "_walkTextNode(): end of editable div" );

									return { dom_node: dom_node, offset: caret_position, type: 'end', preventDefault: false, checkForObjects: false };
									}

								// we are at the end of a container. The call will check the
								// container's nextSibling.

								ddt.log( "_walkTextNode(): stepping out of a container" );

								// There is an edge case which is namely we do not want to step out of 
								// the contenteditable div.

								if ( $( dom_node.parentNode ).attr( 'id' ) == this.element.attr( 'id' ) )
									{

									ddt.log( "_walkTextNode(): attempted to step out of editable div." );

									// we'll insert a textnode in this case and return that. 

									var textnode = this._insertEmptyNode( dom_node, 'after' );

									return { dom_node: textnode, offset: 0, type: 'end', preventDefault: false, checkForObjects: true };

									}

								return { dom_node: dom_node.parentNode, offset: -1, type: 'container', preventDefault: false, checkForObjects: true };

								}

							// we may encounter an element, likely a BR.

		  					if ( dom_node.nextSibling.nodeType != 3 )
								{

								ddt.log( "_walkTextNode(): nextSibling is NOT a text node:", dom_node.nextSibling );

								dom_node = dom_node.nextSibling;

								return { dom_node: dom_node, offset: -1, type: 'element', preventDefault: false, checkForObjects: true };

								}

							ddt.log( "_walkTextNode(): moving to nextSibling" );

							dom_node = dom_node.nextSibling;

							caret_position = 0;

							// this should not happen, no?

							if ( dom_node.nodeValue.length == 0 )
								{

								// should not happen, no?

								ddt.log( "_walkTextNode(): zero length textnode encountered" );

								continue;

								}

							}

						if ( dom_node.nodeValue.charAt( caret_position ) != '\u200B' )
							{

							ddt.log( "_walkTextNode(): Not a zero width space at position '" + caret_position + "'. Found '" + dom_node.nodeValue.charCodeAt( caret_position ) + "'" );

							return { dom_node: dom_node, offset: caret_position, type: 'text', preventDefault: false, checkForObjects: true };

							}

						caret_position++;

						}	// end of while loop.

					ddt.error( "_walkTextNode(): bottom of right loop :", dom_node );
		
					return false;

				}	// end of switch

			},	// end of _walkTextNode()

		/**
		* highlights objects
		*
		* Checks to see if the cursor is near an object and sets the highlight class on it. Removes it 
		* from all other objects. This is useful to let the user know that they'll delete the 
		* object on a backspace.
		*/

		_highlightObject: function()
			{

			var object = false;

			ddt.log( "_highlightObject(): top with this", this );

			this._unHighlightObjects( this.element );

			// if we have moved next to an embedded object, such that another
			// backspace will delete the object (in _onKeyDown()), highlight the
			// object. (or if we're in front of it and a delete will delete it.)

			ddt.log( "_highlightObject(): checking for prev object" );

			if ( object = this._checkForAdjacentObject( 'left' ) )
				{

				ddt.log( "_highlightObject(): check for object to left returned:", object );

				if ( ! object.container_spanned )
					{
					$( object.dom_node ).addClass( 'highlight' );
					}

				}

			ddt.log( "_highlightObject(): checking for next object" );

			if ( object = this._checkForAdjacentObject( 'right' ) )
				{

				ddt.log( "_highlightObject(): check for object to right returned:", object );

				if ( ! object.container_spanned )
					{
					$( object.dom_node ).addClass( 'highlight' );
					}

				}

			},	// end of _highlightObject()

		/**
		* clears highlighting
		*
		* recurses through the contenteditable div and un-highlights all objects.
		*
		* It should be noted that the browser can add a bunch of different element types
		* as the user enters content. This varies by browser. 
		*
		* @param {jQuery} jQuery object representing the contenteditable div.
		*/

		_unHighlightObjects: function( object )
			{

			// now remove the highlight class from any of the other objects. 
			//
			// Objects are always one level under the contenteditable div. 
			//
			// We are just interested in elements in this case, ok to loop over children instead of childNodes

			var rich_textarea = this;

			object.children().each( function( index )
				{

				// we only recurse into elements that are NOT one of our objects, identified by 
				// the data-value attribute.

				if ( rich_textarea._isEmbeddedObject( $(this).get(0) ) )
					{

					// ddt.log( "found element with data value: ", $(this).attr( 'data-value' ) );

					$(this).removeClass( 'highlight' );

					return;

					}

				// ddt.log( "_unHighlightObjects(): not an embedded object. checking for children of '" + $(this).prop( 'nodeName' ) + "' with '" + $(this).children().length + "'" );
								
				if ( $( this ).children().length > 0 )
					{

					// ddt.log( "unHighlightObjects(): recursing into '" + $( this ).prop( 'nodeName' ) + "'" );

					rich_textarea._unHighlightObjects( $( this ) );

					}

				});

			// ddt.log( "_unHightlightObjects(): end" );


			},	// end of _unHighlightObjects()

		/**
		* sets the caret to a position in a textnode
		*
		* @param {Object} text_node textnode being selected
		* @param {Integer} offset offset in textnode to set caret to
		*/

		_selectTextNode: function( text_node, offset )
			{

			// if we do not receive a textnode it's an error

			if ( text_node.nodeType != 3 )
				{

				ddt.error( "_selectTextNode(): ERROR - node of type '" + text_node.nodeName + "' received." );

				return false;

				}

			ddt.log( "_selectTextNode(): setting offset '" + offset + "' in text node of length '" + text_node.nodeValue.length + "'" );

			var selection = RANGE_HANDLER.getSelection();

			var range = CREATERANGE_HANDLER.createRange();

			range.setStart( text_node, offset );
			range.setEnd( text_node, offset );
			range.collapse(true);

			selection.removeAllRanges();
			selection.addRange( range );

			this._saveRange( range );

			},

		/**
		* sets the caret position relative to a dom_node.
		*
		* sets a caret position relative to a dom_node.
		*
		* If the dom_node points to an embedded object, (i.e. an element with a data-value) zero width space 
		* characters are taken into account, and potentially inserted.
		*
		* There are a number of issues using the range.setStartBefore() method. It never seems to select
		* exactly what I want. To work around this, zero width space characters are used to enable 
		* explicitly selecting before or after a given node.
		*
		* @param {Node} dom_node dom_node to use as a reference point for the caret position.
		* @param {String} position may be 'before', 'after', 'end','beginning'
		*
		* @see http://a-software-guy.com/2013/01/problems-with-range-setstartbefore/
		*/

		_setCaretPositionRelative: function( dom_node, position )
			{
			var sel = RANGE_HANDLER.getSelection();

			var range = null;

			ddt.log( "_setCaretPositionRelative(): moving '" + position + "' relative to :", dom_node );

			if ( dom_node.previousSibling != null )
				{
				ddt.log( "_setCaretPositionRelative(): with previousSibling: ", dom_node.previousSibling );
				}

			if ( this._isEmbeddedObject( dom_node ) )
				{

				ddt.log( "_setCaretPositionRelative(): setting caret position '" + position + "' relative to an embedded object. getting object range." );

				// it's an object so get the range with potentially wrapping
				// zero width space text nodes around it.

				range = this._getObjectRange( dom_node );

				ddt.log( "_setCaretPositionRelative(): got object range: ", range );

				switch ( position )
					{
					
					case 'before':
					case 'beginning':
			
						ddt.log( "_setCaretPositionRelative(): collapsing to start of range around object" );

						range.collapse( true );

						break;

					case 'after':
					case 'end':

						ddt.log( "_setCaretPositionRelative(): collapsing to end of range around object" );

						range.collapse( false );

						break;

					}

				sel.removeAllRanges()
				sel.addRange( range );

				this._saveRange();

				return;

				}	// end of if we were selecting an inserted object.

			// selecting a single cursor position.

			range = sel.getRangeAt(0);

			switch ( position )
				{

				case 'before':

					// for a BR use the zero width space character trick and set the range explicitly.

					if ( dom_node.nodeName == 'BR' )
						{
						ddt.log( "_setCaretPositionRelative(): 'before' with a 'BR'" );

						var textnode = this._insertEmptyNode( dom_node, 'before' );

						this._setCaretPositionRelative( textnode, 'end' );

						return;
						}

					range.setStartBefore( dom_node );
					range.setEndBefore( dom_node );

					range.collapse( true );

					sel.removeAllRanges()
					sel.addRange( range );

					this._saveRange();

					var caret = this._getCaretPosition();

					break;

				case 'after':

					// for a BR use the zero width space character trick and set the range explicitly.

					if ( dom_node.nodeName == 'BR' )
						{
						ddt.log( "_setCaretPositionRelative(): 'after' with a 'BR'" );

						// FIXME: this is probably a hack. For a BR, position the cursor
						// before the BR and let the browser move the cursor to the other
						// side of the BR on it's own. 

						range.setStartBefore( dom_node );
						range.setEndBefore( dom_node );

						range.collapse( false );
        	
						sel.removeAllRanges()
						sel.addRange( range );

						this._saveRange();

						break;
						}

					range.setStartAfter( dom_node );
					range.setEndAfter( dom_node );

					range.collapse( false );

					sel.removeAllRanges()
					sel.addRange( range );

					this._saveRange();

					break;

				case 'beginning':

					// we only want this to work on text nodes

					if ( dom_node.nodeType != 3 )
						{
						ddt.error( "_setCaretPositionRelative(): 'beginning not on a text node: ", dom_node );
						return;
						}

					range.setStart( dom_node, 0 );
					range.setEnd( dom_node, 0 );

					range.collapse( false );

					sel.removeAllRanges()
					sel.addRange( range );

					this._saveRange();

					break;

				case 'end' :

					// we only want this to work on text nodes

					if ( dom_node.nodeType != 3 )
						{
						ddt.error( "_setCaretPositionRelative(): 'end not on a text node: ", dom_node );
						return;
						}

					// 'end' is really one character past the end of the node per 
					// docs: http://help.dottoro.com/ljlmndqh.php The range end is
					// one character past the end of the range. 

					range.setStart( dom_node, dom_node.nodeValue.length );
					range.setEnd( dom_node, dom_node.nodeValue.length );

					range.collapse( false );

					sel.removeAllRanges()
					sel.addRange( range );

					this._saveRange();

					break;

				}

			// HACK: with nested DIV's in Mozilla it's possible to move the cursor to the end position
			// no-man's land in the editable DIV. In this case we'll insert a zero-width char at the end
			// and adjust the range accordingly.

			if (( range.startContainer.nodeName == 'DIV' ) &&
				( $( range.startContainer ).attr( 'id' ) == this.element.attr( 'id' ) ) &&
				( range.startOffset == range.startContainer.childNodes.length ))
				{

				ddt.error( "_setCaretPositionRelative(): attempted to break out of div." );

				var textnode = this._insertEmptyNode( range.startContainer, 'child' );

				this._selectTextNode( textnode, 0 );

				}

			ddt.log( "_setCaretPositionRelative(): result range is: ", range );

			},	

		/**
		* determines the range surrounding an embedded object
		*
		* returns a range representing an embedded object making sure the object
		* is bordered by textnodes on both sides.
		*
		* NOTE: In a situation where there are two objects right next to one another 
		* there is no empty TEXT node between them but apparently, at least based on
		* testing in Chrome, the range will include the first visible character from the object div,
		* which sucks.
		*
		* To offset this, embedded objects are bounded, when necessary, by zero width
		* space characters, forming an invisible text node, which allows us to form a range 
		* to position the cursor between div's, span's, etc.
		*
		* When getting the range position before or after an object, we get the position outside the boundary of
		* these zero width spaces. Despite being zero width they still require a key press to arrow or backspace
		* through which is confusing for the user.
		*
		* @param {Node} dom_node node representing the object to create a range for. 
		*
		* @return {Range} range object. 
		*/

		_getObjectRange: function( dom_node )
			{

			ddt.log( "_getObjectRange(): top" );

			var sel = RANGE_HANDLER.getSelection();
			var range = sel.getRangeAt(0);

			var tmp_range = null;
			var offset = 0;

			if ( ! sel.rangeCount ) 
		 		{
				ddt.error( "_getObjectRange(): NO RANGE. UNABLE TO MOVE CARET." );

				return;
				}

			// ------------------------ BEFORE OBJECT ----------------------------------------

			ddt.log( "_getObjectRange(): getting position 'before' node" );

			// is there a node? 

			if ( dom_node.previousSibling == null )
				{

				ddt.log( "_getObjectRange(): BEFORE: No sibling node to the left" );

				// this "should not" happen but still does occasionally if the user manages to 
				// delete a last remaining zero width space. 
				//
				// we'll patch it up in this case, otherwise there's no getting the selection before
				// the object.

				var textnode = this._insertEmptyNode( dom_node, 'before' );

				range.setStart( textnode, 0 );

				}
			else if ( dom_node.previousSibling.nodeType != 3 )
				{

				// this is probably due to the browser adding some markup by itself. 

				ddt.log( "_getObjectRange(): BEFORE: sibling to the left NOT A TEXT NODE, it's a '" + dom_node.previousSibling.nodeName + "'" );

				var textnode = this._insertEmptyNode( dom_node, 'before' );

				range.setStart( textnode, 0 );

				}
			else if ( dom_node.previousSibling.nodeValue == null )
				{

				// this shouldn't happen, no? 

				ddt.log( "_getObjectRange(): BEFORE: sibling to the left is an EMPTY/NULL TextNode" );

				var textnode = this._insertEmptyNode( dom_node, 'before' );

				range.setStart( textnode, 0 );

				}
			else if ( dom_node.previousSibling.nodeValue.length == 0 )
				{

				// this shouldn't happen, no?

				ddt.log( "_getObjectRange(): BEFORE: sibling to the left is a 0 length TextNode" );

				var textnode = this._insertEmptyNode( dom_node, 'before' );

				range.setStart( textnode, 0 );

				}
			else 
				{

				// we have a text node with some content. This makes the area before the object 
				// selectable. 

				ddt.log( "_getObjectRange(): existing text node. setting range to start before object" );

				range.setStart( dom_node.previousSibling, dom_node.previousSibling.nodeValue.length );

				}	// end of else we had a textnode containing characters.

			// ------------------------- AFTER OBJECT -----------------------------------

			tmp_range = CREATERANGE_HANDLER.createRange();

			// is there a node? 

			if ( dom_node.nextSibling == null )
				{

				ddt.log( "_getObjectRange(): AFTER: No sibling node to the right" );

				// this "should not" happen but still does occasionally if the user manages to 
				// backspace over the last remaining zero width space. 
				//
				// we'll patch it up in this case, otherwise there's no getting the selection after
				// the object.

				var textnode = this._insertEmptyNode( dom_node, 'after' );

				range.setEnd( textnode, 1 );

				}                      
			else if ( dom_node.nextSibling.nodeType != 3 )
				{

				// this is probably due to the browser adding some markup by itself. 

				ddt.log( "_getObjectRange(): AFTER: sibling to the right NOT A TEXT NODE, it's a '" + dom_node.nextSibling.nodeName + "'" );

				var textnode = this._insertEmptyNode( dom_node, 'after' );

				range.setEnd( textnode, 1 );

				}
			else if ( dom_node.nextSibling.nodeValue == null )
				{

				// this shouldn't happen, no? 

				ddt.log( "_getObjectRange(): AFTER: sibling to the right is an EMPTY/NULL TextNode" );

				var textnode = this._insertEmptyNode( dom_node, 'after' );

				range.setEnd( textnode, 1 );

				}
			else if ( dom_node.nextSibling.nodeValue.length == 0 )
				{

				// this shouldn't happen, no?

				ddt.log( "_getObjectRange(): AFTER: sibling to the right is a 0 length TextNode" );

				var textnode = this._insertEmptyNode( dom_node, 'after' );

				range.setEnd( textnode, 1 );

				}
			else 
				{

				// we have a text node with some content.

				ddt.log( "_getObjectRange(): existing text node." );

				// If this is NOT a zero width text node, add one in for good measure.
				//
				// FIXME: I've been having quite a bit of trouble with moving over objects
				// that are <SPAN>s in FireFox vs. Chrome. When event.preventDefault() is set,
				// Chrome doesn't move the cursor out of the span when moving right. If event.preventDefault
				// is not sent, Chrome works but FireFox sends the caret one too many characters to the right
				// in _moveCaret().
				//
				// Making sure there is an empty text node no matter what seems to solve the situation for
				// both browsers. Yes, this polutes a bunch of extra characters but the user gets the behavior
				// they would expect.

				if ( dom_node.nextSibling.nodeValue != '\u200B' )
					{
					var textnode = this._insertEmptyNode( dom_node, 'after' );
					range.setEnd( textnode, 1 );
					}
				else
					{
					range.setEnd( dom_node.nextSibling, 1 );
					}

				}	// end of else we had a textnode containing characters.

			return range;

			},	// end of _getObjectRange()

		/**
		* returns the caret position in the DOM
		*
		* Returns the current position in the DOM in addition to a character
		* offset if it's a text node. 
		*
		* In the case the current node is NOT a text node, offset will be -1 and it will be up
		* to the caller to decide what to do.
		*
		* If the current position is not selectable, inserts a zero-width space character, updates the
		* selection range and return the textnode.
		*
		* @return {Object|Boolean} position with keys dom_node and offset or FALSE if not a collapsed range.
		*/

		_getCaretPosition: function()
			{

			var dom_node = null;
			var text_node = null;
			var embedded_object = null;

			var sel = RANGE_HANDLER.getSelection();

			// This may fail if nothing is selected.

			try {
				var range = RANGE_HANDLER.getSelection().getRangeAt(0);

				}
			catch( err )
				{
				ddt.log( "_getCaretPosition(): unable to get position " + err );
				return false;
				}

			ddt.log( "_getCaretPosition(): top" );

			if ( range.collapsed == false )
				{
				ddt.log( "_getCaretPosition(): multi-char selection" );
				return false;
				}

			dom_node = range.startContainer;

			// ddt.log( "_getCaretPosition(): got container from range of type '" + dom_node.nodeName + "'" );

			// The problem is, the user may have selected a node INSIDE an embedded object. 
			//
			// If it weren't for the webkit bug of having contenteditable=false items on a line interfering
			// with deletions this would be so much easier. 
			//
			// in Mozilla it seems like an endless cat and mouse game to avoid getting "inside" 
			// an embedded object 
			//
			// Check to see if we are inside an object, regardless of our node type.

			// ddt.log( "_getCaretPosition(): checking to see if this node is or is inside an embedded object :", dom_node );

			if ( embedded_object = this._isEmbeddedObject( dom_node ) )
				{

				ddt.log( "_getCaretPosition(): we have an embedded object" );

				return { dom_node: embedded_object, offset: -1 };

				}	// end of if we were inside an embedded object.

			// ddt.log( "_getCaretPosition(): not an embedded object" );

			// do we have a text node?
			
			if ( dom_node.nodeType == 3 )
				{

				// ddt.log( "_getCaretPosition(): we have a text node of length '" + dom_node.nodeValue.length + "' startOffset '" + range.startOffset + "'" );

				return { dom_node: dom_node, offset: range.startOffset };

				}

			// If the node is a container, we need to use the offset to get the current element in the
			// container (which should NOT be a text node). This can happen if:
			//
			//		. we are at the end of a container.
			//		. we are between elements.
			//		. we are between a BR and the beginning of a container.

			if (( $( dom_node ).attr( 'id' ) == this.element.attr( 'id' ) ) ||
				( dom_node.nodeName == 'DIV' ) ||
				( dom_node.nodeName == 'P' ))
				{

				ddt.log( "_getCaretPosition(): Got a container (DIV/P) as a parent. We are possibly next to a BR or at the end. startOffset is '" + range.startOffset + "'" );

				// This should not occur, but have been encountered an empty container? 

				if ( dom_node.childNodes.length == 0 )
					{

					ddt.log( "_getCaretPosition(): EMPTY CONTAINER! Adding empty text node." );

					text_node = this._insertEmptyNode( dom_node, 'child' );

					this._selectTextNode( text_node, 0 );

					return { dom_node: text_node, offset: 0 };

					}	// end of if we had an empty container.

				// are we at the end of the container? It's possible to get a startOffset that is past the
				// range of childNodes meaning we are at the end of a container. In WebKit browsers this is
				// "unselectable no-man's land"

				if ( range.startOffset >= dom_node.childNodes.length )
					{

					ddt.log( "_getCaretPosition(): We are at the end of a container which is unselectable in webKit browsers" );

					// insert a zero space node here and return that. 

					text_node = this._insertEmptyNode( dom_node, 'after' );

					this._selectTextNode( text_node, 1 );

					return { dom_node: text_node, offset: 1 };

					}	// end of if we were at the end of a container.

				dom_node = dom_node.childNodes[ range.startOffset ];

				// ddt.log( "_getCaretPosition(): element at offset is :'" + dom_node.nodeName + "'" );

				// this should never be a textnode, correct? If it's a textnode then it should have been
				// returned as the container.

				if ( dom_node.nodeType == 3 )
					{

					// FIXME: If this happens we don't know where in the node to position the caret. 

					ddt.error( "_getCaretPosition(): THIS SHOULD NOT HAPPEN. TEXTNODE RETURNED AS CONTAINER OFFSET" );

					this._selectTextNode( dom_node, 0 );

					return { dom_node: dom_node, offset: 0 };

					}

				}	// end of if we had a container.

			// this should never be a text node, correct?

			return { dom_node: dom_node, offset: -1 };

			},	// end of _getCaretPosition()

		/**
		* inserts an HTML node replacing the current trigger word.
		*
		* given a block of HTML, inserts it at the current cursor position of a 
		* content editable div replacing the trigger word accordingly.
		*
		* A data-value attribute typically representing a server side GUID is added to the top level element 
		* of the content.
		*
		* Selection is an object containing:
		*
		*	value: value to be communicated back to server representing the object selected from list
		*	content: block of HTML to insert that visually represents the value.
		*
		* trigger is an object representing the selected trigger word that invoked the selection
		*
		*	startNode - start textNode
		*	startOffset - offset in start textNode
		*	endNode - endNode
		*	endOffset - offset in end textNode
		*
		* NOTE: 
		*
		* To work around a browser selection/range limitation, zero width space characters are
		* inserted strategically between adjacent objects to allow us to select that position in a range.
		*
		* @param {Object} trigger trigger word details including startNode, startOffset, endNode, endOffset of trigger word.
		* @param {String} selection containing value and content keys. 
		*
		* @see http://stackoverflow.com/questions/14098303/how-to-set-caret-cursor-position-in-a-contenteditable-div-between-two-divs
		*/
		 
		_insertSelection: function( trigger, selection )
			{

			ddt.log( "_insertSelection(): deleting trigger word based on trigger: ", trigger, " with currentRange ", this.currentRange );

			this.replaceWord( trigger, selection.content, selection.value );

			// FIXME: There's a bug in jquery.ui.autocomplete having to do with up and down
			// arrows in FireFox not working. autocomplete intercepts and disables some keypresses.
			// so that Firefox works I've modified ui.autocomplete to not disable keypresses but it
			// looks like (hypothesis) that becuase of that onEnter is getting fired even when a
			// selection menu item is selected. 
			//
			// Let onKeyUp know not to handle this enter press.

			this.selectionEntered = true;

			},	// end of _insertSelection()

		/**
		* replace a word with some html content.
		*
		* Given a text range returned by _getWord(), replaces it with the object provided.
		* Typically used in regex callbacks.
		*
		* @param {Object} word_entry entry with startNode, startOffset, endNode, endOffset and word
		* @param {String} content HTML content to replace word_entry with
		* @param {String} data_value data value to tag inserted html with
		*/

		replaceWord: function( word_entry, content, data_value )
			{

			var sel = RANGE_HANDLER.getSelection();
			var range = CREATERANGE_HANDLER.createRange();

			ddt.log( "replaceWord(): deleting word: ", word_entry );

			// However, because the fact the WebKit does not merge adjacent textnodes the 
			// trigger word may span multiple nodes (and have zero width space characters in between)
			// the trigger sent to us contains the complete range.

			range.setStart( word_entry.startNode, word_entry.startOffset );

			// from the docs: The end position of a Range is the first position in the DOM hierarchy that is after the Range.

			range.setEnd( word_entry.endNode, word_entry.endOffset + 1 );

			range.deleteContents();

			this._saveRange( range );

			// FIXME: I do not understand why but if I apply this here it causes one extra space to get consumed
			// when the object is inserted. This makes no sense to me. Clearly I'm missing something.

//			sel.removeAllRanges();
//			sel.addRange( range );

			this.insertObject( content, data_value );

			}, 

		/**
		* inserts a textnode with a single zero-width space character.
		*
		* Inserts a zero width textnode before, after or as a child of a given DOM node. 
		*
		* @param {Node} dom_node node the node should be inserted next to
		* @param {String} position 'before', 'after', 'child' indicating where the node should be inserted.
		* @param {Boolean} force whether or not to force creation of empty text nodes. needed to work around some browser weirdness.
		*
		* @return {Node} textnode inserted or the one that was already present.
		*
		* @todo add checking for presence of an existing empty text node.
		*/

		_insertEmptyNode: function( dom_node, direction, force )
			{

			if ( typeof( force ) == 'undefined' )
				{
				force = false;
				}

			var text_node = document.createTextNode( '\u200B' );

			switch ( direction )
				{

				case 'before':

					// FIXME: we seem to be getting back 0 length text nodes in webkit sometimes. Not sure why.

					if (( ! force ) &&
						( dom_node.previousSibling != null ) && 
						( dom_node.previousSibling.nodeType == 3 ) &&
						( dom_node.previousSibling.nodeValue.length > 0 ))
						{
						ddt.log( "_insertEmptyNode(): there's already a text node before this node" );
						return dom_node.previousSibling;
						}

					$( text_node ).insertBefore( dom_node );

					break;

				case 'after':

					if (( ! force ) &&
						( dom_node.nextSibling != null ) && 
						( dom_node.nextSibling.nodeType == 3 ) &&
						( dom_node.nextSibling.nodeValue.length > 0 ))
						{
						ddt.log( "_insertEmptyNode(): there's already a text node after this node" );
		 				return dom_node.nextSibling;
						}

					$( text_node ).insertAfter( dom_node );

					break;

				case 'child':

					// is the last child of this node already a text node?

					if (( dom_node.childNodes.length != 0 ) && ( dom_node.childNodes[ dom_node.childNodes.length - 1 ].nodeType == 3 ))
						{
						ddt.log( "_insertEmptyNode(): there's already a text node at the end of this container." );
						return dom_node.childNodes[ dom_node.childNodes.length - 1 ];
						}

					$( text_node ).appendTo( dom_node );

					break;

				default:

					ddt.error( "_insertEmptyNode(): Invalid direction supplied '" + direction + "'" );

					break;

				}

			return text_node;

			},

		/**
		* checks a sibling to ensure both sides are selectable.
		*
		* Given a node and a direction, checks the sibling to make sure the places in front of
		* and behind the node are selectable. 
		*
		* If it's a container makes sure the container begins and ends with textnodes so that the beginning
		* and end of the container will remain selectable in WebKit browsers.
		*
		* Safeguards against embedded objects.
		*
		* @param {Node} dom_node dom_node to check for sibling containers
		* @param {String} direction 'prev' or 'next' - checks for previous or next siblings.
		*
		*/

		_checkSibling: function( dom_node, direction )
			{

			var sibling = null;

			ddt.log( "_checkSibling(): dom_node is :", dom_node );

			if ( direction == 'prev' )
				{
				sibling = dom_node.previousSibling;
				}
			else
				{
				sibling = dom_node.nextSibling;
				}

			ddt.log( "_checkSibling(): sibling is :", sibling );

			// are we at the beginning or end of a container? 

			if ( sibling == null ) 
				{
				ddt.log( "_checkSibling(): sibling is null." );

				return;
				}
			
			if ( this._isEmbeddedObject( sibling ) )
				{

				ddt.log( "_checkSibling(): object sibling" );

				// make certain the sibling is wrapped in textnodes

				this._insertEmptyNode( sibling, 'before' );
				this._insertEmptyNode( sibling, 'after' );

				return;
				}

			// it might be a BR

			if ( sibling.nodeName == 'BR' )
				{

				ddt.log( "_checkSibling(): sibling is a BR" );

				// make certain the sibling is wrapped in textnodes

				this._insertEmptyNode( sibling, 'before' );
				this._insertEmptyNode( sibling, 'after' );

				return;
				}

			// is it not a container?

			if (( sibling.nodeName != 'SPAN' ) && 
				( sibling.nodeName != 'DIV' ) &&
				( sibling.nodeName != 'P' ))
				{
				ddt.log( "_checkSibling(): sibling is not a container: '" + sibling.nodeName + "'" );

				return;
				}

			// is it an empty container? 

			if ( sibling.childNodes.length == 0 )
				{

				ddt.log( "_checkSibling(): empty container. adding textnode" );

				this._insertEmptyNode( sibling, 'child' );

				return;

				}

			// does it just container a BR? (WebKit)

			if (( sibling.childNodes.length == 1 ) && ( sibling.childNodes[ 0 ].nodeName == 'BR' ))
				{

				ddt.log( "_checkSibling(): DIV containing just a BR found. Adding a zero width char." );

				var tmp_node = sibling.childNodes[ 0 ];

				this._insertEmptyNode( tmp_node, 'before' );

				$( tmp_node ).remove()
				
				return;

				}

			// we have a container and it has child nodes. Insert textnodes at the beginning
			// and end.

			this._insertEmptyNode( sibling.childNodes[ 0 ], 'before' );
			this._insertEmptyNode( sibling.childNodes[ sibling.childNodes.length - 1 ], 'after' );

			return;

			},	// end of _checkSibling()

		/**
		* determines if the given node is an embedded object (or inside of one)
		*
		* Determines if the dom_node passed in is an embedded object or some node inside
		* an embedded object. If so, returns the object, false otherwise.
		*
		* @param {Node} dom_node dom_node to inspect
		*
		* @return {Node|Boolean} dom_node of embedded object or null if not an embedded object
		*/

		_isEmbeddedObject: function( dom_node )
			{

			var embedded_object = null;

			if ( dom_node == null )
				{
				ddt.log( "_isEmbeddedObject(): NULL node passsed in" );
				return false;
				}

			// ddt.log( "_isEmbeddedObject(): inspecting node :", dom_node );

			if ( $( dom_node ).attr( 'data-value' ) != null )
				{
				return dom_node;
				}

			// ddt.log( "_isEmbeddedObject(): not a TOP LEVEL embedded object node. Is one of our parents?" );

			// we may be any kind of node inside an embedded object 

			return $( dom_node ).parents( '[data-value]' ).get(0);

			},	// end of _isEmbeddedObject()

		/**
		* insert an object at the current caret position
		*
		* Inserts a block of HTML representing an embedded object. The object
		* is tagged with a provided data-value which represents the value of the
		* object on the server (typically a GUID).
		*
		* The caret is moved to the space after the inserted object.
		*
		* @param {String} content HTML content to add.
		* @param {String} value GUID or other value to associate with the object. 
		*
		* @return {Node} dom node of inserted object.
		*
		* @see _saveRange()
		*/

		insertObject: function( content, value )
			{

			ddt.log( "insertObject(): top with content '" + content + "' and value '" + value + "'" );

			// this method is often invoked from the 'outside' and as such the 
			// editable div loses focus which messes up the works.

			this.element.focus();

			ddt.log( "insertObject(): after focus - currentRange is ", this.currentRange );

			// we may have lost focus so restore the range we saved after
			// each keypress. However, we also need to take into the account
			// that the user may not have clicked in the editable div at all.

			if ( this.currentRange === false )
				{

				ddt.log( "insertObject(): currentRange is false" );

				// insert a blank text node in the div

				var textnode = this._insertEmptyNode( this.element.get(0), 'child' );

				this._selectTextNode( textnode, 1 );

				// _selectTextNode() calls _saveRange() which affects currentRange. 
				// I know, ugly side-effect.

				}

			var sel = RANGE_HANDLER.getSelection();
			var range = this.currentRange;

			sel.removeAllRanges();
			sel.addRange( range );

			var caret = null;

			// for some reason for a range of content returned from the server
			// this results in an expression error. 
			//
			// var node = $( content );
			//
			// Trim the content just in case we have a few whitespace characters leading or following.

			var tempDiv = document.createElement('div');
			tempDiv.innerHTML = content.replace(/^[\s\u200B]+|[\s\u200B]+$/g,"");

			// make sure not to include the wrapping temporary div. We make the
			// assumption here that content is wrapped in some single container tag,
			// either a div or a span.

			node = $( tempDiv ).contents();

			ddt.log( "insertObject(): node is ", node );

			node.attr( 'data-value', value );

//			FIXME: This breaks webkit browsers. If you press DELETE or backspace such that
//			two lines are joined, the latter of which has a contenteditable=false item on it
//			everything from the item to the end of the line will be unceremoniously deleted.
//
//			node.attr( 'contenteditable', 'false' );

			// to avoid the mess that results when trying to get a range on the 
			// empty/non-existent text node between two objects when they are placed next to 
			// one another, we insert zero width space characters as needed. This 
			// can then be selected in a range allowing us to move the cursor to the space
			// between the objects, notably in WebKit browsers.
			//
			// Without some kind of character between the <div>'s, the selection will
			// jump to the nearest inside one of the divs. (Which, if you think about it, makes
			// sense from the perspective of a user at the keyboard. You don't want to have to 
			// move the arrow key over invisible entities ...)
			//
			// The same problem occurs when an object is placed at the very beginning or very 
			// end of the contenteditable div.
			//
			// Unfortunately, zero width space characters do take up a keyboard arrow press,
			// i.e. if you arrow over such a character the cursor doesn't move but you have to 
			// press the arrow key once for each such character which is confusing. This is
			// addressed in the _onKeyDown() handler. We move the cursor over them.

			// The approach is to add the object then check to see if we have sibling objects 
			// before or after us. If not, we add them.

			var dom_node = node.get(0);

			range.insertNode( node.get(0) );
			range.setStartAfter( node.get(0) );
			range.collapse( true );

			sel.removeAllRanges();
			sel.addRange(range);

			ddt.log( "insertObject(): previousSibling is : ", dom_node.previousSibling );

			// check siblings before and after us, if any. 
			//
			// And, in Chome and possibly other browsers, if this is the first element there is, 
			// an entirely empty text node is insert at the first position. 

			ddt.log( "insertObject(): inserting zero width node before selection" );

			// FIXME: Not sure why, but if I don't force the inclusion of empty nodes even if
			// the object is surrounded by text nodes selections break. wtf? (i.e. without this
			// inserting object into the middle of text lines fails in Webkit)

			var textnode = this._insertEmptyNode( dom_node, 'before', true );

//			this._selectTextNode( textnode, 1 );

			// if there is no sibling after us or if it's not a text node, add a zero width space.

			ddt.log( "insertObject(): inserting zero width node after selection" );

		  	var textnode2 = this._insertEmptyNode( dom_node, 'after', true );

			// FIXME: if this is 0, in Chrome it selects a point in the span.

			this._selectTextNode( textnode2, 1 );

			},	// end of insertObject()

		/**
		* returns plain text contents of the editable area with BR's turned to newlines.
		*
		* Returns the contents of the editable div in plaintext with BR tags (and other
		* block level elements, converted to newlines.
		*
		* Spurious newlines are stripped prior to conversion.
		*
		* preserved and any embedded objects in the form $[[VALUE]] where VALUE is the GUID
		* of the embedded object (or other uniquely identifying value)
		*
		* public method, callable using $(..).rich_textarea( 'getTextWithLineBreaks' ), per 
		* widget factory guidelines.
		*
		* @return string plaintext of content editable div.
		*/

		getTextContent: function()
			{

			ddt.log( "getTextContent(): top" );

			// this.element is a jQuery object.

			var content = this._getTextWithLineBreaks( this.element.get(0).childNodes );

			// strip out all the zero width space characers.

			ddt.log( "getTextcontent(): content length before replace is: '" + content.length + "'" );

			content = content.replace( /[\u200B]/gm, '' );

			if ( content.match( /[\u200B]/ ) != null )
				{
				ddt.error( "getTextContent(): zero width chars in content" );
				}

			ddt.log( "getTextcontent(): content length after replace is: '" + content.length + "'" );

			return content;
			},

		/**
		* private method for recursing through div child elements.
		*
		* All browsers are now normalized to using <BR> to denote newlines. 
		* 
		* @param {Array} elems array of DOM nodes.
		* @see _handleEnter()
		*/

		_getTextWithLineBreaks: function( elems )
			{

			// list of elements used by various browsers to 
			// mark newlines in a contenteditable section.

			var break_tags = [ 'BR', 'DIV', 'P' ];

			var text_string = "";
			var elem;

			ddt.log( "elems ", elems );

			for ( var i = 0; elems[i]; i++ )
				{

				elem = elems[i];

				ddt.log( "elem is '" + elem.nodeName + "'" );

				if ( this._isEmbeddedObject( elem ) )
					{

					ddt.log( "embedded object found" );
					text_string += "[o=" + $( elem ).attr( 'data-value' ) + "]";

					continue;
					}

				if (( elem.nodeType == 3 ) || ( elem.nodeType == 4 ))
					{

					ddt.log( "text or cdata found" );

					// text or cdata node

					// first strip out any newlines that might be in the content. Might be from
					// copy paste, etc. The only newlines present in the output should be ones that
					// reflect the formatting the user sees in the browser.

					text_string += elem.nodeValue.replace( /[\n]/gm, '' );

					}
				else if ( jQuery.inArray( elem.nodeName, break_tags ) != -1 )
					{

					ddt.log( "break_tag found, adding newline" );
					text_string += "\n";
					}
				else
					{
					ddt.log( "other" );
					}

				if ( elem.nodeType !== 8 ) // comment node
					{
					text_string += this._getTextWithLineBreaks( elem.childNodes );
					}

				}

			return text_string;

			},	// end of getTextWithLineBreaks()

		/**
		* clears the content of the editable div.
		*
		* Typically used after submit, clears the content of the editable div.
		*/

		clear: function()
			{
			this.element.empty();
			},

		/**
		* focuses the rich_textarea
		*
		* focuses the rich_textarea and sets the initial selection.
		*
		* @todo this is broken. scoping.
		*/

		focus: function()
			{

			var sel = RANGE_HANDLER.getSelection();
			var range = CREATERANGE_HANDLER.createRange();

			range.setStart( this.element.get(0), 0 );

			this.element.focus();

			}

	    });	// end of $.widget() parameter list.

	})(jQuery);
