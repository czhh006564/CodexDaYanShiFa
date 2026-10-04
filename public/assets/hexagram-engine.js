function bitsKey(bits) {
  return bits.join("");
}

function movementKey(sequence, positions) {
  return `${sequence}|${positions.join(",")}`;
}

function compactTextRecords(items) {
  return items.map(([type, ref, position, text, translation]) => ({
    type, ref, position, text, translation
  }));
}

export function createHexagramEngine(hexagrams, routeIndex) {
  if (!Array.isArray(hexagrams) || hexagrams.length !== 64) {
    throw new Error("V4 卦级数据库应包含 64 卦。");
  }
  if (!Array.isArray(routeIndex) || routeIndex.length !== 4096) {
    throw new Error("V4 变化路径索引应包含 4096 条记录。");
  }

  const byPattern = new Map();
  const bySequence = new Map();
  const sequences = new Set();
  for (const hexagram of hexagrams) {
    const linePattern = hexagram.identity?.line_pattern_bottom_up;
    if (!Number.isInteger(hexagram.sequence) || hexagram.sequence < 1 || hexagram.sequence > 64 || sequences.has(hexagram.sequence)) {
      throw new Error("V4 卦级数据库包含无效或重复的卦序。");
    }
    if (!Array.isArray(linePattern) || linePattern.length !== 6 || linePattern.some(line => line !== "阳" && line !== "阴")) {
      throw new Error(`V4 第 ${hexagram.sequence} 卦的六爻阴阳位型无效。`);
    }
    sequences.add(hexagram.sequence);
    bySequence.set(hexagram.sequence, hexagram);
    const pattern = bitsKey(linePattern.map(line => line === "阳" ? 1 : 0));
    if (byPattern.has(pattern)) throw new Error(`V4 卦形重复：${pattern}`);
    byPattern.set(pattern, hexagram);
  }
  if (sequences.size !== 64) throw new Error("V4 卦级数据库卦序不完整。");

  function relationSequence(relation, relationName, baseSequence) {
    const label = relation?.hexagram;
    const match = typeof label === "string" ? label.match(/^\s*(\d{1,2})\b/) : null;
    const sequence = match ? Number(match[1]) : NaN;
    if (!Number.isInteger(sequence) || !bySequence.has(sequence)) {
      throw new Error(`V4 第 ${baseSequence} 卦缺少有效的${relationName}关系记录。`);
    }
    return sequence;
  }

  function derivedBits(bits, relation) {
    if (relation === "mutual") return [bits[1], bits[2], bits[3], bits[2], bits[3], bits[4]];
    if (relation === "opposite") return bits.map(value => 1 - value);
    return bits.slice().reverse();
  }

  const relationFields = [
    ["mutual", "nuclear_hexagram", "互卦"],
    ["opposite", "opposite_hexagram", "错卦"],
    ["reverse", "reverse_hexagram", "综卦"]
  ];
  for (const hexagram of hexagrams) {
    const bits = hexagram.identity.line_pattern_bottom_up.map(line => line === "阳" ? 1 : 0);
    for (const [key, field, label] of relationFields) {
      const linkedSequence = relationSequence(hexagram[field], label, hexagram.sequence);
      const derivedHexagram = byPattern.get(bitsKey(derivedBits(bits, key)));
      if (!derivedHexagram || derivedHexagram.sequence !== linkedSequence) {
        throw new Error(`V4 第 ${hexagram.sequence} 卦的${label}关系与卦形不一致。`);
      }
    }
  }

  const byRoute = new Map();
  const routesPerBase = new Map();
  for (const route of routeIndex) {
    if (!Array.isArray(route) || route.length !== 7 || !Number.isInteger(route[0]) || route[0] < 1 || route[0] > 64 ||
        !Number.isInteger(route[1]) || route[1] < 1 || route[1] > 64 ||
        !Array.isArray(route[2]) || route[2].some(position => !Number.isInteger(position) || position < 1 || position > 6) ||
        route[2].some((position, index) => index > 0 && route[2][index - 1] >= position)) {
      throw new Error("4096 路径索引存在无法识别的记录。");
    }
    if (!Array.isArray(route[4]) || !Array.isArray(route[5]) ||
        [...route[4], ...route[5]].some(item => !Array.isArray(item) || item.length !== 5)) {
      throw new Error("4096 路径索引中的取辞文本结构无效。");
    }
    const baseHexagram = bySequence.get(route[0]);
    const changedHexagram = bySequence.get(route[1]);
    const basePattern = bitsKey(baseHexagram.identity.line_pattern_bottom_up.map(line => line === "阳" ? 1 : 0));
    const changedPattern = bitsKey(changedHexagram.identity.line_pattern_bottom_up.map(line => line === "阳" ? 1 : 0));
    const expectedChangedPattern = basePattern.split("").map((bit, index) =>
      route[2].includes(index + 1) ? (bit === "1" ? "0" : "1") : bit
    ).join("");
    if (changedPattern !== expectedChangedPattern) {
      throw new Error(`V4 路径 ${route[0]} → ${route[1]} 的动爻与变卦卦形不一致。`);
    }
    const key = movementKey(route[0], route[2]);
    if (byRoute.has(key)) throw new Error(`变化路径重复：${key}`);
    byRoute.set(key, route);
    routesPerBase.set(route[0], (routesPerBase.get(route[0]) || 0) + 1);
  }
  if (routesPerBase.size !== 64 || [...routesPerBase.values()].some(count => count !== 64)) {
    throw new Error("4096 路径索引没有为每一卦提供完整的 64 种动爻组合。");
  }

  function resolve(values) {
    if (!Array.isArray(values) || values.length !== 6 || values.some(value => ![6, 7, 8, 9].includes(value))) {
      throw new Error("起卦结果必须是按初爻至上爻排列的六个 6/7/8/9。");
    }
    const baseBits = values.map(value => value === 6 || value === 8 ? 0 : 1);
    const movingPositions = values.flatMap((value, index) => value === 6 || value === 9 ? [index + 1] : []);
    const changedBits = baseBits.map((value, index) => movingPositions.includes(index + 1) ? 1 - value : value);
    const baseHexagram = byPattern.get(bitsKey(baseBits));
    if (!baseHexagram) throw new Error("本卦卦形无法在 V4 数据库中定位。");
    const hexByKey = {
      base: baseHexagram,
      changed: byPattern.get(bitsKey(changedBits)),
      mutual: bySequence.get(relationSequence(baseHexagram.nuclear_hexagram, "互卦", baseHexagram.sequence)),
      opposite: bySequence.get(relationSequence(baseHexagram.opposite_hexagram, "错卦", baseHexagram.sequence)),
      reverse: bySequence.get(relationSequence(baseHexagram.reverse_hexagram, "综卦", baseHexagram.sequence))
    };
    if (Object.values(hexByKey).some(hexagram => !hexagram)) {
      throw new Error("卦形无法在 V4 数据库中定位。");
    }

    const packedRoute = byRoute.get(movementKey(hexByKey.base.sequence, movingPositions));
    if (!packedRoute) throw new Error("4096 变化路径中没有找到对应记录。");
    if (packedRoute[1] !== hexByKey.changed.sequence) {
      throw new Error("路径库与阴阳变爻计算结果不一致。");
    }
    const route = {
      rule_id: packedRoute[3],
      primary_texts: compactTextRecords(packedRoute[4]),
      secondary_texts: compactTextRecords(packedRoute[5]),
      rule_note: packedRoute[6]
    };
    return { hexByKey, movingPositions, route };
  }

  return { resolve };
}
