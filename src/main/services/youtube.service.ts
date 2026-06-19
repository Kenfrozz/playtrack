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

const INNERTUBE_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8'

function postInnerTube(endpoint: string, body: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const request = net.request({
      method: 'POST',
      url: `https://www.youtube.com/youtubei/v1/${endpoint}?key=${INNERTUBE_KEY}`
    })
    request.setHeader('Content-Type', 'application/json')
    request.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
    request.setHeader('Accept-Language', 'tr-TR,tr;q=0.9')
    request.setHeader('X-YouTube-Client-Name', '1')
    request.setHeader('X-YouTube-Client-Version', '2.20240101.01.00')
    let data = ''
    request.on('response', (res) => {
      res.on('data', (chunk) => { data += chunk.toString() })
      res.on('end', () => resolve(data))
    })
    request.on('error', reject)
    request.write(body)
    request.end()
  })
}

function makeNextBody(playlistId: string, videoId?: string, continuation?: string): string {
  return JSON.stringify({
    context: {
      client: {
        clientName: 'WEB',
        clientVersion: '2.20240101.01.00',
        hl: 'tr',
        gl: 'TR'
      }
    },
    ...(continuation
      ? { continuation }
      : {
          playlistId,
          ...(videoId ? { videoId } : {}),
          params: 'OAI%3D'  // include all playlist items
        })
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractFromPlaylistPanel(data: any, videos: PlaylistVideo[]): string | null {
  // Primary path: watch next panel
  const panels = data?.contents?.twoColumnWatchNextResults?.playlist?.playlist
  const playlistContents = panels?.contents

  // Continuation path
  const contContents =
    data?.continuationContents?.playlistPanelContinuation?.contents ??
    data?.onResponseReceivedEndpoints?.[0]?.appendContinuationItemsAction?.continuationItems

  const items = playlistContents ?? contContents
  if (!Array.isArray(items)) return null

  for (const item of items) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const v = (item as any)?.playlistPanelVideoRenderer
    if (!v?.videoId) continue

    const durationOverlay = v.thumbnailOverlays?.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (o: any) => o?.thumbnailOverlayTimeStatusRenderer?.text?.simpleText
    )
    const durationText = durationOverlay?.thumbnailOverlayTimeStatusRenderer?.text?.simpleText

    const position = v.index?.simpleText ? parseInt(v.index.simpleText, 10) : videos.length

    videos.push({
      videoId: v.videoId,
      title: v.title?.simpleText ?? v.title?.runs?.[0]?.text ?? '',
      thumbnailUrl:
        v.thumbnail?.thumbnails?.slice(-1)[0]?.url ??
        `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
      durationSeconds: parseDuration(durationText),
      position
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lastItem = (items as any[])[items.length - 1]
  return (
    lastItem?.playlistPanelVideoRenderer === undefined
      ? lastItem?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token
      : null
  ) ?? null
}

export async function fetchPlaylist(playlistId: string): Promise<PlaylistResult> {
  const videos: PlaylistVideo[] = []

  // Step 1: get first video ID from browse (to seed the next endpoint)
  const browseBody = JSON.stringify({
    context: { client: { clientName: 'WEB', clientVersion: '2.20240101.01.00', hl: 'tr', gl: 'TR' } },
    browseId: 'VL' + playlistId
  })
  const browseResp = await postInnerTube('browse', browseBody)
  const browseData = JSON.parse(browseResp)

  // Extract thumbnail from browse data
  const thumbnailUrl =
    browseData?.header?.playlistHeaderRenderer?.thumbnail?.thumbnails?.slice(-1)[0]?.url ||
    browseData?.microformat?.microformatDataRenderer?.thumbnail?.thumbnails?.slice(-1)[0]?.url ||
    ''

  // Get first videoId from browse data (any lockupViewModel or playlistVideoRenderer)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let firstVideoId: string | undefined
  const lockupContents =
    browseData?.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]
      ?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]
      ?.itemSectionRenderer?.contents
  if (Array.isArray(lockupContents)) {
    for (const item of lockupContents) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lv = (item as any)?.lockupViewModel
      if (lv?.contentId) { firstVideoId = lv.contentId; break }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pv = (item as any)?.playlistVideoRenderer
      if (pv?.videoId) { firstVideoId = pv.videoId; break }
    }
  }

  // Step 2: use next endpoint to get all videos with durations
  const firstNextResp = await postInnerTube('next', makeNextBody(playlistId, firstVideoId))
  const firstNextData = JSON.parse(firstNextResp)

  let continuation = extractFromPlaylistPanel(firstNextData, videos)

  while (continuation) {
    const contResp = await postInnerTube('next', makeNextBody(playlistId, undefined, continuation))
    const contData = JSON.parse(contResp)
    continuation = extractFromPlaylistPanel(contData, videos)
  }

  videos.sort((a, b) => a.position - b.position)
  return { thumbnailUrl: thumbnailUrl || videos[0]?.thumbnailUrl || '', videos }
}
