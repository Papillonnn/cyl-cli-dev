'use strict';

const path = require('path');
const pkgDir = require('pkg-dir').sync;
const pathExists = require('path-exists').sync;
const fse = require('fs-extra');
const npmInstall = require('npminstall');
const {isObject} = require('@cyl-cli-dev/utils');
const formatPath = require('@cyl-cli-dev/format-path');
const {getDefaultRegistry, getNpmLatestVersion} = require('@cyl-cli-dev/get-npm-info');

class Package {
  constructor(options) {
    if (!options) {
      throw new Error('Package参数options不能为空！');
    }
    if (!isObject(options)) {
      throw new Error('Package参数options必须为对象！');
    }
    // package目标路径
    this.targetPath = options.targetPath;
    // 缓存package路径
    this.storeDir = options.storeDir;
    this.packageName = options.packageName;
    this.packageVersion = options.packageVersion;
    // package缓存目录前缀
    this.cacheFilePathPrefix = this.packageName.replace('/', '_');
  }
  // _@imooc-cli_init@1.1.2@@imooc-cli

  async prepare() {
    if(this.storeDir && !pathExists(this.storeDir)) {
      fse.mkdirpSync(this.storeDir);
    }
    if(this.packageVersion === 'latest') {
      this.packageVersion = await getNpmLatestVersion(this.packageName)
    }
  }

  get cacheFilePath() {
    return path.resolve(this.storeDir, `_${this.cacheFilePathPrefix}@${this.packageVersion}@${this.packageName}`);
  }

  getSpecificCacheFilePath(packageVersion) {
    return path.resolve(this.storeDir, `_${this.cacheFilePathPrefix}@${packageVersion}@${this.packageName}`);
  }

  // 检测package是否存在
  async exists() {
    if(this.storeDir && pathExists(this.storeDir)) {
      await this.prepare();
      return pathExists(this.cacheFilePath);
    }else {
      return pathExists(this.targetPath);
    }
  }

  // 安装package
  async install() {
    await this.prepare();
    return npmInstall({
      root: this.targetPath,
      storeDir: this.storeDir,
      registry: getDefaultRegistry(),
      pkgs: [{
        name: this.packageName,
        version: this.packageVersion
      }]
    })
  }

  //  更新package
  async update() {
    await this.prepare();
    // 获取最新版本号
    // 查询最新版本对应的路径是否存在
    // 不存在直接安装最新版本
    const latestPackageVersion = await getNpmLatestVersion(this.packageName);
    if(!pathExists(this.getSpecificCacheFilePath(latestPackageVersion))) {
      await npmInstall({
        root: this.targetPath,
        storeDir: this.storeDir,
        registry: getDefaultRegistry(),
        pkgs: [{
          name: this.packageName,
          version: latestPackageVersion
        }]
      })
      this.packageVersion = latestPackageVersion;
    }
  }

  // 获取入口文件路径
  getRootFilePath() {
    function _getRootFile(targetPath) {
      // 1.获取package.json所在目录 ->pkg-dir
      const dir = pkgDir(targetPath);
      if (dir) {
        // 2.读取package.json -> require()
        const pkgFile = require(path.resolve(dir, 'package.json'));
        // 3.寻找main | lib
        if (pkgFile && pkgFile.main) {
          // 4.路径兼容(macOS|windows)
          return formatPath(path.resolve(dir, pkgFile.main));
        }
      }
      return null;
    }
    if(this.storeDir) {
      return _getRootFile(this.cacheFilePath);
    }else {
      return _getRootFile(this.targetPath);
    }
  }
}

module.exports = Package;