const {generate_a_bogus} = require('./sign')
const dayjs = require('./dayjs')
const qs = require('qs')
const axios = require('axios')

const ROOM_STATUS = {
	0: '直播中',
	1: '未开播',
	2: '已结束',
}

const CONFIG = {
	CK: 'ttwid=1%7CatouSgrcYVbMn0Ck6OZCFHXQg3dlWYsTo3cmHM1ow_U%7C1758687543%7Cc7f9479845e683bf7e7cf4c65a6d97e488b59de2c1f3b3e9e3ab014e77a8bc17',
	UA: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
	TOKEN:'1763801580671865c2a28e7e253c8da3e647620568823',
}

const HOST = {
	seachNormal:'https://one-share.one-data.cn/aibo/normal_search_anchor',
	seachAll:'https://one-share.one-data.cn/aibo/search_anchor',
	historyLive:'https://one-share.one-data.cn/aibo/anchor_room'
}

/**
 * 获取抖音直播状态
 * @param {string} roomId 抖音直播房间ID
 * @returns {object} room_status 抖音直播状态
 * @property {{room_status_code: number, room_status_text: string}} room_status - 直播状态码
 * 0: 直播中
 * 1: 未开播
 * 2: 已结束
 * */
const liveStatus = async (roomId) => {
    const url = `https://live.douyin.com/webcast/room/web/enter/?aid=6383&web_rid=${roomId}`
	// const ck = 'ttwid=1%7CatouSgrcYVbMn0Ck6OZCFHXQg3dlWYsTo3cmHM1ow_U%7C1758687543%7Cc7f9479845e683bf7e7cf4c65a6d97e488b59de2c1f3b3e9e3ab014e77a8bc17'
	const bogus = generate_a_bogus(url.split('?')[1])
	// const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
	const {data} = await axios.get(url+'&a_bogus='+bogus, {
		headers: {'User-Agent': CONFIG.UA, 'Cookie': CONFIG.CK}
	})
	return {
		room_status_code: data?.data?.room_status,
		room_status_text: ROOM_STATUS[data?.data?.room_status],
	}
}

/**
 * 获取抖音直播房间信息
 * @param {string} roomId 抖音直播房间ID
 * @returns {object} room_info 抖音直播房间信息
 * @property {{room_view_stats: Object, user_count_str: string, title: string, stream_url: Object, like_count: number, avatar: string}} room_info - 直播房间信息
 * */
const roomInfo = async (roomId) =>{
		const url = `https://live.douyin.com/webcast/room/web/enter/?aid=6383&web_rid=${roomId}`
		const bogus = generate_a_bogus(url.split('?')[1])
		const {data} = await axios.get(url+'&a_bogus='+bogus, {
			headers: {'User-Agent': CONFIG.UA, 'Cookie': CONFIG.CK}
		})
		// console.log(data)
		if (data?.data?.room_status === 0){
			return {
				room_id: data?.data?.enter_room_id, //直播房间ID
				room_view_stats: data?.data?.data[0]?.room_view_stats,
				user_count_str: data?.data?.data[0]?.user_count_str,
				title: data?.data?.data[0]?.title,
				stream_url: data?.data?.data[0]?.stream_url?.hls_pull_url_map,
				like_count: data?.data?.data[0]?.like_count,
				avatar: data?.data?.data[0]?.owner?.avatar_thumb?.url_list[0],
				message: '正在直播',
			}
		}
		else {
			return {
				message: '未开播',
				room_id: data?.data?.enter_room_id, //直播房间ID
				id_str: data?.data?.user?.id_str || '', //主播sec_uid
				nickname: data?.data?.user?.nickname || '', //主播昵称
				avatar: data?.data?.user?.avatar_thumb?.url_list[0] || '', //主播头像
			}
		}
}

//https://webcast.amemv.com/webcast/room/reflow/info/?type_id=0&live_id=1&room_id={room_id}&app_id=1128

const anchorInfo = async (roomId)=>{
		const url = `https://live.douyin.com/webcast/room/web/enter/?aid=6383&web_rid=${roomId}`
		const bogus = generate_a_bogus(url.split('?')[1])
		const {data} = await axios.get(url+'&a_bogus='+bogus, {
			headers: {'User-Agent': CONFIG.UA, 'Cookie': CONFIG.CK}
		})
		return {
			avatar: data?.data?.user?.avatar_thumb?.url_list[0] || '',
			name: data?.data?.user?.nickname || '',
			sec_uid: data?.data?.user?.sec_uid || '',
		}
}

const rommInfoDate = async (roomId)=>{
	const url = `https://webcast.amemv.com/webcast/room/reflow/info/?type_id=0&live_id=1&room_id=${roomId}&app_id=1128`
	const {data} = await axios.get(url, {
		headers: {'User-Agent': CONFIG.UA}
	})
	const room = data?.data?.room
	return {
		room_id: roomId, //直播房间ID
		title: room?.title, //直播间标题
		user_count: room?.user_count, //当前在线用户数
		like_count: room?.like_count, //点赞数
		display_short: room?.room_view_stats?.display_short, //场观人数
		display_value: room?.room_view_stats?.display_value, //场观人数具体值
		total_user: room?.stats?.total_user, //场观人次
		follow_count: room?.stats?.follow_count, //涨粉数
		start_time: room?.start_time ? dayjs.unix(room?.start_time).format('YYYY-MM-DD HH:mm:ss') : '', // 开播时间
		create_time: room?.create_time ? dayjs.unix(room?.create_time).format('YYYY-MM-DD HH:mm:ss') : '', //创建时间
		finish_time: room?.finish_time ? dayjs.unix(room?.finish_time).format('YYYY-MM-DD HH:mm:ss') : '', //下播时间
		stream_url_map: room?.stream_url?.hls_pull_url_map, //直播流地址对象
	}
}

/**
 * 搜索抖音主播
 * @param {string} name 主播名称
 * @param {boolean} server 是否搜索普通主播
 * @returns {object} anchor_info 主播信息
 * @property {{avatar: string, name: string, sec_uid: string}} anchor_info - 主播信息
 * */
const seachAnchor = async (name,server=true)=>{
	let url = ''
	const postData = qs.stringify({
		'keyword': name,
		'cursor': '0'
	});
	if (server){
		url = HOST.seachNormal
	}else {
		url = HOST.seachAll
	}
	const {data} = await axios.post(url, postData, {
		headers: {'User-Agent': CONFIG.UA, 'Token': CONFIG.TOKEN}
	})
	return data
}

/**
 * 获取抖音主播历史直播记录
 * @param {string} id 主播ID
 * @returns {object} history_live 主播历史直播记录
 * */
const historyLive = async (id)=>{
	const url = HOST.historyLive
	const postData = qs.stringify({
		'anchor_id': id
	});
	const {data} = await axios.post(url, postData, {
		headers: {'User-Agent': CONFIG.UA, 'Token': CONFIG.TOKEN}
	})
	return data
}

const getAid = async (rid)=>{
		const url = `https://live.douyin.com/webcast/room/web/enter/?aid=6383&web_rid=${rid}`
		const bogus = generate_a_bogus(url.split('?')[1])
		const {data} = await axios.get(url+'&a_bogus='+bogus, {
			headers: {'User-Agent': CONFIG.UA, 'Cookie': CONFIG.CK}
		})
		return data?.data?.user?.id_str || ''
}


module.exports = {
	liveStatus,
	roomInfo,
	anchorInfo,
	rommInfoDate,
	seachAnchor,
	historyLive,
	getAid,
}
