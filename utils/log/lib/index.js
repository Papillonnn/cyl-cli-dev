'use strict';

const log = require('npmlog');

log.level = process.env.LOG_LEVEL ? process.env.LOG_LEVEL : 'info';

// log.heading = 'cyl-cli'; // 自定义头部信息
// log.headingStyle = { fg: 'red', bg: 'black' }; // 自定义头部样式
log.addLevel('success', 2000, { fg: 'green', bold: true }); // 添加自定义命令

module.exports = log;