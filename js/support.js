
function newsTitleFiller(count){
	var headline_fillers = ["Next title", "Here's next", "Next one"];
	if(count > headline_fillers.length)
		count = headline_fillers.length;
	return headline_fillers[Math.floor(Math.random() * count)];
}

function makeFullURL(uri, url){
	uri_obj = new URI(uri);
	if (!(uri_obj.authroity && uri_obj.scheme))
		return url+uri_obj.path
	else
		return uri
}

function checkAuthenticityOfURL(site_url, article_url){
  let site = new URI(site_url);
  let article = new URI(article_url);
  return (site.authority == article.authority);
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

var supportedSites = {
	times_of_india: function(){
		this.display_name = "Times of india"
		this.site_url = "http://timesofindia.indiatimes.com" // should not end with '/'
		this.feed_proxy = new FeedProxy(this.site_url);
		this.class_name = 'times_of_india';
		this.local_storage_object = new AppStorage();

		this.getFeedList = function(){
			var self = this;
			return new Promise(function(resolve, reject){
				getFeedListFromStorage(self.local_storage_object, self.class_name)
					.then(function(feed_list){
						resolve(feed_list);
					})
					.catch(function(){
						self.feed_proxy.getPage()
							.then(function(pageText){
								var list = [];
								dom_element = stringToDOM(pageText);
								anchors = $q('[data-vr-zone="top_stories"] a', dom_element).all()
								for(i=0; i<anchors.length;i++){
									a_link = anchors[i].getAttribute('href').trim();
								    a_text = anchors[i].innerText.trim();
								    if(a_link != "" && a_text != ""){
								    	list.push({
								    		title: a_text, 
								    		url: makeFullURL(a_link, self.site_url),
								    		source_name: self.display_name, // Added part of template need.
								    		class_name: self.class_name
								    	});
									}
								}
								addFeedListToStorage(self.local_storage_object, self.class_name, list)
									.then(function(){
										resolve(list);
									})
									.catch(function(addFeedListError){
										reject(addFeedListError);
									});
							})
							.catch(function(error){
								console.log("[Error] Error fetching feed list.")
								reject(error);
							});
					});
			});
		}

		// This method is written for testing.
		this.readHeadLines = function(){
			var self = this;
			// New information in voice.
			self.feed_proxy.speechSynthesiser("News titles from "+this.display_name);
			self.getFeedList()
				.then(function(response){
			   		for(i in response){
			   			console.log("[Reading] "+response[i].title);
						self.feed_proxy.speechSynthesiser(response[i].title);
						if(i != response.length-1)
							self.feed_proxy.speechSynthesiser(newsTitleFiller(response.length));
			   		}
			   	})
			   	.catch(function(error){
			   		console.log("[Error] Error reading headlines: "+ error);
			   	})
		}

		this.getCleanContent = function(article_div){
			article_div = removeAllTags('.similar-articles', article_div);
			article_div = removeAllTags('.sponsor_block', article_div);
			article_div = removeAllTags('.topcomment', article_div);
			article_div = removeAllTags('[data-type="tilCustomLink"]', article_div);
			return article_div.innerText.trim().replace(/\n|\r/g, "");
		}

		this.getArticle = function(article_title, article_url){
			var self = this;
			return new Promise(function(resolve,reject){
				if(checkAuthenticityOfURL(self.site_url, article_url)){
					var article_feed_proxy = new FeedProxy(article_url);
					article_feed_proxy.getPage()
						.then(function(responseHTML){
							dom_element = stringToDOM(responseHTML);
							main_dom = $q('[itemprop="articleBody"] arttextxml .Normal', dom_element).first();
							article_head = "Title of the article : "+article_title
							article_feed_proxy.speechSynthesiser(article_head+". "+self.getCleanContent(main_dom));
							resolve();
						})
						.catch(function(error){
							reject(error);
						});
				}else{
					reject('[Error] UnAuthenticate article url.');
				}
			});
		}

	},

	techcrunch: function(){
		this.display_name = "Techcrunch"
		this.site_url = "https://techcrunch.com" // should not end with '/'
		this.feed_proxy = new FeedProxy(this.site_url);
		this.class_name = 'techcrunch';
		this.local_storage_object = new AppStorage();

		this.getFeedList = function(){
			var self = this;
			return new Promise(function(resolve, reject){
				getFeedListFromStorage(self.local_storage_object, self.class_name)
					.then(function(feed_list){
						resolve(feed_list);
					})
					.catch(function(){
						self.feed_proxy.getPage()
							.then(function(pageText){
								var list = [];
								dom_element = stringToDOM(pageText);
								block = $q('ul.river', dom_element).first()
								anchors = $q('h2.post-title a', block).all()
								for(i=0; i<anchors.length;i++){
									a_link = anchors[i].getAttribute('href').trim();
								    a_text = anchors[i].innerText.trim();
								    if(a_link != "" && a_text != ""){
								    	list.push({
								    		title: a_text, 
								    		url: makeFullURL(a_link, self.site_url),
								    		source_name: self.display_name, // Added part of template need.
								    		class_name: self.class_name
								    	});
									}
								}
								addFeedListToStorage(self.local_storage_object, self.class_name, list)
									.then(function(){
										resolve(list);
									})
									.catch(function(addFeedListError){
										reject(addFeedListError);
									});
							})
							.catch(function(error){
								console.log("[Error] Error fetching feed list.")
								reject(error);
							});
					});
			});
		}

		this.getCleanContent = function(paragraphs){
			var full_content = "";
			for( i=0; i<paragraphs.length; i++ ){
				full_content = full_content + paragraphs[i].innerText.trim().replace(/\n|\r/g, "");
			}
			return full_content;
		}

		this.getArticle = function(article_title, article_url){
			var self = this;
			return new Promise(function(resolve,reject){
				if(checkAuthenticityOfURL(self.site_url, article_url)){
					var article_feed_proxy = new FeedProxy(article_url);
					article_feed_proxy.getPage()
						.then(function(responseHTML){
							dom_element = stringToDOM(responseHTML);
							main_dom = $q('div.l-main div.article-entry p', dom_element).all();
							article_head = "Title of the article : "+article_title
							clean_content = self.getCleanContent(main_dom);
							article_feed_proxy.speechSynthesiser(article_head+". "+clean_content);
							resolve();
						})
						.catch(function(error){
							reject(error);
						});
				}else{
					reject('[Error] UnAuthenticate article url.');
				}
			});
		}
	},

	the_new_york_times: function(){
		this.display_name = "The Newyork Times"
		this.site_url = "http://www.nytimes.com/pages/todayspaper/index.html?action=Click&module=HPMiniNav&region=TopBar&WT.nav=page&contentCollection=TodaysPaper&pgtype=Homepage" // should not end with '/'
		this.feed_proxy = new FeedProxy(this.site_url);
		this.class_name = 'the_new_york_times';
		this.local_storage_object = new AppStorage();

		this.getFeedList = function(){
			var self = this;
			return new Promise(function(resolve, reject){
				getFeedListFromStorage(self.local_storage_object, self.class_name)
					.then(function(feed_list){
						resolve(feed_list);
					})
					.catch(function(){
						self.feed_proxy.getPage()
							.then(function(pageText){
								var list = [];
								dom_element = stringToDOM(pageText);
								anchors = $q('div.columnGroup.first div.story h3 a', dom_element).all()
								for(i=0; i<anchors.length;i++){
									a_link = anchors[i].getAttribute('href').trim();
								    a_text = anchors[i].innerText.trim();
								    if(a_link != "" && a_text != ""){
								    	list.push({
								    		title: a_text, 
								    		url: a_link,
								    		source_name: self.display_name, // Added part of template need.
								    		class_name: self.class_name
								    	});
									}
								}
								addFeedListToStorage(self.local_storage_object, self.class_name, list)
									.then(function(){
										resolve(list);
									})
									.catch(function(addFeedListError){
										reject(addFeedListError);
									});
							})
							.catch(function(error){
								console.log("[Error] Error fetching feed list.");
								reject(error);
							});
					});
			});
		}

		this.getCleanContent = function(paragraphs){
			var full_content = "";
			for( i=0; i<paragraphs.length; i++ ){
				full_content = full_content + paragraphs[i].innerText.trim().replace(/\n|\r/g, "");
			}
			return full_content;
		}

		this.getArticle = function(article_title, article_url){
			var self = this;
			return new Promise(function(resolve,reject){
				if(checkAuthenticityOfURL(self.site_url, article_url)){
					var article_feed_proxy = new FeedProxy(article_url);
					article_feed_proxy.getPage()
						.then(function(responseHTML){
							dom_element = stringToDOM(responseHTML);
							main_dom = $q('p.story-content', dom_element).all();
							article_head = "Title of the article : "+article_title
							clean_content = self.getCleanContent(main_dom);
							article_feed_proxy.speechSynthesiser(article_head+". "+clean_content);
							resolve();
						})
						.catch(function(error){
							reject(error);
						});
				}else{
					reject('[Error] UnAuthenticate article url.');
				}
			});
		}
	},

	the_sun: function(){
		this.display_name = "The Sun"
		this.site_url = "https://www.thesun.co.uk/news" // should not end with '/'
		this.feed_proxy = new FeedProxy(this.site_url);
		this.class_name = 'the_sun';
		this.local_storage_object = new AppStorage();

		this.getFeedList = function(){
			var self = this;
			return new Promise(function(resolve, reject){
				getFeedListFromStorage(self.local_storage_object, self.class_name)
					.then(function(feed_list){
						resolve(feed_list);
					})
					.catch(function(){
						self.feed_proxy.getPage()
							.then(function(pageText){
								var list = [];
								dom_element = stringToDOM(pageText);
								anchors = $q('a.teaser-anchor', dom_element).all().slice(0, 10);
								for(i=0; i<anchors.length;i++){
									a_link = anchors[i].getAttribute('href').trim();
								    a_text = a_link.replace('https://www.thesun.co.uk/news', '').split('/')[2].replace(/-/g,' ');
								    a_text = capitalizeFirstLetter(a_text);
								    if(a_link != '' && a_text != ''){
								    	list.push({
								    		title: a_text, 
								    		url: a_link,
								    		source_name: self.display_name, // Added part of template need.
								    		class_name: self.class_name
								    	});
									}
								}
								addFeedListToStorage(self.local_storage_object, self.class_name, list)
									.then(function(){
										resolve(list);
									})
									.catch(function(addFeedListError){
										reject(addFeedListError);
									});
							})
							.catch(function(error){
								console.log("[Error] Error fetching feed list.");
								reject(error);
							});
					});
			});
		}

		this.getCleanContent = function(paragraphs){
			var full_content = "";
			for( i=0; i<paragraphs.length; i++ ){
				full_content = full_content + paragraphs[i].innerText.trim().replace(/\n|\r/g, "");
			}
			return full_content;
		}

		this.getArticle = function(article_title, article_url){
			var self = this;
			return new Promise(function(resolve,reject){
				if(checkAuthenticityOfURL(self.site_url, article_url)){
					var article_feed_proxy = new FeedProxy(article_url);
					article_feed_proxy.getPage()
						.then(function(responseHTML){
							dom_element = stringToDOM(responseHTML);
							main_dom = $q('div.article__content p', dom_element).all();
							if(main_dom[main_dom.length-1].indexOf('For the latest news on this story') > -1)
								main_dom.pop();
							article_head = "Title of the article : "+article_title
							clean_content = self.getCleanContent(main_dom);
							article_feed_proxy.speechSynthesiser(article_head+". "+clean_content);
							resolve();
						})
						.catch(function(error){
							reject(error);
						});
				}else{
					reject('[Error] UnAuthenticate article url.');
				}
			});
		}
	},

	the_torronto_star: function(){
		this.display_name = "The Torronto Star"
		this.site_url = "https://www.thestar.com/news.html" // should not end with '/'
		this.feed_proxy = new FeedProxy(this.site_url);
		this.class_name = 'the_torronto_star';
		this.local_storage_object = new AppStorage();

		this.getFeedList = function(){
			var self = this;
			return new Promise(function(resolve, reject){
				getFeedListFromStorage(self.local_storage_object, self.class_name)
					.then(function(feed_list){
						resolve(feed_list);
					})
					.catch(function(){
						self.feed_proxy.getPage()
							.then(function(pageText){
								var list = [];
								dom_element = stringToDOM(pageText);
								anchors = $q('div.story a', dom_element).all().slice(0, 20);
								for(i=0; i<anchors.length;i=i+2){
									a_link = anchors[i].getAttribute('href').trim();
								    a_text = a_link.split('/').pop().replace('.html','').replace(/-/g, ' ');
								    a_text = capitalizeFirstLetter(a_text);
								    if(a_link != "" && a_text != ""){
								    	list.push({
								    		title: a_text, 
								    		url: makeFullURL(a_link, 'https://www.thestar.com'),
								    		source_name: self.display_name, // Added part of template need.
								    		class_name: self.class_name
								    	});
									}
								}
								addFeedListToStorage(self.local_storage_object, self.class_name, list)
									.then(function(){
										resolve(list);
									})
									.catch(function(addFeedListError){
										reject(addFeedListError);
									});
							})
							.catch(function(error){
								console.log("[Error] Error fetching feed list.");
								reject(error);
							});
					});
			});
		}

		this.getCleanContent = function(paragraphs){
			var full_content = "";
			for( i=0; i<paragraphs.length; i++ ){
				full_content = full_content + paragraphs[i].innerText.trim().replace(/\n|\r/g, "");
			}
			return full_content;
		}

		this.getArticle = function(article_title, article_url){
			var self = this;
			return new Promise(function(resolve,reject){
				if(checkAuthenticityOfURL(self.site_url, article_url)){
					var article_feed_proxy = new FeedProxy(article_url);
					article_feed_proxy.getPage()
						.then(function(responseHTML){
							dom_element = stringToDOM(responseHTML);
							main_dom =$q('[itemprop="articleBody"]', dom_element).all()
							article_head = "Title of the article : "+article_title
							clean_content = self.getCleanContent(main_dom);
							article_feed_proxy.speechSynthesiser(article_head+". "+clean_content);
							resolve();
						})
						.catch(function(error){
							reject(error);
						});
				}else{
					reject('[Error] UnAuthenticate article url.');
				}
			});
		}
	}
}