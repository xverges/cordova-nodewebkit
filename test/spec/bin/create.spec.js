var child_process = require('child_process'),
    cwd,
    fs = require('fs'),
    os = require('os'),
    path = require('path'),
    shelljs = require('shelljs'),
    ROOT = path.join(__dirname, '..', '..', '..'),
    script = path.join(ROOT,
                       'bin',
                       'create' + (os.platform === 'win32'? '.bat' : '')),
    update = path.join(ROOT,
                       'bin',
                       'update' + (os.platform === 'win32'? '.bat' : ''));

(function initTestDir() {
    cwd = mkDir(os.tmpdir(), 'cordova-nodewebkit-tests');
})();

function rmDirInCwd(name) {
    var dir = path.join(cwd, name);
    if (shelljs.test('-d', dir)) {
        shelljs.rm('-rf', dir);
    }
    return dir;
}
function mkDirInCwd(name) {
    return mkDir(cwd, name);
}
function mkDir(base, name) {
    var dir = path.join(base, name);
    if (!shelljs.test('-d', dir)) {
        shelljs.mkdir(dir);
    } else {
        shelljs.rm('-rf', path.join(dir, '*'));
    }
    return dir;
}

function runScript(cmdLine, done, check) {
    function cb(error, stdout, stderr) {
        if (check) {
            check(error, stdout, stderr);
        }
        done();
    }
    child_process.exec(cmdLine, {cwd: cwd}, cb);
}

function sameContents(file1, file2) {
    var s1, s2;
    s1 = fs.readFileSync(file1).toString();
    s2 = fs.readFileSync(file2).toString();
    return s1 === s2;
}


describe('bin/create', function () {
    var projDir = 'theProjDir';
    it('should rc=EX_USAGE + help message if called with bad params', function(done) {
        runScript(script, done, function(error, stdout, stderr) {
            expect(error.code).toBe(64);
            expect(stderr).toMatch(/^Usage: create/);
        });
    });
    it('should rc=EX_USAGE + help message if called with --help', function(done) {
        var cmd = script + ' --help ' + projDir + ' projName';
        runScript(cmd, done, function(error, stdout, stderr) {
            expect(error.code).toBe(64);
            expect(stderr).toMatch(/^Usage: create/);
        });
    });
    it('should rc=EX_USAGE + error message if called with existing path', function(done) {
        var cmd = script + ' ' + projDir + ' projName';
        mkDirInCwd(projDir);
        runScript(cmd, done, function(error, stdout, stderr) {
            expect(error.code).toBe(64);
            expect(stderr).toMatch(/^Project already exists. Delete and recreate\s$/);
        });
    });
    it('should rc=0 and a new project dir when properly called', function(done) {
        var cmd = script + ' ' + projDir + ' projName',
            tgt = rmDirInCwd(projDir);
        runScript(cmd, done, function(error, stdout, stderr) {
            expect(error).toBe(null);
            expect(fs.existsSync(tgt)).toBeTruthy();
            expect(stderr).toMatch(/^$/);
        });
    });
});

describe('bin/update', function () {
    var projDir = 'theProjDir';
    it('should rc=EX_USAGE + help message if called with bad params', function(done) {
        runScript(update, done, function(error, stdout, stderr) {
            expect(error.code).toBe(64);
            expect(stderr).toMatch(/^Usage: update/);
        });
    });
    it('should rc=EX_USAGE + help message if called with --help', function(done) {
        var cmd = update + ' --help ' + projDir;
        runScript(cmd, done, function(error, stdout, stderr) {
            expect(error.code).toBe(64);
            expect(stderr).toMatch(/^Usage: update/);
        });
    });
    it('should rc=EX_NOINPUT + error message if called with non existing path', function(done) {
        var cmd = update + ' ' + projDir;
        rmDirInCwd(projDir);
        runScript(cmd, done, function(error, stdout, stderr) {
            expect(error.code).toBe(66);
            expect(stderr).toMatch(/^Project not found\s$/);
        });
    });
    it('should rc=0 and an updated cordova.js when properly called', function(done) {
        var cmd1 = script + ' ' + projDir + ' projName',
            cmd2 = update + ' ' + projDir,
            tgt = rmDirInCwd(projDir),
            cordovajs = path.join(tgt, 'app', 'www', 'cordova.js'),
            libCordovajs = path.join(ROOT, 'cordova-lib', 'cordova.js');
        runScript(cmd1, onCreated);
        function onCreated() {
            shelljs.sed('-i', /var /gm, 'var  ', cordovajs);
            runScript(cmd2, done, function(error /*, stdout, stderr*/) {
                expect(error).toBe(null);
                expect(sameContents(cordovajs, libCordovajs)).toBeTruthy();
            });
        }
    });
});

describe('default project layout', function() {
    var projDir = 'checkTree',
        projName = 'projName',
        manifest,
        manifestFile,
        cmd = script + ' ' + projDir + ' ' + projName,
        tgt = rmDirInCwd(projDir);
    beforeEach(function() {
        var done = false;
        if (!shelljs.test('-d', tgt)) {
            runs(function() {
                runScript(cmd, function() {
                    manifestFile = path.join(tgt, 'app', 'package.json');
                    // Cool trick to read JSON
                    //   https://github.com/joyent/node/issues/1357
                    manifest = require(manifestFile.replace(/\.json$/, ''));
                    done = true;
                });
            });
            waitsFor(function() {return done;}, 'script never finished!');
        }
    });
    it('has an \'app\' dir, with a nw \'package.json\'', function(){
        var app = path.join(tgt, 'app');
        expect(shelljs.test('-d', app)).toBeTruthy();
        expect(shelljs.test('-f', manifestFile)).toBeTruthy();
    });
    it('has an \'app/www\' dir, with a non dummy \'cordova.js\'', function(){
        var www = path.join(tgt, 'app', 'www'),
            cordovajs = path.join(www, 'cordova.js'),
            libCordovajs = path.join(ROOT, 'cordova-lib', 'cordova.js');
        expect(shelljs.test('-d', www)).toBeTruthy();
        expect(shelljs.test('-f', cordovajs)).toBeTruthy();
        expect(sameContents(cordovajs, libCordovajs)).toBeTruthy();
    });
    it('has a nw \'package.json\' with main set to \'www/index.html\'', function() {
        expect(manifest.main).toBe('www/index.html');
    });
    it('has a nw \'package.json\' with name and title set to projectName', function() {
        expect(manifest.name).toBe(projName);
        expect(manifest.window.title).toBe(projName);
    });
});

