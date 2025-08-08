// File: src/services/external/VimeoService.ts
import fs from 'fs'
import path from 'path'
import client from '../../vimeo' // Corrected path assuming vimeo.ts is in config folder

// Interfaces
interface VimeoFileLink {
  quality: string
  type: string
  link: string
  expires?: string
  // Add other fields like width, height, fps, size if you need them
}
interface VimeoPlayData {
  progressive?: VimeoFileLink[]
  hls?: {
    link: string
    type?: string // e.g., 'application/x-mpegURL'
    // Potentially other fields like 'cdns', 'default_cdn'
    [key: string]: any // To accommodate other potential HLS properties
  }
  dash?: { link: string; type?: string }
}
interface VimeoVideoMetadata {
  uri: string
  link: string
  play?: VimeoPlayData
  files?: VimeoFileLink[]
  transcode?: { status: string }
  upload?: { status: string }
  name?: string
  duration?: number
  privacy?: {
    view: 'anybody' | 'contacts' | 'disable' | 'nobody' | 'password' | 'ptv' | 'unlisted' | string
    embed: 'public' | 'private' | 'whitelist' | string
    download: boolean
    add: boolean
    comments: 'anybody' | 'contacts' | 'nobody' | string
  }
}
interface VimeoLinkResponse {
  link?: string
}

type VimeoClientCallback = (
  error: Error | null,
  body: any,
  statusCode: number,
  headers: Record<string, string>,
) => void

class VimeoService {
  private readonly tmpUploadDir = path.resolve('tmp_uploads')

  constructor() {
    if (!fs.existsSync(this.tmpUploadDir)) {
      try {
        fs.mkdirSync(this.tmpUploadDir, { recursive: true })
        console.log(`VimeoService: Created temporary upload directory: ${this.tmpUploadDir}`)
      } catch (err) {
        console.error(
          `VimeoService: Failed to create temporary upload directory ${this.tmpUploadDir}:`,
          err,
        )
      }
    }
    console.log(`VimeoService initialized. Temp upload directory: ${this.tmpUploadDir}`)
    if (!client) {
      console.error(
        'VimeoService FATAL: Vimeo client from config/vimeo.ts is null. Check credentials and initialization.',
      )
    }
  }

  private deleteTempFile(filePath: string): void {
    if (!filePath) return
    const resolvedFilePath = path.resolve(filePath)
    if (resolvedFilePath.startsWith(this.tmpUploadDir) && fs.existsSync(resolvedFilePath)) {
      fs.unlink(resolvedFilePath, (unlinkErr) => {
        if (unlinkErr) {
          console.error(`VimeoService: Failed to delete temp file ${resolvedFilePath}:`, unlinkErr)
        } else {
          console.log(`VimeoService: Successfully deleted temp file ${resolvedFilePath}`)
        }
      })
    } else if (!resolvedFilePath.startsWith(this.tmpUploadDir)) {
      console.warn(
        `VimeoService: Attempt to delete file outside tmp_uploads: ${resolvedFilePath}. Skipped.`,
      )
    }
  }

