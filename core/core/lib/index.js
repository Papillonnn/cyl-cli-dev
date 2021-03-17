'use strict';

module.exports = core;

const path = require('path');
const colors = require('colors');
const userHome = require('user-home');
const pathExists = require('path-exists').sync;
const commander = require('commander');

const pkg = require('../package.json');
const log = require('@cyl-cli-dev/log');
const exec = require('@cyl-cli-dev/exec');
const constant = require('./const');

const program = new commander.Command();

async function core() {
    try {
        await prepare();
        registerCommand();
    } catch(e) {
        log.error(e.message);
        if(program.opts().debug) {
            console.log(e)
        }
    }
}

async function prepare() {
    checkPkgVersion();
    rootCheck();
    checkUserHome();
    checkEnv();
    await checkGlobalUpdate();
}

/**
 * 检查版本号
 */
function checkPkgVersion() {
    const version = pkg.version;
    log.info('cli', version);
}


/**
 * 检查root权限并自动降级
 */
function rootCheck() {
    const rootCheck = require('root-check');
    rootCheck();
}

/**
 * 检查用户主目录是否存在
 */
function checkUserHome() {
    if(!userHome || !pathExists(userHome)) {
        throw new Error(colors.red('用户主目录不存在！'))
    }
}

/**
 * 检查环境变量
 */
function checkEnv() {
    const dotenvPath = path.resolve(userHome, '.env');
    if(pathExists(dotenvPath)) {
        require('dotenv').config({
            path: dotenvPath
        });
    }
    createDefaultConfig();
}

function createDefaultConfig() {
    const cliConfig = {
        home: userHome
    }
    if(process.env.CLI_HOME) {
        cliConfig['cliHome'] = path.join(userHome, process.env.CLI_HOME);
    }else {
        cliConfig['cliHome'] = path.join(userHome, constant.DEFAULT_CLI_HOME);
    }
    process.env.CLI_HOME_PATH = cliConfig['cliHome']
}

async function checkGlobalUpdate() {
    // const { getNpmSemverVersions } = require('@cyl-cli-dev/get-npm-info');
    // const { version: currentVersion, name: npmName } = pkg;
    // const lastVersion = await getNpmSemverVersions(currentVersion, npmName);
    // if(lastVersion && semver.gt(lastVersion, currentVersion)) {
    //     log.warn('更新提示', `请手动更新至最新版本，当前版本：${currentVersion}，最新版本：${lastVersion}
    //     更新命令：npm install -g ${npmName}`)
    // }
}

function registerCommand() {
    program
      .name(Object.keys(pkg.bin)[0])
      .usage('<command> [options]')
      .option('-d, --debug', '是否开启调试模式', false)
      .option('-tp, --targetPath <targetPath>', '是否指定本地调试文件路径', '')
      .version(pkg.version)

    program
      .command('init [projectName]')
      .option('-f, --force', '是否强制初始化项目')
      .action(exec)

    program.on('option:targetPath', function() {
        process.env.CLI_TARGET_PATH = program.opts().targetPath;
    })

    // 监听debug模式
    program.on('option:debug', function() {
        if(program.opts().debug) {
            process.env.LOG_LEVEL = 'verbose';
        }else {
            process.env.LOG_LEVEL = 'info';

        }
        log.level = process.env.LOG_LEVEL;
    })

    // 监听未知命令
    program.on('command:*', function(opts) {
        const availableCommands = program.commands.map(cmd => cmd.name());
        console.log(colors.red(`未知命令: ${opts[0]}`))
        if(availableCommands.length > 0) {
            console.log(colors.red(`可用命令: ${availableCommands.join(',')}`));
        }
    })

    if(process.argv.length < 3) {
        program.outputHelp();
    }

    program.parse(process.argv);
}