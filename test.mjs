import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { FreeSearchPlugin } from './index.mjs'

const context = () => ({ abort: new AbortController().signal })
const json = value => new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' } })
const npmData = { objects: [{ package: { name: 'react', version: '19.0.0', description: 'UI library', links: { npm: 'https://www.npmjs.com/package/react' } } }] }
const originalFetch = globalThis.fetch
const withFetch = async (mock, action) => { globalThis.fetch = mock; try { return await action() } finally { globalThis.fetch = originalFetch } }

test('Magpie 声明 settings 面板并与插件页面共用同一表单', () => {
  const p = JSON.parse(readFileSync(new URL('./package.json', import.meta.url)))
  assert.equal(p.magpie.panels[0].slot, 'settings')
  assert.equal(p.magpie.panels[0].file, p.magpie.page.file)
  assert.match(p.magpie.icon,/^data:image\/svg\+xml;base64,/)
  const icon=readFileSync(new URL('./page/icon.svg',import.meta.url),'utf8')
  assert.equal(Buffer.from(p.magpie.icon.split(',')[1],'base64').toString('utf8'),icon)
  assert.equal(p.magpie.page.icon,'page/icon.svg')
  assert.ok(icon.length<1_000_000)
})

test('工具注册、定向搜索与缓存命中', async () => {
  const { tool } = await FreeSearchPlugin({}, { enabled: ['npm'], mode: 'npm', extraTools:true })
  assert.equal(Object.keys(tool).length, 11)
  assert.deepEqual(tool.web_search.args.required,['query'])
  assert.throws(()=>tool.web_search.execute({},context()),/Missing required argument: query/)
  let calls = 0
  await withFetch(async () => { calls++; return json(npmData) }, async () => {
    const a = JSON.parse(await tool.platform_search.execute({ query:'react test 1', platform:'npm' },context()))
    const b = JSON.parse(await tool.platform_search.execute({ query:'react test 1', platform:'npm' },context()))
    assert.equal(a.results[0].title,'react · 19.0.0')
    assert.equal(b.cached,true)
    assert.equal(calls,1)
  })
})

test('Magpie 原生 search hook 免密钥注册、尊重结果数量', async () => {
  const hooks = await FreeSearchPlugin({}, {enabled:['npm'],mode:'npm'})
  assert.equal(hooks.tool,undefined)
  assert.equal(Object.keys(hooks.search).length,19)
  assert.equal(hooks.search.free.keyOptional,true)
  await withFetch(async()=>json(npmData),async()=>{
    const pages=await hooks.search.free.execute({query:'magpie native search',count:1,key:''},context())
    assert.equal(pages.length,1)
    assert.equal(pages[0].title,'react · 19.0.0')
    assert.equal(pages[0].text,'UI library')
  })
})

test('独立原生搜索通道不依赖 MCP，并由 Magpie 管理可选密钥', async () => {
  const hooks=await FreeSearchPlugin({}, {enabled:[]})
  let authorization=''
  await withFetch(async (_url,init)=>{authorization=init.headers.authorization;return json({results:[{url:'https://example.com/t',title:'Tavily result',content:'snippet'}]})},async()=>{
    const pages=await hooks.search.tavily.execute({query:'native keyed search',count:1,key:'magpie-stored-key'},context())
    assert.equal(authorization,'Bearer magpie-stored-key')
    assert.equal(pages[0].title,'Tavily result')
  })
})

test('Magpie 独立搜索通道按密钥隔离冷却与结果缓存', async () => {
  const hooks=await FreeSearchPlugin({}, {enabled:[]})
  let calls=0
  await withFetch(async (_url,init)=>{calls++;return init.headers.authorization==='Bearer rejected' ? new Response('invalid',{status:401}) : json({results:[{url:'https://example.com/ok',title:'Account result',content:'verified'}]})},async()=>{
    await assert.rejects(hooks.search.tavily.execute({query:'per-key isolate',count:1,key:'rejected'},context()),e=>e.status===401)
    const pages=await hooks.search.tavily.execute({query:'per-key isolate',count:1,key:'valid'},context())
    assert.equal(pages[0].title,'Account result')
    assert.equal(calls,2)
  })
})

