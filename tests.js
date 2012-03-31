var _$ = require('./flatnested.js')._$;

_$.debug = false;

var dataProvider = {};
dataProvider.read = function(url, callback) {
    setTimeout(function() {
        // return some fake data
        callback(null, [1, 2, 3, 4, 5]);
    }, 1000);
};
dataProvider.write = function(data, callback) {
    setTimeout(function() {
        // Returns the number of bytes written
        callback(null, data.length);
    }, 1000);
};


var fetchProcessAndWriteData = function(data, callback) {
    
    dataProvider.read(data.url, function(error, result) {
        if(error) {
            callback(error);
            return;
        }
        
        var total = 0;
        var largest = 0;
        for(var i=0; i<result.length; ++i) { 
            total += result[i]; 
            largest = Math.max(largest, result[i]);
        };

        var info = 'total:' + data.total + ', largest:' + data.largest;
        dataProvider.write(info, function(error, bytesWritten) {
            if(error) {
                callback(error);
                return;
            }
            
            callback(null, bytesWritten);
        });
    });
};

var writeData = function(data, callback) {
    
    var info = 'total:' + data.total + ', largest:' + data.largest;
    dataProvider.write(info, function(error, bytesWritten) {
        if(error) {
            callback(error);
            return;
        }

        callback(null, bytesWritten);
    });
};

var fetchAndProcessData = function(data, callback) {
    dataProvider.read(data.url, function(error, result) {
        if(error) {
            callback(error);
            return;
        }
        
        var total = 0;
        var largest = 0;
        for(var i=0; i<result.length; ++i) { 
            total += result[i]; 
            largest = Math.max(largest, result[i]);
        };

        callback(null, { total: total, largest: largest });
    });
};

var writeData = function(data, callback) {
    
    var info = 'total:' + data.total + ', largest:' + data.largest;
    dataProvider.write(info, function(error, bytesWritten) {
        if(error) {
            callback(error);
            return;
        }

        callback(null, bytesWritten);
    });
};

_$.serial(
    { url: '/foo/bar'},
    fetchAndProcessData,
    writeData,
    function(error, result) {
        if(error) {
            console.log('error:' + JSON.stringify(error));
        }
        else {
            console.log('result:' + result);
        }
    }
);

var fetchAndProcessData2 = function(data, callback) {
    dataProvider.read(data.url, _$.ce(callback, function(result) {
        var total = 0;
        var largest = 0;
        for(var i=0; i<result.length; ++i) { 
            total += result[i]; 
            largest = Math.max(largest, result[i]);
        };

        callback(null, { total: total, largest: largest });
    }));
};

var writeData2 = function(data, callback) {
    
    var info = 'total:' + data.total + ', largest:' + data.largest;
    dataProvider.write(info, _$.ce(function(bytesWritten) {
        callback(2, null, bytesWritten);
    }));
};

_$.serial(
    { url: '/foo/bar'},
    fetchAndProcessData2,
    writeData2,
    function(error, result) {
        if(error) {
            console.log('error:' + JSON.stringify(error));
        }
        else {
            console.log('result:' + result);
        }
    }
);