rich_textarea: a jQuery UI plugin replacement for a TEXTAREA.
=============

Rich_TextArea is a contenteditable TEXTAREA replacement widget featuring extendable @mention and #tag autocompletions in addition to rich object support.

[Homepage](http://miles-by-motorcycle.com/engineering/rich_textarea)

This is the second public release and is version alpha 2.


## Screenshot

![Screenshot](http://miles-by-motorcycle.com/static/rich_textarea/images/rich_textarea_screenshot.png)


## Demo

See [this demo](http://miles-by-motorcycle.com/static/rich_textarea/index.html).


## Overview

Rich_TextArea is not a WYSIWYG editor. It's intended to be a replacement for a plain TEXTAREA with some additional features including:

1. dropdown autocomplete support based on definable trigger characters such as @mentions, #tags, etc.
2. insertion of arbitrary markup to represent "embedded objects", such as images, links, etc. which are treated as single entities from the point of view of cursor movement and mouse selections. 
3. regular expression triggered callbacks enabling things like in-line URL rewriting, smiley insertion, etc.
4. generation of a plain text representation of the editable area.

Multiple autocomplete trigger characters can be defined simultaneously, each with it's own data-source callback so it's possible to do @mentions and #tagging and other kinds of triggers all at the same time. 

These "embedded objects" are treated as atomic entities and each is tagged with a "data-value" that is used to identify the object on the server. This could be a GUID, a tag name, an ID, whatever. When clicked on, the caret is positioned before the object and the *.highlight* class is applied. ARROW keys move over the object. Pressing DELETE when the caret is positioned before the object on the same line deletes it. Backspacing over an object deletes it as well. When selecting ranges using the mouse or SHIFT-ARROW, the ranges are adjusted to enclose any selected objects. (i.e. it prevents the user from selecting a range into the middle of an embedded object). Moving into an object using the UP and DOWN arrow keys also positions the caret the beginning of the object.  

Multiple regular expression triggers can also be defined.

A public method is available to generate a text version of the contents of the editable div. "embedded objects" are encoded using the 'data-value' and are represented in the text using the notation *[o={data-value}]*. This can then be passed back to the server. It's up to the server to parse this and do something useful with it.

This version, Alpha 2, improves on the previous version by normalizing the content of the editable div to use exclusively BR tags for newlines. The previous version, where we attempted to parse through the markup mess that each browser generated on it's own proved untenable. As such, the arrow key, backspace, delete and enter behavior of this version should be much more reliable. 

Pasting of plain text works well. Pasting of content with markup is currently not supported and will interfere with the operation of the editor.


## Browser Support

Rich_TextArea has been tested on:

1. FireFox 12 & 17
2. IE 9
3. Chrome 17
4. PS/3 
5. Safari

Later versions of these browsers should also work.

Internet Explorer browsers earlier than IE9 are not supported. 

It should be possible to make this code work with any browser that supports DOM selections and the contenteditable attribute, although depending on the details of the browser this may prove to be challenging. There is apparently no standard for how contenteditable should be implemented and each browser makes radically different design choices.


## Dependencies

Rich_TextArea depends on 

1. [jquery](http://jquery.com)
2. [jquery-ui](http://ui.jquery.com)
3. [jquery.scrollto](https://github.com/flesler/jquery.scrollTo)
4. [Scott Gonazalez' autocomplete html extension](https://github.com/scottgonzalez/jquery-ui-extensions/blob/master/autocomplete/jquery.ui.autocomplete.html.js)
5. [Tim Down's rangey](http://code.google.com/p/rangy/)

and has been tested with jquery-1.8.2, jquery-ui-1.9.0 and rangy-1.3alpha.

Versions of dependencies are now bundled so that the demo can be run "out of the box" without any configuration. 


### Usage

To use it, first pull in the jquery-ui stylesheet, then load jquery, jquery-ui, jquery.scrollTo, rangy-core, the included jquery-ui-autocomplete.html extension and finally jquery.rich_textarea.js

```javascript
<link rel="stylesheet" type="text/css" href="../jquery-1.8.2/css/smoothness/jquery-ui-1.9.0.custom.css">

<script src="jquery-1.8.2/js/jquery-1.8.2.js" type="text/javascript"></script>
<script src="jquery-1.8.2/js/jquery-ui-1.9.0.custom.js" type="text/javascript"></script>
<script src="jquery.scrollTo/jquery.scrollTo.min.js" type="text/javascript"></script>
<script src="rangy-1.3alpha.681/rangy-core.js" type="text/javascript"></script>

<script src="jquery.ui.autocomplete.html.js" type="text/javascript"></script>
<script src="jquery.rich_textarea.js" type="text/javascript"></script>
```

*Note:* Adjust your paths as appropriate.

**IMPORTANT** there is a [bug in jquery.ui.autocomplete](http://bugs.jqueryui.com/ticket/8911) that prevents the up and down arrows from working in FireFox in a contentedible div that has autocomplete enabled. To work around this, I commented out: 

```php
keypress: function( event ) {
   if ( suppressKeyPress ) {
      suppressKeyPress = false;

// 2013-01 YmL: so FireFox up and down arrow keys will work.
//    event.preventDefault();

      return;
     }
```

in jquery.ui.autocomplete.js. Hopefully they will come up with a fix for this soon.


Next, create a content editable div and give it a unique id: 

```html
<div contenteditable="true" id="rich_textarea"></div>
```

Enabling Rich_TextArea is just a matter of calling it on the given id. Currently, it supports two configuration options:
1. triggers: an array of trigger definitions consisting of a trigger character and a callback function. 
2. regexes: an array of regular expressions and callbacks to be invoked when the user enters something that matches.

```javascript

$( '#rich_textarea' ).rich_textarea( triggers:
	[{ tigger: '@',
	callback: function( trigger_word, response )
		{
		do stuff here with the trigger_word and return an array of labels and values.
		}
	}],
	regexes:
	[{ regex: '/^:beer:$/',
	callback: function( word_entry )
		{
		do stuff whenever someone types :beer: separated by spaces, possibly inserting a smiley.
		}
	}]);
```

The callback function will be called once a user enters a trigger character and at least two characters after that. (The number of characters is currently hard coded at 2). The trigger string and jquery autcomplete reseponse callback are then passed to the callback. The callback must call response with an array formatted as jquery.ui.autocomplet would expect. [jquery.ui.autocomplete formatted array of labels and values](http://api.jqueryui.com/autocomplete/#option-source). 

Rich_TextArea expects the value: key itself to consist of value: and content: keys as in:

```javascript

{ label: 'text or html for label in dropdown', value: { value: 'value/GUID for server', content: 'html to render object in editable div' } }

```

The value is made up of two parts.

1. *value* represents an id, guid or other value to send back to the server. 
2. *content* represents the html markup that should be inserted into the editable div when this item is selected from the autocomplete menu.
 
You may define multiple trigger characters each with their own callback function. In this way you can simultaneously have @user mentions along with #tags if you wanted or define other trigger characters for other purposes. See the [demo](http://miles-by-motorcycle.com/static/rich_textarea/demo/index.php) for an example of how this works. 


For regexes that trigger callbacks, the regex may be any javascript regex and is applied to every space delimited "word" entered into the content area. These are checked whenever the user presses ENTER of the SPACE key. It should be noted that regexes can be applied to items also used with autocomplete. For instance, as is shown in the example, one can have an autocomplete trigger defined for # but also fire a regex callback for any #tag that is entered but not selected from the dropdown. This useful, for example, for allowing a user to define new tags inline. 
The regex callback is provided a word object with the properties:
1. startNode - the text node on which the word that triggered the callback is located
2. startOffset - the offset into the startNode
3. endNode - the text node on which the word ends
4. endOffset - the offset into the end text node.
5. word - the word that caused the regex callback to fire. 


## Hightlighting

Rich_TextArea applies the *.highlight* class to an embedded object when it is clicked on with the mouse or moved next to using the arrow keys.


## Options

Currently, the only option supported is the *triggers* options described above.


### Generating Plain Text

To generate a plain text version of the editable div content use the getTextContent() method as in:

```javascript
alert( $( '#RICH_TEXTAREA' ).rich_textarea( 'getTextContent' ) );
```

### Clearing the DIV

To clear the contents of the div, call the clear() method as in:

```javascript
$( '#RICH_TEXTAREA' ).clear();
```

### Status of the Code

This is a second *ALPHA* release, codenamed 'Well, it sort of work.". I have tested this in Chrome, FireFox, MSIE 9 and Safari and it seems to work better than the previous release. There are still some edge cases that fail.

All the effort has gone into simply making the beast work more or less. No effort has been put into efficiency or packaging at this time.

Rich_TextArea was built for my [Miles By Motorcycle](http://miles-by-motorcycle.com) site and figures prominently on that site. 

I had really hoped to find an adequate pre-existing plugin that I could use but unfortunately I was unable to find anything that worked the way I needed. Thus, I decided to get my hands dirty and write a jQuery plugin. All I wanted to do was be able to have a textarea like widget that I could insert images and markup into, include @mentions and #tags, and have them work the way one would expect. Little did I know that this would end up being so challenging. There are many who have abandoned use of the contenteditable divs because they are so challenging in favor of less portable solutions.

Comments, suggestions and criticisms will be graciously received. 


### Some Comments on the Code

Depending on the browser, it turns out that it's often [impossible to select particular positions](http://miles-by-motorcycle.com/fv-b-8-665/you-can---t-select-that-----webkit-browser-selections-and-ranges-in-chrome-and-safari). For example, in Chrome it's not possible to select the space before a SPAN if the SPAN is the first thing in the contenteditable DIV. This means that the user cannot move the caret before an object they've inserted at the beginning of the DIV, which would be No Good(tm). The same is true if the user puts two objects right next to one another. Or tries to get "behind" the last object in the DIV. Etc. Etc.
Moving the caret has it's own issues in FireFox.

Then there is the issue that the three major browsers [all do different things when ENTER is pressed](http://miles-by-motorcycle.com/fv-b-8-666/a-summary-of-markup-changes-in-contenteditable-divs-in-webkit-firefox-and-msie).

As a result, developing this plugin has involved a tremendous amount of trial and error as I tried to figure out what the browsers were doing in all these various circumstances. The code reflects this trial and error. There are prodigious trace messages which can be turned on by calling *ddt.on()*. 

Originally, an attempt was made to parse through the markup generated by each browser. This led to all kinds of nasty edges case manifesting in double and triple newlines, backspaces that wouldn't work and all kinds of other problems. In this version, I am intercepting the ENTER onKeyDown event and managing the markup manually. All newlines are now represented using <BR>'s in all browsers. The trick is to prevent default event propagation after the event and then to manually manage moving the cursor and handle scrolling. (Preventing the default behavior out of onKeyDown for the ENTER key prevents the div from scrolling.)

The jquery scrollTo plugin is used to accomplish scrolling. The browser built in scrollIntoView() method causes all kinds of jumping and also bubbles up to the window level causing all kinds of odd behavior. It took some trial and error to determine that you cannot use a <BR> as the target for scrollTo. Thus a temporary <span> is inserted, used for the scroll call, and then removed. Sometimes, for reasons unknown, the <span> is not correctly removed. 

For non-selectable spaces such as between a <DIV> for an embedded object and the beginning or end of a line, I use no printing space characters. It turns out that textnodes are always selectable in all major browsers so the approach I've chosen is to insert Unicode Zero Width Space characters (u+200B) in those areas that are typically not selectable. These text nodes take up no space on the screen and are as a result invisible to the user. As long as there's one of these invisible characters present, the user can move the caret there. Thus the trick is to make sure that textnodes wrap objects in all cases regardless of how the users happens to edit the content. (HINT: It can get challenging when you consider inserting an object, deleting it, breaking a line then merging it back together again using the BACSPACE key, etc.)

Unfortunately, when moving the cursor using the arrow keys (or BACKSPACE), moving over zero width space characters does consume a keystroke, which means the user presses a key and nothing happens. Not Good(tm).

To address this, I intercept key presses and look to see if the caret is next to any zero width characters and skip over them accordingly. The same is done for BACKSPACE. It gets challenging when you consider that you might reach the end of a container, like a DIV in Chrome, and have to step out of that container, into an adjacent one and continue skipping across blank character. Then you have to also take into account that WebKit browsers do not merge adjacent textnodes, so you may have any number of textnodes with any number of zero width characters.

What has proven particularly challenging is getting cursor movement to behave as expected in all cases when one considers how the various browsers format content and what their default key handler behavior is. There are still some cases where the cursor jumps one space too many or the code doesn't recognize that it's next to an object (and should highlight it).


### Debugging

The code includes prodigious trace messages which can be turned by by including:

```html
<script src="ddt.js" type="text/javascript"></script>
```

and then calling:

```javascript
ddt.on();
```

Messages are sent to the javascript console. 


### Known Bugs

1. Under Linux, at least in Fedora Core, pressing the DELETE key on the numeric keypad in Chrome generates a keyCode of 0 which confuses Rich_TextArea.

2. Sometimes it's still possible after doing significant editing to confuse the cursor movement code. This should be improved in this version.

3. In FireFox, due to a [bug in jquery.ui.autocomplete](http://bugs.jqueryui.com/ticket/8911), without editing jquery.ui.autocomplete.js, up and down arrow keys do not work.

5. Clicking on an embedded image in MSIE causes the image to be selected by the browser allowing it to be deleted in such a way that confuses Rich_TextArea.

6. WebKit browsers do not handle *display: inline-block* correctly in editable divs correctly. The up and down arrow keys stop working.

7. WebKit browsers also do not handle *contenteditable="false"* tags in the editable area correctly. If two lines are merged where the second has such an uneditable span, WebKit delete the span and everything after it. 
