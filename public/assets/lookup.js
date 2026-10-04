const queryParams = new URLSearchParams(window.location.search);
const queryInput = document.querySelector('#lookup-query');
const form = document.querySelector('#lookup-search-form');
const suggestionList = document.querySelector('#hexagram-suggestions');
const status = document.querySelector('#lookup-status');
const resultRoot = document.querySelector('#lookup-result');
let hexagrams = [];
let pathIndex = [];
const traditionalToSimplified = {
  為:'为',訟:'讼',師:'师',謙:'谦',隨:'随',蠱:'蛊',臨:'临',觀:'观',賁:'贲',剝:'剥',復:'复',無:'无',
  頤:'颐',過:'过',離:'离',恆:'恒',壯:'壮',晉:'晋',損:'损',漸:'渐',歸:'归',豐:'丰',兌:'兑',渙:'涣',
  節:'节',濟:'济',馬:'马',貞:'贞',後:'后',萬:'万',與:'与',陽:'阳',陰:'阴',龍:'龙',見:'见',飛:'飞',
  時:'时',變:'变',體:'体',應:'应',書:'书',學:'学'
};

const labels = {
  hexagram_id:'数据库编号', name_simplified:'简体卦名', name_traditional:'繁体卦名', full_name:'全名', symbol:'卦符',
  identity:'卦象结构', upper_trigram:'上卦', lower_trigram:'下卦', line_pattern_bottom_up:'自下而上的阴阳爻序',
  v3_line_ids:'关联爻辞编号', name_philology:'卦名训诂', name_original_meaning:'卦名核心义',
  character_etymology:'字源说明', early_usage:'早期用义', why_this_name:'卦名依据', variant_names:'异名',
  philology_notes:'训诂说明', confidence:'置信标记', trigram_composition:'上下卦组合', name:'卦名', image:'象',
  virtue:'德性', function:'作用', nature:'性质', animal:'动物类象', body:'身体类象', family:'家庭类象',
  direction:'方位', other_images:'其他类象', interaction:'上下卦互动', image_to_meaning:'取象说明',
  composition_summary:'组合摘要', judgment_text:'卦辞', original:'原文', key_terms:'关键词释义', term:'词语',
  source_base:'文本底本', textual_variants_status:'异文状态', judgment_translation:'卦辞译文',
  literal_translation:'直译', interpretive_translation:'释义', translation_note:'译注', judgment_exegesis:'卦义阐释',
  core_logic:'核心逻辑', logic_chain:'推理链', auspicious_logic:'趋吉逻辑', risk_logic:'风险逻辑',
  core_message:'核心信息', core_tension:'核心张力', pole_a:'张力一端', pole_b:'张力另一端',
  tension_description:'张力说明', resolution_principle:'协调原则', failure_mode:'失衡方式',
  keywords:'关键词', summaries:'摘要', one_sentence:'一句话摘要', hundred_characters:'百字摘要', full_summary:'完整摘要',
  provenance:'来源与校核', base_text:'经文底本', primary_sources:'主要来源', commentarial_reference:'注疏参考',
  review_status:'校核状态', six_line_arc:'六爻演化链', compressed_chain:'演化摘要', stages:'六爻阶段',
  stage_number:'爻位序号', line_id:'爻辞编号', line_position:'爻位', stage_label:'阶段标签',
  translation:'译文', role_in_arc:'演化作用', structural_fact:'结构事实', moving_to:'单爻变化去向',
  narrative:'整体叙事', structural_turning_point:'结构转折点', turning_point:'转折说明', peak_or_center:'顶点或中心',
  terminal_logic:'终局逻辑', special_use:'特殊总用辞', lifecycle_model:'生命周期模型', emergence:'初生阶段',
  development:'发展阶段', transition:'转折阶段', maturity:'成熟阶段', extreme_and_transformation:'极盛与转化',
  description:'说明', line_structure:'爻位结构', lines:'六爻结构', position:'位置', type:'爻性',
  positional_type:'爻位阴阳', proper:'是否当位', middle:'是否得中', proper_count:'当位爻数', middle_lines:'中位爻',
  response_pairs:'应爻关系', pair:'对应爻', responsive:'是否相应', reason:'说明理由', adjacent_pairs:'比邻关系',
  relation:'关系', hexagram_lord:'卦主', traditional_lords:'传统卦主', traditional_source:'传统来源',
  source_summary:'来源摘要', method_note:'方法说明', nuclear_hexagram:'互卦', opposite_hexagram:'错卦',
  reverse_hexagram:'综卦', hexagram:'所关联卦象', construction:'构成方法', inner_dynamic:'内部动力',
  interpretive_value:'解释用途', caution:'使用注意', opposite_condition:'反置条件', what_it_reveals:'揭示内容',
  reversed_viewpoint:'反向视角', what_changes_when_viewpoint_reverses:'视角反转后的变化',
  sequence_relation:'卦序关系', previous_hexagram:'前一卦', next_hexagram:'后一卦',
  current_role_in_sequence:'本卦在卦序中的位置', why_from_previous:'前后承接说明',
  why_to_next:'转入下一卦的说明', sequence_arc:'卦序脉络', xugua:'序卦传', original_relevant_text:'相关原文',
  sequence_logic:'序卦逻辑', critical_notes:'辨析要点', zagua:'杂卦传', compressed_characterization:'简要定性',
  notes:'补充说明', shuogua_mapping:'说卦母象', shared_primary_text:'共有原文', application_note:'应用说明',
  direction_system:'方位体系', dayan_divination:'大衍筮法资料', current_hexagram_role:'本卦作用',
  unmoving_reading:'无动爻规则', rule:'取辞规则', rule_id:'规则编号', historical_rule:'历史规则',
  primary:'主要取辞', secondary:'辅助取辞', source_level:'规则来源层级', practical:'实占说明',
  practical_focus:'实占焦点', one_moving_line:'一爻变', multiple_moving_lines:'多爻变',
  routes:'单爻变化路径', changed_to:'变化为', changed_hexagram_id:'变卦编号', line_text:'爻辞',
  reading_focus:'阅读重点', two:'二爻变规则', three:'三爻变规则', four:'四爻变规则',
  five:'五爻变规则', all_moving:'六爻皆变', primary_texts:'主要文本', secondary_texts:'辅助文本',
  qian_kun_special_case:'乾坤特殊规则', practical_workflow:'实占流程', historical_rule_notes:'历史规则辨析',
  route_refs:'变化路径记录编号', ref:'引用编号', text:'文本', status:'状态', note:'说明',
  paragraph_explanation:'段落说明', how_it_explains_judgment:'解释卦辞的方式', key_concepts:'关键概念',
  differences_from_jing:'与经文的层级差异', natural_image:'自然之象', human_application:'人事应用',
  image_reasoning:'取象推理', limits_of_application:'应用边界', rules:'规则', yarrow_probability:'蓍法概率',
  split:'分二', hang:'挂一', divide:'揲四', return:'归奇', remainder:'余策',
  great_image:'大象传', tuan:'彖传', classification:'分类', constituting_lord:'成卦之主', governing_lord:'主卦之主',
  function_in_cycle:'在演化周期中的作用', id:'编号', interpretation_note:'解释说明', judgment:'判断要点',
  label:'标签', labels:'标签集合', line_3_evidence:'三爻依据', line_4_evidence:'四爻依据', line_ref:'关联爻位编号',
  line_refs:'关联爻位编号', meaning:'含义', semantic_shift:'语义转变', sequence:'卦序', structural_relation:'结构关系',
  stage_6_label:'上爻阶段标签', stage2_note:'第二阶段说明', stage3_note:'第三阶段说明',
  stage4_note:'第四阶段说明', stage5_note:'第五阶段说明', xugua_original:'《序卦》原文'
};
const groups = [
  { title:'卦名、卦体与卦象', keys:['name_philology','identity','trigram_composition','shuogua_mapping','keywords'] },
  { title:'卦辞与卦义', keys:['judgment_text','judgment_translation','judgment_exegesis','core_tension','summaries'], open:true },
  { title:'六爻演化与爻位', keys:['six_line_arc','lifecycle_model','line_structure','hexagram_lord'] },
  { title:'彖象、序卦与杂卦', keys:['tuan','great_image','sequence_relation','xugua','zagua'] },
  { title:'互卦、错卦与综卦资料', keys:['nuclear_hexagram','opposite_hexagram','reverse_hexagram'] },
  { title:'大衍筮法与实占规则', keys:['dayan_divination'] },
  { title:'来源、校核与编号', keys:['provenance','route_refs'] }
];

