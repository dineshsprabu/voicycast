function stringToDOM(htmlString){
	return (new DOMParser().parseFromString(htmlString, "text/html"))
}

function $q(selector, ctx) {
  ctx = ctx || document;
  // Return methods for lazy evaluation of the query
  return {
    // Return array of all matches
    all: function() {
      var list, ary = [];
      list = ctx.querySelectorAll( selector );
      for ( var i = 0; i < list.length; i++ ) {
        ary[ i ] = list[ i ];
      }
      return ary;
    },

    // Return first match
    first: function() {
      return ctx.querySelector( selector );
    },

    // Return last match
    last: function() {
      var list = ctx.querySelectorAll( selector );
      return list.length > 0 ? list[ list.length - 1 ] : null;
    }
  };
}

function removeAllTags(selector_string, domelement){
  found_elems = $q(selector_string, domelement).all();
  for(i in found_elems){
    found_elems[i].remove();
  }
  return domelement
}

function clearExistingSpeech(){
  console.log('[Status] Clearing exisiting speech before playing.');
  speechSynthesis.cancel();
}

function sendEndSignal(){
  console.log('[Status] End of speech.');
}

FeedProxy = function(url){
	var self = this;
	self.url = url;

	self.speechSynthesiser = function(selectedText) {
		if (window.speechSynthesis ){
			var speechInProgress = true;
			var speakBot = new SpeechSynthesisUtterance(selectedText);
      speakBot.voice = window.speechSynthesis.getVoices()[1];
      speakBot.volume = 0.7; // 0 to 1 
      speakBot.rate = 5; // 0.1 to 10
      speakBot.pitch = 0.8; //0 to 2
      speakBot.onstart = clearExistingSpeech();
      speakBot.addEventListener('end', function(){
        chrome.runtime.sendMessage({type: 'endOfSpeech'});
      });
			speechSynthesis.speak(speakBot);
		}
	}

	self.getPage = function(){
		return makeRequest({method: 'GET', url: self.url})
	}

	self.processPage = function(dStatus, callback){
		var respond = callback;
		var displayStatus = dStatus;
		makeRequest({method: 'GET', url: self.url})
			.then(function(response){
				self.speechSynthesiser(response); //Sending response text for synthesis.
				respond({status: 'success', displayStatus: displayStatus, response: response});
			})
			.catch(function(error){
				respond({status: 'error', error: error, response: ""});
			});
	}

}

function persistSingleWindow(windowID){
  return new Promise(function(resolve, reject){
    let storageObject = new AppStorage();
    let windowInformation = {}
    windowInformation.window_id = windowID;
    storageObject.set(windowInformation)
      .then(function(){
        console.log('[Status] Added window info to storage');
      })
      .catch(function(){
        console.log('[Error] Failed adding window info to storage');
      })
  })
}



/* Below code will make a detached popup window. */
chrome.browserAction.onClicked.addListener(function(){
  let storageObject = new AppStorage();
  storageObject.get('window_id')
    .then(function(window_id){
      chrome.windows.update(window_id, {focused: true}, function(){
        console.log('[Status] Existing window focused');
      });
    })
    .catch(function(){
      var w = 20;
      var h = 600;
      var left = (screen.width/2)-(w/2);
      var top = (screen.height/2)-(h/2); 
      chrome.windows.create({
        'url': '../html/popup.html', 
        'type': 'popup', 
        'height': 600,
        'width':400, 
        'left': left, 
        'top': top
      },
      function(nWindow){
        // Startup action: adds user location info to settings storage.
        persistSingleWindow(nWindow.id)
        addUserLocationIfNotAvailable();
      });
    });
});

function clearingWindowInformation(){
  let storageObject = new AppStorage();
  storageObject.remove('window_id')
  .then(function(){
    console.log('[Status] Deleted window information persisted.');
  })
  .catch(function(err){
    console.log('[Error] Unable to flush window details.');
  });
}


/* Short living connection */
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if(request.type == "getFeedList"){
		  siteObject = new supportedSites[request.options.site];
      siteObject.getFeedList()
        .then(function(feed_list){
          sendResponse({
            status: 'success',
            site: request.options.site,
            feed_list: feed_list
          })
        })
        .catch(function(err){
          sendResponse({
            status: 'failure',
            error: err
          })
        })
    }
    else if(request.type == "closingWindow"){
      speechSynthesis.cancel();
      clearingWindowInformation();
    }
    else if(request.type == "readMeThis"){
      var feed_object = new supportedSites[request.options.source_key];
      feed_object.getArticle(request.options.article_title, request.options.source_url)
        .then(function(){
          console.log("[Status] Playing the article: "+source_url);
          sendResponse({ status: "success", display_message: 'Playing'})
        })
        .catch(function(err){
          sendResponse({ status: "failure", error: err });
        })
    }
    return true;
});