const axios = require('axios');

// ⚠️ 替换为你自己的 Bark Key
const BARK_KEY = '9JG9jWEXLXvKKPfK4ZEK6m';
// https://api.day.app/9JG9jWEXLXvKKPfK4ZEK6m/这里改成你自己的推送内容
function barkPush(title, content) {
	const url = `https://api.day.app/${BARK_KEY}/${encodeURIComponent(title)}/${encodeURIComponent(content)}`;

	return axios.get(url).catch(err => {
		console.log('❌ Bark 推送失败:', err.message);
	});
}

// barkPush('测试', '这是一条测试消息');

module.exports = { barkPush };
