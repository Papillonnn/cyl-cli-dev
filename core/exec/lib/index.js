'use strict';
const path = require('path');
const cp = require('child_process');
const Package = require('@cyl-cli-dev/package');
const log = require('@cyl-cli-dev/log');

const SETTINGS = {
    init: '@imooc-cli/init'
}

const CACHE_DIR = 'dependencies'

async function exec() {
    let targetPath = process.env.CLI_TARGET_PATH;
    const homePath = process.env.CLI_HOME_PATH;
    let pkg, storeDir = null;

    const cmdObj = arguments[arguments.length - 1];
    const cmdName = cmdObj.name();
    const packageName = SETTINGS[cmdName];
    const packageVersion = 'latest';
    // const packageVersion = '1.1.0';

    if(!targetPath) {
        targetPath = path.resolve(homePath, CACHE_DIR);
        storeDir = path.resolve(targetPath, 'node_modules');
        log.verbose('targetPath', targetPath);
        log.verbose('storeDir', storeDir);

        pkg = new Package({
            targetPath,
            storeDir,
            packageName,
            packageVersion
        });
        if(await pkg.exists()) {
            await pkg.update();
        }else {
            await pkg.install()
            log.verbose('install complete');
        }
    }else {
        pkg = new Package({
            targetPath,
            packageName,
            packageVersion
        });
    }
    const rootFile = pkg.getRootFilePath();
    log.verbose('rootFile', rootFile);
    if(rootFile) {
        try {
            // 在当前进程中调用
            // require(rootFile).call(null, Array.from(arguments));
            // 在Node子进程中调用
            const args = Array.from(arguments);
            let cmd = args[args.length - 1];
            const options = cmd.opts();
            cmd = Object.assign(cmd, options);
            // 对象瘦身
            const o = Object.create(null);
            Object.keys(cmd).forEach(key => {
                if(cmd.hasOwnProperty(key) && !key.startsWith('_') && key !== 'parent') {
                    o[key] = cmd[key];
                }
            })
            args[args.length - 1] = o;
            const code = `require('${rootFile}').call(null, ${JSON.stringify(args)});`;
            const child = spawn('node', ['-e', code], {
                cwd: process.cwd(),
                stdio: 'inherit'
            });
            child.on('error', e => {
                log.error(e.message);
                process.exit(1);
            });
            child.on('exit', e => {
                log.verbose('命令执行完成：', e);
                process.exit(e);
            })
        }catch(e) {
            log.error(e.message);
        }
    }
}
// windows兼容spawn方法
function spawn(command, args, options) {
    const win32 = process.platform === 'win32';

    const cmd = win32 ? 'cmd' : command;
    const cmdArgs = win32 ? ['/c'].concat(command, args) : args;

    return cp.spawn(cmd, cmdArgs, options || {});
}


module.exports = exec;