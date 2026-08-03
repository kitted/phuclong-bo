export const listItemKey = (item, index = 0) =>
  String(
    item?.id || item?._id || item?.code || item?.documentId || item?.comparisonId || `row-${index}`
  );

export const mergeUniqueItems = (current = [], incoming = [], getKey = listItemKey) => {
  const merged = [...current];
  const positions = new Map(current.map((item, index) => [getKey(item, index), index]));

  incoming.forEach((item, index) => {
    const key = getKey(item, current.length + index);
    const existingIndex = positions.get(key);
    if (existingIndex === undefined) {
      positions.set(key, merged.length);
      merged.push(item);
      return;
    }
    merged[existingIndex] = item;
  });

  return merged;
};
