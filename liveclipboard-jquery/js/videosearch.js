/**
 *
 *
 */
$(function() {

  $('#submit').click(search);
  $('#query').keydown(function(e) { if (e.keyCode==13) search() });
    
  var properties = 
    'tbUrl,title,content,rating,duration,playUrl,published,publisher'.split(',');

  var clipOptions = {
    cls : 'tile-clipboard',
    active : function() { return $(this).hasClass('selected') },
    copy : function() {
      var data = [];
      data.push(properties.join('\t'));
      $(this).parent().find('> .selected').each(function() {
        var entry = $(this).data('json')
        var values = [];
        $.each(properties, function(i, prop) { values.push(esc(entry[prop])) });
        data.push(values.join('\t'));
      });
      return data.join('\n');
    },
    del : function() {
      $(this).parent().find('> .selected').removeClipboard().remove();
      $.trackClipboards();
    }
  }

  $('#searchResultContainer').clipboard({
    paste : function(data) {
      data = data.split('\n');
      $.each(data, function(i, values) {
        values = values.split('\t');
        if (!/^https?:/.test(values[0])) return;
        var entry = {};
        $.each(properties, function(i, prop) { entry[prop] = unesc(values[i]) });
        appendEntry(entry);
      });
      $.trackClipboards();
    }
  });

  function search() {
    var query = $('#query').val();
    if (query) {
      searchGoogle(query, 0, function(res) {
        var results = res;
        searchGoogle(query, 8, function(res) {
          Array.prototype.push.apply(results, res);
          renderResults(results);
        });
      })
    }
  }

  function searchGoogle(query, startIndex, callback) {
    $.getJSON(
      'http://ajax.googleapis.com/ajax/services/search/video?v=1.0&rsz=large&' +
      'q='+encodeURIComponent(query)+'&start='+startIndex+'&callback=?',
      function(r) { callback(r.responseData.results) }
    );
  }

  function renderResults(entries) {
    $('#searchResult').empty();
    $.each(entries, function(i, entry) { appendEntry(entry) });
    $.trackClipboards();
  }

  function appendEntry(entry) {
    $('<div />').addClass('tile')
      .append(
        $('<div />').addClass('tile-inner').append(
          $('<img />').attr('src', entry.tbUrl)
                      .attr('title', entry.title)
        )
      )
      .append($('<div />').addClass('title').text(entry.title))
      .appendTo($('#searchResult'))
      .data('json', entry)
      .click(function() { $(this).toggleClass('selected') })
      .clipboard(clipOptions)
  }

  function esc(str) {
    return /["\r\n]/.test(str) ? '"' + (str||'').replace(/"/g, '""') + '"' : str;
  }

  function unesc(str) {
    str = str || '';
    return /^".*"$/.test(str) ? str.substring(1, str.length-1).replace(/""/g, '"') : str;
  }


})
