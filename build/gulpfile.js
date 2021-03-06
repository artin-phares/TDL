var gulp = require('gulp'),
    util = require('gulp-util'),
    concat = require('gulp-concat'),
    insert = require('gulp-insert'),
    uglify = require('gulp-uglify'),
    del = require('del'),
    minifyCSS = require('gulp-minify-css'),
    sprite = require('gulp-sprite-generator'),
    replace = require('gulp-replace'),
    requirejs = require('requirejs'),
    esprima_harmony = require('esprima-harmony'),
    es = require('event-stream');

//region Paths

var paths = {
    src: '../src/',
    target: './bin/'
};

paths.config = {
    main: paths.src + 'config.json',
    overrides: './config.overrides.json'
};

paths.client = {
    src: paths.src + 'client/',
    target: paths.target + 'client/'
};

paths.client.manifest = 'manifest.json';

paths.client.serviceWorkers = [
    'sw/sw-init.js',
    'sw/sw-cache.js'
];

paths.client.scripts = {
    folder: paths.client.src + 'scripts/',
    mask: paths.client.src + 'scripts/*.js',
    targetMask: paths.client.target + '*.js'
};

paths.client.styles = {
    folder: paths.client.src + 'styles/',
    mask: paths.client.src + 'styles/*.css',
    targetMask: paths.client.target + '*.css'
};

paths.client.images = {
    folder: paths.client.src + 'images/',
    mask: paths.client.src + 'images/*',
    targetMask: paths.client.target + '*.png'
};

paths.client.views = {
    folder: paths.client.src,
    mask: paths.client.src + '*.html'
};

paths.ignore = [
    '**/placeholder',
    '**/*.log*'
];

//endregion

//region Presentation

gulp.task('clean', function(cb) {
    del([paths.target], {force: true},  cb);
});

gulp.task('scripts', ['clean'], function() {
    
    // Redefine optimiser's normal esprisma reference
    // to fork that supports Harmony features (like generators)
    // https://github.com/jrburke/r.js/issues/769
    // TODO: Generators should be added soon to original esprisma package (v2.3)
    requirejs.define('esprima', [], function () {
        return esprima_harmony;
    });
    
    var stream = es.pause();
    
    requirejs.optimize({
        name: "client",
        baseUrl: paths.client.scripts.folder,
        mainConfigFile: paths.client.scripts.folder + 'lib/require.config.js',
        paths: {
            requireLib: 'lib/vendor/require'
        },
        include: ['requireLib'],
        out: function(text) {
            stream.write(new util.File({
                path: 'app.js',
                contents: new Buffer(text)
            }));
        }
    });
    
    stream
        .pipe(insert.append(';require(["client"]);'))
        // uglify does not support Harmony generators for now.
        // TODO: Harmony features is handeled by
        //       https://github.com/mishoo/UglifyJS2/issues/448
        // .pipe(uglify())
        .pipe(gulp.dest(paths.client.target));
    
    return stream;
});

gulp.task('styles', ['clean'], function() {
    return gulp.src(paths.client.styles.mask)
        // Replace all 'url(/images/image.png)' with 'url(image.png)'
        .pipe(replace(/\/images\//g, ''))
        .pipe(concat('styles.css'))
        .pipe(gulp.dest(paths.client.target));
});

gulp.task('images', ['clean'], function() {
    return gulp.src(paths.client.images.mask)
        .pipe(gulp.dest(paths.client.target));
});

gulp.task('sprites', ['clean', 'styles', 'images'], function() {

    var spriteName = 'sprite.png';
    var spriteOutput = gulp.src(paths.client.styles.targetMask)
        .pipe(sprite({
            baseUrl: paths.client.target,
            spriteSheetName: spriteName,
            accumulate: true,
            padding: 2 // prevent overlapping when zooming (Chrome)
        }));

    var cssPromise = new Promise((resolve, reject) => {
        spriteOutput.css
            .pipe(minifyCSS({keepBreaks:true}))
            .pipe(gulp.dest(paths.client.target))
            .on('end', resolve)
            .on('error', reject);
    });
    
    var spritePromise = new Promise((resolve, reject) => {
        spriteOutput.img.pipe(gulp.dest(paths.client.target))
            .on('end', resolve)
            .on('error', reject);
    });
    
    // wait sprite output
    return Promise.all([cssPromise, spritePromise])
        .then(function() {

            // delete all sprited images
            del([
                paths.client.images.targetMask,
                '!' + paths.client.target + spriteName,
                '!' + paths.client.target + 'favicon*',
            ], {force: true});
        });
});

gulp.task('manifest', ['clean'], function() {
    return gulp.src(paths.client.manifest)
        .pipe(gulp.dest(paths.client.target));
});

gulp.task('service-workers', ['clean'], function() {
   return  gulp.src(paths.client.serviceWorkers)
        .pipe(replace(/#CACHE_VERSION/, new Date().toISOString()))
        .pipe(gulp.dest(paths.client.target));
});

gulp.task('views', ['clean'], function() {
    return gulp.src(paths.client.views.mask)

        // Replace all style links with singe link with reference to combined css
        .pipe(replace(/<link rel='stylesheet'.*>/, '#FIRSTSTYLETAG#'))
        .pipe(replace(/<link rel='stylesheet'.*>/g, ''))
        .pipe(replace(/#FIRSTSTYLETAG#/,
            "<link rel='stylesheet' type='text/css' href='styles.css'>"))

        // Replace all script tags with single tag with reference to combined js
        .pipe(replace(/<script.*script>/, '#FIRSTSCRIPTTAG#'))
        .pipe(replace(/<script.*script>/g, ''))
        .pipe(replace(/#FIRSTSCRIPTTAG#/,
            "<script type='text/javascript' src='sw-init.js'></script>\r\n" +
            "<script type='text/javascript' src='app.js'></script>"))

        .pipe(gulp.dest(paths.client.target));
});

gulp.task('client', [
    'scripts', 
    'styles', 
    'images', 
    'sprites', 
    'manifest', 
    'service-workers', 
    'views'
]);

//endregion

//region Backend

gulp.task('backend', ['clean'], function() {
    // Copy everything except client folder and other ignored resources
    return gulp.src([
        paths.src + '**/*',
        '!' + paths.client.src + '**/*'
    ].concat(paths.ignore.map(function(ignorePath) {
            return '!' + paths.src + ignorePath
        }))
    ).pipe(gulp.dest(paths.target));
});

//endregion

//region Config

gulp.task('config', ['clean', 'backend'], function() {
    return gulp.src([paths.config.main, paths.config.overrides])
        .pipe(gulp.dest(paths.target));
});

//endregion

gulp.task('build', ['backend', 'client', 'config']);

gulp.task('default', ['build']);
