import ElementsRadar from "@/components/ElementsRadar";

const MOCK_ELEMENTS = { wood: 3, fire: 5, earth: 2, metal: 4, water: 3 };

const PILLARS = [
  { label: "年柱", stem: "癸", branch: "卯" },
  { label: "月柱", stem: "丁", branch: "巳" },
  { label: "日柱", stem: "甲", branch: "寅" },
  { label: "時柱", stem: "壬", branch: "子" },
];

const PALACES = [
  { name: "父母", star: "天梁" },
  { name: "福德", star: "七殺" },
  { name: "田宅", star: "天府" },
  { name: "官祿", star: "廉貞" },
  { name: "命宮", star: "紫微" },
  { name: "兄弟", star: "天機" },
  { name: "夫妻", star: "太陰" },
  { name: "僕役", star: "貪狼" },
  { name: "子女", star: "太陽" },
  { name: "財帛", star: "武曲" },
  { name: "疾厄", star: "天相" },
  { name: "遷移", star: "巨門" },
];

const TABS = ["總覽", "宮位", "大運", "八字", "眾說"];

export default function ReadingPreview() {
  return (
    <div className="paper-card rounded-2xl overflow-hidden max-w-3xl mx-auto border border-border-warm select-none">

      {/* Tab bar */}
      <div className="flex border-b border-border-warm bg-parchment px-2 overflow-x-auto no-scrollbar">
        {TABS.map((tab, i) => (
          <div
            key={tab}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap flex-shrink-0 ${
              i === 0
                ? "text-vermillion border-b-2 border-vermillion -mb-px"
                : "text-ink-4"
            }`}
          >
            {tab}
          </div>
        ))}
      </div>

      {/* Visible top row: three panels */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 border-b border-border-warm bg-paper">

        {/* Panel 1: Five-element radar */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-[10px] text-ink-4 tracking-[0.3em] uppercase">五行分佈</p>
          <ElementsRadar elements={MOCK_ELEMENTS} size={110} />
        </div>

        {/* Panel 2: Bazi four pillars */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-[10px] text-ink-4 tracking-[0.3em] uppercase">八字四柱</p>
          <div className="flex gap-2">
            {PILLARS.map((p) => (
              <div
                key={p.label}
                className="flex flex-col items-center border border-border-warm rounded-lg px-2 py-2.5 bg-parchment"
              >
                <span className="text-[8px] text-ink-4 mb-1.5">{p.label}</span>
                <span className="text-base font-bold text-vermillion leading-none">{p.stem}</span>
                <span className="w-px h-2.5 bg-border-warm my-1" />
                <span className="text-base font-bold text-ink leading-none">{p.branch}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Panel 3: Ziwei palace mini-grid */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-[10px] text-ink-4 tracking-[0.3em] uppercase">紫微星盤</p>
          <div className="grid grid-cols-4 gap-0.5">
            {PALACES.map((palace) => (
              <div
                key={palace.name}
                className="border border-border-warm rounded p-1 text-center bg-parchment"
              >
                <p className="text-[7px] text-ink-4 leading-tight">{palace.name}</p>
                <p className="text-[9px] text-ink font-semibold leading-tight mt-0.5">{palace.star}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Blurred content area */}
      <div className="relative bg-paper">
        <div className="p-5" style={{ filter: "blur(5px)" }}>
          <p className="text-xs font-semibold text-ink mb-2">命格總覽 · 紫微坐命</p>
          <p className="text-xs text-ink-2 leading-relaxed mb-3">
            命主生於癸卯年丁巳月，天干癸水，地支卯木。紫微星坐命宮，化權入遷移宮，三方會合廉貞、七殺，
            形成「紫府同宮」變格，主一生貴氣自帶，逢貴人提攜，事業宮位氣勢宏大。
            三合派與飛星派在此格局判斷一致，四化派補充貪狼化忌入夫妻，感情路稍有曲折。
          </p>
          <p className="text-xs text-ink-2 leading-relaxed mb-3">
            八字方面，日主甲木生於寅月，木氣當令，身旺。年幹癸水生助，月幹丁火洩秀，食神格局初現。
            調候用神以丙火、庚金為主，行西方金運時事業財運均有建樹。
            大限逢甲午運（32–42歲），天干透甲與日主比肩，進取心強，適合創業或主動轉型。
          </p>
          <p className="text-xs text-ink-2 leading-relaxed">
            財帛宮武曲化祿，官祿宮天府守，三方形成「財官雙美」。
            據《斗數卷》王亭之按：武曲化祿逢天府守官，財源穩定，中年後積累顯著。
            千里命稿論食神格：食神生財，以印為忌，行運宜避印綬旺地，丙運、午運皆為財運高峰期。
          </p>
        </div>
        {/* Gradient fade overlay */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-paper to-transparent pointer-events-none" />
      </div>
    </div>
  );
}
