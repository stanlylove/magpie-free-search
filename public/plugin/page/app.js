// 普通脚本而非 module：Magpie 的沙盒 iframe 可能具有不透明 origin，module 加载会触发 CORS。
;(async () => {
  const ids = ['bing','ddg','ddg-lite','searxng','wikipedia','github','hackernews','npm','pypi','crossref','arxiv','anysearch','tavily','firecrawl','you','exa','parallel','keenable']
  const defaults = { mode:'auto',enabled:ids.filter(x=>x!=='searxng'),fallback:['bing','ddg','ddg-lite','anysearch','tavily','you','wikipedia'],zhPool:['bing','ddg','wikipedia'],enPool:['bing','ddg','ddg-lite'],safeSearch:'moderate',cacheMinutes:5,maxResults:8,blockedDomains:[],searxngUrl:'',extraTools:false }
  const $ = id => document.getElementById(id)
  const split = s => s.split(',').map(x=>x.trim()).filter(Boolean)
  try {
    await magpie.ready
    const o = { ...defaults, ...(await magpie.options.get() || {}) }
    for (const id of ids) if (![...$('mode').options].some(option => option.value === id)) $('mode').add(new Option(id, id))
    $('engines').innerHTML = ids.map(id=>`<label><input type="checkbox" value="${id}">${id}</label>`).join('')
    const render = value => {
      for (const id of ['mode','safeSearch','cacheMinutes','maxResults','searxngUrl']) $(id).value = value[id] ?? ''
      for (const id of ['zhPool','enPool','fallback','blockedDomains']) $(id).value = (value[id] || []).join(', ')
      $('engines').querySelectorAll('input').forEach(el => el.checked = value.enabled.includes(el.value))
      $('extraTools').checked = value.extraTools === true
    }
    render(o)
    $('reset').onclick = () => { render(defaults); $('status').textContent = '已恢复表单默认值；点击「保存设置」后才会写入 Magpie。' }
    $('save').onclick = async () => {
      $('save').disabled = true
      try {
        const next = { ...o }
        for (const id of ['mode','safeSearch','searxngUrl']) next[id] = $(id).value
        for (const id of ['cacheMinutes','maxResults']) next[id] = Number($(id).value)
        for (const id of ['zhPool','enPool','fallback','blockedDomains']) next[id] = split($(id).value)
        next.enabled = [...$('engines').querySelectorAll('input:checked')].map(x=>x.value)
        next.extraTools = $('extraTools').checked
        if (!next.enabled.length) throw new Error('请至少启用一个引擎')
        if (next.cacheMinutes < 0 || next.cacheMinutes > 60 || next.maxResults < 1 || next.maxResults > 20) throw new Error('缓存时间或结果数量超出允许范围')
        if (next.searxngUrl && !/^https?:\/\//i.test(next.searxngUrl)) throw new Error('SearXNG 地址必须以 http:// 或 https:// 开头')
        if (next.enabled.includes('searxng') && !next.searxngUrl) throw new Error('启用 SearXNG 时请填写实例地址')
        await magpie.options.set(next)
        $('status').textContent = '已保存。请在插件列表中关闭并重新开启此插件，使工具读取新配置。'
      } catch (error) { $('status').textContent = '保存失败：' + error.message }
      finally { $('save').disabled = false }
    }
  } catch (error) { $('status').textContent = '无法加载 Magpie 设置桥接：' + error.message }
})()
