// Regenerate famous people articles with actual iztro chart data as grounding.
// Fixes hallucinated palace star placements from Phase 1.
// Usage: npx tsx --env-file=.env.local scripts/regenFamousPeople.mjs

import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { calculateZiwei } from "../lib/ziwei.ts";
import { detectMingge } from "../lib/detectMingge.ts";

const deepseek = new OpenAI({ apiKey: process.env.DEEPSEEK_API_KEY, baseURL: "https://api.deepseek.com" });
const OUT_DIR = path.join(process.cwd(), "content", "seo", "mingge_famous");
fs.mkdirSync(OUT_DIR, { recursive: true });

const SUBJECTS = [
  {
    name: "李小龙", slug: "李小龙",
    birth: "1940年11月27日 卯时（约07:00）",
    year: 1940, month: 11, day: 27, hour: 7, gender: "male",
    achievements: "截拳道创始人、武术宗师、演员、哲学家。主演《唐山大兄》《精武门》《猛龙过江》《龙争虎斗》，打破好莱坞种族壁垒。33岁突然离世。",
    keywords: ["李小龙命盘", "府相朝垣格", "紫微斗数李小龙"],
  },
  {
    name: "莫扎特", slug: "莫扎特",
    birth: "1756年1月27日 戌时（约20:00）",
    year: 1756, month: 1, day: 27, hour: 20, gender: "male",
    achievements: "古典音乐神童，5岁作曲，一生创作600余部作品，跨越歌剧、交响、协奏曲等领域。代表作《费加罗的婚姻》《魔笛》《安魂曲》。35岁英年早逝，晚年贫困。",
    keywords: ["莫扎特命盘", "杀破狼格", "紫微斗数莫扎特"],
  },
  {
    name: "爱因斯坦", slug: "爱因斯坦",
    birth: "1879年3月14日 午时（约11:00）",
    year: 1879, month: 3, day: 14, hour: 11, gender: "male",
    achievements: "物理学家，相对论创立者，1921年诺贝尔物理学奖。1905奇迹年发表四篇论文，彻底改变物理学。因纳粹迫害流亡美国。擅小提琴，两段婚姻皆不圆满。76岁去世。",
    keywords: ["爱因斯坦命盘", "杀破狼格", "紫微斗数爱因斯坦"],
  },
  {
    name: "张国荣", slug: "张国荣",
    birth: "1956年9月12日 子时（约23:00）",
    year: 1956, month: 9, day: 12, hour: 23, gender: "male",
    achievements: "香港乐坛与影坛巨星，代表作《霸王别姬》《倩女幽魂》《阿飞正传》，歌曲《当年情》《Monica》风靡亚洲。47岁选择以决绝方式离世，令无数歌迷扼腕。",
    keywords: ["张国荣命盘", "日月并明格", "紫微斗数张国荣"],
  },
  {
    name: "金庸", slug: "金庸",
    birth: "1924年3月10日 卯时（约05:00）",
    year: 1924, month: 3, day: 10, hour: 5, gender: "male",
    achievements: "武侠小说宗师，《射雕英雄传》《倚天屠龙记》《笑傲江湖》《鹿鼎记》等名作影响数代人。同时创办香港《明报》，兼具文学家与报人双重身份。94岁去世。",
    keywords: ["金庸命盘", "禄马交驰格", "紫微斗数金庸"],
  },
  {
    name: "马云", slug: "马云",
    birth: "1964年9月10日 巳时（约09:00）",
    year: 1964, month: 9, day: 10, hour: 9, gender: "male",
    achievements: "阿里巴巴集团创始人，从英语教师到全球电商帝国缔造者。旗下包括淘宝、天猫、支付宝、菜鸟等生态体系。曾多次入选全球最具影响力商业人物榜单。",
    keywords: ["马云命盘", "杀破狼格", "紫微斗数马云"],
  },
  {
    name: "周杰伦", slug: "周杰伦",
    birth: "1979年1月18日 卯时（约07:00）",
    year: 1979, month: 1, day: 18, hour: 7, gender: "male",
    achievements: "华语流行音乐天王，从首张专辑《Jay》到《七里香》《青花瓷》《稻香》，开创中国风嘻哈融合风格，斩获金曲奖等无数奖项，成为一代人的青春记忆。",
    keywords: ["周杰伦命盘", "日月并明格", "紫微斗数周杰伦"],
  },
  {
    name: "拿破仑", slug: "拿破仑",
    birth: "1769年8月15日 午时（约11:00）",
    year: 1769, month: 8, day: 15, hour: 11, gender: "male",
    achievements: "法国皇帝，欧洲历史上最伟大的军事统帅之一。以科西嘉岛小贵族之身起家，横扫欧洲大陆，颁布《拿破仑法典》影响近现代法律体系。最终兵败滑铁卢，流亡圣赫拿岛，51岁离世。",
    keywords: ["拿破仑命盘", "杀破狼格", "紫微斗数拿破仑"],
  },
  {
    name: "居里夫人", slug: "居里夫人",
    birth: "1867年11月7日 午时（约11:00）",
    year: 1867, month: 11, day: 7, hour: 11, gender: "female",
    achievements: "首位两度获诺贝尔奖的科学家（物理学奖1903年、化学奖1911年），发现钋和镭元素。身为女性在19世纪末科学界冲破重重壁垒，因长期接触放射性物质于66岁离世。",
    keywords: ["居里夫人命盘", "火贪格", "紫微斗数居里夫人"],
  },
  {
    name: "乔布斯", slug: "乔布斯",
    birth: "1955年2月24日 卯时（约07:00）",
    year: 1955, month: 2, day: 24, hour: 7, gender: "male",
    achievements: "Apple联合创始人，主导推出Mac电脑、iPod、iPhone、iPad，以颠覆性设计理念改写个人电脑、音乐与移动通信三个时代。被驱逐后回归Apple，缔造史上最大市值公司。56岁因胰腺癌去世。",
    keywords: ["乔布斯命盘", "铃贪格", "紫微斗数乔布斯"],
  },
  {
    name: "马斯克", slug: "马斯克",
    birth: "1971年6月28日 卯时（约07:00）",
    year: 1971, month: 6, day: 28, hour: 7, gender: "male",
    achievements: "SpaceX、特斯拉、X（前Twitter）等多家公司创始人或CEO。致力于可重复使用火箭、新能源汽车与脑机接口技术，目标是实现人类多星球生存。多次跌入破产边缘又东山再起。",
    keywords: ["马斯克命盘", "机月同梁格", "紫微斗数马斯克"],
  },
  {
    name: "李连杰", slug: "李连杰",
    birth: "1963年4月26日 卯时（约07:00）",
    year: 1963, month: 4, day: 26, hour: 7, gender: "male",
    achievements: "五届全国武术冠军，功夫电影巨星。《少林寺》让他一夕成名，《黄飞鸿》《精武英雄》《英雄》等确立武侠宗师地位。后进军好莱坞主演《致命武器4》《木乃伊3》，晚年专注慈善公益。",
    keywords: ["李连杰命盘", "君臣庆会格", "紫微斗数李连杰"],
  },
  {
    name: "梅艳芳", slug: "梅艳芳",
    birth: "1963年10月10日 午时（约11:00）",
    year: 1963, month: 10, day: 10, hour: 11, gender: "female",
    achievements: "香港乐坛「百变天后」，代表作《坏女孩》《似水流年》《女人花》，横跨歌坛与影坛，主演《胭脂扣》《审死官》。一生挚爱事业与友情，未曾结婚，40岁因宫颈癌去世，告别演唱会身着婚纱谢幕。",
    keywords: ["梅艳芳命盘", "命无正曜格", "紫微斗数梅艳芳"],
  },
  {
    name: "邓丽君", slug: "邓丽君",
    birth: "1953年1月29日 午时（约11:00）",
    year: 1953, month: 1, day: 29, hour: 11, gender: "female",
    achievements: "亚洲流行音乐传奇，歌曲《月亮代表我的心》《甜蜜蜜》《夜来香》风靡华人世界及日本。凭借温婉细腻的演唱风格与纯净音色成为无法复制的天后，42岁因气喘病在泰国清迈英年早逝，至今仍是华语乐坛最受怀念的歌手之一。",
    keywords: ["邓丽君命盘", "邓丽君紫微斗数", "紫微斗数音乐"],
  },
  {
    name: "王菲", slug: "王菲",
    birth: "1969年8月8日 子时（约23:00）",
    year: 1969, month: 8, day: 8, hour: 23, gender: "female",
    achievements: "华语乐坛「天后」，以独特的空灵嗓音和前卫风格著称，代表作《红豆》《传奇》《梦中人》。两度婚姻备受关注，曾与谢霆锋、窦唯结婚。演唱会票价屡创华人世界纪录，是罕见跨越港台大陆三地皆受追捧的超级巨星。",
    keywords: ["王菲命盘", "王菲紫微斗数", "紫微斗数音乐"],
  },
  {
    name: "成龙", slug: "成龙",
    birth: "1954年4月7日 丑时（约01:00）",
    year: 1954, month: 4, day: 7, hour: 1, gender: "male",
    achievements: "国际功夫巨星、导演、慈善家。以融合杂技、喜剧与武打的独特风格开创动作电影新纪元，代表作《警察故事》《A计划》《成龙的故事》系列。荣获奥斯卡终身成就奖，累计主演逾100部电影，是全球最具票房号召力的华人演员之一。",
    keywords: ["成龙命盘", "成龙紫微斗数", "紫微斗数电影"],
  },
  {
    name: "刘德华", slug: "刘德华",
    birth: "1961年9月27日 亥时（约21:00）",
    year: 1961, month: 9, day: 27, hour: 21, gender: "male",
    achievements: "香港四大天王之一，集歌手、演员、制片人于一身。主演逾100部电影，凭《天若有情》《无间道》《桃姐》多次夺得香港电影金像奖。发行逾百张专辑，演唱会遍及全球。以敬业精神和平易近人的形象成为华人娱乐圈常青树。",
    keywords: ["刘德华命盘", "刘德华紫微斗数", "紫微斗数音乐"],
  },
  {
    name: "张学友", slug: "张学友",
    birth: "1961年7月10日 寅时（约03:00）",
    year: 1961, month: 7, day: 10, hour: 3, gender: "male",
    achievements: "香港四大天王之一，被誉为「歌神」。代表作《吻别》《情书》《祝福》销量突破3000万张，是华语乐坛史上最畅销歌手之一。主演《旺角卡门》《男人四十》获金像奖最佳男主角提名，音乐剧《雪狼湖》更开创华语音乐剧先河。",
    keywords: ["张学友命盘", "张学友紫微斗数", "紫微斗数音乐"],
  },
  {
    name: "黎明", slug: "黎明",
    birth: "1966年12月11日 酉时（约17:00）",
    year: 1966, month: 12, day: 11, hour: 17, gender: "male",
    achievements: "香港四大天王之一，集歌手、演员、导演、时装设计师于一身。代表歌曲《对你爱不完》《漫步人生路》，主演《甜蜜蜜》《新警察故事》。凭借俊朗外形与多元发展成为香港娱乐圈最具商业价值的艺人之一。",
    keywords: ["黎明命盘", "黎明紫微斗数", "紫微斗数音乐"],
  },
  {
    name: "郭富城", slug: "郭富城",
    birth: "1965年10月26日 申时（约15:00）",
    year: 1965, month: 10, day: 26, hour: 15, gender: "male",
    achievements: "香港四大天王之一，以舞蹈见长，有「舞王」之称。代表歌曲《对你爱不完》《我是不是你最疼爱的人》，主演《三岔口》《父子》《麦路人》，凭《父子》荣获金马奖最佳男主角。演唱会以精致舞台制作著称，是华语娱乐圈最勤奋的艺人之一。",
    keywords: ["郭富城命盘", "郭富城紫微斗数", "紫微斗数音乐"],
  },
  {
    name: "陈奕迅", slug: "陈奕迅",
    birth: "1974年7月27日 卯时（约05:00）",
    year: 1974, month: 7, day: 27, hour: 5, gender: "male",
    achievements: "华语乐坛天王，被誉为继张学友之后最具影响力的粤语歌手。代表作《富士山下》《十年》《好久不见》横跨粤语与普通话市场。演唱会场场爆满，以真实情感表达和多变唱腔赢得跨世代歌迷，是21世纪华语流行音乐的标志性人物。",
    keywords: ["陈奕迅命盘", "陈奕迅紫微斗数", "紫微斗数音乐"],
  },
  {
    name: "章子怡", slug: "章子怡",
    birth: "1979年2月9日 卯时（约05:00）",
    year: 1979, month: 2, day: 9, hour: 5, gender: "female",
    achievements: "国际知名华人女演员，凭《卧虎藏龙》登上好莱坞舞台，主演《英雄》《十面埋伏》《2046》《一代宗师》，多次荣获金马奖、香港电影金像奖及多个国际电影节奖项。被外媒誉为「中国最具国际影响力的女演员之一」。",
    keywords: ["章子怡命盘", "章子怡紫微斗数", "紫微斗数电影"],
  },
  {
    name: "刘亦菲", slug: "刘亦菲",
    birth: "1987年8月25日 申时（约15:00）",
    year: 1987, month: 8, day: 25, hour: 15, gender: "female",
    achievements: "中国著名演员，以出众外形被粉丝誉为「神仙姐姐」。代表作《仙剑奇侠传》《天龙八部》《神雕侠侣》奠定其古装美人形象，主演好莱坞电影《花木兰》（2020）成为中国演员首次出演迪士尼真人公主。",
    keywords: ["刘亦菲命盘", "刘亦菲紫微斗数", "紫微斗数电影"],
  },
  {
    name: "巩俐", slug: "巩俐",
    birth: "1965年12月31日 午时（约11:00）",
    year: 1965, month: 12, day: 31, hour: 11, gender: "female",
    achievements: "中国最具国际声誉的女演员，与张艺谋合作的《红高粱》《菊豆》《大红灯笼高高挂》《秋菊打官司》确立其艺术地位。荣获戛纳、威尼斯多项国际大奖，被称为「中国影坛第一人」，是迄今为止最受国际电影节认可的华人女演员。",
    keywords: ["巩俐命盘", "巩俐紫微斗数", "紫微斗数电影"],
  },
  {
    name: "马化腾", slug: "马化腾",
    birth: "1971年10月29日 巳时（约09:00）",
    year: 1971, month: 10, day: 29, hour: 9, gender: "male",
    achievements: "腾讯公司创始人兼CEO，将即时通讯软件QQ发展为覆盖社交、游戏、支付、媒体的超级生态帝国。旗下微信月活超13亿，是全球最大的社交平台之一。腾讯市值曾跻身全球前五，马化腾本人长期位居中国首富前列。",
    keywords: ["马化腾命盘", "马化腾紫微斗数", "紫微斗数科技"],
  },
  {
    name: "雷军", slug: "雷军",
    birth: "1969年12月16日 午时（约11:00）",
    year: 1969, month: 12, day: 16, hour: 11, gender: "male",
    achievements: "小米科技创始人兼CEO，以「为发烧而生」的理念颠覆中国智能手机市场，将小米从车库创业发展为全球前三大手机品牌。同时也是顺为资本创始人，投资了数百家科技企业。2024年小米首款纯电动汽车上市，再度证明其跨界颠覆能力。",
    keywords: ["雷军命盘", "雷军紫微斗数", "紫微斗数科技"],
  },
  {
    name: "任正非", slug: "任正非",
    birth: "1944年10月25日 辰时（约07:00）",
    year: 1944, month: 10, day: 25, hour: 7, gender: "male",
    achievements: "华为技术有限公司创始人，将一家深圳小型通信公司发展为全球最大的电信设备制造商和全球第二大智能手机品牌。在美国制裁压力下坚守自主研发路线，主导麒麟芯片和鸿蒙操作系统研发，成为中国科技自主化的精神象征。",
    keywords: ["任正非命盘", "任正非紫微斗数", "紫微斗数科技"],
  },
  {
    name: "姚明", slug: "姚明",
    birth: "1980年9月12日 申时（约15:00）",
    year: 1980, month: 9, day: 12, hour: 15, gender: "male",
    achievements: "中国篮球史上最伟大的球员，身高2米26，曾效力NBA休斯顿火箭队8个赛季，8次入选NBA全明星，成为中国运动员走向世界的标志性人物。退役后出任中国篮球协会主席，积极推动中国篮球职业化进程，并投资多家体育和科技企业。",
    keywords: ["姚明命盘", "姚明紫微斗数", "紫微斗数体育"],
  },
  {
    name: "刘翔", slug: "刘翔",
    birth: "1983年7月13日 午时（约11:00）",
    year: 1983, month: 7, day: 13, hour: 11, gender: "male",
    achievements: "中国田径传奇人物，2004年雅典奥运会以12秒91夺得110米栏金牌，成为首位夺得奥运田径金牌的中国男运动员，并创世界纪录。2006年以12秒88再度刷新世界纪录，成为田径短跨项目的世界第一人，改写了黄种人在速度项目上的历史。",
    keywords: ["刘翔命盘", "刘翔紫微斗数", "紫微斗数体育"],
  },
  {
    name: "李宁", slug: "李宁",
    birth: "1963年9月8日 卯时（约05:00）",
    year: 1963, month: 9, day: 8, hour: 5, gender: "male",
    achievements: "中国体操王子，1984年洛杉矶奥运会一届揽获3金2银1铜共6枚奖牌，创造奥运体操史上单届最多奖牌纪录。退役后创办「李宁」运动品牌，从本土运动品牌发展为与耐克、阿迪达斯抗衡的国际运动服饰企业，是中国运动员转型创业的经典案例。",
    keywords: ["李宁命盘", "李宁紫微斗数", "紫微斗数体育"],
  },
  {
    name: "比尔·盖茨", slug: "比尔·盖茨",
    birth: "1955年10月28日 亥时（约21:00）",
    year: 1955, month: 10, day: 28, hour: 21, gender: "male",
    achievements: "微软公司联合创始人，将Windows操作系统推向全球数十亿台电脑，长期蝉联全球首富。2008年后逐渐退出微软管理层，将精力转向比尔及梅琳达·盖茨基金会，致力于消除全球贫困、疾病与教育不公，成为21世纪最具影响力的慈善家之一。",
    keywords: ["比尔盖茨命盘", "比尔盖茨紫微斗数", "紫微斗数科技"],
  },
  {
    name: "贝佐斯", slug: "贝佐斯",
    birth: "1964年1月12日 戌时（约19:00）",
    year: 1964, month: 1, day: 12, hour: 19, gender: "male",
    achievements: "亚马逊公司创始人，从网上书店起家，将亚马逊发展为全球最大的电商平台和云计算服务商（AWS），多次荣登全球首富榜首。卸任CEO后转型为太空探索创业者，旗下蓝色起源公司致力于商业太空旅行，并收购《华盛顿邮报》进军媒体领域。",
    keywords: ["贝佐斯命盘", "贝佐斯紫微斗数", "紫微斗数科技"],
  },
  {
    name: "鲁迅", slug: "鲁迅",
    birth: "1881年9月25日 卯时（约05:00）",
    year: 1881, month: 9, day: 25, hour: 5, gender: "male",
    achievements: "中国现代文学奠基人，代表作《阿Q正传》《狂人日记》《呐喊》《彷徨》以犀利笔锋剖析中国国民性，开启五四新文化运动新篇章。同时是翻译家、杂文家，毕生以文字为武器，批判封建礼教与社会黑暗，56岁病逝上海，被誉为「中国现代文学之父」。",
    keywords: ["鲁迅命盘", "鲁迅紫微斗数", "紫微斗数文学"],
  },
];

