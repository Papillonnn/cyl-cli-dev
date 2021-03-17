const request = require('@cyl-cli-dev/request');

function getTemplateInfo() {
  return request('project/getTemplate');
}

module.exports = getTemplateInfo;