test('SearXNG 直接使用 Magpie 搜索 API 配置的实例地址', async () => {
  const hooks=await FreeSearchPlugin({}, {enabled:[]})
  assert.equal(hooks.search.searxng.url,true)
  let requested=''
  await withFetch(async url=>{requested=String(url);return json({results:[{url:'https://example.com/page',title:'SearXNG source',content:'snippet'}]})},async()=>{
    const pages=await hooks.search.searxng.execute({query:'native SearXNG',count:1,url:'https://93.184.216.34'},context())
    assert.equal(pages[0].title,'SearXNG source')
    assert.match(requested,/93\.184\.216\.34\/search\?/)
  })
})

test('原生搜索拒绝带凭据、控制字符或非网页协议的结果链接', async () => {
  const hooks=await FreeSearchPlugin({}, {})
  const bad=['javascript:alert(1)','https://user:pass@example.com/','https://example.com/\u202ehidden']
  await withFetch(async()=>json({objects:bad.map((url,i)=>({package:{name:`bad${i}`,version:'1',links:{npm:url}}}))}),async()=>{
    await assert.rejects(hooks.search.npm.execute({query:'unsafe result links',count:3},context()),/No results/)
  })
})

test('Magpie 请求的结果数量参与缓存标识，不会把 1 条命中当成 3 条', async () => {
  const hooks=await FreeSearchPlugin({}, {})
  let calls=0
  await withFetch(async()=>{calls++;return json({objects:[1,2,3].map(i=>({package:{name:`item-${i}`,version:'1',links:{npm:`https://www.npmjs.com/package/item-${i}`}}}))})},async()=>{
    const args={query:'native count cache regression'}
    const one=await hooks.search.npm.execute({...args,count:1},context())
    const three=await hooks.search.npm.execute({...args,count:3},context())
    assert.equal(one.length,1)
    assert.equal(three.length,3)
    assert.equal(calls,2)
  })
})

test('失败回退不会把禁用的引擎当作平台结果', async () => {
  const { tool } = await FreeSearchPlugin({}, { enabled:['bing','npm'], mode:'bing', fallback:['npm'], extraTools:true })
  await withFetch(async url => String(url).includes('bing.com') ? new Response('temporary failure',{status:503}) : json(npmData), async () => {
    const a=JSON.parse(await tool.web_search.execute({query:'fallback test 2'},context()))
    assert.equal(a.engine,'npm')
    assert.equal(a.fallback,true)
    const b=JSON.parse(await tool.platform_search.execute({query:'blocked platform',platform:'github'},context()))
    assert.equal(b.results.length,0)
  })
})

test('并发去重合并两个引擎的来源', async () => {
  const { tool }=await FreeSearchPlugin({}, { enabled:['npm','github'], mode:'multi', enPool:['npm','github'], extraTools:true })
  await withFetch(async url => String(url).includes('npmjs.org') ? json(npmData) : json({items:[{html_url:'https://www.npmjs.com/package/react',full_name:'react',description:'second source'}]}), async () => {
    const r=JSON.parse(await tool.multi_search.execute({query:'merge test 3'},context()))
    assert.equal(r.results.length,1)
    assert.deepEqual(r.results[0].engines.sort(),['github','npm'])
  })
})

test('网页抓取拒绝回环地址，且不发起任何网络请求', async () => {
  const { tool }=await FreeSearchPlugin({}, {extraTools:true})
  await withFetch(async () => { throw Error('network must not be called') }, async () => {
    await assert.rejects(tool.web_fetch.execute({url:'http://127.0.0.1/private'},context()),/Private or local/)
    await assert.rejects(tool.web_fetch.execute({url:'http://169.254.169.254/latest/meta-data/'},context()),/Private or local/)
  })
})

