/*
 * This project adopts the probability profile recorded in rules.json.
 * Each line is generated as three yarrow changes: change one has 5/9
 * residues at 3:1 odds; changes two and three have 4/8 residues at 1:1
 * odds. A valid split is then selected that realizes the sampled remainders.
 * The combined line probabilities are therefore 6:1/16, 7:5/16,
 * 8:7/16, 9:3/16. This keeps the project convention explicit while
 * showing all eighteen changes instead of drawing a hexagram directly.
 */
function randomBelow(limit) {
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error("当前环境不支持安全随机数，请使用现代浏览器并通过本地服务器打开。");
  }
  const span = 0x100000000;
  const ceiling = Math.floor(span / limit) * limit;
  const buffer = new Uint32Array(1);
  do { globalThis.crypto.getRandomValues(buffer); } while (buffer[0] >= ceiling);
  return buffer[0] % limit;
}

function remainderByFour(count) {
  return count % 4 || 4;
}

function chooseSplit(total, targetRemainders, hangOne) {
  const possibilities = [];
  for (let left = 1; left < total; left += 1) {
    const right = total - left;
    if (hangOne && right <= 1) continue;
    const rightToCount = right - (hangOne ? 1 : 0);
    if (rightToCount < 1) continue;
    const leftRemainder = remainderByFour(left);
    const rightRemainder = remainderByFour(rightToCount);
    if (leftRemainder + rightRemainder === targetRemainders) {
      possibilities.push({ left, right, rightToCount, leftRemainder, rightRemainder });
    }
  }
  if (!possibilities.length) throw new Error("本次分堆没有得到有效归奇结果。");
  return possibilities[randomBelow(possibilities.length)];
}

export function createLineCast() {
  let remaining = 49;
  const changes = [];
  return {
    nextChange() {
      if (changes.length >= 3) throw new Error("一爻已完成三变。");
      const index = changes.length;
      const hangOne = index === 0;
      const targetRemainders = hangOne
        ? (randomBelow(4) === 0 ? 8 : 4)
        : (randomBelow(2) === 0 ? 4 : 8);
      const split = chooseSplit(remaining, targetRemainders, hangOne);
      const removed = targetRemainders + (hangOne ? 1 : 0);
      const before = remaining;
      remaining -= removed;
      const change = {
        change: index + 1,
        before,
        leftPile: split.left,
        rightPile: split.right,
        hungOne: hangOne,
        leftRemainder: split.leftRemainder,
        rightRemainder: split.rightRemainder,
        remainders: targetRemainders,
        removed,
        after: remaining
      };
      changes.push(change);
      return change;
    },
    finish() {
      if (changes.length !== 3) throw new Error("一爻必须完成三变后才能定爻。");
      const value = remaining / 4;
      if (![6, 7, 8, 9].includes(value)) throw new Error("归奇结果不在 6、7、8、9 之内。");
      return { value, remaining, changes: changes.slice() };
    }
  };
}
