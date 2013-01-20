rich_textarea: a jQuery UI plugin replacement for a TEXTAREA.
=============

Rich_TextArea is a contenteditable TEXTAREA replacement widget featuring extendable @mention and #tag autocompletions in addition to rich object support.

[Homepage](http://a-software-guy.com/rich_textarea/)

This is the first public release and is thus version alpha 1.


## Screenshot

![Screenshot](http://a-software-guy.com/demos/rich_textarea/images/rich_textarea_screenshot.png)


## Demo

See [this demo](http://a-software-guy.com/demos/rich_textarea/index.php).


## Overview

Rich_TextArea is not a WYSIWYG editor. It's intended to be a replacement for a plain TEXTAREA with additional feature including:

1. dropdown autocomplete support based on definable trigger characters such as @mentions, #tags, etc.
2. insertion arbitrary markup to represent "embedded objects", such as images, links, etc. which are treated as single entities from the point of view of cursor movement and mouse selections. 
3. generation of a plain text representation of the editable area.

Multiple autocomplete trigger characters can be defined simultaneously, each with it's own data-source callback so it's possible to do @mentions and #tagging and other kinds of triggers all at the same time. 

These "embedded objects" are treated as atomic entities and each is tagged with a "data-value" that is used to identify the object on the server. This could be a GUID, a tag name, an ID, whatever. When clicked on, the caret is positioned before the object and the *.highlight* class is applied. ARROW keys move over the object. Backspacing over an object removes it. 


A public method is available to generate a text version of the contents of the editable div. "embedded objects" are encoded using the 'data-value' and are represented in the text using the notation *[o={data-value}]*. This can then be passed back to the server. It's up to the server to parse this and do something useful with it.


## Browser Support

Rich_TextArea has been tested on:

1. FireFox 12 & 17
2. IE 9
3. Chrome 17

Later versions of these browsers should also work.

Safari is next on the list for testing. I suspect it will "just work".

Internet Explorer browsers earlier than IE9 are not supported. 

Opera has not been tested. 

It should be possible to make this code with with any browser that supports DOM selections and the contenteditable attribute, although depending on the details of the browser this may be challenging.


## Dependencies

Rich_TextArea depends on 

1. [jquery](http://jquery.com)
2. [jquery-ui](http://ui.jquery.com)
3. [Scott Gonazalez' autocomplete html extension](https://github.com/scottgonzalez/jquery-ui-extensions/blob/master/autocomplete/jquery.ui.autocomplete.html.js)
3. [Tim Down's rangey](http://code.google.com/p/rangy/)

and has been tested with jquery-1.8.2, jquery-ui-1.9.0 and rangy-1.3alpha.


### Usage

To use it, first pull in the jquery-ui stylesheet, then load jquery, jquery-ui, rangy-core, the included jquery-ui-autocomplete.html extension and finally jquery.rich_textarea.js

```javascript
<link rel="stylesheet" type="text/css" href="../jquery-1.8.2/css/smoothness/jquery-ui-1.9.0.custom.css">

<script src="../jquery-1.8.2/js/jquery-1.8.2.js" type="text/javascript"></script>
<script src="../jquery-1.8.2/js/jquery-ui-1.9.0.custom.js" type="text/javascript"></script>
<script src="../rangy-1.3alpha.681/rangy-core.js" type="text/javascript"></script>

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

Enabling Rich_TextArea is just a matter of calling it on the given id. Currently, it takes one argument which is an array of trigger definitions consisting of a trigger character and a callback function. 

```javascript

$( '#rich_textarea' ).rich_textarea( triggers:
	[{ tigger: '@',
	callback: function( trigger_word )
		{
		do stuff here with the trigger_word and return an array of labels and values.
		}
	}] );
```

The callback function will be called once a user enters a trigger character and at least two characters after that. (The number of characters is currently hard coded at 2). The trigger string is then passed to the callback. The callback must reply with an array formatted as jquery.ui.autocomplet would expect. [jquery.ui.autocomplete formatted array of labels and values](http://api.jqueryui.com/autocomplete/#option-source). 

Rich_TextArea expects the value: key itself to consist of value: and content: keys as in:

```javascript

{ label: 'text or html for label in dropdown', value: { value: 'value/GUID for server', content: 'html to render object in editable div' } }

```

The value is made up of two parts.

1. *value* represents an id, guid or other value to send back to the server. 
2. *content* represents the html markup that should be inserted into the editable div when this item is selected from the autocomplete menu.
 
You may define multiple trigger characters each with their own callback function. In this way you can simultaneously have @user mentions along with #tags if you wanted or define other trigger characters for other purposes. See the demo for an example of how this works. 


## Hightlighting

Rich_TextArea applies the *.highlight* class to an embedded object when it is clicked on with the mouse or moved next to using the arrow keys.


## Options

Currently, the only option supported is the *triggers* options described above.


### Generating Plain Text

To generate a plain text version of the editable div content use the getTextContent() method as in:

```javascript
alert( $( '#RICH_TEXTAREA' ).rich_textarea( 'getTextContent' ) );
```


### Status of the Code

This is a first ALPHA release. I have tested this in Chrome, FireFox and MSIE 9 and it seems to work. I will test in Safari soon.

All the effort has gone into simply making the beast work more or less. No effort has been put into efficiency or packaging at this time.

Rich_TextArea was built for my [Miles By Motorcycle](http://miles-by-motorcycle.com) site and will figure prominently once I launch the new codebase. As a result, I do not expect to abandon this project any time soon. 

I had really hoped to find an adequate pre-existing plugin that I could use but unfortunately I was unable to find anything that worked the way I needed. Thus, I decided to get my hands dirty and write a jQuery plugin. All I wanted to do was be able to have a textarea like widget that I could insert images and markup into, include @mentions and #tags, and have them work the way one would expect. Little did I know that this would end up being so challenging.

This is my first substantial jQuery plugin and by far the largest block of Javascript I've written. As a result, I'm sure there are countless areas where I am doing things less than optimally and in other places probably just plain wrong.

Comments, suggestions and criticisms will be graciously received. I suspect I am going to be doing a tremendous amount of this kind of work moving forward and I need to step up my game.


### Some Comments on the Code

Depending on the browser, it turns out that it's often [impossible to select particular positions](http://a-software-guy.com/2013/01/you-cant-select-that-webkit-browser-selections-and-ranges-in-chrome-and-safari/). For example, in Chrome it's not possible to select the space before a <SPAN> if the <SPAN> is the first thing in the <DIV>. This means that without some serious handstands the user cannot move the caret before an object they've inserted, which would be No Good(tm).
Moving the caret has it's own issues in FireFox.

Then there is the issue that the three major browsers [all do different things when ENTER is pressed](http://a-software-guy.com/2013/01/a-summary-of-markup-changes-in-contenteditable-divs-in-webkitfirefox-and-msie/).

As a result, the majority of work involved in developing this plugin has involved a tremendous amount of trial and error. The code reflects this trial and error. There are prodigious trace messages which can be turned on by calling *ddt.on()*. 

Despite not being able to select, for instance, the space between a <SPAN> and the beginning of a <DIV>, one can INSERT content there. It turns out that textnodes are always selectable in all major browsers so the approach I've chosen is to insert Unicode Zero Width Space characters (u+200B) in those areas that are typically not selectable. As long as there's one of these invisible characters present, the user can move the caret there. Thus the trick is to make sure that textnodes wrap objects in all cases regardless of how the users happens to edit the content. (HINT: It can get challenging when you consider inserting an object, deleting it, breaking a line then merging it back together again using the BACSPACE key, etc.)

Unfortunately, when moving the cursor using the arrow keys (or BACKSPACE), moving over zero width space characters does consume a keystroke, which means the user presses a key and nothing happens. Not Good(tm).

To address this, I intercept key presses and look to see if the caret is next to any zero width character and skip over them accordingly. The same is done for BACKSPACE. It gets challenging when you consider that you might reach the end of a container, like a <DIV> in Chrome, and have to step out of that container, into an adjacent one and continue skipping across blank character. Then you have to also take into account that WebKit browsers do not merge adjacent textnodes, so you may have any number of textnodes with any number of zero width characters.

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

2. Sometimes it's still possible after doing significant editing to confuse the cursor movement code. It will sometimes jump one character or line too many especially in the LEFT arrow case.

3. getTextContent() currently generates too many newlines.

4. In FireFox, due to a [bug in jquery.ui.autocomplete](http://bugs.jqueryui.com/ticket/8911), without editing jquery.ui.autocomplete.js, up and down arrow keys do not work.

5. Clicking on an embedded image in MSIE causes the image to be selected by the browser allowing it to be deleted in such a way that confuses Rich_TextArea.