  async getVideoMetadata(videoUri: string): Promise<VimeoVideoMetadata | null> {
    if (!client) {
      console.error('VimeoService.getVideoMetadata: Client not initialized.')
      return null
    }

    let videoPath = videoUri
    if (!videoUri.startsWith('/videos/')) {
      const idPart = videoUri.split('/').pop()
      if (idPart && /^\d+$/.test(idPart)) {
        videoPath = `/videos/${idPart}`
      } else {
        console.error(
          `VimeoService.getVideoMetadata: Invalid videoUri format: ${videoUri}. Expected format like '/videos/ID', 'videos/ID', or 'ID'.`,
        )
        return null
      }
    }
    // console.log(`VimeoService.getVideoMetadata: Fetching metadata for video path: ${videoPath}`); // Can be verbose

    return new Promise((resolve) => {
      const callback: VimeoClientCallback = (error, body, statusCode) => {
        // Original check from before adding explicit Accept header:
        if (error || statusCode >= 400) {
          console.error(
            `VimeoService.getVideoMetadata: Error for ${videoPath}. Status: ${statusCode}, Error: ${
              error ? error.message : 'N/A'
            }. Body:`,
            // Log body for more context on error
            typeof body === 'object' ? JSON.stringify(body, null, 2) : body,
          )
          return resolve(null)
        }
        // Added robustness check for body type
        if (typeof body !== 'object' || body === null) {
          console.error(
            `VimeoService.getVideoMetadata: Invalid body received for ${videoPath}. Expected object, got:`,
            body,
          )
          return resolve(null)
        }
        resolve(body as VimeoVideoMetadata)
      }
      const fields = 'uri,link,play,files,transcode.status,upload.status,name,duration,privacy'
      // Original client.request call without explicit headers object:
      client.request({ method: 'GET', path: `${videoPath}?fields=${fields}` }, callback)
    })
  }

  getPlayableMp4Url(playData: VimeoPlayData | undefined): string | null {
    if (!playData?.progressive || playData.progressive.length === 0) {
      return null
    }
    const hd =
      playData.progressive.find((f) => f.quality === '1080p' && f.link && f.type === 'video/mp4') ||
      playData.progressive.find((f) => f.quality === 'hd' && f.link && f.type === 'video/mp4')
    const sd =
      playData.progressive.find((f) => f.quality === 'sd' && f.link && f.type === 'video/mp4') ||
      playData.progressive.find((f) => f.quality === '720p' && f.link && f.type === 'video/mp4') ||
      playData.progressive.find((f) => f.quality === '540p' && f.link && f.type === 'video/mp4')
    const anyProg = playData.progressive.find((f) => f.link && f.type === 'video/mp4') // Catch-all for any MP4

    const chosenLink = hd?.link || sd?.link || anyProg?.link || null
    if (chosenLink) {
      // console.log(`VimeoService.getPlayableMp4Url: Found MP4 link (Quality HD: ${!!hd}, SD: ${!!sd}, Any: ${!!anyProg}): ${chosenLink.substring(0, 50)}...`);
    } else {
      // console.log('VimeoService.getPlayableMp4Url: No suitable progressive MP4 link found.');
    }
    return chosenLink
  }

  getPlayableHlsUrl(playData: VimeoPlayData | undefined): string | null {
    if (
      playData?.hls?.link &&
      (playData.hls.type === 'application/x-mpegURL' || !playData.hls.type)
    ) {
      // console.log(`VimeoService.getPlayableHlsUrl: Found HLS link: ${playData.hls.link.substring(0,50)}...`);
      return playData.hls.link
    }
    // console.log('VimeoService.getPlayableHlsUrl: No suitable HLS link found.');
    return null
  }

  getBestFileLink_Legacy(files: VimeoFileLink[] | undefined): string | null {
    if (!files || files.length === 0) {
      return null
    }
    const hd = files.find((f) => f.quality === 'hd' && f.type === 'video/mp4' && f.link)
    const sd = files.find((f) => f.quality === 'sd' && f.type === 'video/mp4' && f.link)
    const anyMp4 = files.find((f) => f.type === 'video/mp4' && f.link)

    const chosenLink = hd?.link || sd?.link || anyMp4?.link || null
    if (chosenLink) {
      // console.log(`VimeoService.getBestFileLink_Legacy: Found MP4 link from files (Quality HD: ${!!hd}, SD: ${!!sd}, Any: ${!!anyMp4}): ${chosenLink.substring(0, 50)}...`);
    } else {
      // console.log('VimeoService.getBestFileLink_Legacy: No suitable MP4 link found in files array.');
    }
    return chosenLink
  }

