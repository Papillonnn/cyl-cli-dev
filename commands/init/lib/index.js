'use strict';

const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');
const userHome = require('user-home');
const inquirer = require('inquirer');
const semver = require('semver');
const Command = require('@cyl-cli-dev/command');
const log = require('@cyl-cli-dev/log');
const Package = require('@cyl-cli-dev/package');
const { spinnerStart, sleep } = require('@cyl-cli-dev/utils');

const getTemplateInfo = require('./getTemplateInfo');

const TYPE_PROJECT = 'project';
const TYPE_COMPONENT = 'component';

class InitCommand extends Command {
  init() {
    this.projectName = this._argv[0];
    this.force = !!this._cmd.force || false;
    log.verbose('projectName->', this.projectName);
    log.verbose('force->', this.force);
  }

  async exec() {
    try {
      const projectInfo = await this.prepare();
      log.verbose('projectInfo=>', projectInfo);
      if(projectInfo) {
        this.projectInfo = projectInfo;
        // 下载模板
        await this.downloadTemplate();
        // 安装模板
      }
    }catch (e) {
      log.error(e.message);
    }
  }

  async prepare() {
    // 判断模板是否存在
    const template = await getTemplateInfo();
    if(!template || template.length === 0) {
      throw new Error('项目模板不存在！');
    }
    this.template = template;
    const localPath = process.cwd();
    // 判断当前目录是否为空
    if (!this.isDirEmpty(localPath)) {
      if (!this.force) {
        const {ifContinue} = await inquirer.prompt({
          type: 'confirm',
          name: 'ifContinue',
          default: false,
          message: '当前文件夹不为空，是否继续创建项目？'
        });
        if (!ifContinue) return;
      }
      // 二次确认
      const {confirmDelete} = await inquirer.prompt({
        type: 'confirm',
        name: 'confirmDelete',
        default: false,
        message: '是否确认清空当前目录下的所有文件？'
      });
      if (confirmDelete) {
        // 清空当前目录
        fse.emptyDirSync(localPath);
      }
    }

    return this.getProjectInfo();
  }

  async getProjectInfo() {
    let projectInfo = null;
    // 选择创建项目或组件
    const { type } = await inquirer.prompt({
      type: 'list',
      name: 'type',
      message: '请选择创建项目或组件：',
      choices: [
        {
          name: '项目',
          value: TYPE_PROJECT
        },
        {
          name: '组件',
          value: TYPE_COMPONENT
        }
      ]
    })
    if (type === TYPE_PROJECT) {
      projectInfo = await inquirer.prompt([
        {
          type: 'input',
          name: 'projectName',
          message: '请输入项目名称：',
          default: '',
          validate: function(v) {
            // 首字符必须为英文字符
            // 尾字符必须为英文或数字
            // 字符仅允许 ’-_‘
            const done = this.async();
            setTimeout(function() {
              if (!/^[a-zA-Z]+([-][a-zA-Z][a-zA-Z0-9]*|[_][a-zA-Z][a-zA-Z0-9]*|[a-zA-Z0-9]*$)/.test(v)) {
                done('项目名称不合法！1.首字符必须为英文字符 2.尾字符必须为英文或数字 3.特殊字符仅允许 - _');
                return;
              }
              done(null, true);
            }, 0);
          },
          filter: v => {
            return v
          }
        },
        {
          type: 'input',
          name: 'projectVersion',
          message: '请输入项目版本：',
          default: '1.0.0',
          validate: function(v) {
            const done = this.async();
            setTimeout(function() {
              if (!(!!semver.valid(v))) {
                done('版本号不合法！');
                return;
              }
              done(null, true);
            }, 0);
          },
          filter: v => {
            if(!!semver.valid(v)) {
              return semver.valid(v);
            }
            return v;
          }
        },
        {
          type: 'list',
          name: 'projectTemplate',
          message: '请选择项目模板：',
          choices: this.createTemplateChoice()
        }
      ])
    } else if (type === TYPE_COMPONENT) {

    }
    return projectInfo;
  }

  isDirEmpty(localPath) {
    let fileList = fs.readdirSync(localPath);
    fileList = fileList.filter(file => (
      !file.startsWith('.') && file !== 'node_modules'
    ))
    return !fileList || fileList.length < 1;
  }

  createTemplateChoice() {
    return this.template.map(item => ({
      name: item.name,
      value: item.npmName
    }))
  }

  async downloadTemplate() {
    const { projectTemplate } = this.projectInfo;
    const templateInfo = this.template.find(item => item.npmName === projectTemplate);
    const targetPath = path.resolve(userHome, '.cyl-cli', 'template');
    const storeDir = path.resolve(userHome, '.cyl-cli', 'template', 'node_modules');
    const options = {
      targetPath: targetPath,
      storeDir: storeDir,
      packageName: templateInfo.npmName,
      packageVersion: templateInfo.version
    }
    console.log(options);
    const pkg = new Package(options);
    if(!await pkg.exists()) {
      const spinner = spinnerStart('正在下载模板...');
      await sleep(1000);
      try {
        await pkg.install();
        log.success('下载模板成功！');
      }catch (e) {
        throw e;
      }finally {
        spinner.stop(true);
      }
    }else {
      const spinner = spinnerStart('正在更新模板...');
      await sleep(1000);
      try {
        await pkg.update();
        log.success('更新模板成功！');
      }catch (e) {
        throw e;
      }finally {
        spinner.stop(true);
      }
    }
  }
}

function init(argv) {
  return new InitCommand(argv);
}

module.exports = init;
module.exports.InitCommand = InitCommand;
