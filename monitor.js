const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { barkPush } = require('./bark');
const { liveStatus } = require('./api');
const dayjs = require('dayjs');
const DB_PATH = path.join(__dirname, 'anchor.json');

/* ========================
✅ 全局限流池（每分钟最多请求 60 次）
======================== */
const GLOBAL_LIMIT = 60;
let globalCount = 0;


const log = (...args) => console.log(`[${dayjs().format('YYYY-MM-DD HH:mm:ss')}]`, ...args);


/* ✅ 每分钟重置全局计数 */
cron.schedule('* * * * *', () => {
	globalCount = 0;
});

/* ========================
✅ 请求队列（防同时打爆）
每 1200ms 执行 1 个请求 ≈ 每分钟 50 次
======================== */
const queue = [];

setInterval(async () => {
	if (queue.length === 0) return;
	const task = queue.shift();
	await task();
}, 1200);

/* ========================
✅ 读取 JSON
======================== */
function readData() {
	if (!fs.existsSync(DB_PATH)) {
		fs.writeFileSync(DB_PATH, JSON.stringify([]));
	}
	return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

/* ========================
✅ 写入 JSON
======================== */
function writeData(data) {
	fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

/* ========================
✅ 动态时间段调频
0–12 点：10 分钟
12–21 点：5 分钟
21–24 点：1 分钟
======================== */
function applyTimeInterval(anchor) {
	const hour = new Date().getHours();

	if (hour < 12) anchor.checkInterval = 600;
	else if (hour < 21) anchor.checkInterval = 300;
	else anchor.checkInterval = 60;
}

/* ========================
✅ 真实 API 调用（带缓存防抖）
======================== */
async function checkLiveStatus(anchor) {
	const res = await liveStatus(anchor.id);

	if (!res || typeof res.room_status_code !== 'number') {
		throw new Error('API 结构异常');
	}

	return res.room_status_code === 0; // 0 = 直播中
}

cron.schedule('* * * * *', async () => {
	const list = readData();
	const now = Date.now();

	// log('🔄 开始新一轮主播检测');

	for (const anchor of list) {
		if (!anchor.monitor || anchor.paused) continue;

		applyTimeInterval(anchor);

		if (anchor.lastLive === true) {
			anchor.checkInterval = 300;
		}

		const interval = (anchor.checkInterval || 60) * 1000;

		if (now - (anchor.lastCheckAt || 0) < interval) continue;

		anchor.lastCheckAt = now;

		if (globalCount >= GLOBAL_LIMIT) {
			log('🚦 全局限流，跳过本轮请求');
			break;
		}

		globalCount++;

		queue.push(async () => {
			try {
				const isLive = await checkLiveStatus(anchor);
				anchor.failCount = 0;

				if (anchor.lastLive === undefined || anchor.lastLive === null) {
					anchor.lastLive = isLive;
				}

				/* ✅ 输出当前状态 */
				log(`检测主播：${anchor.name}，状态：${isLive ? '直播中' : '未直播'}`);

				if (!anchor.lastLive && isLive) {
					await barkPush(`${anchor.name} 开播了`, `主播 ${anchor.name} 已上线`);
					log(`✅ 开播推送：${anchor.name}`);
				}

				if (anchor.lastLive && !isLive) {
					await barkPush(`${anchor.name} 下播了`, `主播 ${anchor.name} 已下线`);
					log(`✅ 下播推送：${anchor.name}`);
				}

				anchor.lastLive = isLive;
				anchor.updatedAt = Date.now();
			} catch (err) {
				anchor.failCount = (anchor.failCount || 0) + 1;
				log(`❌ API 异常：${anchor.name} 第 ${anchor.failCount} 次`);

				if (anchor.failCount >= 5) {
					anchor.paused = true;
					await barkPush(`⚠️ 监控异常`, `${anchor.name} 连续 5 次 API 失败，已自动暂停`);
					log(`🚨 已暂停：${anchor.name}`);
				}
			}

			writeData(list);
		});
	}

	// log(`🔄 本轮主播检测结束，共加入队列 ${queue.length} 个任务`);
});