  async getFreshPlayableUrl(videoUri: string): Promise<string | null> {
    console.log(
      `VimeoService.getFreshPlayableUrl: Received video URI: '${videoUri}' for processing.`,
    )

    if (!videoUri || typeof videoUri !== 'string' || videoUri.trim() === '') {
      console.error(
        'VimeoService.getFreshPlayableUrl: Input video URI is null, empty, or not a string.',
      )
      return null
    }

    let normalizedUri = videoUri.trim()
    if (normalizedUri.startsWith('/videos/')) {
      const idPart = normalizedUri.substring('/videos/'.length)
      if (!/^\d+$/.test(idPart)) {
        console.error(
          `VimeoService.getFreshPlayableUrl: Invalid ID part in pre-formatted URI '${normalizedUri}'.`,
        )
        return null
      }
    } else if (normalizedUri.startsWith('videos/')) {
      const idPart = normalizedUri.substring('videos/'.length)
      if (/^\d+$/.test(idPart)) {
        normalizedUri = `/videos/${idPart}`
      } else {
        console.error(
          `VimeoService.getFreshPlayableUrl: Invalid ID part in 'videos/...' formatted URI '${videoUri}'.`,
        )
        return null
      }
    } else if (/^\d+$/.test(normalizedUri)) {
      normalizedUri = `/videos/${normalizedUri}`
    } else {
      console.error(
        `VimeoService.getFreshPlayableUrl: Unrecognized video URI format: '${videoUri}'. Could not normalize.`,
      )
      return null
    }
    console.log(`VimeoService.getFreshPlayableUrl: Normalized URI to: '${normalizedUri}'`)

    const metadata = await this.getVideoMetadata(normalizedUri)
    if (!metadata) {
      console.warn(
        `VimeoService.getFreshPlayableUrl: No metadata found for normalized URI ${normalizedUri} (original: ${videoUri}).`,
      )
      return null
    }

    // --- CRITICAL LOGGING (Keep this for debugging) ---
    console.log(`VimeoService.getFreshPlayableUrl: Metadata received for ${normalizedUri}:`)
    console.log(`  Upload Status: ${metadata.upload?.status}`)
    console.log(`  Transcode Status: ${metadata.transcode?.status}`)
    console.log(`  Play Object (metadata.play):`, JSON.stringify(metadata.play, null, 2))
    // Log files object only if play.progressive is missing or empty, or if no URL is found from play
    let logFilesObject = !metadata.play?.progressive || metadata.play.progressive.length === 0
    // --- END CRITICAL LOGGING ---

    if (metadata.upload?.status !== 'complete') {
      console.log(
        `VimeoService.getFreshPlayableUrl: Video ${normalizedUri} upload not complete (status: ${metadata.upload?.status})`,
      )
      return null
    }

    if (metadata.transcode?.status !== 'complete') {
      console.log(
        `VimeoService.getFreshPlayableUrl: Video ${normalizedUri} not yet transcoded (status: ${metadata.transcode?.status})`,
      )
      return null
    }

    let playableUrl: string | null = null

    // 1. Try Progressive MP4 from 'play'
    playableUrl = this.getPlayableMp4Url(metadata.play)
    if (playableUrl) {
      console.log(
        `VimeoService.getFreshPlayableUrl: Success - Found Progressive MP4 URL from 'play' data for ${normalizedUri}.`,
      )
      return playableUrl
    }
    console.log(
      `VimeoService.getFreshPlayableUrl: Info - No Progressive MP4 URL found in 'play.progressive' for ${normalizedUri}.`,
    )
    logFilesObject = true // Since MP4 from play.progressive failed, ensure files object is logged

    // 2. Try HLS from 'play' (if your player supports HLS)
    playableUrl = this.getPlayableHlsUrl(metadata.play)
    if (playableUrl) {
      console.log(
        `VimeoService.getFreshPlayableUrl: Success - Found HLS URL from 'play.hls' for ${normalizedUri}.`,
      )
      return playableUrl // This will be an .m3u8 link
    }
    console.log(
      `VimeoService.getFreshPlayableUrl: Info - No HLS URL found in 'play.hls' for ${normalizedUri}.`,
    )
    logFilesObject = true // Since HLS also failed, ensure files object is logged

    // Log files object if it hasn't been logged and we haven't found a URL yet
    if (logFilesObject) {
      console.log(`  Files Object (metadata.files):`, JSON.stringify(metadata.files, null, 2))
    }

    // 3. Try legacy 'files' array (usually for MP4s)
    playableUrl = this.getBestFileLink_Legacy(metadata.files)
    if (playableUrl) {
      console.log(
        `VimeoService.getFreshPlayableUrl: Success - Found MP4 URL from 'files' data (legacy) for ${normalizedUri}.`,
      )
      return playableUrl
    }
    console.log(
      `VimeoService.getFreshPlayableUrl: Info - No MP4 URL found in 'files' data (legacy) for ${normalizedUri}.`,
    )

    console.error(
      // Final error if nothing is found
      `VimeoService.getFreshPlayableUrl: FAILURE - No playable URL (MP4, HLS, or legacy MP4) found for ${normalizedUri}.`,
    )
    return null
  }