test('超大响应被截断前拒绝，而不是读取后静默返回', async () => {
  const { tool }=await FreeSearchPlugin({}, { enabled:['npm'], extraTools:true })
  await withFetch(async () => json({objects:[{package:{name:'x',description:'x'.repeat(2_100_000)}}]}), async () => {
    const r=JSON.parse(await tool.platform_search.execute({query:'large test 4',platform:'npm'},context()))
    assert.equal(r.mode,'failed')
    assert.match(r.failures[0],/Response too large/)
  })
})

test('Parallel MCP 可跳过 SSE 通知并解析带来源的结果', async () => {
  const { tool }=await FreeSearchPlugin({}, { enabled:['parallel'], mode:'parallel', extraTools:true })
  const message={jsonrpc:'2.0',id:1,result:{content:[{type:'text',text:JSON.stringify({results:[{url:'https://example.com/p',title:'Parallel result',excerpts:['evidence']} ]})}]}}
  await withFetch(async () => new Response(`data: ${JSON.stringify({jsonrpc:'2.0',method:'notifications/progress'})}\n\ndata: ${JSON.stringify(message)}\n\n`,{headers:{'content-type':'text/event-stream'}}),async()=>{
    const r=JSON.parse(await tool.web_search.execute({query:'parallel test 5'},context()))
    assert.equal(r.engine,'parallel')
    assert.equal(r.results[0].snippet,'evidence')
  })
})

test('Keenable MCP 正确解析文本格式与发布日期', async () => {
  const { tool }=await FreeSearchPlugin({}, { enabled:['keenable'],mode:'keenable', extraTools:true })
  await withFetch(async () => json({jsonrpc:'2.0',id:1,result:{content:[{type:'text',text:'Title: Keenable result\nURL: https://example.com/k\nPublished: 2026-01-01\nSnippets:\npublic source'}]}}),async()=>{
    const r=JSON.parse(await tool.web_search.execute({query:'keenable test 6'},context()))
    assert.equal(r.results[0].title,'Keenable result')
    assert.equal(r.results[0].date,'2026-01-01')
  })
})

test('research 抓取正文并允许 cache_search 检索证据', async () => {
  const { tool }=await FreeSearchPlugin({}, {enabled:['npm'],mode:'multi',enPool:['npm'],extraTools:true})
  await withFetch(async url => String(url).includes('npmjs.org')
    ? json({objects:[{package:{name:'evidence',version:'1.0',links:{npm:'https://93.184.216.34/page'}}}]})
    : new Response('<html><body>unique-evidence-phrase is a verified statement.</body></html>',{headers:{'content-type':'text/html'}}),async()=>{
      const r=JSON.parse(await tool.research.execute({question:'evidence test 7',depth:1},context()))
      assert.equal(r.documents.length,1)
      assert.match(r.documents[0].content,/unique-evidence-phrase/)
      const cached=JSON.parse(await tool.cache_search.execute({query:'unique-evidence-phrase'},context()))
      assert.equal(cached.documents[0].url,'https://93.184.216.34/page')
    })
})

test('DDG Lite 支持单引号 class 与 href 在前的网页结构', async () => {
  const {tool}=await FreeSearchPlugin({}, {enabled:['ddg-lite'],mode:'ddg-lite',extraTools:true})
  await withFetch(async()=>new Response('<a rel="nofollow" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fddg" class=\'result-link\'>DDG source</a>'),async()=>{
    const r=JSON.parse(await tool.web_search.execute({query:'ddg parser test 8'},context()))
    assert.equal(r.results[0].url,'https://example.com/ddg')
  })
})

test('Bing 结果解包跳转链接并返回真实来源', async () => {
  const {tool}=await FreeSearchPlugin({}, {enabled:['bing'],mode:'bing',extraTools:true})
  const encoded=Buffer.from('https://example.com/source').toString('base64url')
  await withFetch(async()=>new Response(`<li class="b_algo"><h2><a href="https://www.bing.com/ck/a?u=a1${encoded}">Actual result</a></h2><p>source text</p></li>`),async()=>{
    const r=JSON.parse(await tool.web_search.execute({query:'bing parser test 9'},context()))
    assert.equal(r.results[0].url,'https://example.com/source')
  })
})
