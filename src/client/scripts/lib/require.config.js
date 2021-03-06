/** 
 * Main RequireJs config file.
 */

var require = {
    baseUrl: 'scripts',
    paths: {
        'jquery': 'lib/vendor/jquery-2.1.3',
        'ko': 'lib/vendor/knockout-3.4.1.debug',
        'unobtrusive-knockout': 'lib/vendor/jquery.unobtrusive-knockout',
        'Sortable': 'lib/vendor/Sortable',
        'co': 'lib/vendor/co',
        'moment': 'lib/vendor/moment',
        'ResizeSensor': 'lib/vendor/ResizeSensor'
    },
    shim: {
        'jquery': {
            exports: ['jQuery']
        },
        'unobtrusive-knockout': {
            deps: ['jquery', 'ko']
        }
    },
    "waitSeconds": 120
};