function esc(value) {
  return String(value ?? '').replace(/[&<>\"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[char]));
}
function label(key) { return labels[key] || String(key).replaceAll('_',' '); }
function seqLabel(hex) { return String(hex.sequence).padStart(2,'0'); }
function normalize(value) { return String(value ?? '').normalize('NFKC').toLocaleLowerCase('zh-CN').replace(/[\s《》【】「」『』]/g,''); }
function simplify(value) { return [...normalize(value)].map(char => traditionalToSimplified[char] || char).join(''); }

function chineseNumber(value) {
  const digit = {零:0,〇:0,一:1,二:2,两:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9};
  if (!value || !/^[零〇一二两三四五六七八九十]+$/.test(value)) return null;
  if (!value.includes('十')) return value.length === 1 ? digit[value] : null;
  if (value.indexOf('十') !== value.lastIndexOf('十')) return null;
  const parts = value.split('十');
  return (parts[0] ? digit[parts[0]] : 1) * 10 + (parts[1] ? digit[parts[1]] : 0);
}

function findHexagram(value) {
  const query = normalize(value);
  const simplifiedQuery = simplify(value);
  if (!query) return null;
  const numbered = query.match(/^(?:第)?(\d{1,2})(?:卦)?(?:[·、,，._-]?)(.*)$/);
  if (numbered) {
    const found = hexagrams.find(hex => hex.sequence === Number(numbered[1]));
    const suffix = numbered[2].replace(/卦$/,'');
    if (found && (!suffix || [found.name_simplified,found.name_traditional,found.full_name,found.symbol].some(name => simplify(name).includes(simplify(suffix))))) return found;
  }
  const numeral = query.replace(/^第/,'').replace(/卦$/,'');
  const chinese = chineseNumber(numeral);
  if (chinese) return hexagrams.find(hex => hex.sequence === chinese) || null;
  const exact = hexagrams.find(hex => [hex.hexagram_id,hex.name_simplified,hex.name_traditional,hex.full_name,hex.symbol]
    .some(name => normalize(name) === query || normalize(name).replace(/卦$/,'') === numeral || simplify(name) === simplifiedQuery));
  if (exact) return exact;
  return hexagrams.find(hex => [hex.name_simplified,hex.name_traditional,hex.full_name].some(name => simplify(name).includes(simplifiedQuery))) || null;
}

function renderData(value) {
  if (value === null || value === undefined || value === '') return '<span class=\"lookup-empty\">未提供</span>';
  if (typeof value === 'string') return '<div class=\"lookup-value-text\">' + esc(value) + '</div>';
  if (typeof value === 'number' || typeof value === 'boolean') return '<span class=\"lookup-value-scalar\">' + esc(typeof value === 'boolean' ? (value ? '是' : '否') : value) + '</span>';
  if (Array.isArray(value)) {
    if (!value.length) return '<span class=\"lookup-empty\">无</span>';
    if (value.every(item => item === null || ['string','number','boolean'].includes(typeof item))) {
      const compact = value.length > 12 ? ' is-compact' : '';
      return '<ul class=\"lookup-value-list' + compact + '\">' + value.map(item => '<li>' + esc(typeof item === 'boolean' ? (item ? '是' : '否') : item) + '</li>').join('') + '</ul>';
    }
    return '<div class=\"lookup-collection\">' + value.map((item,index) => {
      const title = item?.line_position || item?.pair || item?.term || (item?.stage_number ? '第 ' + item.stage_number + ' 爻' : '第 ' + (index + 1) + ' 项');
      return '<article class=\"lookup-object-card\"><h4>' + esc(title) + '</h4>' + renderData(item) + '</article>';
    }).join('') + '</div>';
  }
  if (typeof value === 'object') return '<dl class=\"lookup-data-list\">' + Object.entries(value).map(([key,child]) =>
    '<div class=\"lookup-data-row\"><dt>' + esc(label(key)) + '</dt><dd>' + renderData(child) + '</dd></div>').join('') + '</dl>';
  return '<span>' + esc(value) + '</span>';
}

function renderDrawing(hex) {
  const positions = ['初','二','三','四','五','上'];
  const stages = hex.six_line_arc?.stages || [];
  const rows = hex.identity.line_pattern_bottom_up.map((bit,index) => ({bit,index})).reverse().map(({bit,index}) => {
    const stage = stages.find(item => Number(item.stage_number) === index + 1) || {};
    const mark = '<span class=\"lookup-line-mark ' + (bit === '阳' ? 'is-yang' : 'is-yin') + '\" aria-hidden=\"true\"><i></i>' + (bit === '阴' ? '<i></i>' : '') + '</span>';
    return '<div class=\"lookup-drawing-line\"><span>' + esc(stage.line_position || (positions[index] + '爻')) + '</span>' + mark + '<b>' + bit + '</b></div>';
  }).join('');
  return '<div class=\"lookup-drawing\" role=\"img\" aria-label=\"' + esc(hex.name_simplified) + '卦六爻卦象\">' + rows + '</div>';
}

function renderGroup(group, hex) {
  const cards = group.keys.map(key => '<section class=\"lookup-info-card\"><h3>' + esc(label(key)) + '</h3>' + renderData(hex[key]) + '</section>').join('');
  return '<details class=\"lookup-info-section\" ' + (group.open ? 'open' : '') + '><summary>' + esc(group.title) + '<span>' + group.keys.length + ' 组资料</span></summary><div class=\"lookup-info-grid\">' + cards + '</div></details>';
}

function renderPath(record, bySequence) {
  const base = record[0], changedSequence = record[1], moves = record[2], ruleId = record[3];
  const names = ['初','二','三','四','五','上'];
  const changed = bySequence.get(changedSequence);
  const moveLabel = moves.length ? moves.map(pos => names[pos - 1] + '爻').join('、') : '无动爻';
  const summary = moves.length + ' 动爻（' + moveLabel + '） · ' + String(base).padStart(2,'0') + ' → ' +
    (changed ? seqLabel(changed) + ' ' + changed.name_simplified : String(changedSequence).padStart(2,'0')) + ' · ' + ruleId;
  function records(items) {
    if (!items.length) return '<p class=\"lookup-empty\">无</p>';
    return items.map(item => '<article class=\"lookup-route-text\"><h4>' + esc(item[0]) + (item[2] ? ' · ' + esc(item[2]) : '') +
      '</h4><p>' + esc(item[3]) + '</p>' + (item[4] ? '<p class=\"lookup-route-translation\">' + esc(item[4]) + '</p>' : '') +
      '<small>' + esc(item[1]) + '</small></article>').join('');
  }
  return '<details class=\"lookup-path-item\"><summary>' + esc(summary) + '</summary>' +
    (record[6] ? '<p class=\"lookup-route-note\">' + esc(record[6]) + '</p>' : '') +
    '<h4>主取文本</h4><div class=\"lookup-route-grid\">' + records(record[4]) + '</div>' +
    '<h4>辅助文本</h4><div class=\"lookup-route-grid\">' + records(record[5]) + '</div></details>';
}

function renderHexagram(hex) {
  const upper = hex.trigram_composition?.upper_trigram || {};
  const lower = hex.trigram_composition?.lower_trigram || {};
  const bySequence = new Map(hexagrams.map(item => [item.sequence,item]));
  const routes = pathIndex.filter(record => Number(record[0]) === Number(hex.sequence));
  const fields = groups.map(group => renderGroup(group,hex)).join('');
  const keywords = (hex.keywords || []).map(word => '<span>' + esc(word) + '</span>').join('');
  const literal = hex.judgment_translation?.literal_translation || '';
  const interpretation = hex.judgment_translation?.interpretive_translation || '';
  resultRoot.innerHTML =
    '<section class=\"lookup-hero\"><div class=\"lookup-hero-drawing\">' + renderDrawing(hex) + '<span>' + esc(hex.symbol || '') + '</span></div>' +
    '<div class=\"lookup-hero-content\"><p class=\"visual-kicker\">第 ' + seqLabel(hex) + ' 卦 · V4 资料</p>' +
    '<h1>' + esc(hex.name_simplified) + '<small>' + esc(hex.full_name || '') + '</small></h1>' +
    (hex.name_traditional && hex.name_traditional !== hex.name_simplified ? '<p class=\"lookup-traditional-name\">繁体：' + esc(hex.name_traditional) + '</p>' : '') +
    '<p class=\"lookup-trigram-summary\">上卦 <b>' + esc(upper.name || '未提供') + '</b>（' + esc(upper.image || '') + ' · ' + esc(upper.virtue || '') +
    '）<br>下卦 <b>' + esc(lower.name || '未提供') + '</b>（' + esc(lower.image || '') + ' · ' + esc(lower.virtue || '') + '）</p>' +
    '<p class=\"lookup-main-summary\">' + esc(hex.summaries?.one_sentence || hex.judgment_exegesis?.core_message || '卦义摘要未提供') + '</p>' +
    '<div class=\"lookup-keywords\">' + keywords + '</div></div></section>' +
    '<section class=\"lookup-primary-text\"><h2>卦辞</h2><blockquote>' + esc(hex.judgment_text?.original || '卦辞资料未提供') + '</blockquote>' +
    (literal ? '<p><b>直译：</b>' + esc(literal) + '</p>' : '') +
    (interpretation ? '<p><b>释义：</b>' + esc(interpretation) + '</p>' : '') + '</section>' +
    '<section class=\"lookup-all-info\"><h2>完整卦级资料</h2><p>以下按项目 V4 数据分组，可展开查看经传、六爻、卦序、关系与大衍筮法资料。</p>' + fields + '</section>' +
    '<details class=\"lookup-info-section lookup-all-paths\"><summary>4096 变化路径矩阵 · 本卦对应 ' + routes.length + ' 条路径<span>各动爻组合的变卦与取辞文本</span></summary>' +
    '<div class=\"lookup-path-list\">' + routes.map(record => renderPath(record,bySequence)).join('') + '</div></details>' +
    '<details class=\"lookup-info-section lookup-raw-data\"><summary>完整 V4 原始 JSON 记录<span>用于复制或数据核对</span></summary><pre>' +
    esc(JSON.stringify(hex,null,2)) + '</pre></details>';
  status.textContent = '已找到第 ' + seqLabel(hex) + ' 卦：' + hex.name_simplified + '（' + (hex.full_name || hex.name_traditional) + '）。';
}

function submitSearch(value) {
  const query = String(value ?? '').trim();
  queryInput.value = query;
  const params = new URLSearchParams(window.location.search);
  params.set('q',query);
  window.history.replaceState(null,'','lookup.html?' + params.toString());
  const hex = findHexagram(query);
  if (!hex) {
    status.textContent = '没有找到“' + query + '”。请尝试卦名、全名或 1—64 的卦序。';
    resultRoot.innerHTML = '<section class=\"lookup-empty-state\"><h2>暂未找到这条卦名或编号</h2><p>可输入例如：乾、乾为天、1、01、第三卦。</p></section>';
    return;
  }
  renderHexagram(hex);
}

form.addEventListener('submit', event => {
  event.preventDefault();
  submitSearch(queryInput.value);
});

async function start() {
  const initialQuery = queryParams.get('q') || '';
  queryInput.value = initialQuery;
  try {
    const responses = await Promise.all([fetch('data/hexagrams.json'),fetch('data/routes-index.json')]);
    if (responses.some(response => !response.ok)) throw new Error('V4 卦象资料暂时无法读取。');
    [hexagrams,pathIndex] = await Promise.all(responses.map(response => response.json()));
    suggestionList.innerHTML = hexagrams.map(hex => '<option value=\"' + esc(hex.name_simplified) + '\" label=\"' +
      seqLabel(hex) + ' ' + esc(hex.full_name || hex.name_traditional) + ' ' + esc(hex.symbol || '') + '\"></option>').join('');
    if (initialQuery) submitSearch(initialQuery);
    else resultRoot.innerHTML = '<section class=\"lookup-empty-state\"><h2>输入卦名或卦序开始检索</h2><p>例如：乾、乾为天、1、01 或 第六十四卦。点击输入框也可查看六十四卦名称。</p></section>';
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : '请检查静态服务器和 V4 数据文件。';
    resultRoot.innerHTML = '<section class=\"lookup-empty-state\"><h2>卦象资料暂时无法载入</h2><p>请通过本地静态服务器或已部署的网站打开本页面。</p></section>';
  }
}

start();