  async uploadVideo(
    filePath: string,
    videoName: string = 'Daytz App Upload',
  ): Promise<{ uri: string; pageLink: string }> {
    if (!client) {
      console.error('VimeoService.uploadVideo: Client not initialized.')
      throw new Error('Vimeo client not configured.')
    }
    console.log(`VimeoService.uploadVideo: Uploading "${filePath}" as "${videoName}"`)

    const params = {
      name: videoName,
      privacy: {
        view: 'unlisted',
        embed: 'public',
        download: false,
      },
    }

    return new Promise<{ uri: string; pageLink: string }>((resolve, reject) => {
      let initiatedVideoUri: string | null = null

      client.upload(
        filePath,
        params,
        (uri: string) => {
          console.log(`VimeoService.uploadVideo: Upload initiated. Video API URI: ${uri}`)
          initiatedVideoUri = uri

          client.request(
            { method: 'GET', path: `${uri}?fields=link,upload.status,transcode.status` },
            (err: Error | null, body: VimeoVideoMetadata | null, status: number) => {
              if (err || status >= 400 || !body?.link) {
                console.warn(
                  `VimeoService.uploadVideo: Could not fetch page link or verify status for ${uri} post-initiation. Status: ${status}. Error: ${
                    err ? err.message : 'N/A'
                  }. Body: ${JSON.stringify(body)}`,
                )
                const videoId = initiatedVideoUri?.split('/').pop()
                const fallbackPageLink = videoId
                  ? `https://vimeo.com/${videoId}`
                  : `https://vimeo.com${initiatedVideoUri || ''}`
                console.warn(
                  `VimeoService.uploadVideo: Using fallback pageLink: ${fallbackPageLink}`,
                )
                if (initiatedVideoUri) {
                  resolve({ uri: initiatedVideoUri, pageLink: fallbackPageLink })
                } else {
                  reject(
                    new Error('Vimeo upload initiated but failed to retrieve URI or page link.'),
                  )
                }
                return
              }

              console.log(
                `VimeoService.uploadVideo: Fetched page link: ${body.link}. Upload: ${body.upload?.status}, Transcode: ${body.transcode?.status}`,
              )
              if (initiatedVideoUri) {
                resolve({ uri: initiatedVideoUri, pageLink: body.link })
              } else {
                reject(
                  new Error('Vimeo upload initiated but URI became null before final resolution.'),
                )
              }
            },
          )
        },
        (_bytes_uploaded: number, _bytes_total: number) => {
          /* Progress callback */
        },
        (error: Error) => {
          console.error(
            `VimeoService.uploadVideo: Failed to initiate video upload. Error:`,
            error.message,
          )
          reject(new Error(`Vimeo upload initiation failed: ${error.message}`))
        },
      )
    }).finally(() => {
      this.deleteTempFile(filePath)
    })
  }

