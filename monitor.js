const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { barkPush } = require('./bark');

const DB_PATH = path.join(__dirname, 'anchor.json');

// ✅ 读取数据
function readData() {
	if (!fs.existsSync(DB_PATH)) {
		fs.writeFileSync(DB_PATH, JSON.stringify([]));
	}
	return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

// ✅ 写入数据
function writeData(data) {
	fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

/**
 * ✅ 这里替换成你的真实直播状态 API
 * 必须返回 true/false
 */
async function checkLiveStatus(anchor) {
	// ⚠️ 示例：模拟直播（5 秒一变）
	return Math.random() > 0.7;
}

/**
 * ✅ 每 30 秒检测一次
 */
cron.schedule('*/30 * * * * *', async () => {
	const list = readData();
	const monitorList = list.filter(v => v.monitor === true);

	for (const anchor of monitorList) {
		try {
			const isLive = await checkLiveStatus(anchor);

			// ✅ 第一次初始化状态
			if (anchor.lastLive === undefined) {
				anchor.lastLive = isLive;
				continue;
			}

			// ✅ 开播推送
			if (!anchor.lastLive && isLive) {
				await barkPush(
					`${anchor.name} 开播了`,
					`主播 ${anchor.name} 已上线`
				);
				console.log(`✅ 开播推送：${anchor.name}`);
			}

			// ✅ 下播推送
			if (anchor.lastLive && !isLive) {
				await barkPush(
					`${anchor.name} 下播了`,
					`主播 ${anchor.name} 已下线`
				);
				console.log(`✅ 下播推送：${anchor.name}`);
			}

			anchor.lastLive = isLive;

		} catch (err) {
			console.log(`❌ 监控失败：${anchor.name}`, err.message);
		}
	}

	writeData(list);
});
