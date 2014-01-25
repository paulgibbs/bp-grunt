/* jshint node:true */
module.exports = function( grunt ) {
	var path = require( 'path' ),
	SOURCE_DIR = 'src/',
	BUILD_DIR  = 'build/',

	// RTL from cssjanus
	BP_RTL_CSS = [
		'bp-activity/admin/css/*-rtl.css',
		'bp-core/admin/css/*-rtl.css',
		'bp-core/css/*-rtl.css',
		'bp-groups/admin/css/*-rtl.css',
		'bp-messages/css/*-rtl.css',
		'bp-templates/bp-legacy/css/*-rtl.css',
		'bp-xprofile/admin/css/*-rtl.css'
	],
	BP_LTR_CSS = [
		'bp-activity/admin/css/*.css',
		'bp-core/admin/css/*.css',
		'bp-core/css/*.css',
		'bp-groups/admin/css/*.css',
		'bp-messages/css/*.css',
		'bp-templates/bp-legacy/css/*.css',
		'bp-xprofile/admin/css/*.css'
	],

	BP_JS = [
		'bp-activity/admin/js/*.js',
		'bp-core/js/*.js',
		'bp-friends/js/*.js',
		'bp-groups/admin/js/*.js',
		'bp-groups/js/*.js',
		'bp-messages/js/*.js',
		'bp-templates/bp-legacy/js/*.js',
		'bp-xprofile/admin/js/*.js'
	];

	// Load tasks.
	require( 'matchdep' ).filterDev( 'grunt-*' ).forEach( grunt.loadNpmTasks );

	// Project configuration.
	grunt.initConfig({
		clean: {
			all: [ BUILD_DIR ],
			dynamic: {
				cwd: BUILD_DIR,
				dot: true,
				expand: true,
				src: []
			}
		},
		copy: {
			files: {
				files: [
					{
						cwd: SOURCE_DIR,
						dest: BUILD_DIR,
						dot: true,
						expand: true,
						src: [ '!**/.{svn,git}/**', '**' ] // Ignore version control directories.
					}
				]
			},
			dynamic: {
				cwd: SOURCE_DIR,
				dest: BUILD_DIR,
				dot: true,
				expand: true,
				src: []
			}
		},
		cssmin: {
			ltr: {
				cwd: SOURCE_DIR,
				dest: BUILD_DIR,
				expand: true,
				ext: '.min.css',
				src: BP_LTR_CSS,
				options: { banner: '/*! https://wordpress.org/plugins/buddypress/ */' }
			},
			rtl: {
				cwd: BUILD_DIR,
				dest: BUILD_DIR,
				expand: true,
				ext: '.min.css',
				src: BP_RTL_CSS,
				options: { banner: '/*! https://wordpress.org/plugins/buddypress/ */' }
			}
		},
		cssjanus: {
			core: {
				expand: true,
				cwd: SOURCE_DIR,
				dest: BUILD_DIR,
				ext: '-rtl.css',
				src: BP_LTR_CSS,
				options: { generateExactDuplicates: true }
			},
			dynamic: {
				expand: true,
				cwd: SOURCE_DIR,
				dest: BUILD_DIR,
				ext: '-rtl.css',
				src: []
			}
		},
		jshint: {
			options: grunt.file.readJSON( '.jshintrc' ),
			grunt: {
				src: [ 'Gruntfile.js' ]
			},
			core: {
				expand: true,
				cwd: SOURCE_DIR,
				src: BP_JS,

				/**
				 * Limit JSHint's run to a single specified file: grunt jshint:core --file=filename.js
				 *
				 * @param {String} filepath
				 * @returns {Bool}
				 */
				filter: function( filepath ) {
					var index, file = grunt.option( 'file' );

					// Don't filter when no target file is specified
					if ( ! file ) {
						return true;
					}

					// Normalise filepath for Windows
					filepath = filepath.replace( /\\/g, '/' );
					index = filepath.lastIndexOf( '/' + file );

					// Match only the filename passed from cli
					if ( filepath === file || ( -1 !== index && index === filepath.length - ( file.length + 1 ) ) ) {
						return true;
					}

					return false;
				}
			}
		},
		uglify: {
			core: {
				cwd: SOURCE_DIR,
				dest: BUILD_DIR,
				expand: true,
				ext: '.min.js',
				src: BP_JS
			},
			options: {
				banner: '/*! https://wordpress.org/plugins/buddypress/ */\n'
			}
		},
		phpunit: {
			'default': {
				cmd: 'phpunit',
				args: ['-c', 'phpunit.xml']
			},
			multisite: {
				cmd: 'phpunit',
				args: ['-c', 'tests/phpunit/multisite.xml']
			}
		},
		jsvalidate:{
			options:{
				globals: {},
				esprimaOptions:{},
				verbose: false
			},
			build: {
				files: {
					src: BUILD_DIR + '/**/*.js'
				}
			}
		},
		watch: {
			all: {
				files: [
					SOURCE_DIR + '**',
					// Ignore version control directories.
					'!' + SOURCE_DIR + '**/.{svn,git}/**'
				],
				tasks: [ 'clean:dynamic', 'copy:dynamic' ],
				options: {
					dot: true,
					interval: 2000,
					spawn: false
				}
			},
			rtl: {
				files: BP_LTR_CSS.map( function( path ) {
					return SOURCE_DIR + path;
				} ),
				tasks: [ 'cssjanus:dynamic' ],
				options: {
					interval: 2000,
					spawn: false
				}
			}
		},

		exec: {
			bbpress: {
				command: 'svn export https://bbpress.svn.wordpress.org/tags/1.2 bbpress',
				cwd: BUILD_DIR + 'bp-forums',
				stdout: false
			},
			bpdefault: {
				command: 'mkdir bp-themes && cp -R ../tools/bp-default bp-themes/',
				cwd: BUILD_DIR,
				stdout: false
			}
		}
	});


	// Build tasks.
	grunt.registerTask( 'build',         [ 'clean:all', 'copy:files', 'cssjanus:core', 'cssmin:ltr', 'cssmin:rtl', 'uglify:core', 'jsvalidate:build' ] );
	grunt.registerTask( 'build-release', [ 'clean:all', 'copy:files', 'cssjanus:core', 'cssmin:ltr', 'cssmin:rtl', 'uglify:core', 'jsvalidate:build', 'exec:bpdefault', 'exec:bbpress', 'phpunit:all' ] );

	// Testing tasks.
	grunt.registerMultiTask( 'phpunit', 'Runs PHPUnit tests, including the ajax and multisite tests.', function() {
		grunt.util.spawn( {
			cmd:  this.data.cmd,
			args: this.data.args,
			opts: { stdio: 'inherit' }
		}, this.async() );
	});

	grunt.registerTask( 'test', 'Runs all unit tasks.', [ 'phpunit' ] );

	// Default task.
	grunt.registerTask( 'default', [ 'build' ] );


	// Add a listener to the watch task.
	//
	// On `watch:all`, automatically updates the `copy:dynamic` and `clean:dynamic` configurations so that only the changed files are updated.
	// On `watch:rtl`, automatically updates the `cssjanus:dynamic` configuration.
	grunt.event.on( 'watch', function( action, filepath, target ) {
		if ( target !== 'all' && target !== 'rtl' ) {
			return;
		}

		var relativePath = path.relative( SOURCE_DIR, filepath ),
		cleanSrc = ( action === 'deleted' ) ? [ relativePath ] : [],
		copySrc  = ( action === 'deleted' ) ? [] : [ relativePath ];

		grunt.config( [ 'clean', 'dynamic', 'src' ], cleanSrc );
		grunt.config( [ 'copy', 'dynamic', 'src' ], copySrc );
		grunt.config( [ 'cssjanus', 'dynamic', 'src' ], copySrc );
	});
};