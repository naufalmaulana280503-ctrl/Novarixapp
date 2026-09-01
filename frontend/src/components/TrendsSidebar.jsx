import React from 'react'

const TrendsSidebar = () => {
  const trends = [
    { tag: '#NovarixLaunch', count: '12.4K' },
    { tag: '#IndieCreators', count: '8.1K' },
    { tag: '#LiveNow', count: '5.6K' },
    { tag: '#Shorts', count: '22.3K' },
    { tag: '#Music', count: '14.9K' },
  ]

  return (
    <aside style={styles.container}>
      <div style={styles.header}>Trending</div>
      <ul style={styles.list}>
        {trends.map((t) => (
          <li key={t.tag} style={styles.item}>
            <div style={styles.tag}>{t.tag}</div>
            <div style={styles.count}>{t.count}</div>
          </li>
        ))}
      </ul>
      <div style={styles.explore}><a href="#" style={{color:'#aab0d6', textDecoration:'none'}}>Explore more</a></div>
    </aside>
  )
}

const styles = {
  container: {
    background: 'linear-gradient(180deg, rgba(255,255,255,0.01), transparent)',
    borderRadius: 12,
    padding: 12,
    border: '1px solid rgba(255,255,255,0.03)',
  },
  header: { fontWeight: 800, marginBottom: 8 },
  list: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 },
  item: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', borderRadius: 8, background: 'rgba(255,255,255,0.01)' },
  tag: { color: '#e6e6ef', fontWeight: 700 },
  count: { color: '#9aa0c7', fontSize: 12 },
  explore: { marginTop: 12, textAlign: 'center' }
}

export default TrendsSidebar
