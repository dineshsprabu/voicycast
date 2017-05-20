function makeRequest (opts) {
  return new Promise(function (resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open(opts.method, opts.url, true);
    xhr.onload = function () {
      if (this.status >= 200 && this.status < 300) {
        resolve(xhr.response);
      } else {
        reject({
          status: this.status,
          statusText: xhr.statusText
        });
      }
    };
    xhr.onerror = function () {
      reject({
        status: this.status,
        statusText: xhr.statusText
      });
    };
    if (opts.headers) {
      Object.keys(opts.headers).forEach(function (key) {
        xhr.setRequestHeader(key, opts.headers[key]);
      });
    }
    var params = opts.params;
    if (params && typeof params === 'object') {
      params = Object.keys(params).map(function (key) {
        return encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
      }).join('&');
    }
    xhr.send(params);
  });
}

function getUserLocationInformation(){
	return new Promise(function(resolve, reject){
		if(navigator && navigator.geolocation){
			navigator.geolocation.getCurrentPosition(
				function(geoInfo){
					var location_info = {};
					var latlong_string = geoInfo.coords.latitude.toString()+","+geoInfo.coords.longitude.toString();
					location_url = "http://maps.googleapis.com/maps/api/geocode/json?latlng="+latlong_string+"&sensor=false"
					makeRequest({url: location_url, method:"GET"})
					.then(function(response){
						console.log("[Status] Fetching location information of the user.")
						var geolocation_object = JSON.parse(response).results;
						for(i in geolocation_object){
						     for(k in geolocation_object[i]){
								if(k == 'address_components'){
									for (acindex in geolocation_object[i]['address_components']){
										var geo_add_component = geolocation_object[i][k][acindex];
										if(geo_add_component['types'].indexOf('country') > -1){
											location_info['country'] = geo_add_component.long_name;
						                    location_info['country_code'] = geo_add_component.short_name;
										}else if(geo_add_component['types'].indexOf('administrative_area_level_1') > -1){
											location_info['state'] = geo_add_component.long_name;
										}else if(geo_add_component['types'].indexOf('locality') > -1){
											location_info['city'] = geo_add_component.long_name;
										}
									}
								}
							}
						}
						if (Object.keys(location_info).length > 1){ resolve(location_info); }
						else{ reject('[Error] No location data.'); }
					})
					.catch(function(error){
						reject(error);
					});
				}
			);
		}else{
			reject('[Error] Navigator not available.');
		}
	});
}


function addUserLocationIfNotAvailable(){
  var settingsStorageObject = new AppStorage({settings: true})
  return new Promise(function(resolve, reject){
    settingsStorageObject.getAll()
      .then(function(items){
        if(items){
          if(items.user_location){
            resolve(items.user_location)
          }
          else{
            getUserLocationInformation()
              .then(function(loc_info){
                var geo_loc = {user_location: loc_info}
                settingsStorageObject.set(geo_loc)
                  .then(function(){
                    resolve(geo_loc);
                  })
                  .catch(function(err){
                    reject(err);
                  });
              })
              .catch(function(err){
                reject(err);
              });
          }
        }
      })
      .catch(function(err){
        reject(err);
      });
  });
}

function getUserCountryFromIPInfo(){
	return new Promise(function(resolve, reject){
		makeRequest({url:"https://ipinfo.io/country", method:"GET"})
			.then(function(response){
				resolve({country_code: response.trim()});
			})
			.catch(function(){
				reject();
			});
	});
}

function applyCountryBasedDefaultFeed(settings){
	return new Promise(function(resolve, reject){
		addUserLocationIfNotAvailable()
			.then(function(location_info){
				if(location_info && location_info.country_code){
					location_pref = {}
					news_default = Object.keys(NEWS_PAPERS_BY_COUNTRY[location_info.country_code]);
					if(news_default && (news_default.length>0)){
						elem_id = 'feed_'+news_default[0];
						location_pref[elem_id] = true;
						settings.set(location_pref)
							.then(function(){
								$('#'+elem_id).prop('checked', true);
								console.log('[status] has set default pref');
								resolve();
							})
							.catch(function(){
								console.log("[Error] setting default by country.")
								reject();
							});
					} else{ reject(); }
				} else{ reject(); }
			})
			.catch(function(err){
				reject(err);
			});
	});
}

function getFeedPreferenceFromStorage(){
  let settingsObject = new AppStorage({settings: true});
  return new Promise(function(resolve, reject){
    settingsObject.getAll()
      .then(function(settings){
        feed_list = []
        for(k in settings){
          if((k.indexOf('feed_') > -1) && settings[k]){
            feed_list.push(k.split('feed_')[1])
          }
        }
        resolve(feed_list);
      })
      .catch(function(err){
        reject(err);
      });
  });
}


function timeDiffInHours(milliseconds){
	time_diff = (new Date).getTime() - milliseconds
	return parseInt((time_diff/(1000*60*60)) % 24)
}

// Maintaining feedlist based on corresponding expiry.

function getFeedListFromStorage(ls_object, site_name){
	console.log('[Status] Getting playlist from storage for :'+site_name);
	return new Promise(function(resolve, reject){
		ls_object.get(site_name+'_feed_timestamp')
			.then(function(feed_time){
				// Rejecting feed list on storage if expired.
				if(timeDiffInHours(feed_time) >= EXPIRY_BY_SITE[site_name]){
					reject('Feed on storage is expired');
				}else{
					ls_object.get(site_name+'_feed_list')
						.then(function(feed_list){
							resolve(feed_list);
						})
						.catch(function(feed_get_error){
							reject(feed_get_error);
						});
				}
			})
			.catch(function(feed_info_get_error){
				reject(feed_info_get_error);
			});
	});
}

function addFeedListToStorage(ls_object, site_name, feed_list){
	var kv_pair = {};
	kv_pair[site_name+'_feed_list'] = feed_list
	kv_pair[site_name+'_feed_timestamp'] = (new Date).getTime();
	console.log('[Status] Adding feed list to storage for : '+site_name);
	return ls_object.set(kv_pair);
}

var NEWS_PAPERS_BY_COUNTRY = {
	AU: { 'the_herald_sun': {} },
	CN: {'the_torronto_star': {}, 'the_globe_and_mail': {} },
	IN: { 'times_of_india':{}, 'hindustan_times': {} },
	JP: {'the_japan_news':{} }, // display_name: yomiuri shimbun
	NO: {'the_local':{} }, // www.thelocal.no
	TR: {'dailysabah':{} }, // www.dailysabah.com
	UK: {
			'the_sun':{}, //www.thesun.co.uk, http://www.dailymail.co.uk/
			'dailymail':{}
		}, 
	US: {
			'the_wall_street_journal':{}, 
			'the_new_york_times':{}, 
			'usa_today': {}
		}
}

var EXPIRY_BY_SITE = {
	times_of_india: 1,
	the_wall_street_journal: 24,
	the_new_york_times: 24,
	the_sun:24,
	dailymail: 24,
	the_herald_sun: 24,
	the_globe_and_mail: 24,
	the_torronto_star: 24,
	hindustan_times: 24,
	the_japan_news: 24,
	the_local: 24,
	dailysabah: 24
}

