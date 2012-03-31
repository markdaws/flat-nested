#flat-nested

flat-nested is a bare bones, terse helper library aimed at flattening those pesky nested asyncronous functions you find yourself writing all the time in node.js and asynchronous browser JavaScript. It's similar to other async helpers out there, but the aim is to be very terse in syntax and not require any preprocessing on the code to work.

##The async nesting problem
To illustrate, let's start with some synchronous code that performs the following set of logical actions:

* Fetch data from server
* Process data (i.e. sum up all values)
* Write processed data back to the server
* Prints out number of bytes written to the server (return result from the server)

This would look something like:

    try {
        // Fetch data, i.e. returns array of values
        var data = dataProvider.read('/api/v1/foo');
        
        // do some work
        var total = 0;
        for(var i=0; i<data.length; ++i) { total += data[i] }
        
        // write result back to the server
        var bytesWritten = dataProvider.write(total);
        
        console.log('bytes written:' + bytesWritten);
    }
    catch(e) {
        // handle the error
    }
    
Now lets make the dataProvider read/write methods asynchronous.  The standard pattern is to provide a callback that has two parameters (error, result), what you will notice is that we start having to get a lot more code and that you are constantly checking for errors on the callbacks.  The two patterns that flat-nested helps to solve.

The logical flow of our async version of the above code is:

* Send read request, wait for callback
* Check if error was returned, if so callback immediately with an error
* Process data asyncronously, wait for callback
* Check if error was returned, if so callbakc immediately with an error
* Send write request, wait for callback
* Check for error
* Show results

This is only three levels deep, but it can easily get much deeper if you need to chain more async actions together. Some pseudo code for this looks like:

    // Asyncronous data provider (for example purposes)
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
    dataProvider.process = function(data, callback) {
      
        // Processing could take some time, don't want to block
        // on it while data is being processed, imagine this is
        // happening on another thread :) for purposes of
        // illustration
        setTimeout(function() {
            var total = 0;
            var largest = 0;
            for(var i=0; i<result.length; ++i) {
                total += result[i];
                largest = Math.max(largest, result[i]);
            };
            callback(null, { total: total, largest: largest });
        }, 1000);
    };


    // This is our function to do all the work
    var fetchProcessAndWriteData = function(data, callback) {
        dataProvider.read(data.url, function(error, result) {
            if(error) {
                callback(error);
                return;
            }

            dataProvider.process(result, function(error, processedData) {
                if(error) {
                    callback(error);
                    return;
                }
                
                var info = 'total:' + processedData.total + ', largest:' + processedData.largest;
                dataProvider.write(info, function(error, bytesWritten) {
                    // Not technically needed since this is the last item in the chain
                    // could just pass back (error, bytesWritten) but here to show
                    // the normal pattern in async error checking
                    if(error) {
                        callback(error);
                        return;
                    }

                    callback(null, bytesWritten);
                });
            });
        });
    };
    fetchProcessandWriteData(
        { url: '/api/v1/foo' },
        function(error, result) {
            if(error) {
                console.log('error:' + error);
            }
            else {
                console.log('result:' + result);
            }
        }
    );

#flat-nested api

##serial - runs async methods serially

flat-nested is exported in a variable named _$ so you can use _$.serial.  To flatten the code, make each asyncronous piece of the code in to a function, with the following signature:

    var func = function(data, callback) {
    };

Where callback is a function with the signature function(error, result)

For example in the async code above we would have:

    var fetchData = function(data, callback) {
        dataProvider.read(data.url, function(error, result) {
            if(error) {
                callback(error);
                return;
            }

            callback(null, result);
        });
    };

    var processData = function(data, callback) {
        dataProvider.process(data, function(error, processedData) {
            if(error) {
                callback(error);
                return;
            }
            
            callback(null, processedData);
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

You get three nice logical functions, without all of the nesting.  Next we chain these functions together serially using flat-nested and the serial method.  It takes a data value as the first parameter, then an arbitrary number of async functions to call in order and finally a callback to call after all the async functions complete successfully or if there is an error with one of the functions:

    _$.serial(
        { url: '/api/v1/foo'},
        fetchData,
        procesData,
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

The first data parameter is optional, if you don't supply it, then the first async function signature can just be function(callback) instead of function(data, callback).


##ce - performs automatic error checking of async callback
The above code is a lot cleaner, but still littered with the:

    if(error) {
        callback(error);
        return;
    }
    
Pattern throughout the code.  To automatically have flat-nested add the error check for you, instead of having:

    function doSomethingAsync(data, callback) {
        dataProvider.read(data.url, function(error, result) {
            if(error) {
                callback(error);
                return;
            }
        
            //do something with result
            callback(null, result);
        });
    }

use _$.ce to wrap the callback:

    function doSomethingAsync(data, callback) {
      dataProvider.read(data.url, _$.ce(callback, function(result) {
          //do something with result
          callback(null, result);
      });
    }
    
The first parameter to ce is the callback to call if the async function returns an error, so in this case callback will be called with the error parameter of the result.  The ce function is just a wrapper that is doing the error check under the hood i.e.

    _$.ce = function(errorCallback, func) {
        return function(error, result) {
            if(error) {
                errorCallback(error);
                return;
            }
            func(result);
        };
    };

As an added bonus, you don't even need to pass the first callback parameter to the ce function, if you don't then it will use the callback parameter of the enclosing function - magic :) so your function just becomes:

    function doSomethingAsync(data, callback) {
      dataProvider.read(data.url, _$.ce(function(result) {
          //do something with result
          callback(null, result);
      });
    }
    
And that ladies and gentlemen is about as terse as we can get :)

#Use in node.js code
Simply add:

    var _$ = require('flatnested')._$

Obviously making sure you have the right paths setup to find the flatnested.js file

#Use in browser JavaScript code
Include the flatnested.js script in your page, the _$ variable is added to the global window object

#Contact me
markdawson@live.com