import { net } from 'electron'

export interface PlaylistVideo {
  videoId: string
  title: string
  thumbnailUrl: string
  durationSeconds: number
  position: number
}

export interface PlaylistResult {
  thumbnailUrl: string
  videos: PlaylistVideo[]
}

export function extractPlaylistId(url: string): string {
  const match = url.match(/[?&]list=([a-zA-Z0-9_-]+)/)
  if (match) return match[1]
  if (/^[a-zA-Z0-9_-]+$/.test(url)) return url
  throw new Error('Gecersiz playlist URL')
}

function parseDuration(text: string | undefined): number {
  if (!text) return 0
  const parts = text.split(':').map(Number)
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return parts[0] || 0
}

function fetchUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const request = net.request(url)
    request.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
    request.setHeader('Accept-Language', 'tr-TR,tr;q=0.9')
    let data = ''
    request.on('response', (response) => {
      response.on('data', (chunk) => {
        data += chunk.toString()
      })
      response.on('end', () => resolve(data))
    })
    request.on('error', reject)
    request.end()
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractVideosFromData(data: any): PlaylistVideo[] {
  const videos: PlaylistVideo[] = []

  const tabs = data?.contents?.twoColumnBrowseResultsRenderer?.tabs
  if (!tabs) return videos

  const contents =
    tabs[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer
      ?.contents?.[0]?.playlistVideoListRenderer?.contents

  if (!Array.isArray(contents)) return videos

  for (const item of contents) {
    const v = item.playlistVideoRenderer
    if (!v || !v.videoId) continue

    const title = v.title?.runs?.[0]?.text ?? ''
    const videoId = v.videoId
    const idx = v.index?.simpleText ? parseInt(v.index.simpleText, 10) - 1 : videos.length
    const durationText = v.lengthText?.simpleText
    const durationSeconds = parseDuration(durationText)
    const thumbnailUrl =
      v.thumbnail?.thumbnails?.slice(-1)[0]?.url ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`

    videos.push({ videoId, title, thumbnailUrl, durationSeconds, position: idx })
  }

  return videos
}

export async function fetchPlaylist(playlistId: string): Promise<PlaylistResult> {
  const url = `https://www.youtube.com/playlist?list=${playlistId}`
  const html = await fetchUrl(url)

  const match = html.match(/var ytInitialData = ({.*?});<\/script>/s)
  if (!match) throw new Error('Playlist verileri alinamadi')

  const data = JSON.parse(match[1])

  let videos = extractVideosFromData(data)

  // Handle continuation (playlists with 100+ videos)
  const tabs = data?.contents?.twoColumnBrowseResultsRenderer?.tabs
  const contents =
    tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer
      ?.contents?.[0]?.playlistVideoListRenderer?.contents

  if (Array.isArray(contents)) {
    const lastItem = contents[contents.length - 1]
    let continuation = lastItem?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token

    while (continuation) {
      const apiUrl = `https://www.youtube.com/youtubei/v1/browse?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8`
      const body = JSON.stringify({
        context: { client: { clientName: 'WEB', clientVersion: '2.20240101' } },
        continuation
      })

      const contHtml = await new Promise<string>((resolve, reject) => {
        const request = net.request({ method: 'POST', url: apiUrl })
        request.setHeader('Content-Type', 'application/json')
        request.setHeader('User-Agent', 'Mozilla/5.0')
        let d = ''
        request.on('response', (response) => {
          response.on('data', (chunk) => { d += chunk.toString() })
          response.on('end', () => resolve(d))
        })
        request.on('error', reject)
        request.write(body)
        request.end()
      })

      const contData = JSON.parse(contHtml)
      const actions = contData?.onResponseReceivedActions
      const newContents =
        actions?.[0]?.appendContinuationItemsAction?.continuationItems

      if (!Array.isArray(newContents)) break

      for (const item of newContents) {
        const v = item.playlistVideoRenderer
        if (!v || !v.videoId) continue

        const title = v.title?.runs?.[0]?.text ?? ''
        const videoId = v.videoId
        const idx = v.index?.simpleText ? parseInt(v.index.simpleText, 10) - 1 : videos.length
        const durationText = v.lengthText?.simpleText
        const durationSeconds = parseDuration(durationText)
        const thumbnailUrl =
          v.thumbnail?.thumbnails?.slice(-1)[0]?.url ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`

        videos.push({ videoId, title, thumbnailUrl, durationSeconds, position: idx })
      }

      const lastCont = newContents[newContents.length - 1]
      continuation = lastCont?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token || null
    }
  }

  // Sort by position
  videos.sort((a, b) => a.position - b.position)

  // Playlist thumbnail = first video thumbnail or playlist header
  const headerThumbnail =
    data?.microformat?.microformatDataRenderer?.thumbnail?.thumbnails?.slice(-1)[0]?.url
  const thumbnailUrl = headerThumbnail || videos[0]?.thumbnailUrl || ''

  return { thumbnailUrl, videos }
}
