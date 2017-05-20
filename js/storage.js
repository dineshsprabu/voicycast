var AppStorage = function(select){
	var self = this;
	self.storageObject = chrome.storage.local;

	if(select && select.settings && chrome.storage && chrome.storage.sync){
		self.storageObject = chrome.storage.sync;
	}

	self.get = function(key){
		return new Promise(function(resolve, reject){
			if(self.storageObject){
				self.storageObject.get(key, function(kvs){
			    	if (!chrome.runtime.lastError){
			    		if(kvs && kvs[key]){
			    			resolve(kvs[key]);
			    		}else{
			    			reject("[Error] Key not available: "+key)
			    		}
			    	}else{
			    		console.log("[Error] Error on storage get of key: "+key);
			    		reject(chrome.runtime.lastError);
			    	}
				});
			}else{
				reject("[Error] Sync storage is not available.")
			}
		});
	}

	self.getAll = function(){
		return new Promise(function(resolve, reject){
			if(self.storageObject){
				self.storageObject.get(function(kvs){
			    	if (!chrome.runtime.lastError){
			    		resolve(kvs);
			    	}else{
			    		console.log("[Error] Error on storage get of key: "+key);
			    		reject(chrome.runtime.lastError);
			    	}
				});
			}else{
				reject("[Error] Sync storage is not available.")
			}
		});
	}

	self.set = function(keyValuePair){
		return new Promise(function(resolve, reject){
			if(self.storageObject){
				self.storageObject.set(keyValuePair, function(){
			    	if (!chrome.runtime.lastError){
			    		resolve(true);
			    	}else{
			    		console.log("[Error] Error on storage set of keyPair");
			    		reject(chrome.runtime.lastError);
			    	}
				});
			}else{
				reject("[Error] Sync storage is not available.")
			}
		});
	}

	self.remove = function(key){
		return new Promise(function(resolve, reject){
			if(self.storageObject){
				self.storageObject.remove(key, function(){
			    	if (!chrome.runtime.lastError){
			    		resolve(true);
			    	}else{
			    		console.log("[Error] Error on storage remove of key: "+key);
			    		reject(chrome.runtime.lastError);
			    	}
				});
			}else{
				reject("[Error] Sync storage is not available.")
			}
		});
	}

	self.removeAll = function(){
		return new Promise(function(resolve, reject){
			if(self.storageObject){
				self.storageObject.clear(function(){
			    	if (!chrome.runtime.lastError){
			    		resolve(true);
			    	}else{
			    		console.log("[Error] Error on storage get of removeAll");
			    		reject(chrome.runtime.lastError);
			    	}
				});
			}else{
				reject("[Error] Sync storage is not available.")
			}
		});
	}
}