// Build detailed grounding block from iztro chart data
function buildGrounding(name, ziwei, formations) {
  const palaceSummary = ziwei.palaces.map(p => {
    const major = p.stars.filter(s => s.type === "major").map(s => `${s.name}(${s.brightness ?? ""})`).join("·") || "空宫";
    const minor = p.stars.filter(s => s.type !== "major" && s.type !== "helper").slice(0, 3).map(s => s.name).join("、");
    const flags = [
      p.isSoulPalace ? "【命宫】" : "",
      p.isBodyPalace ? "【身宫】" : "",
    ].filter(Boolean).join("");
    return `${p.name}(${p.earthlyBranch})${flags}: 主星${major}${minor ? " | 辅:" + minor : ""}`;
  }).join("\n");

  return `【${name}命盘权威数据（以下为iztro精确计算结果，不得违背）】
五行局：${ziwei.fiveElementsClass}
命主：${ziwei.mainStar} | 身主：${ziwei.bodyStar}
命宫：${ziwei.soulPalace} | 身宫：${ziwei.bodyPalace}
检测到格局：${formations.map(f => f.name).join("、") || "无特殊格局"}

十二宫星曜（权威，如文中提及具体宫位主星，必须与此一致）：
${palaceSummary}`;
}

const SYSTEM = (subj, grounding) => `你是紫微斗数权威内容作家，为命里（mingli.study）撰写面向大众的名人命格分析文章。

${grounding}

【写作要求】
1. 标题：「${subj.name}命盘解析：[格局名]如何造就[成就关键词]？」
2. 覆盖以下章节：
   - 格局定义与成格条件（~200字）
   - ${subj.name}的命运特质与人生轨迹（~250字，结合真实事迹）
   - 格局强弱的影响因素（~180字）
   - 不同宫位与四化的变化（~170字，参考上方真实星曜，不得虚构）
   - 古籍论述与现代解读（~150字，若引用古籍请用「据《书名》记载」而非"《书名》云"，且只引用常见典籍如《紫微斗数全书》）
   - 给你的提醒（3-4条实用建议，温暖具体）
3. 目标关键词自然融入：${subj.keywords.join("、")}
4. 宫位星曜描述必须与上方【命盘权威数据】一致，不得凭空编造
5. 语气：现代、亲切、有洞察力，不做算命宣判，末尾以正向建议收
6. 总字数1500-2000字`;

