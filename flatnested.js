;(function(exports) {

    var _$ = exports._$ = exports._$ || {};
    
    _$.ce = function(errorCallback, func) {

        // If the user didn't specify an errorCallback, we assume that
        // the caller of this function is using the (data, callback)
        // pattern, so we can just invoke the callback param on the
        //case of an error
        if(!func) {
            func = errorCallback;
            errorCallback = arguments.callee.caller.arguments[1];
        }

        return function(error, result) {
            if(error) {
                errorCallback(error);
                return;
            }
            func(result);
        };
    };

    // This can have a variable number of args, should be in the format
    // serial(data, action1, action2, ..., actionX, callback);
    // first data param is optional
    _$.serial = function() {
        
        if(arguments.length < 2) {
            throw 'At least one action and callback required';
        }

        var completed = arguments[arguments.length - 1];
        if(typeof completed !== 'function') {
            throw 'Last parameter must be a callback function';
        }
      
        _$.debug && console.dir(arguments);

        var data,
            actionIndex = 0, 
            actionCount;
        if(typeof arguments[0] !== 'function') {
            data = arguments[0];
            actionIndex = 1;
        }
        
        var args = arguments;
        var firstCall = true;
        function run(previousResult) {
            var action = args[actionIndex++];

            _$.debug && console.log('calling:' + (actionIndex - 1));
            
            function runNext(error, result) {
                if(error) {
                    completed(error);
                    return;
                }
                
                if(actionIndex === args.length - 1) {
                    completed(null, result);
                }
                else {
                    run(result);
                }   
            }

            if(firstCall && !previousResult) {
                firstCall = false;
                action(runNext);
            }
            else {
                firstCall = false;
                action(previousResult, runNext);
            }
        }
        run(data);
    };
}(typeof exports === 'undefined' ? window : exports));