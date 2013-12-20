
var simpleargs = require('./simpleargs'),
    path = require('path'),
    shelljs = require('shelljs');

var EX_USAGE = 64,
    HELP = 'Usage: create <projectPath> <projectName> [<projectTemplate>]\n' +
           '   <projectPath>: path to your new cordova-nodewebkit project\n' +
           '   <projectName>: name of the project\n' +
           '   <projectTemplate>: path to custom app template to use\n',
    ROOT = path.join(__dirname, '..', '..');

shelljs.config.fatal = true;

module.exports = {
    createProjectFromCmdLine: function() {
        var args  = simpleargs.getArgs(process.argv),
            rc;
        if (args['--help'] || args._.length < 2) {
            rc = this.showSyntax();
        } else {
            rc= this.createProject(args._[0], args._[1], args._[2]);
        }
        return rc;
    },
    createProject: function(projPath, projName , template) {
        var libCordova = path.join(ROOT, 'cordova-lib', 'cordova.js'),
            manifest = path.join(projPath, 'app', 'package.json'),
            rc = 0;
        if (shelljs.test('-e', projPath)) {
            rc = EX_USAGE;
            console.error('Project already exists! Delete and recreate');
        } else {
            if (template === undefined) {
                template = path.join(ROOT, 'bin', 'templates', 'project');
            }
            shelljs.mkdir(projPath);
            shelljs.cp('-R', path.join(template, '*'), projPath);
            shelljs.cp('-f', libCordova, path.join(projPath, 'app', 'www'));
            shelljs.sed('-i', /__PROJECT_NAME__/gm, projName, manifest);
        }
        return rc;
    },
    showSyntax: function() {
        console.error(HELP);
        return EX_USAGE;
    }
};
