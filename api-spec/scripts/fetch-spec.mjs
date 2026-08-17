// fetch-spec.mjs — 从开发环境网关拉取各服务 OpenAPI json，覆盖 input/ 后自动重跑 gen-spec.mjs
// 零依赖（Node 18+ 全局 fetch）。
//
// 原理：Knife4j 聚合 UI（doc.html）的数据源是两个可直接 GET 的端点——
//   {base}/v3/api-docs/swagger-config   → 服务清单（name + 每个服务的 api-docs 地址）
//   {base}<url>                         → 该服务的 OpenAPI json（无需登录）
//
// 网关地址（base）解析优先级：
//   1. --base=URL 命令行参数
//   2. OPENAPI_BASE 环境变量
//   3. api-spec/config.json 的 base 字段
//   4. env 文件探测（Vite 规则：.env.development.local 优先于 .env.development）
//      - 查找目录：config.json 的 envDirs（相对项目根）；缺省自动探测——
//        存在 apps/ 目录（monorepo）则逐个扫 apps/*（按目录名排序，先到先得），否则扫项目根
//      - 变量名：config.json 的 envKey，缺省 VITE_APP_BASE_API
//
// 用法：
//   node api-spec/scripts/fetch-spec.mjs                # 只刷新 input/ 里已存在的服务，然后重切片
//   node api-spec/scripts/fetch-spec.mjs --all          # 拉取网关上全部服务（含新服务）
//   node api-spec/scripts/fetch-spec.mjs --only=招商管理 # 只拉指定服务（逗号分隔，可拉 input 里没有的）
//   node api-spec/scripts/fetch-spec.mjs --list         # 只列出网关上的服务，不下载
//   node api-spec/scripts/fetch-spec.mjs --no-gen       # 只下载，不重跑 gen-spec.mjs
//   node api-spec/scripts/fetch-spec.mjs --base=http://10.18.80.20:9102   # 临时指定网关地址
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SPEC_DIR = path.resolve(__dirname, '..') // api-spec/
const IN_DIR = path.join(SPEC_DIR, 'input')
const ROOT = path.resolve(SPEC_DIR, '..')
const TIMEOUT_MS = 60_000

// ============ 0. 可选配置 api-spec/config.json（只放覆盖项，全部字段可省） ============
const CONFIG_FILE = path.join(SPEC_DIR, 'config.json')
const config = fs.existsSync(CONFIG_FILE)
  ? JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'))
  : {}
const ENV_KEY = typeof config.envKey === 'string' && config.envKey ? config.envKey : 'VITE_APP_BASE_API'
const ENV_FILE_NAMES = ['.env.development.local', '.env.development']

// env 查找目录：config.envDirs > 自动探测（monorepo 扫 apps/*，单仓扫根目录）
const detectEnvDirs = () => {
  const appsDir = path.join(ROOT, 'apps')
  if (fs.existsSync(appsDir)) {
    const apps = fs
      .readdirSync(appsDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .sort((a, b) => a.name.localeCompare(b.name))
    if (apps.length) return apps.map((e) => path.join('apps', e.name))
  }
  return ['.']
}
const envDirs =
  Array.isArray(config.envDirs) && config.envDirs.length ? config.envDirs.map(String) : detectEnvDirs()

// ============ 1. 解析 CLI 参数 ============
const args = process.argv.slice(2)
const flag = (name) => args.includes(`--${name}`)
const opt = (name) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3)
if (flag('help')) {
  console.log(
    '用法见文件头部注释。可用参数：--all / --only=a,b / --list / --no-gen / --base=URL / --help'
  )
  process.exit(0)
}

// ============ 2. 确定网关地址：--base > OPENAPI_BASE > config.base > env 文件 ============
const readEnvBase = () => {
  for (const dir of envDirs) {
    for (const name of ENV_FILE_NAMES) {
      const file = path.join(ROOT, dir, name)
      if (!fs.existsSync(file)) continue
      for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Za-z_][\w.]*)\s*=\s*(.*)$/)
        if (!m || m[1] !== ENV_KEY) continue
        const value = m[2]
          .replace(/\s+#.*$/, '')
          .trim()
          .replace(/^['"]|['"]$/g, '')
        if (value) return { base: value.replace(/\/+$/, ''), from: path.relative(ROOT, file) }
      }
    }
  }
  return null
}
const baseOverride = opt('base') || process.env.OPENAPI_BASE
const resolved = baseOverride
  ? { base: baseOverride.replace(/\/+$/, ''), from: '命令行/环境变量' }
  : typeof config.base === 'string' && config.base
    ? { base: config.base.replace(/\/+$/, ''), from: path.relative(ROOT, CONFIG_FILE) }
    : readEnvBase()
