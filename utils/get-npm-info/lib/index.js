'use strict';

const axios = require('axios');
const urlJoin = require('url-join');
const semver = require('semver');

function getNpmInfo(npmName, registry) {
  if(!npmName) return null;
  const registryUrl = registry || getDefaultRegistry();
  const npmInfoUrl = urlJoin(registryUrl, npmName);
  return axios.get(npmInfoUrl).then(res => {
    if(res.status === 200) {
      return res.data;
    }
    return null;
  }).catch(err => {
    return Promise.reject(err);
  })
}

/**
 * 获取当前包的所有版本
 * @param npmName
 * @param registry
 * @returns {Promise<string[]|*[]>}
 */
async function getNpmVersions(npmName, registry) {
  const data = await getNpmInfo(npmName, registry);
  if(data) {
    return Object.keys(data.versions);
  }else {
    return [];
  }
}

function getSemverVersions(baseVersion, versions) {
  return versions
    .filter(version => semver.satisfies(version, `>${baseVersion}`))
    .sort((a, b) => {
      if(semver.gt(b, a)) return 1;
      if(semver.lt(b, a)) return -1;
      return 0;
    });
}

/**
 * 获取最新版本
 * @param baseVersion 当前版本
 * @param npmName
 * @param registry
 * @returns {Promise<null|*>}
 */
async function getNpmSemverVersions(baseVersion, npmName, registry) {
  const versions = await getNpmVersions(npmName, registry);
  const newVersions = getSemverVersions(baseVersion, versions);
  if(newVersions && newVersions.length > 0) {
    return newVersions[0];
  }
  return null;
}

function getDefaultRegistry(isOriginal = false) {
  return isOriginal ? 'https://registry.npmjs.org' : 'https://registry.npm.taobao.org'
}

async function getNpmLatestVersion(npmName, registry) {
  let versions = await getNpmVersions(npmName, registry)
  if(versions) {
    versions = versions.sort((a, b) => {
      if(semver.gt(b, a)) return 1;
      if(semver.lt(b, a)) return -1;
      return 0;
    });
    return versions[0];
  }
  return null;
}

module.exports = {
  getNpmInfo,
  getNpmVersions,
  getNpmSemverVersions,
  getDefaultRegistry,
  getNpmLatestVersion
};
