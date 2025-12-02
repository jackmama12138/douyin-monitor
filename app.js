const express = require('express')
const cors = require('cors')
const fs = require('fs')
const path = require('path')
const {liveStatus, roomInfo,anchorInfo,rommInfoDate,seachAnchor, historyLive} = require('./api')

const app = express()
app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')))
const port = 8000

const DB_PATH = path.join(__dirname, 'anchor.json');

/**
 * 读取数据
 */
function readData() {
	if (!fs.existsSync(DB_PATH)) {
		fs.writeFileSync(DB_PATH, JSON.stringify([]));
	}
	return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

/**
 * 写入数据
 */
function writeData(data) {
	fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

/**
 * ✅ 新增
 * GET /api/add/:id
 */
app.get('/api/add/:id', async (req, res) => {
	const { id } = req.params;

	if (!id) {
		return res.status(400).json({ msg: 'id 不能为空' });
	}

	const list = readData();

	// 防止重复
	if (list.find(item => item.id === id)) {
		return res.status(409).json({ msg: '该 ID 已存在' });
	}

	const info = await anchorInfo(id)

	const newItem = {
		name:info.name,
		id,
		avatar: info.avatar,
		monitor: true,
		createdAt: Date.now()
	};

	list.push(newItem);
	writeData(list);

	res.json({ msg: '添加成功', data: newItem });
});

/**
 * ✅ 查询全部
 * GET /api/list
 */
app.get('/api/list', (req, res) => {
	const list = readData();
	res.json(list);
});

/**
 * ✅ 查询单个
 * GET /api/get/:id
 */
app.get('/api/get/:id', (req, res) => {
	const list = readData();
	const item = list.find(v => v.id === req.params.id);

	if (!item) {
		return res.status(404).json({ msg: '未找到' });
	}

	res.json(item);
});

/**
 * ✅ 修改
 * PUT /api/update/:id
 */
app.put('/api/update/:id', (req, res) => {
	const { name, monitor } = req.body;
	const list = readData();

	const index = list.findIndex(v => v.id === req.params.id);
	if (index === -1) {
		return res.status(404).json({ msg: '未找到' });
	}

	if (name !== undefined) list[index].name = name;
	if (monitor !== undefined) list[index].monitor = monitor;

	list[index].updatedAt = Date.now();

	writeData(list);

	res.json({ msg: '修改成功', data: list[index] });
});

/**
 * ✅ 删除
 * DELETE /api/delete/:id
 */
app.delete('/api/delete/:id', (req, res) => {
	const list = readData();
	const newList = list.filter(v => v.id !== req.params.id);

	if (newList.length === list.length) {
		return res.status(404).json({ msg: '未找到' });
	}

	writeData(newList);
	res.json({ msg: '删除成功' });
});

/**
 * 获取主播ID获取抖音直播状态
 * @param {string} uid 抖音直播房间ID
 * @returns {object} room_status 抖音直播状态
 * @property {{"room_status_code":0,"room_status_text":"直播中"}}
 * @property {{"room_status_code":1,"room_status_text":"未开播"}}
 * @property {{"room_status_code":2,"room_status_text":"已结束"}}
 * */
app.get('/api/live/:uid', async (req, res) => {
	const uid = req.params.uid
	const data = await liveStatus(uid)
	res.json(data)
})

/**
 * 获取主播ID获取抖音直播房间信息
 * @param {string} uid 抖音直播房间ID
 * @returns {object} room_info 抖音直播房间信息
 * @property {{room_view_stats: Object, user_count_str: string, title: string, stream_url: Object, like_count: number, avatar: string}} room_info - 直播房间信息
 * */
app.get('/api/room/:uid', async (req, res) => {
	const uid = req.params.uid
	const data = await roomInfo(uid)
	res.json(data)
})

/**
 * 获取房间ID获取抖音直播房间详细信息
 * @param {string} uid 抖音直播房间ID
 * @returns {object} room_info 抖音直播房间详细信息
 * */
app.get('/api/roomdate/:uid', async (req, res) => {
	const uid = req.params.uid
	const data = await rommInfoDate(uid)
	res.json(data)
})

app.get('/api/search/:name', async (req, res) => {
	const name = req.params.name
	const data = await seachAnchor(name)
	res.json(data)
})

app.get('/api/history/:id', async (req, res) => {
	const id = req.params.id
	const data = await historyLive(id)
	res.json(data)
})

app.listen(port, () => {
	console.log(`首页URL: http://localhost:${port}`)
	console.log(`搜索主播页面: http://localhost:${port}/search.html`)
	console.log(`历史直播回放测试URL: http://localhost:${port}/history.html`)
	console.log(`搜索主播测试URL: http://localhost:${port}/api/search/旭旭宝宝`)
	console.log(`直播状态测试URL: http://localhost:${port}/api/live/renyixu1989`)
	console.log(`直播房间信息测试URL: http://localhost:${port}/api/room/renyixu1989`)
	console.log(`直播房间详细信息测试URL: http://localhost:${port}/api/roomdate/7578749002221439790`)
	console.log(`主播历史直播记录测试URL: http://localhost:${port}/api/history/71483666475`)
})