if (!resolved) {
  console.error(
    `[FATAL] 未能确定后端网关地址：--base 参数 / OPENAPI_BASE 环境变量 / config.json 的 base / env 文件（变量 ${ENV_KEY}，查找目录：${envDirs.join(', ')}）都没找到。`
  )
  console.error(
    '  可在 api-spec/config.json 配置 { "base": "http://host:port" }，或用 --base=http://host:port 临时指定。'
  )
  process.exit(1)
}
console.log(`网关地址: ${resolved.base}（来源：${resolved.from}）`)

// ============ 3. 拉服务清单 ============
const getJson = async (url, label) => {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) }).catch((e) => {
    throw new Error(`${label} 请求失败: ${e.message}`)
  })
  if (!res.ok) throw new Error(`${label} 返回 HTTP ${res.status}`)
  return res.json()
}

let services
try {
  const swaggerConfig = await getJson(`${resolved.base}/v3/api-docs/swagger-config`, '服务清单')
  services = (swaggerConfig.urls || []).filter((s) => s.name && s.url)
} catch (e) {
  console.error(`[FATAL] ${e.message}`)
  console.error('  地址可能不是 Knife4j/springdoc 网关（确认浏览器能打开该地址的 /doc.html）。')
  process.exit(1)
}
if (!services.length) {
  console.error('[FATAL] 服务清单为空，没有可下载的服务。')
  process.exit(1)
}

if (flag('list')) {
  console.log('\n网关上的服务：')
  for (const s of services) console.log(`  - ${s.name}  (${s.url})`)
  process.exit(0)
}

// ============ 4. 选出要拉的服务：--only > --all > 默认只刷新 input 里已有的 ============
const fileName = (name) => `${name.replace(/[_-]?(openapi|api-docs|swagger)$/i, '')}_OpenAPI.json`
const existing = new Set(
  fs.existsSync(IN_DIR) ? fs.readdirSync(IN_DIR).filter((f) => f.endsWith('.json')) : []
)

let targets
if (opt('only')) {
  const wanted = opt('only')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  targets = services.filter((s) => wanted.includes(s.name))
  const missing = wanted.filter((w) => !targets.some((t) => t.name === w))
  if (missing.length) {
    console.error(
      `[FATAL] --only 里的服务不在网关清单中: ${missing.join(', ')}。可用 --list 查看全部服务名。`
    )
    process.exit(1)
  }
} else if (flag('all')) {
  targets = services
} else {
  targets = services.filter((s) => existing.has(fileName(s.name)))
  const skipped = services.filter((s) => !targets.some((t) => t.name === s.name))
  for (const s of skipped)
    console.log(`跳过 ${s.name}（input/ 里不存在，需拉取请加 --all 或 --only=${s.name}）`)
  if (!targets.length) {
    console.error(
      '[FATAL] input/ 里没有任何已存在的服务可刷新。首次拉取请用 --all，之后默认只刷新已有服务。'
    )
    process.exit(1)
  }
}

// ============ 5. 逐个下载 → 校验 → 内容有变化才落盘（失败不覆盖旧文件） ============
const stableStringify = (v) => JSON.stringify(sortKeys(v))
function sortKeys(v) {
  if (Array.isArray(v)) return v.map(sortKeys)
  if (v && typeof v === 'object') {
    return Object.fromEntries(
      Object.keys(v)
        .sort()
        .map((k) => [k, sortKeys(v[k])])
    )
  }
  return v
}

let ok = 0
let failed = 0
for (const s of targets) {
  const file = path.join(IN_DIR, fileName(s.name))
  try {
    const spec = await getJson(new URL(s.url, resolved.base).href, `[${s.name}]`)
    if (!spec || typeof spec !== 'object' || !spec.paths || typeof spec.paths !== 'object') {
      throw new Error('响应不是有效的 OpenAPI json（缺少 paths）')
    }
    if (
      fs.existsSync(file) &&
      stableStringify(spec) === stableStringify(JSON.parse(fs.readFileSync(file, 'utf8')))
    ) {
      console.log(`[${s.name}] 无变化，跳过写入`)
      ok++
      continue
    }
    fs.writeFileSync(file, JSON.stringify(spec, null, 2) + '\n', 'utf8')
    console.log(
      `[${s.name}] 已保存 → ${path.relative(ROOT, file)}（paths: ${Object.keys(spec.paths).length}）`
    )
    ok++
  } catch (e) {
    console.error(`[${s.name}] ${e.message}，保留旧文件`)
    failed++
  }
}

// ============ 6. 自动重跑切片 ============
if (failed) {
  console.error(
    `\n[失败] ${failed} 个服务拉取失败（成功 ${ok} 个）。请检查网络或服务可用性后重试。`
  )
  process.exit(1)
}
if (flag('no-gen')) {
  console.log('\n完成（--no-gen，未重跑切片）。')
  process.exit(0)
}
console.log('\n重新生成切片…')
const gen = spawnSync(process.execPath, [path.join(SPEC_DIR, 'scripts', 'gen-spec.mjs')], {
  stdio: 'inherit',
  env: process.env
})
process.exit(gen.status ?? 1)
