export const formatNumber = (num) => {
  if (num == null || num === undefined || isNaN(Number(num))) {
    return '0';
  }
  return Number(num).toLocaleString('id-ID');
};

export const formatCompactNumber = (num) => {
  if (num == null || num === undefined || isNaN(Number(num))) {
    return '0';
  }
  const n = Number(num);
  if (n >= 1000000000) {
    return (n / 1000000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (n >= 1000000) {
    return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'Jt';
  }
  if (n >= 1000) {
    return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'Rb';
  }
  return n.toLocaleString('id-ID');
};

export const getVerifiedBadgeIcon = (badge) => {
  switch (badge) {
    case 'sun':
      return '☀️';
    case 'moon':
      return '🌙';
    case 'star':
      return '⭐';
    default:
      return null;
  }
};

export const getVerifiedBadgeTitle = (badge) => {
  switch (badge) {
    case 'sun':
      return 'Verified (CEO Manual)';
    case 'moon':
      return 'Verified (10M+ Followers & Likes)';
    case 'star':
      return 'Verified (20M+ Followers & Likes)';
    default:
      return 'Verified';
  }
};