  async replaceVideoSource(
    filePath: string,
    videoUri: string,
  ): Promise<{ uri: string; pageLink: string }> {
    if (!client) {
      console.error('VimeoService.replaceVideoSource: Client not initialized.')
      throw new Error('Vimeo client not configured.')
    }

    let fullVideoPath = videoUri
    if (!videoUri.startsWith('/videos/')) {
      const idPart = videoUri.split('/').pop()
      if (idPart && /^\d+$/.test(idPart)) fullVideoPath = `/videos/${idPart}`
      else throw new Error(`Invalid videoUri format for replacement: ${videoUri}`)
    }
    console.log(
      `VimeoService.replaceVideoSource: Replacing source for ${fullVideoPath} with file ${filePath}`,
    )

    return new Promise<{ uri: string; pageLink: string }>((resolve, reject) => {
      client.replace(
        filePath,
        fullVideoPath,
        (uploadCompleteUri: string) => {
          console.log(
            `VimeoService.replaceVideoSource: Replacement upload complete. Vimeo reported URI: ${uploadCompleteUri}. Original Video URI: ${fullVideoPath}`,
          )
          client.request(
            { method: 'GET', path: `${fullVideoPath}?fields=link` },
            (err: Error | null, body: VimeoLinkResponse | null, status: number) => {
              let pageLink = ''
              if (err || status >= 400 || !body?.link) {
                console.warn(
                  `VimeoService.replaceVideoSource: Could not fetch page link for ${fullVideoPath} after replace. Status: ${status}. Error: ${
                    err ? err.message : 'N/A'
                  }. Body: ${JSON.stringify(body)}. Falling back.`,
                )
                const videoId = fullVideoPath.split('/').pop()
                pageLink = videoId
                  ? `https://vimeo.com/${videoId}`
                  : `https://vimeo.com${fullVideoPath}`
              } else {
                pageLink = body.link
                console.log(
                  `VimeoService.replaceVideoSource: Fetched page link for replaced video: ${pageLink}`,
                )
              }
              resolve({ uri: fullVideoPath, pageLink: pageLink })
            },
          )
        },
        (_bytes_uploaded: number, _bytes_total: number) => {
          /* Progress */
        },
        (error: Error) => {
          console.error(
            `VimeoService.replaceVideoSource: Failed replacement for ${fullVideoPath}. Error:`,
            error.message,
          )
          reject(new Error(`Vimeo replacement initiation failed: ${error.message}`))
        },
      )
    }).finally(() => {
      this.deleteTempFile(filePath)
    })
  }

  async deleteVideo(videoUriOrId: string): Promise<void> {
    if (!client) {
      console.error('VimeoService.deleteVideo: Client not initialized.')
      throw new Error('Vimeo client not configured.')
    }

    const videoId = videoUriOrId.split('/').pop()
    if (!videoId || !/^\d+$/.test(videoId)) {
      const errMsg = `Invalid video URI/ID for deletion: ${videoUriOrId}`
      console.error(`VimeoService.deleteVideo: ${errMsg}`)
      throw new Error(errMsg)
    }
    const videoPath = `/videos/${videoId}`
    console.log(`VimeoService.deleteVideo: Attempting to delete video: ${videoPath}`)

    return new Promise<void>((resolve, reject) => {
      const callback: VimeoClientCallback = (error, body, statusCode) => {
        if (error || (statusCode >= 400 && statusCode !== 404)) {
          console.error(
            `VimeoService.deleteVideo: Failed for ${videoPath}. Status: ${statusCode}.`,
            error || body,
          )
          reject(error || new Error(`Vimeo API Error during delete: Status ${statusCode}`))
        } else {
          console.log(
            `VimeoService.deleteVideo: ${videoPath} deletion successful or not found (Status: ${statusCode}).`,
          )
          resolve()
        }
      }
      client.request({ method: 'DELETE', path: videoPath }, callback)
    })
  }
}

export default VimeoService
