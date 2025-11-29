import fs from 'fs'
import path from 'path'

type Genre = {
  gid: string
  name: string
}

type Title = {
  gid: string
  anime_gid: string
  language: string
  name: string
  created_at: string
  updated_at: string
}

type Anime = {
  gid: string
  status: string
  age: string
  type: string
  title: string
  url: string
  start_date: number
  end_date: number
  preview_path: string
  number_episodes: number
  description: string
  enable: boolean
  created_at: string
  updated_at: string
  genres: Genre[]
  titles: Title[]
}

type ApiResponse = {
  result: Anime[]
  total: number
}

type SitemapUrl = {
  loc: string
  lastmod?: string
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority?: string
}

type SitemapFileInfo = {
  filename: string
  loc: string
  lastmod?: string
}

const API_URL = 'http://127.0.0.1:7999/api/v2/anime/search'
const PAGE_SIZE = 36
const SITE_URL = 'https://animeviewer.ru'
const OUTPUT_DIR = path.resolve(process.cwd(), '..', 'static')
const SITEMAP_INDEX_FILE = path.join(OUTPUT_DIR, 'sitemap.xml')
const MAX_URLS_PER_SITEMAP = 50000

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/'/g, '&apos;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function toW3CDate(value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value)
  return d.toISOString()
}

async function fetchPage(page: number, pageSize: number): Promise<ApiResponse> {
  const url = `${API_URL}?page=${page}&page_size=${pageSize}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Request failed: ${res.status} ${res.statusText}`)
  return (await res.json()) as ApiResponse
}

async function fetchAllAnime(): Promise<Anime[]> {
  const first = await fetchPage(1, PAGE_SIZE)
  const total = first.total
  const all: Anime[] = [...first.result]
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  for (let page = 2; page <= totalPages; page++) {
    const p = await fetchPage(page, PAGE_SIZE)
    all.push(...p.result)
  }

  return all
}

function buildUrlEntry(u: SitemapUrl): string {
  const loc = escapeXml(u.loc)
  const parts: string[] = []
  parts.push('  <url>')
  parts.push(`    <loc>${loc}</loc>`)
  if (u.lastmod) {
    parts.push(`    <lastmod>${escapeXml(u.lastmod)}</lastmod>`)
  }
  if (u.changefreq) {
    parts.push(`    <changefreq>${u.changefreq}</changefreq>`)
  }
  if (u.priority) {
    parts.push(`    <priority>${u.priority}</priority>`)
  }
  parts.push('  </url>')
  return parts.join('\n')
}

function generateSitemapXml(urls: SitemapUrl[]): string {
  const entries = urls.map(buildUrlEntry).join('\n')
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"`,
    `        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd"`,
    `        xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    entries,
    `</urlset>`,
    ``
  ].join('\n')
}

function buildSitemapIndexEntry(info: SitemapFileInfo): string {
  const loc = escapeXml(info.loc)
  const parts: string[] = []
  parts.push('  <sitemap>')
  parts.push(`    <loc>${loc}</loc>`)
  if (info.lastmod) {
    parts.push(`    <lastmod>${escapeXml(info.lastmod)}</lastmod>`)
  }
  parts.push('  </sitemap>')
  return parts.join('\n')
}

function generateSitemapIndexXml(files: SitemapFileInfo[]): string {
  const entries = files.map(buildSitemapIndexEntry).join('\n')
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<sitemapindex xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"`,
    `              xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/siteindex.xsd"`,
    `              xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    entries,
    `</sitemapindex>`,
    ``
  ].join('\n')
}

function generateRobots(animeList: Anime[]): string {
  const lines: string[] = []

  lines.push('User-agent: *')
  lines.push('Allow: /')
  lines.push('Disallow: /admin/')

  for (const anime of animeList) {
    if (!anime.enable) continue
    const basePath = `/anime/${anime.url}`
    lines.push(`Allow: ${basePath}`)
    const episodes = Number.isFinite(anime.number_episodes)
      ? anime.number_episodes
      : 0
    for (let i = 1; i <= episodes; i++) {
      lines.push(`Disallow: ${basePath}/${i}`)
    }
  }

  lines.push(`Sitemap: ${SITE_URL}/sitemap.xml`)

  return lines.join('\n') + '\n'
}

async function main() {
  const animeList = await fetchAllAnime()

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  const nowIso = toW3CDate(new Date())

  const urls: SitemapUrl[] = []

  urls.push({
    loc: `${SITE_URL}/`,
    lastmod: nowIso,
    changefreq: 'daily',
    priority: '1.0'
  })

  for (const anime of animeList) {
    if (!anime.enable) continue
    const loc = `${SITE_URL}/anime/${anime.url}`
    const lastmod = anime.updated_at ? toW3CDate(anime.updated_at) : undefined
    let changefreq: SitemapUrl['changefreq'] = 'yearly'
    if (anime.status === 'ongoing') changefreq = 'weekly'
    const priority = '0.8'
    urls.push({
      loc,
      lastmod,
      changefreq,
      priority
    })
  }

  const sitemapFiles: SitemapFileInfo[] = []
  let sitemapIndex = 1

  for (let i = 0; i < urls.length; i += MAX_URLS_PER_SITEMAP) {
    const chunk = urls.slice(i, i + MAX_URLS_PER_SITEMAP)
    const filename = `sitemap-${sitemapIndex}.xml`
    const filepath = path.join(OUTPUT_DIR, filename)
    const loc = `${SITE_URL}/${filename}`
    const xml = generateSitemapXml(chunk)
    fs.writeFileSync(filepath, xml, { encoding: 'utf8' })
    sitemapFiles.push({
      filename,
      loc,
      lastmod: nowIso
    })
    sitemapIndex++
  }

  const sitemapIndexXml = generateSitemapIndexXml(sitemapFiles)
  fs.writeFileSync(SITEMAP_INDEX_FILE, sitemapIndexXml, { encoding: 'utf8' })

  const robotsContent = generateRobots(animeList)
  const robotsPath = path.join(OUTPUT_DIR, 'robots.txt')
  fs.writeFileSync(robotsPath, robotsContent, { encoding: 'utf8' })
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})