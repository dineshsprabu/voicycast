
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


var supportedSites = {
	times_of_india: function(){
		this.display_name = "Times of india"
		this.site_url = "http://timesofindia.indiatimes.com" // should not end with '/'
		this.feed_proxy = new FeedProxy(this.site_url);
		this.class_name = 'times_of_india';

		this.getFeedList = function(){
			var self = this;
			return new Promise(function(resolve, reject){
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
						resolve(list);
					})
					.catch(function(error){
						console.log("[Error] Error fetching feed list.")
						reject(error);
					});
			});
		}

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

		this.getArticle = function(article_url){
			var self = this;
			return new Promise(function(resolve,reject){
				if(checkAuthenticityOfURL(self.site_url, article_url)){
					var article_feed_proxy = new FeedProxy(article_url);
					article_feed_proxy.getPage()
						.then(function(responseHTML){
							dom_element = stringToDOM(responseHTML);
							main_dom = $q('[itemprop="articleBody"] arttextxml .Normal', dom_element).first();
							article_feed_proxy.speechSynthesiser(self.getCleanContent(main_dom));
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
		this.site_url = "https://techcrunch.com"

		this.getFeedList = function(){
			var self = this;
			return new Promise(function(resolve, reject){
				(new FeedProxy(self.site_url)).getPage()
					.then(function(pageText){
						var list = [];
						resolve(list);
					})
					.catch(function(error){
						console.log("[Error] Error fetching feed list.")
						reject(error);
					});
			});
		}
	}
}