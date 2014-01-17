/**
 * jQuery Live Clipboard
 *
 * Copyright (c) 2009 Shinichi Tomita (shinichi.tomita@gmail.com)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
(function($) {

  var namespace = 'liveclip';
  var relayEvents = 
    'click,dblclick,mousedown,mouseup,mousemove,mouseover,mouseout,keypress,keyup'.split(',');

  /**
   * Adjust clipboard textarea size to cover parent clippable element.
   */
  function track() {
    var target = $(this);
    var clipboard = target.clipboard();
    var w = target.outerWidth(), h = target.outerHeight(), offset = target.offset();
    if (/^(auto|scroll)$/.test(target.css('overflow'))) w -= 20;
    if (clipboard) clipboard.css({ width : w, height : h, top : offset.top, left : offset.left });
  }

  /**
   * Finding and capture event target element, excluding clipboard textarea.
   * This is "pseudo" capturing, assuming no layered elements covering over the target.
   */
  function capture(el, e) {
    var captured = _capture(el);
    var clipboard = captured.clipboard();
    // if captured element has clipboard, return it. 
    return captured !== el && clipboard ? clipboard : captured;

    function _capture(el) {
      var target = el;
      el.children().each(function() {
        var child = $(this);
        var w = child.width(), h = child.innerHeight(), offset = child.offset();
        if (e.pageX > offset.left && e.pageX < offset.left + w &&
            e.pageY > offset.top  && e.pageY < offset.top  + h) {
          target = _capture(child);
        }
      })
      return target;
    }
  }

  /**
   * Context menu event handler 
   */
  function contextmenuHandler(e) {
    var clipboard = $(this);
    var target = clipboard.data(namespace + '-target');
    var options = target.data(namespace + '-clipboard-options');

    if (options.active && options.active.call(target) === false) {
      clipboard.attr('readonly', 'readonly');
      return;
    }

    if (options.paste || options.del) {
      clipboard.removeAttr('readonly');
    } else {
      clipboard.attr('readonly', 'readonly');
    }

    var val = options.copy ? options.copy.call(target) : '';
    clipboard.val(val);
    clipboard.get(0).select(); 
    if (options.paste || options.del) {
      val = clipboard.val();
      var watchPID = clipboard.data(namespace+'-watcher');
      if (watchPID) {
        clearInterval(watchPID);
        clipboard.removeData(namespace+'-watcher');
      }
      watchPID = setInterval(function() {
        var v = clipboard.val();
        if (v !== val) {
          try {
            if (v === '') {
              if (options.del) options.del.call(target)
            } else {
              if (options.paste) options.paste.call(target, v);
              clipboard.val('');
            }
          } catch(e) {}
          clearInterval(watchPID);
          clipboard.removeData(namespace+'-watcher');
        }
      }, 100);
      clipboard.data(namespace+'-watcher', watchPID);
    }
  }


  /**
   * Keyboard down event handler
   */
  function keydownHandler(e) {
    var clipboard = $(this);
    var target = clipboard.data(namespace + '-target');
    var options = target.data(namespace + '-clipboard-options');

    if (e.metaKey) {
      switch (e.keyCode) {
        case 67 : // Command + C
          var val = options.copy ? options.copy.call(target) : '';
          clipboard.val(val)
          clipboard.get(0).select(); 
          break;
        case 86 : // Command + V
          if (options.paste) {
            clipboard.get(0).select(); 
            setTimeout(function() {
              var data = clipboard.val();
              options.paste.call(target, data);
              clipboard.val('')
            }, 10);
          }
          break;
        case 88 : // Command + X
          var val = options.copy ? options.copy.call(target) : '';
          clipboard.val(val)
          clipboard.get(0).select(); 
          if (options.del) {
            setTimeout(function() {
              options.del.call(target)
            }, 10);
          }
          break;
        default :
          break;
      }
    } else if (e.keyCode==46) { // delete
      if (options.del) options.del.call(target);
    }

  }


  $.fn.extend({

    /**
     * Attach clipboard feature to block element
     * Get current clipboard proxy textarea
     */
    clipboard : function(options) {
      var elements = this;

      if (options) { // setter

        $(elements).each(function() {
          var target = $(this);
          var clipboard = target.data(namespace + '-clipboard');
          if (!clipboard) { 
            clipboard = $('<textarea></textarea>')
              .addClass(namespace+'-clipboard')
              .addClass(options.cls ? options.cls : '')
              .css({ 
                cursor : 'default',
                position : 'absolute', 
                fontSize : $.liveclip.debug ? '12px' : '1px',
                opacity : $.liveclip.debug ? .5 : .01 
              })
              .appendTo(document.body)
              .bind('contextmenu', contextmenuHandler)
              .bind('keydown', keydownHandler);
            $.each(relayEvents, function(i, eventName) {
              clipboard.bind(eventName+'.'+namespace, function(e) { 
                capture(target, e).trigger(e);
              });
            });
            if ($.liveclip.autoTrack) { target.bind('mouseover.'+namespace, track) }
            target.data(namespace+'-clipboard', clipboard);
            clipboard.data(namespace+'-target', target);
          }
          target.data(namespace+'-clipboard-options', options);
          track.call(target);
        });
        return this;

      } else { // getter
        return $(this).data(namespace + '-clipboard');
      }

    }
    ,

    /**
     * remove attached clipboard feature
     */
    removeClipboard : function() {
      $(this).each(function() {
        $(this).clipboard().remove();
        $(this).unbind('mouseover.'+namespace, track)
               .removeData(namespace + '-clipboard')
               .removeData(namespace + '-clipboard-options');
      });
      return this;
    }

  });

  $.liveclip = {
    debug : false,
    autoTrack : false
  }

  /**
   * Track all clipboard, aligning to target element position and size
   * If no target element available in document, removing clipboard.
   */
  $.trackClipboards = function() {
    $('body > textarea.'+namespace+'-clipboard').each(function() {
      var clipboard = $(this);
      var target = clipboard.data(namespace + '-target');
      if (target && target.parent()) {
        track.call(target);
      } else {
        clipboard.remove();
      }
    });
  }

  $(function() {
    if ($.liveclip.autoTrack) {
      $(document).mousemove($.trackClipboards);
    }
  })

})(jQuery)
