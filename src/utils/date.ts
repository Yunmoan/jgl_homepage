export const formatUnixTimestampToUTC8 = (timestamp: number): string => {
  if (!timestamp) return '';
  // Create a date object. The timestamp is in seconds, so multiply by 1000 for milliseconds.
  // Add the 8-hour offset for UTC+8. 8 hours * 60 minutes/hour * 60 seconds/minute * 1000 milliseconds/second
  const date = new Date(timestamp * 1000 + 8 * 3600 * 1000);

  // Use toISOString() which returns a string in ISO format (YYYY-MM-DDTHH:mm:ss.sssZ) in UTC.
  // Since we've already added the 8-hour offset, the UTC time of this new date object is our target UTC+8 time.
  const isoString = date.toISOString();

  // The format is "YYYY-MM-DDTHH:mm:ss.sssZ". We want "YYYY-MM-DD HH:mm:ss".
  // We can slice and replace 'T' with a space.
  return isoString.slice(0, 19).replace('T', ' ');
};

export const formatISOToUTC8 = (isoString: string): string => {
  if (!isoString) return '';
  // 从ISO字符串创建日期对象
  const originalDate = new Date(isoString);

  // 创建一个早8小时的新日期对象
  // getTime() 返回自纪元以来的毫秒数
  const utc8Date = new Date(originalDate.getTime() + 8 * 3600 * 1000);

  // 使用 toISOString() 返回 UTC 格式的 ISO 字符串 (YYYY-MM-DDTHH:mm:ss.sssZ)
  // 由于我们已经添加了8小时的偏移量，这个新日期对象的UTC时间就是我们想要的目标UTC+8时间
  const isoStringUTC8 = utc8Date.toISOString();

  // 格式是 "YYYY-MM-DDTHH:mm:ss.sssZ". 我们想要 "YYYY-MM-DD HH:mm:ss"
  // 我们可以切割字符串并用空格替换 'T'
  return isoStringUTC8.slice(0, 19).replace('T', ' ');
};
