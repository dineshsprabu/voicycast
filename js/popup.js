function openCity(evt, cityName) {
    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    document.getElementById(cityName).style.display = "block";
}

function applyFeedChoiceFromStorage(settings){
	return new Promise(function(resolve, reject){
		settings.getAll()
			.then(function(items){
				var feed_pref_available = false;
				for(k in items){
					if(k.indexOf('feed_') > -1){
						if(items[k] && !$('#'+k).prop('checked')){
							$('#'+k).prop('checked', true);
						}else if(!items[k] && $('#'+k).prop('checked')){
							$('#'+k).prop('checked', false);
						}
						if(!feed_pref_available){
							feed_pref_available = true;
						}
					}
				}
				if(!feed_pref_available){
					reject();
				}
			})
			.catch(function(err){
				console.log('[Error] in applyFeedChoiceFromStorage.')
				reject(err);
			});
	});
}

function getPlaylistTemplate(liquid){
	return `<div class="playlist-container">
				<div class="playlist-left">
		  			<span class="feed-title"> 
		  				`+liquid.title+`
		  			</span>
		  			<div class="feed-bottom">
			  			<span class="feed-courtesy">
			  				Courtesy: `+liquid.source_name+` 
			  			</span>
			  			<a class="feed-visit" target="_blank" href="`+liquid.url+`">View article</a>
		  			</div>
		  		</div>
		  		<div class="playlist-right">
		  			<img src="../img/play.png" alt="play" id="play-this" class="play-status" data-bind="false" data-playing="false" data-skey="`+liquid.class_name+`" data-surl="`+liquid.url+`"></img>
		  		</div>
		  	</div>`
}


function populatePlaylistByPreference(){
	return new Promise(function(resolve, reject){
		getFeedPreferenceFromStorage()
			.then(function(pref_list){
				for(i in pref_list){
					console.log("[Status] Sending getPlaylistPageBuilt message to background..")
					chrome.runtime.sendMessage({
						type: "getFeedList",
						options: {
							site: pref_list[i]
						}
					},
					// Response for sendMessage.
					function(response){
						if(response.status == "success"){
							for(i in response.feed_list){
								$('.playlist').append(getPlaylistTemplate(response.feed_list[i]));
							}
							resolve();
						}else{
							console.log("[Error] Failed populating playlist: "+response.error)
							reject(response.error);
						}
					});
				}
			})
			.catch(function(err){
				reject(err);
			});
	});
}

function stopPlaying(){
	$('[src="../img/pause.png"]').click();
}

var playAll = false;

$(document).ready(function(){
	console.log("[Status] Loaded.");

	var settings = new AppStorage({settings:true});

	// Handling tab switch.
	$('.tablinks').on('click', function(){
		openCity(this, this.getAttribute('data-tab'));
	});

	$('#play-all').on('click', function(){
		if(!playAll){
			playAll = true;
			$('.playlist .playlist-container').first().find('img').click();
			$(this).text('Stop');
		}else{
			playAll = false;
			stopPlaying();
			$(this).text('Play All');
		}
	})

	// Supported websites settings.
	$("#supported_feeds label input:checkbox").change(function(){
		var ischecked = $(this).is(':checked');
		var keyName = $(this).attr('id');
		var keyPair = {};
		if(!ischecked){
			keyPair[keyName] = false;
		}else{
			keyPair[keyName] = true;
		}
		settings.set(keyPair)
			.then(function(){
				console.log('[Status] Below settings has been set:');
				console.log(keyPair);
			})
			.catch(function(error){
				console.log('[Error] Error adding below keyPair to settings');
				console.log(keyPair);
			});
 	});

 	applyFeedChoiceFromStorage(settings)
 		.then(function(){
 			console.log("[Status] Feed pref applied.")
 		})
 		.catch(function(){
 			console.log('in catch applyFeedChoiceFromStorage');
 			applyCountryBasedDefaultFeed(settings)
 				.then(function(){
 					applyFeedChoiceFromStorage(settings);
 				})
 				.catch(function(){
 					console.log('[Error] setting country based settings.');
 				});
 		});

	$('[data-tab="Wish List"]').on('click', function(){
		populatePlaylistByPreference()
			.then(function(){
			})
			.catch(function(err){
				console.log(err);
			});
	});

	var isOnePlaying = false; // To make play/pause image set.

	$('.playlist').bind('DOMNodeInserted', function(e){
		$($(e.target).find('img#play-this')[0]).on('click', function(){
			var self = this;
			var source_data = $(self).data();
			var article_title = $(self).parent().parent().find('span.feed-title').text().trim();
			if(source_data.playing || source_data.playing == "true"){
				$(self).data({playing: false});
				$(self).attr('src', '../img/play.png');
				window.speechSynthesis.cancel();
			}else{
				chrome.runtime.sendMessage({ 
					type: "readMeThis",
					options:{
						source_url: source_data.surl,
						source_key: source_data.skey,
						article_title: article_title
					}
				}, function(response){
					if(isOnePlaying){
						$('img').attr('src', '../img/play.png');
					}else{
						isOnePlaying = true;
					}
					$(self).data({playing: true});
					$(self).attr('src', '../img/pause.png');
				});
			}
		});
	});

});

// Message for notifying background about closing.
$(window).on('beforeunload', function(){
    chrome.runtime.sendMessage({ type: "closingWindow" });
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if(request.type == 'endOfSpeech'){
    	console.log('[Status] End of Speech');
    	// Change UI pause to play on end of speech.
    	$('[src="../img/pause.png"]').attr('src', '../img/play.png');
    }else if(request.type == 'playNext'){
    	if(playAll){
    		$('[src="../img/pause.png"]').parent().parent().next().find('img').click();
    	}
    }
    return true;
});
