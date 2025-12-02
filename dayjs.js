const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

// 使用 utc 和 timezone 插件
dayjs.extend(utc);
dayjs.extend(timezone);

// 设置默认时区
dayjs.tz.setDefault('Asia/Shanghai');

// 导出配置好的 dayjs 实例
module.exports = dayjs;