const FORCE = process.argv.includes("--force");

async function generate(subj) {
  const outFile = path.join(OUT_DIR, `${subj.slug}.json`);
  if (!FORCE && fs.existsSync(outFile)) {
    console.log(`\n[跳过] ${subj.name} (已存在)`);
    return;
  }
  console.log(`\n[生成] ${subj.name}...`);

  const ziwei = await calculateZiwei(subj.year, subj.month, subj.day, subj.hour, subj.gender);
  const formations = detectMingge(ziwei.palaces);
  const grounding = buildGrounding(subj.name, ziwei, formations);

  console.log(`  格局: ${formations.map(f => f.name).join("、")}`);
  console.log(`  命宫: ${ziwei.soulPalace} | 五行: ${ziwei.fiveElementsClass}`);

  const resp = await deepseek.chat.completions.create({
    model: "deepseek-reasoner",
    max_tokens: 4000,
    messages: [
      { role: "system", content: SYSTEM(subj, grounding) },
      { role: "user", content: `请根据以上命盘数据，撰写${subj.name}的紫微斗数命格分析文章。真实事迹参考：${subj.achievements}` },
    ],
  });

  const markdown = resp.choices[0]?.message?.content?.trim() ?? "";
  if (!markdown) { console.log(`  ⚠️ 空响应`); return; }

  const out = {
    label: `${subj.name}的命格分析`,
    name: subj.name,
    formations: formations.map(f => f.name),
    fiveElementsClass: ziwei.fiveElementsClass,
    soulPalace: ziwei.soulPalace,
    mainStar: ziwei.mainStar,
    markdown,
    chars: markdown.length,
    generatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(path.join(OUT_DIR, `${subj.slug}.json`), JSON.stringify(out, null, 2), "utf8");
  console.log(`  ✅ 已保存 (${markdown.length} chars)`);
}

for (const subj of SUBJECTS) {
  await generate(subj);
  await new Promise(r => setTimeout(r, 3000));
}

console.log("\n=== 生成完成 ===");
